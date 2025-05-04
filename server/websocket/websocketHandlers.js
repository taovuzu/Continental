import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import CollaborationRoom from '../models/CollaborationRoom.js';
import CollaborationMessage from '../models/CollaborationMessage.js';

const connections = new Map(); // socketId -> { userId, roomId, username }
const roomConnections = new Map(); // roomId -> Set of socketIds
const userSockets = new Map(); // userId -> Set of socketIds

const MESSAGE_TYPES = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  CHAT_MESSAGE: 'chat-message',
  WEBRTC_SIGNAL: 'webrtc-signal',
  WEBRTC_SIGNAL_ROOM: 'webrtc-signal-room',
  MEDIA_STATE_CHANGE: 'media-state-change',
  SCREEN_SHARE_START: 'screen-share-start',
  SCREEN_SHARE_STOP: 'screen-share-stop',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  PING: 'ping',
  PONG: 'pong'
};

const RESPONSE_TYPES = {
  ROOM_JOINED: 'room-joined',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  CHAT_MESSAGE: 'chat-message',
  WEBRTC_SIGNAL: 'webrtc-signal',
  PEER_MEDIA_STATE_CHANGE: 'peer-media-state-change',
  PEER_SCREEN_SHARE_START: 'peer-screen-share-start',
  PEER_SCREEN_SHARE_STOP: 'peer-screen-share-stop',
  USER_TYPING: 'user-typing',
  ERROR: 'error',
  PONG: 'pong'
};

const authenticateWebSocket = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName
    };
  } catch (error) {
    throw new Error('Authentication failed');
  }
};

const sendMessage = (ws, type, data) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
};

const broadcastToRoom = (roomId, type, data, excludeSocket = null) => {
  const roomSocketSet = roomConnections.get(roomId);
  if (roomSocketSet) {
    roomSocketSet.forEach(socketId => {
      if (socketId !== excludeSocket) {
        const connection = connections.get(socketId);
        if (connection && connection.ws.readyState === connection.ws.OPEN) {
          sendMessage(connection.ws, type, data);
        }
      }
    });
  }
};

const handleJoinRoom = async (ws, data, userInfo) => {
  try {
    const { roomId } = data;
    if (!roomId) {
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Room ID is required' });
      return;
    }

    const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });
    if (!room) {
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Room not found' });
      return;
    }

    const isMember = room.members.includes(userInfo.userId);
    if (!isMember && !room.settings.allowGuests) {
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Access denied - not a member' });
      return;
    }

    if (!isMember) {
      await room.addMember(userInfo.userId);
    }

    const previousRoom = connections.get(ws.id)?.roomId;
    if (previousRoom) {
      await leaveRoomHandler(ws, previousRoom);
    }

    const connectionData = {
      userId: userInfo.userId,
      username: userInfo.username,
      fullName: userInfo.fullName,
      roomId: roomId.toUpperCase(),
      joinedAt: new Date(),
      ws: ws
    };
    connections.set(ws.id, connectionData);

    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set());
    }
    roomConnections.get(roomId).add(ws.id);

    if (!userSockets.has(userInfo.userId)) {
      userSockets.set(userInfo.userId, new Set());
    }
    userSockets.get(userInfo.userId).add(ws.id);

    await room.updateActivity();

    const participantSockets = Array.from(roomConnections.get(roomId) || []);
    const participants = participantSockets.map(socketId => {
      const conn = connections.get(socketId);
      return conn ? { userId: conn.userId, username: conn.username, fullName: conn.fullName } : null;
    }).filter(Boolean);

    broadcastToRoom(roomId, RESPONSE_TYPES.USER_JOINED, {
      userId: userInfo.userId,
      username: userInfo.username,
      fullName: userInfo.fullName,
      participants: participants
    }, ws.id);

    sendMessage(ws, RESPONSE_TYPES.ROOM_JOINED, {
      roomId,
      participants: participants
    });

    console.log(`${userInfo.username} joined room ${roomId}`);

  } catch (error) {
    console.error('Join room error:', error);
    sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Failed to join room' });
  }
};

const handleChatMessage = async (ws, data, userInfo) => {
  try {
    const { message, roomId } = data;

    if (!message?.trim() || !roomId) {
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Message and room ID are required' });
      return;
    }

    const connection = connections.get(ws.id);
    if (!connection || connection.roomId !== roomId.toUpperCase()) {
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Not in this room' });
      return;
    }

    const chatMessage = new CollaborationMessage({
      content: message.trim(),
      author: userInfo.userId,
      authorName: userInfo.username,
      roomId: roomId.toUpperCase(),
      metadata: {
        socketId: ws.id,
        clientTimestamp: new Date()
      }
    });

    await chatMessage.save();

    broadcastToRoom(roomId, RESPONSE_TYPES.CHAT_MESSAGE, {
      id: chatMessage._id,
      content: chatMessage.content,
      author: {
        userId: userInfo.userId,
        username: userInfo.username,
        fullName: userInfo.fullName
      },
      messageType: chatMessage.messageType,
      timeAgo: chatMessage.timeAgo,
      createdAt: chatMessage.createdAt
    });

    const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });
    if (room) {
      room.stats.messageCount++;
      room.updateActivity();
    }

  } catch (error) {
    console.error('Chat message error:', error);
    sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Failed to send message' });
  }
};

const handleWebRTCSignal = (ws, data, userInfo) => {
  const { targetUserId, signal } = data;

  const targetSockets = userSockets.get(targetUserId);
  if (targetSockets) {
    targetSockets.forEach(socketId => {
      const connection = connections.get(socketId);
      if (connection && connection.ws.readyState === connection.ws.OPEN) {
        sendMessage(connection.ws, RESPONSE_TYPES.WEBRTC_SIGNAL, {
          senderUserId: userInfo.userId,
          senderUsername: userInfo.username,
          signal
        });
      }
    });
  }
};

const handleWebRTCSignalRoom = (ws, data, userInfo) => {
  const { roomId, signal } = data;

  const roomSocketSet = roomConnections.get(roomId);
  if (roomSocketSet) {
    roomSocketSet.forEach(socketId => {
      if (socketId !== ws.id) {
        const connection = connections.get(socketId);
        if (connection && connection.ws.readyState === connection.ws.OPEN) {
          sendMessage(connection.ws, RESPONSE_TYPES.WEBRTC_SIGNAL, {
            senderUserId: userInfo.userId,
            senderUsername: userInfo.username,
            signal
          });
        }
      }
    });
  }
};

const handleMediaStateChange = (ws, data, userInfo) => {
  const { roomId, mediaType, isEnabled } = data;

  broadcastToRoom(roomId, RESPONSE_TYPES.PEER_MEDIA_STATE_CHANGE, {
    userId: userInfo.userId,
    username: userInfo.username,
    mediaType,
    isEnabled
  }, ws.id);
};

const handleScreenShare = (ws, data, userInfo, type) => {
  const { roomId } = data;

  const responseType = type === MESSAGE_TYPES.SCREEN_SHARE_START
    ? RESPONSE_TYPES.PEER_SCREEN_SHARE_START
    : RESPONSE_TYPES.PEER_SCREEN_SHARE_STOP;

  broadcastToRoom(roomId, responseType, {
    userId: userInfo.userId,
    username: userInfo.username
  }, ws.id);
};

const handleTyping = (ws, data, userInfo, isTyping) => {
  const { roomId } = data;

  broadcastToRoom(roomId, RESPONSE_TYPES.USER_TYPING, {
    userId: userInfo.userId,
    username: userInfo.username,
    isTyping
  }, ws.id);
};

const leaveRoomHandler = async (ws, roomId) => {
  try {
    const roomSocketSet = roomConnections.get(roomId);
    if (roomSocketSet) {
      roomSocketSet.delete(ws.id);
      if (roomSocketSet.size === 0) {
        roomConnections.delete(roomId);
      }
    }

    const connection = connections.get(ws.id);
    if (connection) {
      const userSocketSet = userSockets.get(connection.userId);
      if (userSocketSet) {
        userSocketSet.delete(ws.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(connection.userId);
        }
      }

      broadcastToRoom(roomId, RESPONSE_TYPES.USER_LEFT, {
        userId: connection.userId,
        username: connection.username
      });

      const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });
      if (room) {
        const remainingUserSockets = userSockets.get(connection.userId);
        const hasOtherSocketsInRoom = remainingUserSockets ?
          Array.from(remainingUserSockets).some(socketId => {
            const conn = connections.get(socketId);
            return conn && conn.roomId === roomId.toUpperCase();
          }) : false;

        if (!hasOtherSocketsInRoom) {
          await room.removeMember(connection.userId);
        }

        await room.updateActivity();
      }

      console.log(`${connection.username} left room ${roomId}`);
    }

  } catch (error) {
    console.error('Leave room error:', error);
  }
};

export const initializeWebSocketHandlers = (wss) => {
  wss.on('connection', async (ws, req) => {
    let userInfo = null;

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

      userInfo = await authenticateWebSocket(token);

      ws.id = Math.random().toString(36).substring(2, 15);

      console.log(`User connected: ${userInfo.username} (${ws.id})`);

      ws.on('message', async (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          const { type, data } = parsedMessage;

          switch (type) {
            case MESSAGE_TYPES.JOIN_ROOM:
              await handleJoinRoom(ws, data, userInfo);
              break;

            case MESSAGE_TYPES.CHAT_MESSAGE:
              await handleChatMessage(ws, data, userInfo);
              break;

            case MESSAGE_TYPES.WEBRTC_SIGNAL:
              handleWebRTCSignal(ws, data, userInfo);
              break;

            case MESSAGE_TYPES.WEBRTC_SIGNAL_ROOM:
              handleWebRTCSignalRoom(ws, data, userInfo);
              break;

            case MESSAGE_TYPES.MEDIA_STATE_CHANGE:
              handleMediaStateChange(ws, data, userInfo);
              break;

            case MESSAGE_TYPES.SCREEN_SHARE_START:
              handleScreenShare(ws, data, userInfo, MESSAGE_TYPES.SCREEN_SHARE_START);
              break;

            case MESSAGE_TYPES.SCREEN_SHARE_STOP:
              handleScreenShare(ws, data, userInfo, MESSAGE_TYPES.SCREEN_SHARE_STOP);
              break;

            case MESSAGE_TYPES.TYPING_START:
              handleTyping(ws, data, userInfo, true);
              break;

            case MESSAGE_TYPES.TYPING_STOP:
              handleTyping(ws, data, userInfo, false);
              break;

            case MESSAGE_TYPES.PING:
              sendMessage(ws, RESPONSE_TYPES.PONG, { timestamp: Date.now() });
              break;

            default:
              sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Unknown message type' });
          }
        } catch (error) {
          console.error('Message parsing error:', error);
          sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Invalid message format' });
        }
      });

      ws.on('close', async () => {
        console.log(`User disconnected: ${userInfo.username} (${ws.id})`);

        const connection = connections.get(ws.id);
        if (connection) {
          const { roomId } = connection;

          await leaveRoomHandler(ws, roomId);

          connections.delete(ws.id);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      sendMessage(ws, RESPONSE_TYPES.ERROR, { message: 'Authentication failed' });
      ws.close();
    }
  });

  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        sendMessage(ws, 'heartbeat', { timestamp: Date.now() });
      }
    });
  }, 30000); // Every 30 seconds
};

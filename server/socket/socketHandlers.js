const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CollaborationRoom = require('../models/CollaborationRoom');
const CollaborationMessage = require('../models/CollaborationMessage');

const connections = new Map(); // socketId -> { userId, roomId, username }
const roomConnections = new Map(); // roomId -> Set of socketIds
const userSockets = new Map(); // userId -> Set of socketIds

const initializeSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      socket.fullName = user.fullName;

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);

    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const isMember = room.members.includes(socket.userId);
        if (!isMember && !room.settings.allowGuests) {
          socket.emit('error', { message: 'Access denied - not a member' });
          return;
        }

        if (!isMember) {
          await room.addMember(socket.userId);
        }

        const previousRoom = connections.get(socket.id)?.roomId;
        if (previousRoom) {
          await leaveRoomHandler(socket, previousRoom);
        }

        socket.join(roomId);

        const connectionData = {
          userId: socket.userId,
          username: socket.username,
          fullName: socket.fullName,
          roomId: roomId.toUpperCase(),
          joinedAt: new Date()
        };
        connections.set(socket.id, connectionData);

        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId).add(socket.id);

        if (!userSockets.has(socket.userId)) {
          userSockets.set(socket.userId, new Set());
        }
        userSockets.get(socket.userId).add(socket.id);

        await room.updateActivity();

        const participantSockets = Array.from(roomConnections.get(roomId) || []);
        const participants = participantSockets.map(socketId => {
          const conn = connections.get(socketId);
          return conn ? { userId: conn.userId, username: conn.username, fullName: conn.fullName } : null;
        }).filter(Boolean);

        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          username: socket.username,
          fullName: socket.fullName,
          participants: participants
        });

        socket.emit('room-joined', {
          roomId,
          participants: participants
        });

        console.log(`${socket.username} joined room ${roomId}`);

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('webrtc-signal', (data) => {
      const { targetUserId, signal } = data;

      const targetSockets = userSockets.get(targetUserId);
      if (targetSockets) {
        targetSockets.forEach(socketId => {
          io.to(socketId).emit('webrtc-signal', {
            senderUserId: socket.userId,
            senderUsername: socket.username,
            signal
          });
        });
      }
    });

    socket.on('chat-message', async (data) => {
      try {
        const { message, roomId } = data;

        if (!message?.trim() || !roomId) {
          socket.emit('error', { message: 'Message and room ID are required' });
          return;
        }

        const connection = connections.get(socket.id);
        if (!connection || connection.roomId !== roomId.toUpperCase()) {
          socket.emit('error', { message: 'Not in this room' });
          return;
        }

        const chatMessage = new CollaborationMessage({
          content: message.trim(),
          author: socket.userId,
          authorName: socket.username,
          roomId: roomId.toUpperCase(),
          metadata: {
            socketId: socket.id,
            clientTimestamp: new Date()
          }
        });

        await chatMessage.save();

        io.to(roomId).emit('chat-message', {
          id: chatMessage._id,
          content: chatMessage.content,
          author: {
            userId: socket.userId,
            username: socket.username,
            fullName: socket.fullName
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
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('media-state-change', (data) => {
      const { roomId, mediaType, isEnabled } = data; // mediaType: 'audio' | 'video'

      socket.to(roomId).emit('peer-media-state-change', {
        userId: socket.userId,
        username: socket.username,
        mediaType,
        isEnabled
      });
    });

    socket.on('screen-share-start', (data) => {
      const { roomId } = data;

      socket.to(roomId).emit('peer-screen-share-start', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('screen-share-stop', (data) => {
      const { roomId } = data;

      socket.to(roomId).emit('peer-screen-share-stop', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing-start', (data) => {
      socket.to(data.roomId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping: true
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(data.roomId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping: false
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);

      const connection = connections.get(socket.id);
      if (connection) {
        const { roomId } = connection;

        await leaveRoomHandler(socket, roomId);

        connections.delete(socket.id);
      }
    });
  });
};

const leaveRoomHandler = async (socket, roomId) => {
  try {
    const roomSocketSet = roomConnections.get(roomId);
    if (roomSocketSet) {
      roomSocketSet.delete(socket.id);
      if (roomSocketSet.size === 0) {
        roomConnections.delete(roomId);
      }
    }

    const userSocketSet = userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        userSockets.delete(socket.userId);
      }
    }

    socket.leave(roomId);

    socket.to(roomId).emit('user-left', {
      userId: socket.userId,
      username: socket.username
    });

    const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });
    if (room) {
      const remainingUserSockets = userSockets.get(socket.userId);
      const hasOtherSocketsInRoom = remainingUserSockets ?
        Array.from(remainingUserSockets).some(socketId => {
          const conn = connections.get(socketId);
          return conn && conn.roomId === roomId.toUpperCase();
        }) : false;

      if (!hasOtherSocketsInRoom) {
        await room.removeMember(socket.userId);
      }

      await room.updateActivity();
    }

    console.log(`${socket.username} left room ${roomId}`);

  } catch (error) {
    console.error('Leave room error:', error);
  }
};

module.exports = { initializeSocketHandlers };

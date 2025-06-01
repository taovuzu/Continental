import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import websocketService from '../services/websocketService';

// Modern WebRTC Component
const VideoConferenceRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector(state => state.auth);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [remoteStreams, setRemoteStreams] = useState({});
  const [roomJoined, setRoomJoined] = useState(false); // Track if room is joined
  const [localVideoError, setLocalVideoError] = useState(null);
  
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    const setupRoom = async () => {
      if (roomId && token) {
        await websocketService.connect(token);
        await initializeRoom();
      }
    };
    setupRoom();
    return () => cleanup();
  }, [roomId, token]);

  useEffect(() => {
    // --- WebSocket event handlers ---
    const handleRoomJoined = (data) => {
      setParticipants(data.participants || []);
      setConnectionStatus('connected');
      if (!roomJoined) {
        setRoomJoined(true);
        if (data.participants && data.participants.length > 0) {
          data.participants.forEach(participant => {
            if (participant.userId !== user.id) {
              createPeerConnection(participant.userId, true);
            }
          });
        }
      }
    };
    const handleUserJoined = (data) => {
      setParticipants(data.participants || []);
      if (roomJoined && data.userId !== user.id) {
        createPeerConnection(data.userId, true);
      }
    };
    const handleUserLeft = (data) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      if (peerConnectionsRef.current[data.userId]) {
        peerConnectionsRef.current[data.userId].close();
        delete peerConnectionsRef.current[data.userId];
      }
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[data.userId];
        return newStreams;
      });
    };
    const handleChatMessage = (data) => {
      setChatMessages(prev => [...prev, data]);
    };
    const handleWebRTCSignal = (data) => {
      handleIncomingSignal(data);
    };
    const handleConnected = () => {
      setConnectionStatus('connected');
      websocketService.joinRoom(roomId);
    };
    const handleDisconnected = () => {
      setConnectionStatus('disconnected');
    };
    const handleError = () => {
      setConnectionStatus('error');
    };
    
    websocketService.on('room-joined', handleRoomJoined);
    websocketService.on('user-joined', handleUserJoined);
    websocketService.on('user-left', handleUserLeft);
    websocketService.on('chat-message', handleChatMessage);
    websocketService.on('webrtc-signal', handleWebRTCSignal);
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    
    if (roomId) {
      websocketService.joinRoom(roomId);
    }
    
    return () => {
      websocketService.off('room-joined', handleRoomJoined);
      websocketService.off('user-joined', handleUserJoined);
      websocketService.off('user-left', handleUserLeft);
      websocketService.off('chat-message', handleChatMessage);
      websocketService.off('webrtc-signal', handleWebRTCSignal);
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
    };
  }, [roomId, token, roomJoined, user.id]);

  const initializeRoom = async () => {
    try {
      setLocalVideoError(null);
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (error) {
      setLocalVideoError(error.message || 'Could not access camera/mic');
      localStreamRef.current = null;
    }
  };

  const createPeerConnection = (userId, isInitiator = false) => {
    if (!roomJoined) return;
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionsRef.current[userId] = peerConnection;
    peerConnection.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: event.streams[0]
      }));
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        websocketService.sendWebRTCSignal(userId, {
          candidate: event.candidate
        });
      }
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }
    if (isInitiator) {
      peerConnection.createOffer().then(offer => {
        return peerConnection.setLocalDescription(offer);
      }).then(() => {
        websocketService.sendWebRTCSignal(userId, {
          sdp: peerConnection.localDescription
        });
      }).catch(() => {});
    }
    return peerConnection;
  };

  const handleIncomingSignal = async (data) => {
    const { senderUserId, signal } = data;
    if (!peerConnectionsRef.current[senderUserId]) {
      createPeerConnection(senderUserId, false);
    }
    const peerConnection = peerConnectionsRef.current[senderUserId];
    if (signal.sdp) {
      try {
        await peerConnection.setRemoteDescription(new window.RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          websocketService.sendWebRTCSignal(senderUserId, {
            sdp: peerConnection.localDescription
          });
        }
      } catch (error) {
        setLocalVideoError('Error handling SDP signal: ' + error.message);
      }
    }
    if (signal.candidate) {
      try {
        await peerConnection.addIceCandidate(new window.RTCIceCandidate(signal.candidate));
      } catch (error) {
        setLocalVideoError('Error handling ICE candidate: ' + error.message);
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      
      // Notify other participants
      websocketService.sendMediaStateChange(roomId, 'audio', !isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
      
      // Notify other participants
      websocketService.sendMediaStateChange(roomId, 'video', !isCameraOff);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // Switch back to camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
        
        localStreamRef.current = cameraStream;
        setIsScreenSharing(false);
        
        // Update all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && cameraStream.getVideoTracks()[0]) {
            sender.replaceTrack(cameraStream.getVideoTracks()[0]);
          }
        });
        
        websocketService.sendScreenShareStop(roomId);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        
        // Update all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && screenStream.getVideoTracks()[0]) {
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        });
        
        websocketService.sendScreenShareStart(roomId);
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  const sendMessage = () => {
    if (!roomJoined) {
      setLocalVideoError('Cannot send chat message before room is joined');
      return;
    }
    if (newMessage.trim()) {
      websocketService.sendChatMessage(newMessage.trim(), roomId);
      setNewMessage('');
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // You could add a toast notification here
  };

  const leaveMeeting = () => {
    websocketService.leaveRoom(roomId);
    navigate('/dashboard');
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnectionsRef.current).forEach(pc => {
      if (pc && pc.close) {
        pc.close();
      }
    });
    websocketService.leaveRoom(roomId);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-white text-xl font-semibold">Continental Meeting</h1>
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
              <span className="text-gray-300 text-sm">Room ID:</span>
              <span className="text-white font-mono text-sm">{roomId}</span>
              <button
                onClick={handleCopyRoomId}
                className="text-blue-400 hover:text-blue-300"
              >
                📋
              </button>
            </div>
          </div>
          
          <button
            onClick={leaveMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Leave Meeting
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Error display */}
        {localVideoError && (
          <div className="bg-red-700 text-white text-center py-2">{localVideoError}</div>
        )}
        {/* Video Grid */}
        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {/* Local Video */}
          <div className="bg-gray-800 rounded-lg overflow-hidden relative group">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
              style={{ border: '2px solid #3b82f6' }}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You (this tab) {isMuted ? '(muted)' : ''} {isCameraOff ? '(camera off)' : ''} {isScreenSharing ? '(sharing)' : ''}
            </div>
          </div>
          {/* Remote participants (excluding self) */}
          {participants.filter(p => p.userId !== user.id).map(participant => {
            const stream = remoteStreams[participant.userId];
            return (
              <div key={participant.userId} className="bg-gray-800 rounded-lg overflow-hidden relative group">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={videoRef => {
                    if (videoRef && stream) {
                      videoRef.srcObject = stream;
                    }
                  }}
                  style={{ border: '2px solid #f59e42' }}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {participant?.username || 'Unknown'} (remote)
                </div>
              </div>
            );
          })}
          {/* Placeholder for participants without video */}
          {participants.filter(p => p.userId !== user.id && !remoteStreams[p.userId]).map(participant => (
            <div key={participant.userId} className="bg-gray-800 rounded-lg overflow-hidden relative group">
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-lg">
                      {participant.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <p className="text-white text-sm">{participant.username}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-3">
                  <div className="text-blue-400 text-sm font-medium">{msg.author?.username}</div>
                  <div className="text-white">{msg.content}</div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-center space-x-6">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-colors ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? '🎤❌' : '🎤'}
        </button>
        
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full transition-colors ${
            isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isCameraOff ? '📷❌' : '📷'}
        </button>
        
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition-colors ${
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isScreenSharing ? '🖥️' : '📺'}
        </button>
        
        <button
          onClick={() => setShowChat(!showChat)}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          💬
        </button>
        
        <div className="flex items-center space-x-2 text-gray-300">
          <div className={`w-3 h-3 ${getConnectionStatusColor()} rounded-full`}></div>
          <span className="text-sm">{getConnectionStatusText()}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoConferenceRoom;

// WebSocket service for real-time communication
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.messageHandlers = new Map();
    this.isConnecting = false;
    this.token = null;
  }

  // Connect to WebSocket server
  connect(token) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.token = token;
    this.isConnecting = true;

    try {
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8080'}/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  // Schedule reconnection
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  // Send message to server
  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = { type, data };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', type, data);
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type, data } = message;
    
    // Emit to specific handlers
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in message handler for ${type}:`, error);
        }
      });
    }
    
    // Emit to general handlers
    this.emit(type, data);
  }

  // Register message handler
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  // Remove message handler
  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit event to general handlers
  emit(type, data) {
    // This can be extended to use EventEmitter if needed
    console.log(`📨 WebSocket message: ${type}`, data);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  // Check connection status
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getState() {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Send ping to keep connection alive
  ping() {
    this.send('ping', { timestamp: Date.now() });
  }

  // Join room
  joinRoom(roomId) {
    this.send('join-room', { roomId });
  }

  // Leave room
  leaveRoom(roomId) {
    this.send('leave-room', { roomId });
  }

  // Send chat message
  sendChatMessage(message, roomId) {
    this.send('chat-message', { message, roomId });
  }

  // Send WebRTC signal
  sendWebRTCSignal(targetUserId, signal) {
    this.send('webrtc-signal', { targetUserId, signal });
  }

  // Send WebRTC signal to room
  sendWebRTCSignalToRoom(roomId, signal) {
    this.send('webrtc-signal-room', { roomId, signal });
  }

  // Send media state change
  sendMediaStateChange(roomId, mediaType, isEnabled) {
    this.send('media-state-change', { roomId, mediaType, isEnabled });
  }

  // Send screen share start
  sendScreenShareStart(roomId) {
    this.send('screen-share-start', { roomId });
  }

  // Send screen share stop
  sendScreenShareStop(roomId) {
    this.send('screen-share-stop', { roomId });
  }

  // Send typing start
  sendTypingStart(roomId) {
    this.send('typing-start', { roomId });
  }

  // Send typing stop
  sendTypingStop(roomId) {
    this.send('typing-stop', { roomId });
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;

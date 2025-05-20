import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isInCall: false,
  roomId: null,
  participants: [],
  isVideoEnabled: false,
  isAudioEnabled: false,
  isScreenSharing: false,
  messages: [],
};

const videoCallSlice = createSlice({
  name: 'videoCall',
  initialState,
  reducers: {
    joinRoom: (state, action) => {
      state.isInCall = true;
      state.roomId = action.payload.roomId;
      state.participants = action.payload.participants;
    },
    leaveRoom: (state) => {
      state.isInCall = false;
      state.roomId = null;
      state.participants = [];
      state.messages = [];
    },
    addParticipant: (state, action) => {
      const existingParticipant = state.participants.find(p => p.id === action.payload.id);
      if (!existingParticipant) {
        state.participants.push(action.payload);
      }
    },
    removeParticipant: (state, action) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    toggleAudio: (state) => {
      state.isAudioEnabled = !state.isAudioEnabled;
    },
    toggleScreenShare: (state) => {
      state.isScreenSharing = !state.isScreenSharing;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    updateParticipantStatus: (state, action) => {
      const participant = state.participants.find(p => p.id === action.payload.userId);
      if (participant) {
        participant.isOnline = action.payload.isOnline;
        participant.lastSeen = new Date();
      }
    },
  },
});

export const {
  joinRoom,
  leaveRoom,
  addParticipant,
  removeParticipant,
  toggleVideo,
  toggleAudio,
  toggleScreenShare,
  addMessage,
  clearMessages,
  updateParticipantStatus,
} = videoCallSlice.actions;

export default videoCallSlice.reducer;

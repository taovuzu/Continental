import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import videoCallReducer from './videoCallSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    videoCall: videoCallReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;

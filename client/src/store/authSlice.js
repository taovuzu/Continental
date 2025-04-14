import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  tokenValidated: false,
};

console.log('🔵 authSlice: Initial state:', initialState);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response.data; // This is the inner data field with token and user
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.response?.data?.error || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('🔵 authSlice: Starting registration with data:', userData);
      const response = await authService.register(userData);
      console.log('🟢 authSlice: Registration response received:', response);
      console.log('🟢 authSlice: Returning data:', response.data);
      return response.data; // This is the inner data field with token and user
    } catch (error) {
      console.log('🔴 authSlice: Registration error:', error);
      console.log('🔴 authSlice: Error response:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || error.response?.data?.error || 'Registration failed');
    }
  }
);

export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.validateToken();
      return response.data; // This is the inner data field with user
    } catch (error) {
      return rejectWithValue('Token validation failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    localStorage.removeItem('token');
    dispatch(clearAuthState());
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthState: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.tokenValidated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.tokenValidated = true;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        console.log('🟢 authSlice reducer: registerUser.fulfilled called with payload:', action.payload);
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.tokenValidated = true;
        localStorage.setItem('token', action.payload.token);
        console.log('🟢 authSlice reducer: State updated - isAuthenticated:', state.isAuthenticated, 'user:', state.user);
      })
      .addCase(registerUser.rejected, (state, action) => {
        console.log('🔴 authSlice reducer: registerUser.rejected called with payload:', action.payload);
        state.isLoading = false;
        state.error = action.payload;
      })
      // Validate Token
      .addCase(validateToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokenValidated = true;
      })
      .addCase(validateToken.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.tokenValidated = true;
        localStorage.removeItem('token');
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = null;
        state.tokenValidated = false;
      });
  },
});

export const { clearAuthState, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

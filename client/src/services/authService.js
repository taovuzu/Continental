import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔵 authService: Request interceptor - token:', token ? 'exists' : 'missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    console.log('🟢 authService: Response interceptor - success:', response.status);
    return response;
  },
  (error) => {
    console.log('🔴 authService: Response interceptor - error:', error.response?.status);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData) {
    console.log('🔵 authService: Starting registration with data:', userData);
    const response = await apiClient.post('/auth/register', userData);
    console.log('🟢 authService: Registration response:', response);
    console.log('🟢 authService: Response data:', response.data);
    return response.data;
  },

  async validateToken() {
    const response = await apiClient.get('/auth/verify');
    return response.data;
  },

  async logout() {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('token');
  },

  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

export default authService;

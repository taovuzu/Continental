import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { initializeWebSocketHandlers } from './websocket/websocketHandlers.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users/users.js';
import collaborationRoutes from './routes/collaboration/collaboration.js';
import connectDatabase from './config/database.js';
import { ApiError } from './utils/ApiError.js';
import { ApiResponse } from './utils/ApiResponse.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

connectDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collaboration', collaborationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Continental API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

initializeWebSocketHandlers(wss);

app.use((err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  if (err instanceof ApiError) {
    return ApiResponse.error(err.statusCode, err.message, err.errors)
      .withRequest(req)
      .send(res);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return ApiResponse.error(400, 'Validation Error', errors)
      .withRequest(req)
      .send(res);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(401, 'Invalid token')
      .withRequest(req)
      .send(res);
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(401, 'Token expired')
      .withRequest(req)
      .send(res);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  return ApiResponse.error(statusCode, message)
    .withRequest(req)
    .send(res);
});

app.use('*', (req, res) => {
  ApiResponse.error(404, 'Route not found')
    .withRequest(req)
    .send(res);
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Continental Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`WebSocket server enabled on /ws`);
});

export { app, server };
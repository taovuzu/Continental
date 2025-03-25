import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, firstName, lastName, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    throw ApiError.conflict('User with this email or username already exists');
  }

  const newUser = new User({
    username,
    email,
    firstName,
    lastName,
    password
  });

  await newUser.save();

  const token = generateToken(newUser._id);

  logger.info('User registered successfully', { userId: newUser._id, username: newUser.username });

  ApiResponse.created({
    token,
    user: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: newUser.fullName
    }
  }, 'User registered successfully').withRequest(req).send(res);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  await user.updateLastActive();

  const token = generateToken(user._id);

  logger.info('User logged in successfully', { userId: user._id, username: user.username });

  ApiResponse.success({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName
    }
  }, 'Login successful').withRequest(req).send(res);
}));

router.get('/verify', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    throw ApiError.unauthorized('Invalid token - user not found');
  }

  await user.updateLastActive();

  ApiResponse.success({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName
    }
  }, 'Token is valid').withRequest(req).send(res);
}));

router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  logger.info('User logged out', { userId: req.user.userId });
  ApiResponse.success(null, 'Logged out successfully').withRequest(req).send(res);
}));

router.post('/refresh', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const token = generateToken(user._id);

  logger.info('Token refreshed', { userId: user._id });

  ApiResponse.success({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName
    }
  }, 'Token refreshed successfully').withRequest(req).send(res);
}));

export default router;
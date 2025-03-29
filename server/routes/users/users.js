import express from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  ApiResponse.success({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      preferences: user.preferences,
      lastActive: user.lastActive,
      connectedRooms: user.connectedRooms
    }
  }).withRequest(req).send(res);
}));

router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const allowedUpdates = ['firstName', 'lastName', 'profilePicture', 'preferences'];
  const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));

  const updateData = {};
  updates.forEach(update => {
    updateData[update] = req.body[update];
  });

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  logger.info('User profile updated', { userId: user._id });

  ApiResponse.success({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      preferences: user.preferences
    }
  }, 'Profile updated successfully').withRequest(req).send(res);
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw ApiError.forbidden('Access denied. Admin privileges required.');
  }

  const users = await User.findActiveUsers();

  ApiResponse.success({
    users: users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      lastActive: user.lastActive,
      createdAt: user.createdAt
    }))
  }).withRequest(req).send(res);
}));

router.get('/search', authMiddleware, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    throw ApiError.badRequest('Search query must be at least 2 characters long');
  }

  const users = await User.find({
    $and: [
      { isActive: true },
      { _id: { $ne: req.user.userId } },
      {
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { firstName: { $regex: q, $options: 'i' } },
          { lastName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      }
    ]
  })
    .select('username firstName lastName email')
    .limit(20);

  ApiResponse.success({
    users: users.map(user => ({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email
    }))
  }).withRequest(req).send(res);
}));

router.get('/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password -email');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  ApiResponse.success({
    user: {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      lastActive: user.lastActive
    }
  }).withRequest(req).send(res);
}));

router.put('/last-active', authMiddleware, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.userId,
    { lastActive: new Date() },
    { validateBeforeSave: false }
  );

  ApiResponse.success(null, 'Last active updated').withRequest(req).send(res);
}));

export default router;
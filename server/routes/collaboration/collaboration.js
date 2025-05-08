import express from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import CollaborationRoom from '../../models/CollaborationRoom.js';
import CollaborationMessage from '../../models/CollaborationMessage.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

router.get('/rooms', authMiddleware, asyncHandler(async (req, res) => {
  const rooms = await CollaborationRoom.findByUser(req.user.userId);

  ApiResponse.success({
    rooms: rooms.map(room => ({
      id: room._id,
      name: room.name,
      roomId: room.roomId,
      description: room.description,
      creator: room.creator,
      memberCount: room.memberCount,
      stats: room.stats,
      settings: room.settings,
      status: room.status,
      metadata: room.metadata,
      createdAt: room.createdAt
    }))
  }).withRequest(req).send(res);
}));

router.post('/rooms', authMiddleware, asyncHandler(async (req, res) => {
  const { name, description, settings, metadata } = req.body;

  let roomId;
  let roomExists = true;

  while (roomExists) {
    roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const existingRoom = await CollaborationRoom.findOne({ roomId });
    roomExists = !!existingRoom;
  }

  const room = new CollaborationRoom({
    name: name || `Room ${roomId}`,
    roomId,
    description,
    creator: req.user.userId,
    members: [req.user.userId],
    settings: {
      isPrivate: false,
      allowGuests: true,
      maxParticipants: 50,
      autoDelete: { enabled: false, duration: 7 },
      chatEnabled: true,
      recordingEnabled: false,
      ...settings
    },
    metadata: {
      category: 'meeting',
      tags: [],
      ...metadata
    }
  });

  await room.save();

  logger.info('Room created successfully', { roomId: room.roomId, creator: req.user.userId });

  ApiResponse.created({
    room: {
      id: room._id,
      name: room.name,
      roomId: room.roomId,
      description: room.description,
      creator: room.creator,
      members: room.members,
      settings: room.settings,
      metadata: room.metadata,
      createdAt: room.createdAt
    }
  }, 'Room created successfully').withRequest(req).send(res);
}));

router.post('/rooms/:roomId/join', authMiddleware, asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  if (room.status !== 'active') {
    throw ApiError.badRequest('Room is not active');
  }

  if (room.settings.isPrivate && !room.members.includes(req.user.userId)) {
    throw ApiError.forbidden('This room is private and requires an invitation');
  }

  await room.addMember(req.user.userId);

  logger.info('User joined room', { roomId: room.roomId, userId: req.user.userId });

  ApiResponse.success({
    room: {
      id: room._id,
      name: room.name,
      roomId: room.roomId,
      description: room.description,
      creator: room.creator,
      members: room.members,
      settings: room.settings,
      metadata: room.metadata
    }
  }, 'Successfully joined room').withRequest(req).send(res);
}));

router.get('/rooms/:roomId', authMiddleware, asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() })
    .populate('creator', 'username fullName')
    .populate('members', 'username fullName');

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  const isMember = room.members.some(member =>
    member._id.toString() === req.user.userId.toString()
  );

  if (!isMember && !room.settings.allowGuests) {
    throw ApiError.forbidden('Access denied. You are not a member of this room.');
  }

  ApiResponse.success({
    room: {
      id: room._id,
      name: room.name,
      roomId: room.roomId,
      description: room.description,
      creator: room.creator,
      members: room.members,
      memberCount: room.memberCount,
      stats: room.stats,
      settings: room.settings,
      metadata: room.metadata,
      status: room.status,
      createdAt: room.createdAt
    }
  }).withRequest(req).send(res);
}));

router.get('/rooms/:roomId/messages', authMiddleware, asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  const isMember = room.members.includes(req.user.userId);

  if (!isMember && !room.settings.allowGuests) {
    throw ApiError.forbidden('Access denied. You are not a member of this room.');
  }

  const messages = await CollaborationMessage.find({ roomId: roomId.toUpperCase() })
    .populate('author', 'username fullName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

  ApiResponse.success({
    messages: messages.reverse().map(message => ({
      id: message._id,
      content: message.content,
      author: message.author,
      authorName: message.authorName,
      roomId: message.roomId,
      messageType: message.messageType,
      reactions: message.reactions,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      timeAgo: message.timeAgo,
      createdAt: message.createdAt
    }))
  }).withRequest(req).send(res);
}));

router.post('/rooms/:roomId/leave', authMiddleware, asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  if (room.creator.toString() === req.user.userId.toString()) {
    throw ApiError.badRequest('Room creator cannot leave the room. Archive or delete the room instead.');
  }

  await room.removeMember(req.user.userId);

  logger.info('User left room', { roomId: room.roomId, userId: req.user.userId });

  ApiResponse.success(null, 'Successfully left room').withRequest(req).send(res);
}));

router.put('/rooms/:roomId/settings', authMiddleware, asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const updates = req.body;

  const room = await CollaborationRoom.findOne({ roomId: roomId.toUpperCase() });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  const isCreator = room.creator.toString() === req.user.userId.toString();
  const isModerator = room.moderators.includes(req.user.userId);

  if (!isCreator && !isModerator) {
    throw ApiError.forbidden('Access denied. Only creator and moderators can update settings.');
  }

  const allowedUpdates = ['name', 'description', 'settings', 'metadata'];
  allowedUpdates.forEach(key => {
    if (updates[key] !== undefined) {
      if (key === 'settings') {
        room[key] = { ...room[key], ...updates[key] };
      } else {
        room[key] = updates[key];
      }
    }
  });

  await room.save();

  logger.info('Room settings updated', { roomId: room.roomId, userId: req.user.userId });

  ApiResponse.success({
    room: {
      id: room._id,
      name: room.name,
      description: room.description,
      settings: room.settings,
      metadata: room.metadata
    }
  }, 'Room settings updated successfully').withRequest(req).send(res);
}));

export default router;
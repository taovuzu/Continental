import mongoose from 'mongoose';

const collaborationRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9]{5}$/, 'Room ID must be exactly 5 alphanumeric characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Room creator is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollaborationMessage'
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowGuests: {
      type: Boolean,
      default: true
    },
    maxParticipants: {
      type: Number,
      default: 50,
      min: [2, 'Minimum 2 participants'],
      max: [100, 'Maximum 100 participants']
    },
    autoDelete: {
      enabled: { type: Boolean, default: false },
      duration: { type: Number, default: 7 } // days
    },
    chatEnabled: {
      type: Boolean,
      default: true
    },
    recordingEnabled: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    messageCount: {
      type: Number,
      default: 0
    },
    participantCount: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    totalMeetingTime: {
      type: Number,
      default: 0 // in minutes
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'scheduled'],
    default: 'active'
  },
  scheduledFor: {
    type: Date
  },
  metadata: {
    tags: [String],
    category: {
      type: String,
      enum: ['meeting', 'workshop', 'presentation', 'casual', 'project'],
      default: 'meeting'
    },
    location: String,
    agenda: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

collaborationRoomSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

collaborationRoomSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

collaborationRoomSchema.virtual('duration').get(function () {
  if (this.createdAt && this.stats.lastActivity) {
    return Math.floor((this.stats.lastActivity - this.createdAt) / 60000); // minutes
  }
  return 0;
});

collaborationRoomSchema.methods.addMember = function (userId) {
  if (this.members.indexOf(userId) === -1) {
    this.members.push(userId);
    this.stats.participantCount = this.members.length;
    this.stats.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

collaborationRoomSchema.methods.removeMember = function (userId) {
  const index = this.members.indexOf(userId);
  if (index > -1) {
    this.members.splice(index, 1);
    this.stats.participantCount = this.members.length;
    this.stats.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

collaborationRoomSchema.methods.updateActivity = function () {
  this.stats.lastActivity = new Date();
  return this.save({ validateBeforeSave: false });
};

collaborationRoomSchema.statics.findActiveRooms = function () {
  return this.find({
    status: 'active',
    isDeleted: { $ne: true }
  })
    .populate('creator', 'username fullName')
    .populate('members', 'username fullName');
};

collaborationRoomSchema.statics.findByUser = function (userId) {
  return this.find({ members: userId })
    .populate('creator', 'username fullName')
    .sort({ 'stats.lastActivity': -1 });
};

collaborationRoomSchema.index({ roomId: 1 });
collaborationRoomSchema.index({ creator: 1 });
collaborationRoomSchema.index({ members: 1 });
collaborationRoomSchema.index({ 'stats.lastActivity': -1 });
collaborationRoomSchema.index({ status: 1 });

collaborationRoomSchema.pre('save', function (next) {
  if (!this.roomId) {
    this.roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  this.stats.participantCount = this.members.length;

  next();
});

export default mongoose.model('CollaborationRoom', collaborationRoomSchema);
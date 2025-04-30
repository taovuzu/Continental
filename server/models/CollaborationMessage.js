import mongoose from 'mongoose';

const collaborationMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message author is required']
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required']
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'emoji', 'system'],
    default: 'text'
  },
  attachments: [{
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    socketId: String,
    clientTimestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

collaborationMessageSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const seconds = Math.floor((now - this.createdAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

collaborationMessageSchema.index({ roomId: 1, createdAt: -1 });
collaborationMessageSchema.index({ author: 1 });
collaborationMessageSchema.index({ 'reactions.userId': 1 });

collaborationMessageSchema.pre('save', function (next) {
  if (this.content && this.content.includes('<script>')) {
    this.content = this.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  next();
});

export default mongoose.model('CollaborationMessage', collaborationMessageSchema);
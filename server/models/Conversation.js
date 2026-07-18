const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    default: ""
  },
  lastMessage: {
    type: String,
    default: ""
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  adminTyping: {
    type: Boolean,
    default: false
  },
  adminTypingAt: {
    type: Date,
    default: null
  },
  hiddenFromUser: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['AI_PENDING', 'HUMAN_PENDING', 'HUMAN_CONNECTED', 'RESOLVED'],
    default: 'AI_PENDING'
  },
  messageCount: {
    type: Number,
    default: 0
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  escalationReason: {
    type: String,
    default: ""
  },
  userSelectedCategory: {
    type: String,
    default: ""
  },
  humanRequested: {
    type: Boolean,
    default: false
  },
  selectedApplicationId: {
    type: String,
    default: null
  },
  pendingQuestion: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);

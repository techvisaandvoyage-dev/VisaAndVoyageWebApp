const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  senderId: {
    type: String,
    default: ""
  },
  text: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    default: 'text' // can be 'text', 'chips', 'human_escalation', 'application_cards'
  },
  options: [{
    type: String
  }],
  applicationsData: {
    type: mongoose.Schema.Types.Mixed, // To store array of simple objects with app info
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);

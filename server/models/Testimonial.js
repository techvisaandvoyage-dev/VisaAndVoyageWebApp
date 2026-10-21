const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['video', 'text'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // --- Video specific fields ---
  videoLink: {
    type: String,
    trim: true
  },
  place: {
    type: String,
    trim: true // e.g., 'Canada'
  },
  visaType: {
    type: String,
    trim: true // e.g., 'Tourist Visa'
  },
  duration: {
    type: String, // e.g., '1:24'
    trim: true
  },
  flag: {
    type: String, // Emoji flag e.g., '🇨🇦'
    trim: true
  },
  image: {
    type: String, // Thumbnail for video, or Avatar for text
    trim: true
  },
  
  // --- Text specific fields ---
  paragraph: {
    type: String,
    trim: true
  },
  rating: {
    type: String, // e.g., '4.2/5'
    trim: true
  },
  
  // Custom theme colors for text cards
  color: {
    type: String,
    default: 'bg-white'
  },
  textColor: {
    type: String,
    default: 'text-slate-600'
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);

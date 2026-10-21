const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { uploadOptimizer, uploadToFirebase } = require('../utils/uploadOptimizer');

// @route   GET /api/testimonials
// @desc    Get all active testimonials
// @access  Public
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching testimonials' });
  }
});

// @route   GET /api/testimonials/all
// @desc    Get all testimonials (including inactive) for admin
// @access  Private/Admin
router.get('/all', protect, requireAdmin, async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching testimonials' });
  }
});

// @route   POST /api/testimonials/upload-image
// @desc    Upload an image for a testimonial
// @access  Private/Admin
router.post('/upload-image', protect, requireAdmin, uploadOptimizer.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const filename = `testimonial-${Date.now()}.webp`;
    const firebaseUrl = await uploadToFirebase(req.file.buffer, filename, 'image/webp', {
      folder: 'testimonials',
      allowLocalFallback: true
    });
    res.json({ url: firebaseUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// @route   POST /api/testimonials
// @desc    Create a new testimonial
// @access  Private/Admin
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const newTestimonial = new Testimonial(req.body);
    const savedTestimonial = await newTestimonial.save();
    res.status(201).json(savedTestimonial);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating testimonial', error: err.message });
  }
});

// @route   PUT /api/testimonials/:id
// @desc    Update a testimonial
// @access  Private/Admin
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTestimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.json(updatedTestimonial);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating testimonial', error: err.message });
  }
});

// @route   DELETE /api/testimonials/:id
// @desc    Delete a testimonial
// @access  Private/Admin
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.json({ message: 'Testimonial removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting testimonial' });
  }
});

module.exports = router;

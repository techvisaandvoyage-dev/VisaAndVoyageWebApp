const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id: String(id), role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

/**
 * @route   POST /api/admin/login
 * @desc    Auth admin & get token
 * @access  Public
 */
const loginAdmin = async (req, res) => {
  try {
    const email = String(req.body.email || req.body.identifier || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check for admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = typeof admin.comparePassword === 'function'
      ? await admin.comparePassword(password)
      : await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(admin._id),
      admin: {
        id: admin._id,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   PUT /api/admin/change-password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    // req.user is set by authMiddleware
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Verify current password
    const isMatch = typeof admin.comparePassword === 'function'
      ? await admin.comparePassword(currentPassword)
      : await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

    const savedAdmin = await Admin.findById(admin._id).select('password passwordChangedAt');
    const savedMatchesNewPassword = savedAdmin
      ? await bcrypt.compare(newPassword, savedAdmin.password)
      : false;

    if (!savedMatchesNewPassword) {
      return res.status(500).json({ success: false, message: 'Password update could not be verified' });
    }

    res.json({
      success: true,
      message: 'Password updated successfully',
      passwordChangedAt: savedAdmin.passwordChangedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  loginAdmin,
  changePassword
};

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Visitor = require('./models/Visitor');
  const User = require('./models/User');
  
  // Find a visitor with a userId
  const v = await Visitor.findOne({ userId: { $ne: null } }).sort({ lastActiveAt: -1 }).lean();
  console.log('Latest Registered Visitor:', v);
  
  if (v && v.userId) {
    const u = await User.findById(v.userId).lean();
    console.log('User:', u);
  }
  
  process.exit(0);
});

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("CRITICAL ERROR: MONGO_URI is missing from your environment variables!");
      console.error("Please configure MONGO_URI in your Hostinger Node.js Dashboard Environment Variables.");
      process.exit(1);
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
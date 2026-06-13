const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI environment variable is not set in .env');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB');

    const totalCount = await Admin.countDocuments();
    console.log(`Total Admins in DB: ${totalCount}`);

    const admins = await Admin.find().select('email role createdAt');
    console.log('\nAdmins in DB:');
    admins.forEach((admin, idx) => {
      console.log(`${idx + 1}. Email: ${admin.email} | Role: ${admin.role} | Created: ${admin.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();

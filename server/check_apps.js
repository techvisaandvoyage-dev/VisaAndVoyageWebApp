const mongoose = require('mongoose');
const Application = require('./models/Application');
require('dotenv').config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://techvisaandvoyage_db_user:0IiCsg1Ert3IxOFd@visaandvoyage.xkvpov1.mongodb.net/visaandvoyage';
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB');

    const totalCount = await Application.countDocuments();
    console.log(`Total Applications in DB: ${totalCount}`);

    const apps = await Application.find()
      .select('applicationId firstName lastName email countryName paymentStatus status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\nLast 10 Applications in DB:');
    apps.forEach((app, idx) => {
      console.log(`${idx + 1}. ID: ${app.applicationId || app._id} | Name: ${app.firstName} ${app.lastName} | Country: ${app.countryName} | Payment: ${app.paymentStatus} | Status: ${app.status} | Created: ${app.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();

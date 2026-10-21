const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Application = require('./models/Application');
const Visitor = require('./models/Visitor');
const Transaction = require('./models/Transaction');
const { getOrCreateSpreadsheet, initializeSheet } = require('./services/googleSheetsService'); // if we need it

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const users = await User.find({ email: /shyam/i });
    console.log('Found users:', users.map(u => u.email));

    for (const u of users) {
      console.log('Deleting data for:', u.email);
      // Delete applications
      await Application.deleteMany({ user: u._id });
      // Delete transactions
      await Transaction.deleteMany({ user: u._id });
      // Delete Visitor where userId matches
      await Visitor.deleteMany({ userId: u._id });
      // Delete User
      await User.deleteOne({ _id: u._id });
    }
    
    console.log('Done deleting!');
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

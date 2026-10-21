require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Visitor = require('./models/Visitor');
const Application = require('./models/Application');
const Transaction = require('./models/Transaction');

const wipeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Wiping all users...');
    await User.deleteMany({});
    
    console.log('Wiping all visitors...');
    await Visitor.deleteMany({});
    
    console.log('Wiping all applications...');
    await Application.deleteMany({});
    
    console.log('Wiping all transactions...');
    await Transaction.deleteMany({});
    
    console.log('Database wipe complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during wipe:', error);
    process.exit(1);
  }
};

wipeDatabase();

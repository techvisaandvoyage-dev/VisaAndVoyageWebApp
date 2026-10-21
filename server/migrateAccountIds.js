require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Counter = require('./models/Counter');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ accountId: { $exists: false } }).sort({ createdAt: 1 });
    console.log(`Found ${users.length} users missing accountId`);

    if (users.length === 0) {
      console.log('No users to migrate.');
      process.exit(0);
    }

    const ACCOUNT_ID_COUNTER = 'accountId';
    const ACCOUNT_ID_START = 500901;

    let counter = await Counter.findOne({ name: ACCOUNT_ID_COUNTER });
    if (!counter) {
      counter = await Counter.create({ name: ACCOUNT_ID_COUNTER, value: ACCOUNT_ID_START });
    } else if (counter.value < ACCOUNT_ID_START) {
      counter.value = ACCOUNT_ID_START;
      await counter.save();
    }

    let startVal = counter.value;

    for (const user of users) {
      user.accountId = startVal;
      await user.save({ validateBeforeSave: false }); // Avoid triggering other validations if older users are incomplete
      console.log(`Assigned ${startVal} to user ${user._id}`);
      startVal++;
    }

    counter.value = startVal;
    await counter.save();

    console.log(`Migration complete. Next accountId will be ${counter.value}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();

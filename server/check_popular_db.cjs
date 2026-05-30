const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const settingsColl = db.collection('settings');
    const doc = await settingsColl.findOne({ singleton: 'global' });
    console.log('Current popularCountries in DB:', doc.popularCountries);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();

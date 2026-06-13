const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  try {
    if (!MONGO_URI) {
      console.error('Error: MONGO_URI environment variable is not set in .env');
      process.exit(1);
    }
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const settingsColl = db.collection('settings');
    const settings = await settingsColl.findOne({});

    if (!settings) {
      console.log("No settings document found.");
    } else {
      console.log("Settings keys found:");
      const keys = Object.keys(settings);
      keys.forEach(k => {
        const val = settings[k];
        const type = typeof val;
        const length = val ? (val.length || (typeof val === 'object' ? Object.keys(val).length : 0)) : 0;
        console.log(`- ${k}: type=${type}, has_value=${!!val}, length/size=${length}`);
      });
      console.log("\nSpecific Firebase values:");
      console.log(`- firebaseStorageBucket: "${settings.firebaseStorageBucket || ''}"`);
      console.log(`- firebaseProjectId: "${settings.firebaseProjectId || ''}"`);
      console.log(`- firebaseApiKey: "${settings.firebaseApiKey ? '***' : ''}"`);
      console.log(`- firebaseServiceAccountJson length: ${settings.firebaseServiceAccountJson ? settings.firebaseServiceAccountJson.length : 0}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();

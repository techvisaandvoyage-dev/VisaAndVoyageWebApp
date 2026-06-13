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
      console.log("Settings overrides:", JSON.stringify(settings.documentCatalogOverrides || [], null, 2));
      console.log("Custom documents:", JSON.stringify(settings.customDocuments || [], null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();

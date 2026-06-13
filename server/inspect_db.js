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
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    for (const collInfo of collections) {
      const collName = collInfo.name;
      const count = await db.collection(collName).countDocuments();
      console.log(`\nCollection ${collName} has ${count} documents.`);
      
      if (collName === 'settings') {
        const docs = await db.collection(collName).find({}).toArray();
        docs.forEach((doc, idx) => {
          console.log(`  Document ${idx}: singleton="${doc.singleton}"`);
          console.log(`  - firebaseProjectId: "${doc.firebaseProjectId}"`);
          console.log(`  - firebaseStorageBucket: "${doc.firebaseStorageBucket}"`);
          console.log(`  - firebaseServiceAccountJson length: ${doc.firebaseServiceAccountJson ? doc.firebaseServiceAccountJson.length : 0}`);
        });
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();

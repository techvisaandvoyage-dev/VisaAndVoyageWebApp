const mongoose = require("mongoose");
const Application = require("./models/Application");
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set in .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    const apps = await Application.find({});
    console.log("Apps count:", apps.length);
    apps.forEach(a => {
      if (["paid", "completed", "success", "captured"].includes(a.paymentStatus)) {
        console.log(a.applicationId, "Payment:", a.paymentStatus, "Status:", a.status);
      }
    });
    process.exit(0);
  });

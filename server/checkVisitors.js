require('dotenv').config();
const mongoose = require('mongoose');
const Visitor = require('./models/Visitor');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const visitors = await Visitor.find().sort({ createdAt: -1 }).limit(5);
  console.log(JSON.stringify(visitors, null, 2));
  process.exit(0);
}
check();

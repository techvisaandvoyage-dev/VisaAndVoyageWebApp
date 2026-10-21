require('dotenv').config();
const mongoose = require('mongoose');
const Visitor = require('./models/Visitor');
const Application = require('./models/Application');
const User = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const visitors = await Visitor.find();
  const users = await User.find();
  const apps = await Application.find();
  
  console.log("VISITORS:", JSON.stringify(visitors, null, 2));
  console.log("USERS:", JSON.stringify(users, null, 2));
  console.log("APPS:", JSON.stringify(apps, null, 2));
  process.exit(0);
}
check();

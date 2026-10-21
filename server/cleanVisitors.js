const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const Visitor = require('./models/Visitor');
const Application = require('./models/Application');

async function clean() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Find all visitors who have an application
    const allAppUserIds = (await Application.find().select('user').lean())
      .map(a => a.user && a.user.toString()).filter(Boolean);
      
    // Delete any visitor that is purely anonymous (no userId) AND hasn't even reached 'Application Started' status
    const res = await Visitor.deleteMany({ 
      status: 'Active', 
      userId: { $exists: false } 
    });
    
    console.log(`Deleted ${res.deletedCount} pure anonymous visitors from DB.`);
    
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

clean();

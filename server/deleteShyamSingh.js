require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Visitor = require('./models/Visitor');
const Application = require('./models/Application');

const deleteShyamSingh = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find users named Shyam Singh
    const users = await User.find({ name: /shyam singh/i });
    if (users.length === 0) {
      console.log('No user named Shyam Singh found.');
    } else {
      for (const user of users) {
        console.log(`Deleting user: ${user.name} (${user._id})`);
        // Delete related applications
        const apps = await Application.find({ user: user._id });
        console.log(`Found ${apps.length} applications for user.`);
        await Application.deleteMany({ user: user._id });
        
        // Delete user
        await User.deleteOne({ _id: user._id });
        
        // Unlink or delete visitor
        await Visitor.deleteMany({ userId: user._id });
      }
    }
    
    // Also try to find any visitor that might have 'shyam singh' info? Visitors don't store name directly, but just in case, clean up any stray ones.
    
    console.log('Deletion complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteShyamSingh();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Application = require('./models/Application');
const Visitor = require('./models/Visitor');
const Transaction = require('./models/Transaction'); // assuming it exists

const emailsToRemove = ['yashrajsingh28359@gmail.com', 'shyamsingh7999464554@gmail.com'];

async function removeData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const email of emailsToRemove) {
      console.log(`Processing email: ${email}`);
      const user = await User.findOne({ email });

      if (user) {
        console.log(`Found user: ${user._id}`);
        
        const applications = await Application.find({ user: user._id });
        console.log(`Found ${applications.length} applications for user.`);
        
        for (const app of applications) {
           await Application.findByIdAndDelete(app._id);
           try {
             if (mongoose.models.Transaction) {
               await mongoose.models.Transaction.deleteMany({ application: app._id });
             }
           } catch (e) {
             // Transaction model might not exist or be different
           }
        }
        
        const deleteUserRes = await User.deleteOne({ _id: user._id });
        console.log(`Deleted user: ${deleteUserRes.deletedCount}`);

        const deleteVisitorRes = await Visitor.deleteMany({ userId: user._id });
        console.log(`Deleted visitors associated with user: ${deleteVisitorRes.deletedCount}`);
      } else {
        console.log(`User not found for email: ${email}`);
        
        // Maybe try to delete applications by email string if there is one?
        const appsByEmail = await Application.find({ email });
        console.log(`Found ${appsByEmail.length} applications by email field directly.`);
        for (const app of appsByEmail) {
           await Application.findByIdAndDelete(app._id);
        }
      }
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

removeData();

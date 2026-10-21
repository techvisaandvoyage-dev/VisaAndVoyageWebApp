const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  accountId: {
    type: Number,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  /** Optional handle for @mentions in blog comments (sparse, unique when set) */
  username: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 32,
    match: [/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores'],
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  age: {
    type: Number,
    min: 0
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  passportNumber: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  profileImage: {
    type: String // Path to uploaded image
  },
  password: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Skip strength validation for already hashed bcrypt strings
        if (typeof v === 'string' && v.startsWith('$2b$')) return true;
        
        // Strict Regex: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(v);
      },
      message: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character.'
    }
  },
  passwordManuallySet: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  firebaseUid: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  authProvider: {
    type: String,
    enum: ['password', 'google', 'facebook', 'phoneOtp', 'emailOtp', 'firebase'],
  },
  profileCompleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Auto-increment accountId
UserSchema.pre('save', async function () {
  if (this.isNew && !this.accountId) {
    try {
      const Counter = require('./Counter');
      const ACCOUNT_ID_COUNTER = 'accountId';
      const ACCOUNT_ID_START = 500901;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        let counter = await Counter.findOne({ name: ACCOUNT_ID_COUNTER });
        if (!counter) {
          try {
            counter = await Counter.create({
              name: ACCOUNT_ID_COUNTER,
              value: ACCOUNT_ID_START,
            });
            this.accountId = counter.value;
            return;
          } catch (err) {
            if (err.code === 11000 && attempt === 0) continue;
            throw err;
          }
        }

        if (counter.value < ACCOUNT_ID_START) {
          counter = await Counter.findOneAndUpdate(
            { name: ACCOUNT_ID_COUNTER },
            { $set: { value: ACCOUNT_ID_START } },
            { returnDocument: 'after' }
          );
          this.accountId = counter.value;
          return;
        }

        counter = await Counter.findOneAndUpdate(
          { name: ACCOUNT_ID_COUNTER },
          { $inc: { value: 1 } },
          { returnDocument: 'after' }
        );
        this.accountId = counter.value;
        return;
      }
    } catch (error) {
      console.error('Failed to generate accountId:', error);
      // Fallback if counter completely fails
      this.accountId = 500000 + Math.floor(Math.random() * 9000); 
    }
  }
});

UserSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  if (this.password.startsWith('$2b$')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);

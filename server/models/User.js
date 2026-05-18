const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // Prevents duplicate accounts
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String, 
    enum: ['Admin', 'Encoder', 'helper'], // Useful for your Kasambahay portal logic
    default: 'Encoder'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
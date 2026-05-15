const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
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
    enum: ['Admin', 'helper'], // Useful for your Kasambahay portal logic
    default: 'helper'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
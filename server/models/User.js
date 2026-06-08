const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Encoder', 'SPES', 'GIP', 'helper'],
    default: 'SPES'
},
  // Districts this user can access (empty = all, only enforced for Encoder/helper)
  assignedDistricts: {
    type: [String],
    default: []   // e.g. ['District 1', 'District 3']
  },
  // Years this user can access (empty = all, only enforced for Encoder/helper)
  assignedYears: {
    type: [Number],
    default: []   // e.g. [2024, 2025]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('User', UserSchema);

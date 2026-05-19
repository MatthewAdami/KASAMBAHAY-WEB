// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String }, // Store the name just in case the user account gets deleted later
  module: { type: String, required: true }, // e.g., 'Kasambahay', 'Users', 'System'
  action: { type: String, required: true }, // e.g., 'ADD', 'EDIT', 'DELETE'
  description: { type: String, required: true }, // e.g., 'Added Kasambahay Juan Dela Cruz'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);

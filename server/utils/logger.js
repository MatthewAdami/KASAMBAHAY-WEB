// utils/logger.js
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, userName, moduleName, action, description) => {
  try {
    await ActivityLog.create({
      user: userId,
      userName: userName,
      module: moduleName,
      action: action,
      description: description
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = { logActivity };

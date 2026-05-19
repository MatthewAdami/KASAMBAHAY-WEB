// routes/activityLogs.js
const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

// Make sure to import your existing authentication middleware
// const { verifyToken } = require('../middleware/auth'); 

// GET /api/activity-logs
router.get('/', /* verifyToken, */ async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch the logs, sorted by newest first
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email'); // optionally fetch user details

    const total = await ActivityLog.countDocuments();

    res.json({
      data: logs,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;

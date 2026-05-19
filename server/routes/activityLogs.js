const express = require('express')
const router  = express.Router()
const ActivityLog = require('../models/ActivityLog')
const { auth, requireRole } = require('../middleware')  // ← use your real middleware

router.get('/', auth, requireRole('Admin'), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit

    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .lean(),
      ActivityLog.countDocuments(),
    ])

    res.json({
      data: logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activity logs' })
  }
})

module.exports = router
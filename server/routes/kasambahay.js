const express = require('express')
const router  = express.Router()
const Kasambahay = require('../models/Kasambahay')
const jwt = require('jsonwebtoken')

// ─── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// ─── GET /api/kasambahay ──────────────────────────────────────────────────────
// All params are OPTIONAL — omit to get all records
//   year      e.g. 2024          (omit = all years)
//   district  e.g. 1             (omit = all districts)
//   page      default 1
//   limit     default 100, max 500
//   search    searches lastName, firstName, barangay
router.get('/', auth, async (req, res) => {
  try {
    const { year, district, search } = req.query
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(500, parseInt(req.query.limit) || 100)
    const skip  = (page - 1) * limit

    // Build filter — only add fields that were provided
    const filter = {}
    if (year)     filter.year     = parseInt(year)
    if (district) filter.district = { $in: [`District ${district}`, district.toString()] }

    // Optional text search
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i')
      filter.$or = [
        { lastName:  regex },
        { firstName: regex },
        { barangay:  regex },
        { mobileNumber: regex },
      ]
    }

    const [data, total] = await Promise.all([
      Kasambahay.find(filter)
        .sort({ district: 1, year: 1, lastName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Kasambahay.countDocuments(filter),
    ])

    res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── GET /api/kasambahay/stats ────────────────────────────────────────────────
// Returns totals per year+district — for dashboard overview cards
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Kasambahay.aggregate([
      {
        $group: {
          _id:   { year: '$year', district: '$district' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.district': 1 } },
    ])

    const total = await Kasambahay.countDocuments()
    res.json({ total, breakdown: stats })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── POST /api/kasambahay ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const kasambahayData = { ...req.body }
    
    // Format district to match "District X" database schema
    if (kasambahayData.district && !String(kasambahayData.district).startsWith('District')) {
      kasambahayData.district = `District ${kasambahayData.district}`
    }

    const newKasambahay = new Kasambahay(kasambahayData)
    await newKasambahay.save()
    res.status(201).json({ message: 'Kasambahay added successfully!', data: newKasambahay })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
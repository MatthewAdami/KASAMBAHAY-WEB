const express    = require('express')
const router     = express.Router()
const Kasambahay = require('../models/Kasambahay')
const User       = require('../models/User')
const { auth, requireRole } = require('../middleware')

// Helper: apply district/year restrictions based on user role + assignments
async function buildFilter(req, extraFilter = {}) {
  const filter = { ...extraFilter }

  // Encoders and helpers are restricted to their assigned districts/years
  if (req.user.role !== 'Admin') {
    const userDoc = await User.findById(req.user.id, 'assignedDistricts assignedYears')

    if (userDoc?.assignedDistricts?.length > 0) {
      filter.district = { $in: userDoc.assignedDistricts }
    }
    if (userDoc?.assignedYears?.length > 0) {
      filter.year = { $in: userDoc.assignedYears }
    }
  }

  return filter
}

// GET /api/kasambahay — All logged-in roles, filtered by assignment
router.get('/', auth, async (req, res) => {
  try {
    const { year, district, search, isDeleted } = req.query
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(500, parseInt(req.query.limit) || 100)
    const skip  = (page - 1) * limit

    // Start with query params filter
    const queryFilter = {}
    if (isDeleted === 'true') {
      queryFilter.isDeleted = true
    } else {
      queryFilter.isDeleted = { $ne: true }
    }
    if (year)     queryFilter.year     = parseInt(year)
    if (district) queryFilter.district = `District ${district}`
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i')
      queryFilter.$or = [{ lastName: regex }, { firstName: regex }, { barangay: regex }]
    }

    // Merge with role-based assignment restrictions
    const filter = await buildFilter(req, queryFilter)

    // If Encoder requested a district/year outside their assignment, return empty
    const [data, total] = await Promise.all([
      Kasambahay.find(filter)
        .sort({ district: 1, year: 1, lastName: 1 })
        .skip(skip).limit(limit).lean(),
      Kasambahay.countDocuments(filter),
    ])

    res.json({ data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/kasambahay/stats — filtered by assignment
router.get('/stats', auth, async (req, res) => {
  try {
    const filter = await buildFilter(req, { isDeleted: { $ne: true } })

    const stats = await Kasambahay.aggregate([
      { $match: filter },
      { $group: { _id: { year: '$year', district: '$district' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.district': 1 } },
    ])
    const total = await Kasambahay.countDocuments(filter)
    res.json({ total, breakdown: stats })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await Kasambahay.findById(req.params.id).lean()
    if (!record) return res.status(404).json({ message: 'Record not found.' })
    res.json(record)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create — Admin + Encoder
router.post('/', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const record = new Kasambahay(req.body)
    await record.save()
    res.status(201).json(record)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT — Restore (Admin only)
router.put('/:id/restore', auth, requireRole('Admin'), async (req, res) => {
  try {
    const restored = await Kasambahay.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null })
    if (!restored) return res.status(404).json({ message: 'Record not found.' })
    res.json({ message: 'Record restored.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update — Admin + Encoder
router.put('/:id', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const updated = await Kasambahay.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) return res.status(404).json({ message: 'Record not found.' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE — Permanent (Admin only)
router.delete('/:id/permanent', auth, requireRole('Admin'), async (req, res) => {
  try {
    const deleted = await Kasambahay.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Record not found.' })
    res.json({ message: 'Record permanently deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE — Soft Delete (Admin + Encoder)
router.delete('/:id', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const deleted = await Kasambahay.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() })
    if (!deleted) return res.status(404).json({ message: 'Record not found.' })
    res.json({ message: 'Record soft deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

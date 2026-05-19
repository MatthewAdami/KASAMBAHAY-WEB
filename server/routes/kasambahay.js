const express    = require('express')
const router     = express.Router()
const Kasambahay = require('../models/Kasambahay')
const User       = require('../models/User')
const { auth, requireRole } = require('../middleware')
const { logActivity } = require('../utils/logger');

// Helper: apply district/year restrictions based on user role + assignments
async function buildFilter(req, extraFilter = {}) {
  const filter = { ...extraFilter }

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

// ─── GET /api/kasambahay — All logged-in roles, filtered by assignment ─────────
router.get('/', auth, async (req, res) => {
  try {
    const { year, district, search, isDeleted } = req.query
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(500, parseInt(req.query.limit) || 100)
    const skip  = (page - 1) * limit

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

    const filter = await buildFilter(req, queryFilter)

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

// ─── GET /api/kasambahay/stats ─────────────────────────────────────────────────
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

// ─── POST /api/kasambahay/check-duplicate ─────────────────────────────────────
// Checks if a record with the same name already exists.
// Used before Add and Edit to warn the user before saving.
//
// Body: { firstName, lastName, middleName, district, year, excludeId? }
//   excludeId — pass the current record's _id when checking during an Edit
//               so the record doesn't flag itself as a duplicate.
//
// Response 200: { hasDuplicate: false }
// Response 200: { hasDuplicate: true, matches: [ ...records ] }
router.post('/check-duplicate', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const { firstName, lastName, middleName, district, year, excludeId } = req.body

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'firstName and lastName are required for duplicate check.' })
    }

    // Build a case-insensitive name match.
    // We match on firstName + lastName always.
    // middleName is optional — only included in the filter if provided,
    // so that "Juan dela Cruz" still flags "Juan C. dela Cruz" as a potential match.
    const nameFilter = {
      firstName:  new RegExp(`^${firstName.trim()}$`, 'i'),
      lastName:   new RegExp(`^${lastName.trim()}$`,  'i'),
      isDeleted:  { $ne: true },
    }

    // Scope to same district+year if provided (tighter match)
    if (district) nameFilter.district = `District ${district}`
    if (year)     nameFilter.year     = parseInt(year)

    // Exclude the record being edited (so it doesn't flag itself)
    if (excludeId) {
      nameFilter._id = { $ne: excludeId }
    }

    const matches = await Kasambahay.find(nameFilter)
      .select('firstName middleName lastName barangay district year birthday mobileNumber registrationNo')
      .limit(5)
      .lean()

    if (matches.length === 0) {
      return res.json({ hasDuplicate: false })
    }

    res.json({ hasDuplicate: true, matches })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── GET single record ────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await Kasambahay.findById(req.params.id).lean()
    if (!record) return res.status(404).json({ message: 'Record not found.' })
    res.json(record)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── POST create — Admin + Encoder ───────────────────────────────────────────
router.post('/', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const record = new Kasambahay(req.body)
    await record.save()
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'ADD', `Added new Kasambahay record for ${record.firstName} ${record.lastName}`)
    res.status(201).json(record)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── PUT restore — Admin only ─────────────────────────────────────────────────
router.put('/:id/restore', auth, requireRole('Admin'), async (req, res) => {
  try {
    const restored = await Kasambahay.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null })
    if (!restored) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'RESTORE', `Restored Kasambahay record for ${restored.firstName} ${restored.lastName}`)
    res.json({ message: 'Record restored.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── PUT update — Admin + Encoder ────────────────────────────────────────────
router.put('/:id', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const updated = await Kasambahay.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'EDIT', `Updated Kasambahay record for ${updated.firstName} ${updated.lastName}`)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── DELETE permanent — Admin only ────────────────────────────────────────────
router.delete('/:id/permanent', auth, requireRole('Admin'), async (req, res) => {
  try {
    const deleted = await Kasambahay.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'DELETE', `Permanently deleted Kasambahay record for ${deleted.firstName} ${deleted.lastName}`)
    res.json({ message: 'Record permanently deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── DELETE soft — Admin + Encoder ───────────────────────────────────────────
router.delete('/:id', auth, requireRole('Admin', 'Encoder'), async (req, res) => {
  try {
    const deleted = await Kasambahay.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() })
    if (!deleted) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'DELETE', `Soft deleted Kasambahay record for ${deleted.firstName} ${deleted.lastName}`)
    res.json({ message: 'Record soft deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

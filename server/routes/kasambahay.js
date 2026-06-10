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

    // ─── DEBUG: Log records with age 15 and below ────────────────────────────
    // const below15 = data.filter(rec => rec.age <= 15)
    // console.log(`\n🔍 DEBUG — Records with age 15 and below (${below15.length} found):`)
    // if (below15.length === 0) {
    //   console.log('  None found.')
    // } else {
    //   below15.forEach((rec, i) => {
    //     console.log(
    //       `  [${i + 1}] ${rec.lastName}, ${rec.firstName} ${rec.middleName ?? ''} | ` +
    //       `Age: ${rec.age} | District: ${rec.district} | Year: ${rec.year} | ` +
    //       `Barangay: ${rec.barangay} | ID: ${rec._id}`
    //     )
    //   })
    // }
    // console.log(`─────────────────────────────────────────────────────\n`)
    // ─── END DEBUG ───────────────────────────────────────────────────────────

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
router.post('/check-duplicate', auth, requireRole('Admin', 'SPES', 'GIP'), async (req, res) => {
  try {
    const { firstName, lastName, middleName, birthday, district, year, excludeId } = req.body

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'firstName and lastName are required for duplicate check.' })
    }

    const fullNameMatch = {
      firstName:  new RegExp(`^${firstName.trim()}$`, 'i'),
      lastName:   new RegExp(`^${lastName.trim()}$`,  'i'),
      isDeleted:  { $ne: true },
    }
    if (middleName?.trim()) {
      fullNameMatch.middleName = new RegExp(`^${middleName.trim()}$`, 'i')
    }

    const orConditions = [fullNameMatch]

    if (birthday) {
      const birthdayStart = new Date(birthday)
      birthdayStart.setHours(0, 0, 0, 0)
      const birthdayEnd = new Date(birthday)
      birthdayEnd.setHours(23, 59, 59, 999)
      orConditions.push({
        birthday: { $gte: birthdayStart, $lte: birthdayEnd },
        firstName: new RegExp(`^${firstName.trim()}$`, 'i'),
        isDeleted: { $ne: true },
      })
    }

    const nameFilter = {
      $or: orConditions,
      isDeleted: { $ne: true },
    }

    if (excludeId) {
      nameFilter._id = { $ne: excludeId }
    }

    const matches = await Kasambahay.find(nameFilter)
      .select('firstName middleName lastName barangay district year birthday mobileNumber registrationNo age civilStatus')
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

// ─── POST /api/kasambahay/bulk — Admin only ───────────────────────────────────
router.post('/bulk', auth, requireRole('Admin'), async (req, res) => {
  try {
    const { records } = req.body
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Request body must be an array of records.' })
    }

    const result = await Kasambahay.insertMany(records, { ordered: false })

    await logActivity(
      req.user.id,
      req.user.name || 'Unknown User',
      'Kasambahay',
      'ADD',
      `Bulk imported ${result.length} Kasambahay records.`
    )

    res.status(201).json({ message: `Successfully imported ${result.length} of ${records.length} records.`, insertedCount: result.length })
  } catch (err) {
    if (err.name === 'BulkWriteError') {
      const insertedCount = err.result.nInserted
      const failedCount = err.writeErrors.length
      await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'ADD', `Bulk import attempted. ${insertedCount} succeeded, ${failedCount} failed.`)
      return res.status(207).json({
        message: `Partial success. Imported ${insertedCount} records. ${failedCount} records failed due to validation errors.`,
        insertedCount: insertedCount,
        errors: err.writeErrors.map(e => ({ index: e.index, message: e.errmsg }))
      })
    }
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
router.post('/', auth, requireRole('Admin', 'SPES', 'GIP'), async (req, res) => {
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
    const restored = await Kasambahay.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: false, deletedAt: null } },
      { new: true }
    )
    if (!restored) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'RESTORE', `Restored Kasambahay record for ${restored.firstName} ${restored.lastName}`)
    res.json({ message: 'Record restored.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── PUT update — Admin + Encoder ────────────────────────────────────────────
router.put('/:id', auth, requireRole('Admin', 'SPES', 'GIP'), async (req, res) => {
  try {
    const old = await Kasambahay.findById(req.params.id).lean()
    if (!old) return res.status(404).json({ message: 'Record not found.' })

    const updated = await Kasambahay.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: false }
    )

    const skip = ['_id', '__v', 'createdAt', 'updatedAt', 'isDeleted', 'deletedAt']
    const changes = []
    for (const key of Object.keys(req.body)) {
      if (skip.includes(key)) continue
      const oldVal = old[key] ?? ''
      const newVal = req.body[key] ?? ''
      if (String(oldVal) !== String(newVal)) {
        changes.push(`${key}: "${oldVal}" → "${newVal}"`)
      }
    }

    const diffText = changes.length > 0
      ? `Changed: ${changes.join('; ')}`
      : 'No field changes detected'

    const description = `Updated Kasambahay record for ${updated.firstName} ${updated.lastName}. ${diffText}`
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'EDIT', description)

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
router.delete('/:id', auth, requireRole('Admin', 'SPES', 'GIP'), async (req, res) => {
  try {
    const deleted = await Kasambahay.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    )
    if (!deleted) return res.status(404).json({ message: 'Record not found.' })
    await logActivity(req.user.id, req.user.name || 'Unknown User', 'Kasambahay', 'DELETE', `Soft deleted Kasambahay record for ${deleted.firstName} ${deleted.lastName}`)
    res.json({ message: 'Record soft deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
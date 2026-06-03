/**
 * GET    /api/gip-profiles          — list (with search, batch, district, pagination)
 * GET    /api/gip-profiles/stats    — aggregate counts
 * GET    /api/gip-profiles/:id      — single record
 * POST   /api/gip-profiles          — create one
 * POST   /api/gip-profiles/bulk     — create many (JSON array)
 * POST   /api/gip-profiles/import   — import from uploaded Excel/CSV
 * PUT    /api/gip-profiles/:id      — replace
 * PATCH  /api/gip-profiles/:id      — partial update
 * DELETE /api/gip-profiles/:id      — delete one
 * DELETE /api/gip-profiles          — delete by batch (admin only)
 */

const router     = require('express').Router()
const multer     = require('multer')
const XLSX       = require('xlsx')
const GipProfile = require('../models/GipProfile')
const { protect, restrict } = require('../middleware/auth')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ── Helper: build filter from query params ────────────────────────────────────
function buildFilter(query) {
  const filter = {}
  if (query.batch)    filter.batch    = Number(query.batch)
  if (query.district) filter.district = Number(query.district)
  if (query.sex)      filter.sex      = new RegExp(`^${query.sex}$`, 'i')
  if (query.search) {
    const q = query.search.trim()
    filter.$or = [
      { name:              new RegExp(q, 'i') },
      { email:             new RegExp(q, 'i') },
      { barangay:          new RegExp(q, 'i') },
      { contact:           new RegExp(q, 'i') },
      { recommendedBy:     new RegExp(q, 'i') },
      { courseProgram:     new RegExp(q, 'i') },
      { assignedSpdOfficer:new RegExp(q, 'i') },
      { skills:            new RegExp(q, 'i') },
    ]
  }
  return filter
}

// ── GET /api/gip-profiles ─────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = buildFilter(req.query)
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(1000, parseInt(req.query.limit) || 0) // 0 = no limit

    let query = GipProfile.find(filter).sort({ batch: 1, name: 1 })
    if (limit > 0) query = query.skip((page - 1) * limit).limit(limit)

    const [data, total] = await Promise.all([
      query.lean(),
      GipProfile.countDocuments(filter),
    ])
    res.json({ data, total, page: limit > 0 ? page : 1 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/gip-profiles/stats ───────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = buildFilter(req.query)
    const agg = await GipProfile.aggregate([
      { $match: filter },
      {
        $group: {
          _id:    null,
          total:  { $sum: 1 },
          male:   { $sum: { $cond: [{ $regexMatch: { input: { $toLower: '$sex' }, regex: /^male$/ } }, 1, 0] } },
          female: { $sum: { $cond: [{ $regexMatch: { input: { $toLower: '$sex' }, regex: /^female$/ } }, 1, 0] } },
        },
      },
    ])

    const batchAgg = await GipProfile.aggregate([
      { $match: filter },
      { $group: { _id: '$batch', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    const batches = {}
    batchAgg.forEach(b => { batches[`batch${b._id}`] = b.count })

    res.json({ ...(agg[0] || { total: 0, male: 0, female: 0 }), ...batches, _id: undefined })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/gip-profiles/:id ─────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await GipProfile.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/gip-profiles ────────────────────────────────────────────────────
router.post('/', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await GipProfile.create(req.body)
    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── POST /api/gip-profiles/bulk ───────────────────────────────────────────────
router.post('/bulk', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Payload must be an array' })
    const docs = await GipProfile.insertMany(req.body, { ordered: false })
    res.status(201).json({ inserted: docs.length })
  } catch (err) {
    res.status(400).json({ error: err.message, inserted: err.result?.nInserted ?? 0 })
  }
})

// ── POST /api/gip-profiles/import (Excel / CSV upload) ───────────────────────
//
// Column mapping: headers must match the model field names or the friendly labels below.
const GIP_HEADER_MAP = {
  'Batch': 'batch', 'Name': 'name', 'Age': 'age', 'Sex': 'sex',
  'Contact': 'contact', 'Email': 'email', 'District': 'district',
  'Barangay': 'barangay', 'Education': 'educationalAttainment',
  'Educational Attainment': 'educationalAttainment',
  'Course/Program': 'courseProgram', 'Skills': 'skills',
  'SPD Officer': 'assignedSpdOfficer', 'Assigned SPD Officer': 'assignedSpdOfficer',
  'Recommended By': 'recommendedBy', 'Remarks': 'remarks',
}

router.post('/import', protect, restrict('admin', 'officer'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  try {
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const docs = rows.map(row => {
      const doc = {}
      for (const [header, val] of Object.entries(row)) {
        const key = GIP_HEADER_MAP[header] || header
        if (key === 'skills') {
          doc[key] = typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []
        } else {
          doc[key] = val === '' ? undefined : val
        }
      }
      return doc
    }).filter(d => d.batch)

    const result = await GipProfile.insertMany(docs, { ordered: false })
    res.status(201).json({ inserted: result.length, total: docs.length })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/gip-profiles/:id ─────────────────────────────────────────────────
router.put('/:id', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await GipProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PATCH /api/gip-profiles/:id ───────────────────────────────────────────────
router.patch('/:id', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await GipProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── DELETE /api/gip-profiles/:id ──────────────────────────────────────────────
router.delete('/:id', protect, restrict('admin'), async (req, res) => {
  try {
    const doc = await GipProfile.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    res.json({ message: 'Deleted', id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/gip-profiles?batch=1 (bulk delete by batch) ──────────────────
router.delete('/', protect, restrict('admin'), async (req, res) => {
  if (!req.query.batch) return res.status(400).json({ error: 'Batch query param required' })
  try {
    const result = await GipProfile.deleteMany({ batch: Number(req.query.batch) })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

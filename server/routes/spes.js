/**
 * GET    /api/spes-profiles          — list (search, batch, district, source, pagination)
 * GET    /api/spes-profiles/stats    — aggregate counts
 * GET    /api/spes-profiles/:id      — single record
 * POST   /api/spes-profiles          — create one
 * POST   /api/spes-profiles/bulk     — create many (JSON array)
 * POST   /api/spes-profiles/import   — import from uploaded Excel/CSV
 * PUT    /api/spes-profiles/:id      — replace
 * PATCH  /api/spes-profiles/:id      — partial update
 * DELETE /api/spes-profiles/:id      — delete one
 * DELETE /api/spes-profiles          — delete by batch (admin only)
 */

const router      = require('express').Router()
const multer      = require('multer')
const XLSX        = require('xlsx')
const SpesProfile = require('../models/SpesProfile')
const { protect, restrict } = require('../middleware/auth')
const { logActivity }        = require('../utils/logger')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ── Helper: build filter ──────────────────────────────────────────────────────
function buildFilter(query) {
  const filter = {}
  // isDeleted: default false (active records); pass ?deleted=true for soft-deleted
  filter.isDeleted = query.deleted === 'true'
  if (query.batch)    filter.batch    = Number(query.batch)
  if (query.district) filter.district = Number(query.district)
  if (query.source)   filter.source   = query.source
  if (query.sex)      filter.sex      = new RegExp(`^${query.sex}$`, 'i')
  if (query.search) {
    const q = query.search.trim()
    filter.$or = [
      { fullName:      new RegExp(q, 'i') },
      { lastName:      new RegExp(q, 'i') },
      { firstName:     new RegExp(q, 'i') },
      { email:         new RegExp(q, 'i') },
      { barangay:      new RegExp(q, 'i') },
      { contact:       new RegExp(q, 'i') },
      { courseProgram: new RegExp(q, 'i') },
      { recommendedBy: new RegExp(q, 'i') },
      { skills:        new RegExp(q, 'i') },
    ]
  }
  return filter
}

// ── GET /api/spes-profiles ────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = buildFilter(req.query)
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(1000, parseInt(req.query.limit) || 0)

    let query = SpesProfile.find(filter).sort({ batch: 1, fullName: 1 })
    if (limit > 0) query = query.skip((page - 1) * limit).limit(limit)

    const [data, total] = await Promise.all([
      query.lean(),
      SpesProfile.countDocuments(filter),
    ])
    res.json({ data, total, page: limit > 0 ? page : 1 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/spes-profiles/stats ──────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = buildFilter(req.query)
    const [agg, batchAgg, sourceAgg] = await Promise.all([
      SpesProfile.aggregate([
        { $match: filter },
        {
          $group: {
            _id:    null,
            total:  { $sum: 1 },
            male:   { $sum: { $cond: [{ $regexMatch: { input: { $toLower: '$sex' }, regex: /^male$/ } }, 1, 0] } },
            female: { $sum: { $cond: [{ $regexMatch: { input: { $toLower: '$sex' }, regex: /^female$/ } }, 1, 0] } },
          },
        },
      ]),
      SpesProfile.aggregate([
        { $match: filter },
        { $group: { _id: '$batch', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      SpesProfile.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ])

    const batches = {}
    batchAgg.forEach(b => { batches[`batch${b._id}`] = b.count })

    const sources = {}
    sourceAgg.forEach(s => { sources[s._id] = s.count })

    res.json({ ...(agg[0] || { total: 0, male: 0, female: 0 }), ...batches, sources, _id: undefined })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/spes-profiles/:id ────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await SpesProfile.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/spes-profiles ───────────────────────────────────────────────────
router.post('/', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await SpesProfile.create(req.body)
    await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'ADD',
      `Added SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    res.status(201).json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── POST /api/spes-profiles/bulk ──────────────────────────────────────────────
router.post('/bulk', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Payload must be an array' })
    const docs = await SpesProfile.insertMany(req.body, { ordered: false })
    res.status(201).json({ inserted: docs.length })
  } catch (err) {
    res.status(400).json({ error: err.message, inserted: err.result?.nInserted ?? 0 })
  }
})

// ── POST /api/spes-profiles/import ───────────────────────────────────────────
const SPES_HEADER_MAP = {
  'Batch': 'batch', 'Source': 'source', 'Full Name': 'fullName', 'Last Name': 'lastName',
  'First Name': 'firstName', 'Middle Name': 'middleName', 'Age': 'age', 'Sex': 'sex',
  'Birthday': 'birthday', 'Birth Place': 'birthPlace', 'Civil Status': 'civilStatus',
  'Contact': 'contact', 'Email': 'email', 'District': 'district', 'Barangay': 'barangay',
  'Present Address': 'presentAddress', 'Address': 'presentAddress',
  'Permanent Address': 'permanentAddress',
  'Education': 'educationalAttainment', 'Educational Attainment': 'educationalAttainment',
  'Course/Program': 'courseProgram', 'Skills': 'skills', 'Skills Acquired': 'skillsAcquired',
  'Father\'s Name': 'fathersName', 'Mother\'s Name': 'mothersName',
  'Recommended By': 'recommendedBy', 'Kasambahay Type': 'kasambahayType',
  'Desk Officer': 'deskOfficer', 'Remarks': 'remarks',
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
        const key = SPES_HEADER_MAP[header] || header
        if (key === 'skills' || key === 'skillsAcquired') {
          doc[key] = typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []
        } else {
          doc[key] = val === '' ? undefined : val
        }
      }
      // default source if missing
      if (!doc.source) doc.source = 'manual'
      return doc
    }).filter(d => d.batch)

    const result = await SpesProfile.insertMany(docs, { ordered: false })
    res.status(201).json({ inserted: result.length, total: docs.length })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/spes-profiles/:id ────────────────────────────────────────────────
router.put('/:id', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await SpesProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'EDIT',
      `Edited SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PATCH /api/spes-profiles/:id ──────────────────────────────────────────────
router.patch('/:id', protect, restrict('admin', 'officer'), async (req, res) => {
  try {
    const doc = await SpesProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    if (req.body.isDeleted === true) {
      await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'DELETE',
        `Soft deleted SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    } else if (req.body.isDeleted === false) {
      await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'RESTORE',
        `Restored SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    } else {
      await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'EDIT',
        `Updated SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    }
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── DELETE /api/spes-profiles/:id ─────────────────────────────────────────────
router.delete('/:id', protect, restrict('admin'), async (req, res) => {
  try {
    const doc = await SpesProfile.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Record not found' })
    await logActivity(req.user.id, req.user.name || req.user.id, 'SPES', 'DELETE',
      `Permanently deleted SPES record: ${doc.fullName || doc.firstName || 'Unknown'} (Batch ${doc.batch})`)
    res.json({ message: 'Deleted', id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/spes-profiles?batch=1 ────────────────────────────────────────
router.delete('/', protect, restrict('admin'), async (req, res) => {
  if (!req.query.batch) return res.status(400).json({ error: 'Batch query param required' })
  try {
    const result = await SpesProfile.deleteMany({ batch: Number(req.query.batch) })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

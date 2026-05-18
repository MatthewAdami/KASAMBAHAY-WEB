const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const User    = require('../models/User')
const { auth, requireRole } = require('../middleware')

// GET all users — Admin only
router.get('/', auth, requireRole('Admin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET own profile — used by frontend to get assignments
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, '-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create user — Admin only
router.post('/', auth, requireRole('Admin'), async (req, res) => {
  try {
    const { name, email, password, role, assignedDistricts, assignedYears } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email, and password are required.' })

    const validRoles = ['Admin', 'Encoder', 'helper']
    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: `Invalid role.` })

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing)
      return res.status(400).json({ message: 'A user with this email already exists.' })

    const hash = await bcrypt.hash(password, 10)
    const newUser = new User({
      name, email: email.toLowerCase(), password: hash,
      role: role || 'Encoder',
      assignedDistricts: assignedDistricts || [],
      assignedYears: assignedYears || [],
    })
    await newUser.save()
    const out = newUser.toObject(); delete out.password
    res.status(201).json(out)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update user — Admin only
router.put('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    const { name, role, password, assignedDistricts, assignedYears } = req.body
    const validRoles = ['Admin', 'Encoder', 'helper']
    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role.' })

    const update = {}
    if (name !== undefined) update.name = name
    if (role !== undefined) update.role = role
    if (assignedDistricts !== undefined) update.assignedDistricts = assignedDistricts
    if (assignedYears     !== undefined) update.assignedYears     = assignedYears
    if (password) update.password = await bcrypt.hash(password, 10)

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: '-password' })
    if (!updated) return res.status(404).json({ message: 'User not found.' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE user — Admin only, cannot delete self
router.delete('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id)
      return res.status(400).json({ message: 'You cannot delete your own account.' })
    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'User not found.' })
    res.json({ message: 'User deleted successfully.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const User    = require('../models/User')
const { auth, requireRole } = require('../middleware')
const { logActivity } = require('../utils/logger')  // ← ADD THIS

// GET all users — Admin only
router.get('/', auth, requireRole('Admin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET own profile
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

    const validRoles = ['Admin', 'SPES', 'GIP', 'helper']
    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role.' })

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing)
      return res.status(400).json({ message: 'A user with this email already exists.' })

    const hash = await bcrypt.hash(password, 10)
    const newUser = new User({
      name, email: email.toLowerCase(), password: hash,
      role: role || 'SPES',
      assignedDistricts: assignedDistricts || [],
      assignedYears: assignedYears || [],
    })
    await newUser.save()

    // ← LOG IT
    await logActivity(
      req.user.id,
      req.user.name || 'Unknown',
      'Users',
      'CREATE',
      `Created user account for ${newUser.name} (${newUser.email}) with role ${newUser.role}`
    )

    const out = newUser.toObject(); delete out.password
    res.status(201).json(out)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update user — Admin or Self
router.put('/:id', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin'
    const isSelf = req.user.id === req.params.id

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const { name, role, password, assignedDistricts, assignedYears } = req.body

    if (!isAdmin && (role !== undefined || assignedDistricts !== undefined || assignedYears !== undefined || name !== undefined)) {
      return res.status(403).json({ message: 'You only have permission to update your password.' })
    }

    const validRoles = ['Admin', 'SPES', 'GIP', 'helper']
    if (role && !validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role.' })

    const update = {}
    if (name !== undefined)              update.name              = name
    if (role !== undefined)              update.role              = role
    if (assignedDistricts !== undefined) update.assignedDistricts = assignedDistricts
    if (assignedYears     !== undefined) update.assignedYears     = assignedYears
    if (password) update.password = await bcrypt.hash(password, 10)

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: '-password' })
    if (!updated) return res.status(404).json({ message: 'User not found.' })

    // ← LOG IT
    const changes = []
    if (name)              changes.push(`name → ${name}`)
    if (role)              changes.push(`role → ${role}`)
    if (password)          changes.push('password changed')
    if (assignedDistricts) changes.push(`districts → ${assignedDistricts.join(', ') || 'all'}`)
    if (assignedYears)     changes.push(`years → ${assignedYears.join(', ') || 'all'}`)

    await logActivity(
      req.user.id,
      req.user.name || 'Unknown',
      'Users',
      'UPDATE',
      `Updated user account for ${updated.name} (${updated.email})${changes.length ? ': ' + changes.join('; ') : ''}`
    )

    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE user — Admin only
router.delete('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id)
      return res.status(400).json({ message: 'You cannot delete your own account.' })

    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'User not found.' })

    // ← LOG IT
    await logActivity(
      req.user.id,
      req.user.name || 'Unknown',
      'Users',
      'DELETE',
      `Deleted user account for ${deleted.name} (${deleted.email})`
    )

    res.json({ message: 'User deleted successfully.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
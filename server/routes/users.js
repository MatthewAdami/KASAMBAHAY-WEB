const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const User    = require('../models/User')
const { auth, requireRole } = require('../middleware')
const { logActivity } = require('../utils/logger')  // ← ADD THIS
const crypto = require('crypto')
const nodemailer = require('nodemailer')

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

// PUT update user — Admin only
router.put('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    const { name, role, password, assignedDistricts, assignedYears } = req.body
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

// POST send reset link — Admin only
router.post('/:id/send-reset-link', auth, requireRole('Admin'), async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ message: 'Server error: EMAIL_USER and EMAIL_PASS are not configured in the .env file.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // 2. Create the exact URL pointing to your frontend's new page (Local or Deployed)
    const clientUrl = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // 3. Send the email (ensure you have EMAIL_USER and EMAIL_PASS in your .env)
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      to: user.email,
      subject: 'Kasambahay System - Password Reset',
      html: `
        <h3>Password Reset Request</h3>
        <p>You or an admin requested a password reset for your account.</p>
        <p>Click the link below to set a new password. It will expire in 15 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#534AB7;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      `
    });
    
    // Log the action
    await logActivity(req.user.id, req.user.name || 'Unknown', 'Users', 'UPDATE', `Sent password reset link to ${user.name} (${user.email})`);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error sending email: ${error.message}` });
  }
});

module.exports = router
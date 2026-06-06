const express  = require('express')
const bcrypt   = require('bcrypt')
const jwt      = require('jsonwebtoken')
const User     = require('../models/User')
const crypto   = require('crypto')
const router   = express.Router()

// ─── LOGIN — email + password → JWT directly ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const email    = req.body.email?.toLowerCase().trim()
    const password = req.body.password

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' })

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid email or password.' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: err.message })
  }
})

// ─── RESET PASSWORD — update password using email token ──────────────────────
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body
    
    // Hash the token from the URL to compare it against the database
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() } // Ensure token hasn't expired
    })

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' })

    user.password = await bcrypt.hash(password, 10)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

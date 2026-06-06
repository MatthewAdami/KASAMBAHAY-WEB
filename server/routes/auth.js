const express  = require('express')
const bcrypt   = require('bcrypt')
const jwt      = require('jsonwebtoken')
const User     = require('../models/User')
const Setting  = require('../models/Setting')
const { auth, requireRole } = require('../middleware')
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

// ─── VERIFY SECURITY PASSWORD (Public) ───────────────────────────────────────
router.post('/verify-security', async (req, res) => {
  try {
    const { password } = req.body;
    const setting = await Setting.findOne({ key: 'security_password' });
    const storedSecPw = setting ? setting.value : '@Kasambahay_2026#';

    if (password === storedSecPw) {
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Incorrect security password.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE SECURITY PASSWORD (Admin Only) ───────────────────────────────────
router.put('/security-password', auth, requireRole('Admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });

    await Setting.findOneAndUpdate(
      { key: 'security_password' },
      { value: password },
      { upsert: true, new: true }
    );

    res.json({ message: 'Security password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router

const express      = require('express')
const bcrypt       = require('bcrypt')
const jwt          = require('jsonwebtoken')
const { Resend }   = require('resend')
const { Agent, fetch: undiciFetch } = require('undici')
const User         = require('../models/User')
const router       = express.Router()

// ─── IPv4-forced Resend client ────────────────────────────────────────────────
// Render blocks outbound SMTP (ports 25, 465, 587) and also blocks IPv6.
// Resend uses HTTPS (port 443) which Render allows — but we still need to
// pin to IPv4 to avoid the "connect ENETUNREACH <IPv6>" error.
const ipv4Agent = new Agent({ connect: { family: 4 } })

const resend = new Resend(process.env.RESEND_API_KEY, {
  fetch: (url, options) => undiciFetch(url, { ...options, dispatcher: ipv4Agent }),
})

console.log('✅ Resend client ready (IPv4-forced, from:', process.env.RESEND_FROM_EMAIL + ')')

// ─── OTP store (in-memory) ────────────────────────────────────────────────────
const otpStore = {}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOTPEmail(email, otp) {
  const { data, error } = await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL,
    to:      email,
    subject: 'Your Kasambahay Login OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0;">Kasambahay Management System</h2>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">
            You requested to sign in to your Kasambahay account. Use the code below to verify your identity:
          </p>
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: 700; color: #667eea; letter-spacing: 4px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 20px;">
            This code will expire in <strong>5 minutes</strong>.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('❌ Resend error:', error)
    throw new Error(error.message)
  }

  console.log('✅ OTP email sent to:', email, '| id:', data?.id)
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Step 1: Validate credentials → send OTP
router.post('/login', async (req, res) => {
  try {
    const email    = req.body.email?.toLowerCase().trim()
    const password = req.body.password

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' })

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid email or password' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })

    const otp       = generateOTP()
    const expiresAt = Date.now() + 5 * 60 * 1000

    otpStore[email] = { otp, expiresAt, userId: user._id.toString(), role: user.role }

    await sendOTPEmail(email, otp)

    res.json({
      message: 'OTP sent to your email. Please verify to continue.',
      email,
      requiresOTP: true,
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: err.message })
  }
})

// Step 2: Verify OTP → issue JWT
router.post('/verify-otp', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim()
    const otp   = req.body.otp

    if (!otpStore[email]) {
      return res.status(400).json({ message: 'OTP not found. Please login again.' })
    }

    const stored = otpStore[email]

    if (Date.now() > stored.expiresAt) {
      delete otpStore[email]
      return res.status(400).json({ message: 'OTP has expired. Please login again.' })
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' })
    }

    const user = await User.findById(stored.userId)
    if (!user) {
      delete otpStore[email]
      return res.status(400).json({ message: 'User not found.' })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    delete otpStore[email]

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
    console.error('Verify OTP error:', err)
    res.status(500).json({ message: err.message })
  }
})

// Optional: Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim()

    if (!otpStore[email]) {
      return res.status(400).json({ message: 'No active login session. Please login again.' })
    }

    const otp = generateOTP()
    otpStore[email].otp       = otp
    otpStore[email].expiresAt = Date.now() + 5 * 60 * 1000

    await sendOTPEmail(email, otp)

    res.json({ message: 'OTP resent to your email.' })
  } catch (err) {
    console.error('Resend OTP error:', err)
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

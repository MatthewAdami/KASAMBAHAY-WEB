const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const dns = require('dns')
const User = require('../models/User')
const router = express.Router()

// Prefer IPv4 for DNS lookups in environments where IPv6 is unreachable
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}

// Store OTPs in memory with expiration (in production, use Redis or DB)
const otpStore = {}

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  family: 4,
  secure: true,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback)
  },
})

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP transporter verification failed:', error)
  } else {
    console.log('SMTP transporter is ready')
  }
})

// Generate random OTP (6 digits)
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
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
  }

  try {
    return await transporter.sendMail(mailOptions)
  } catch (err) {
    console.error('Failed to send OTP email:', err)
    throw err
  }
}

// Step 1: Login with email and password, send OTP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid email or password' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    otpStore[email] = { otp, expiresAt, userId: user._id.toString(), role: user.role }

    // Send OTP email
    await sendOTPEmail(email, otp)

    res.json({
      message: 'OTP sent to your email. Please verify to continue.',
      email,
      requiresOTP: true,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Step 2: Verify OTP and issue JWT token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!otpStore[email]) {
      return res.status(400).json({ message: 'OTP not found. Please login again.' })
    }

    const stored = otpStore[email]

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      delete otpStore[email]
      return res.status(400).json({ message: 'OTP has expired. Please login again.' })
    }

    // Check if OTP matches
    if (stored.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' })
    }

    // Get user and issue token
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

    // Clean up OTP
    delete otpStore[email]

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Optional: Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body

    if (!otpStore[email]) {
      return res.status(400).json({ message: 'No active login session. Please login again.' })
    }

    const otp = generateOTP()
    otpStore[email].otp = otp
    otpStore[email].expiresAt = Date.now() + 5 * 60 * 1000

    await sendOTPEmail(email, otp)

    res.json({ message: 'OTP resent to your email.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
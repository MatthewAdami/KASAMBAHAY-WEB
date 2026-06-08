const jwt = require('jsonwebtoken')

// ─── Verify JWT token ─────────────────────────────────────────────────────────
const User = require('./models/User')

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token. Please log in.' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check tokenVersion against DB — kicks out old sessions
    const user = await User.findById(decoded.id).select('tokenVersion role')
    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    req.user = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

// ─── Require specific roles ───────────────────────────────────────────────────
// Usage: router.get('/secret', auth, requireRole('Admin'), handler)
// Usage: router.post('/data',  auth, requireRole('Admin', 'Encoder'), handler)
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated.' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
    })
  }
  next()
}

module.exports = { auth, requireRole }

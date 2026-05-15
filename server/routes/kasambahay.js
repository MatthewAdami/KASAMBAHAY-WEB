const express = require('express')
const router = express.Router()
const Kasambahay = require('../models/Kasambahay')
const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const { year, district } = req.query
    if (!year || !district) return res.status(400).json({ message: 'Year and district are required' })

    const data = await Kasambahay.find({
      year: parseInt(year),
      district: `District ${district}`
    }).sort({ lastName: 1 })

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
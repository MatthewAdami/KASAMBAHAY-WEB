const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: '../.env' })

const User = require('../models/User')

const users = [
  {
    name: 'Admin User',
    email: 'admin@kasambahay.com',
    password: 'admin123',
    role: 'Admin'
  },
  {
    name: 'Helper User',
    email: 'helper@kasambahay.com',
    password: 'helper123',
    role: 'helper'
  }
]

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    await User.deleteMany({})
    console.log('🗑️  Cleared existing users')

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10)
      await User.create({ ...user, password: hashedPassword })
      console.log(`✅ Created ${user.role}: ${user.email}`)
    }

    console.log('\n🌱 Seeding complete!')
    console.log('---------------------')
    console.log('Admin   → admin@kasambahay.com  / admin123')
    console.log('Helper  → helper@kasambahay.com / helper123')
    console.log('---------------------')

    process.exit(0)
  } catch (err) {
    console.error('❌ Seeder error:', err.message)
    process.exit(1)
  }
}

seed()
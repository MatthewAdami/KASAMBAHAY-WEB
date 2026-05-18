const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

if (process.env.NODE_ENV !== 'production') {
  const dns = require('dns');
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const app = express();
const authRoutes      = require('./routes/auth')
const kasambahayRoutes = require('./routes/kasambahay')
const userRoutes      = require('./routes/users')

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://kasambahay-web.vercel.app' // 💡 Ensure it's whitelisted here too!
  ],
  credentials: true,
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected: Kasambahay Database is ready!')
    
    // 🛠️ Auto-heal dirty district data (runs once on startup)
    const Kasambahay = require('./models/Kasambahay');
    Kasambahay.find({ district: { $in: ["1", "2", "3", "4", "5", "6"] } })
      .then(async (dirtyRecords) => {
        for (let record of dirtyRecords) {
          record.district = `District ${record.district}`;
          await record.save();
        }
        if (dirtyRecords.length > 0) console.log(`✅ Automatically fixed ${dirtyRecords.length} dirty district records!`);
      }).catch(err => console.error(err));
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Error:')
    console.error(err.message)
    console.log('\n👉 Check your MONGO_URI in server/.env')
  });

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Kasambahay API is running!'));
app.use('/api/auth',       authRoutes)
app.use('/api/kasambahay', kasambahayRoutes)
app.use('/api/users',      userRoutes)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message })
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   API ready at http://localhost:${PORT}/api`);
});

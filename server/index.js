const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
<<<<<<< HEAD
const dns = require('dns');

// Fix local DNS / IPv4 resolution issues if any exist
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// Route Imports
const authRoutes = require('./routes/auth');
const kasambahayRoutes = require('./routes/kasambahay');
const userRoutes = require('./routes/users');
=======
const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])
>>>>>>> b749e120009b047eacab0e2ac03b08bc9c5e5211

const app = express();
const authRoutes      = require('./routes/auth')
const kasambahayRoutes = require('./routes/kasambahay')
const userRoutes      = require('./routes/users')

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
<<<<<<< HEAD
  .then(() => {
    console.log('✅ MongoDB Connected: Kasambahay Database is ready!');
  })
  .catch((err) => {
    console.log('❌ MongoDB Connection Error Details:');
    console.error(err.message);
  });

// Test Route
app.get('/', (req, res) => {
  res.send('Kasambahay API is running!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kasambahay', kasambahayRoutes);
app.use('/api/users', userRoutes);

// Server Configuration
// process.env.PORT allows live hosting platforms (like Render) to assign a dynamic port
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
=======
  .then(() => console.log('✅ MongoDB Connected: Kasambahay Database is ready!'))
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
>>>>>>> b749e120009b047eacab0e2ac03b08bc9c5e5211

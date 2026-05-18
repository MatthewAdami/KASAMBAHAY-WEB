const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const dns = require('dns');

// Fix local DNS / IPv4 resolution issues if any exist
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// Route Imports
const authRoutes = require('./routes/auth');
const kasambahayRoutes = require('./routes/kasambahay');
const userRoutes = require('./routes/users');

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
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
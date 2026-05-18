const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const app = express();
const authRoutes = require('./routes/auth')
const kasambahayRoutes = require('./routes/kasambahay')
const userRoutes = require('./routes/users')

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
    console.error(err.message); // This shows the specific reason (like DNS or Password errors)
  });

// Test Route
app.get('/', (req, res) => {
  res.send('Kasambahay API is running!');
});
app.use('/api/auth', authRoutes)
app.use('/api/kasambahay', kasambahayRoutes)
app.use('/api/users', userRoutes)


// Server
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
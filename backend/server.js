/**
 * RoadReady Backend – Express + MongoDB Server
 * ─────────────────────────────────────────────
 * Start with:  npm run dev   (development, nodemon)
 *              npm start     (production)
 *
 * Environment variables are loaded from .env
 * Copy .env.example → .env and fill in your values before starting.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

// ── Connect to MongoDB ────────────────────────────────────────
connectDB();

// ── Express app setup ─────────────────────────────────────────
const app = express();

// Security: set common HTTP headers
app.use(helmet());

// CORS: allow requests from the React frontend (Vite dev server)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// HTTP request logger (concise in production, verbose in development)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Health check endpoint ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);

// ── 404 handler (must come after all routes) ──────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} — route not found`,
  });
});

// ── Centralised error handler (must be last) ──────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('  🚗  RoadReady Backend');
  console.log(`  🌍  Running at:  http://localhost:${PORT}`);
  console.log(`  ❤️   Health:      http://localhost:${PORT}/api/health`);
  console.log(`  📦  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});

module.exports = app;

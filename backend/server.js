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
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');

const errorHandler = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// ── Connect to MongoDB ────────────────────────────────────────
connectDB();

// ── Express app setup ─────────────────────────────────────────
const app = express();

// Trust reverse proxies (Render, Vercel, Railway, AWS, Heroku)
app.set('trust proxy', 1);

// Security: set common HTTP headers
app.use(helmet());

// CORS: allow requests from React frontend (Vite dev server, mobile LAN IP, or deployed URL)
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser, server-to-server, or mobile tools
  if (process.env.CLIENT_ORIGIN) {
    const allowedList = process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
    if (allowedList.includes('*') || allowedList.includes(origin)) return true;
  }
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, origin); // Fallback allow origin with credentials support
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// HTTP request logger (concise in production, verbose in development)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Parse cookies (signed with JWT_SECRET for PKCE OAuth security)
app.use(cookieParser(process.env.JWT_SECRET || 'roadready_oauth_cookie_secret'));

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));


// ── Root & Health check endpoints ─────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'RoadReady Vehicle Rental API',
    status: 'online',
    health: '/api/health',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

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
app.use('/api/weather', weatherRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/payments', paymentRoutes);

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
if (require.main === module) {
  const PORT = parseInt(process.env.PORT, 10) || 5000;

  app.listen(PORT, () => {
    console.log('');
    console.log('  🚗  RoadReady Backend');
    console.log(`  🌍  Running at:  http://localhost:${PORT}`);
    console.log(`  ❤️   Health:      http://localhost:${PORT}/api/health`);
    console.log(`  📦  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
  });
}

module.exports = app;

const express = require('express');
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/bookingController');

const { protect, requireRole } = require('../middleware/auth');

// All booking operations require an authenticated user
router.use(protect);

// POST   /api/bookings          — Create a new booking
router.post('/', createBooking);

// GET    /api/bookings/my       — Get current user's bookings
router.get('/my', getMyBookings);

// GET    /api/bookings          — Staff / Admin: view all bookings
router.get('/', requireRole('admin', 'staff'), getAllBookings);

// GET    /api/bookings/:id      — Get single booking by ID or booking number
router.get('/:id', getBookingById);

// PATCH  /api/bookings/:id/cancel — Cancel booking by ID or booking number
router.patch('/:id/cancel', cancelBooking);

module.exports = router;

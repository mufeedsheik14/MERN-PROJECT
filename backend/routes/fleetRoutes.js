const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleetController');
const { protect, requireRole } = require('../middleware/auth');

/**
 * @route   POST /api/fleet/location
 * @desc    Record a real-time GPS telemetry ping from mobile device
 * @access  Private (Authenticated users / Staff / Drivers)
 */
router.post('/location', protect, fleetController.recordLocation);

/**
 * @route   GET /api/fleet/live-locations
 * @desc    Get the latest GPS location for all tracked vehicles
 * @access  Private (Staff / Admin only)
 */
router.get(
  '/live-locations',
  protect,
  requireRole('admin', 'staff'),
  fleetController.getLiveLocations
);

/**
 * @route   GET /api/fleet/location/:vehicleId
 * @desc    Get current location and recent breadcrumb history for a specific vehicle
 * @access  Private (Staff / Admin only)
 */
router.get(
  '/location/:vehicleId',
  protect,
  requireRole('admin', 'staff'),
  fleetController.getVehicleLocation
);

module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getVehicles,
  getVehicleById,
  createVehicle, vehicleRules,
  updateVehicle,
  deleteVehicle,
  seedVehicles,
} = require('../controllers/vehicleController');

const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// GET  /api/vehicles        — Public: list vehicles with filters
router.get('/', getVehicles);

// GET  /api/vehicles/:id    — Public: get single vehicle by int_Vehicle_Id
// Note: :id must be defined BEFORE /seed so 'seed' isn't treated as an id
router.get('/:id', getVehicleById);

// POST /api/vehicles/seed   — Dev only: seed DB with all 15 mock vehicles
router.post('/seed', seedVehicles);

// POST /api/vehicles        — Admin/Staff: create vehicle
router.post('/', protect, requireRole('admin', 'staff'), vehicleRules, validate, createVehicle);

// PUT  /api/vehicles/:id    — Admin/Staff: update vehicle
router.put('/:id', protect, requireRole('admin', 'staff'), updateVehicle);

// DELETE /api/vehicles/:id  — Admin only: delete vehicle
router.delete('/:id', protect, requireRole('admin'), deleteVehicle);

module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserByUsername,
  createStaff, createStaffRules,
  updateStaff, updateStaffRules,
  updateStaffStatus,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/userController');

const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All user management routes require authentication
router.use(protect);

// GET  /api/users          — Admin only: list all users
router.get('/', requireRole('admin'), getAllUsers);

// GET  /api/users/:username — Admin/Staff: get user by username (Staff restricted to self)
router.get('/:username', requireRole('admin', 'staff'), getUserByUsername);

// POST /api/users/staff    — Admin only: create a staff account
router.post('/staff', requireRole('admin'), createStaffRules, validate, createStaff);

// PUT  /api/users/staff/:username — Admin only: update staff personal info
router.put('/staff/:username', requireRole('admin'), updateStaffRules, validate, updateStaff);

// PATCH /api/users/staff/:username/status — Admin only: update/approve staff status
router.patch('/staff/:username/status', requireRole('admin'), updateStaffStatus);

// PATCH /api/users/:username/toggle — Admin only: activate/deactivate
router.patch('/:username/toggle', requireRole('admin'), toggleUserStatus);

// DELETE /api/users/:username — Admin only: permanently delete user
router.delete('/:username', requireRole('admin'), deleteUser);

module.exports = router;

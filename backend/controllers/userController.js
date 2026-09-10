const { body } = require('express-validator');
const User = require('../models/User');

// ── Validation rules ──────────────────────────────────────────────────────────

const createStaffRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

  body('name').trim().notEmpty().withMessage('Name is required'),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('int_Branch_Id')
    .notEmpty().withMessage('Branch is required')
    .isInt({ min: 1 }).withMessage('Branch must be a positive integer'),

  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('phone').optional().trim()
    .matches(/^(\d{10})?$/).withMessage('Phone must be 10 digits or empty'),
];

// ── Controller functions ──────────────────────────────────────────────────────

/**
 * GET /api/users
 * Admin only — list all users, optionally filtered by role.
 * Query params: ?role=customer|staff|admin&active=true|false&search=text
 */
const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: regex },
        { name: regex },
        { email: regex },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:username
 * Admin/Staff — get a single user by username.
 */
const getUserByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${req.params.username}' not found`,
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff
 * Admin only — create a new staff account with a branch assignment.
 */
const createStaff = async (req, res, next) => {
  try {
    const { username, name, email, phone, password, int_Branch_Id } = req.body;

    const existing = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    const staff = await User.create({
      username: username.trim(),
      password,
      name: name.trim(),
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      role: 'staff',
      int_Branch_Id: Number(int_Branch_Id),
      authProvider: 'local',
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created',
      user: staff.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:username/toggle
 * Admin only — toggle a user's active status (activate / deactivate).
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${req.params.username}' not found`,
      });
    }

    // Prevent admin from deactivating themselves
    if (user.username === req.user.username) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    user.active = !user.active;
    await user.save();

    res.json({
      success: true,
      message: `User '${user.username}' has been ${user.active ? 'activated' : 'deactivated'}`,
      user: user.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:username
 * Admin only — permanently delete a user account.
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.username.toLowerCase() === req.user.username) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findOneAndDelete({
      username: req.params.username.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${req.params.username}' not found`,
      });
    }

    res.json({
      success: true,
      message: `User '${req.params.username}' has been permanently deleted`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserByUsername,
  createStaff,
  createStaffRules,
  toggleUserStatus,
  deleteUser,
};

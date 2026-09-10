const { body } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// ── Validation rule sets ──────────────────────────────────────────────────────

/**
 * Rules for POST /api/auth/register
 */
const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/**
 * Rules for POST /api/auth/login
 */
const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Rules for PUT /api/auth/me (profile update)
 */
const updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('phone').optional().trim()
    .matches(/^(\d{10})?$/).withMessage('Phone must be 10 digits or empty'),
  body('pincode').optional().trim()
    .matches(/^(\d{6})?$/).withMessage('Pincode must be 6 digits or empty'),
];

// ── Controller functions ──────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Customer self-registration. Creates a new user with role=customer.
 */
const register = async (req, res, next) => {
  try {
    const { username, name, email, phone, password } = req.body;

    // Check for duplicate username (case-insensitive)
    const existingUsername = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    // Check for duplicate email
    const existingEmail = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const newUser = await User.create({
      username: username.trim(),
      password,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: 'customer',
      authProvider: 'local',
    });

    const token = generateToken({
      id: newUser._id,
      username: newUser.username,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: newUser.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Username + password login. Returns JWT on success.
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Explicitly select password (it's excluded by default via select: false)
    const user = await User.findOne({
      username: username.toLowerCase().trim(),
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (JWT required).
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is already set by the protect middleware
    res.json({
      success: true,
      user: req.user.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/me
 * Updates the authenticated user's own profile.
 * Username and role cannot be changed via this endpoint.
 */
const updateMe = async (req, res, next) => {
  try {
    // Fields a user is allowed to update on their own profile
    const allowedFields = [
      'name', 'email', 'phone',
      'address', 'addressLine2',
      'city', 'state', 'pincode', 'country',
      'avatar',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  registerRules,
  login,
  loginRules,
  getMe,
  updateMe,
  updateProfileRules,
};

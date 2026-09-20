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
  body('emergencyContactPhone').optional().trim()
    .matches(/^(\d{10})?$/).withMessage('Emergency contact phone must be 10 digits or empty'),
  body('accountStatus').optional().isIn(['Active', 'Pending Approval', 'Deactivated']).withMessage('Invalid account status'),
];

const updateStaffRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('phone').optional().trim()
    .matches(/^(\d{10})?$/).withMessage('Phone must be 10 digits or empty'),
  body('emergencyContactPhone').optional().trim()
    .matches(/^(\d{10})?$/).withMessage('Emergency contact phone must be 10 digits or empty'),
  body('int_Branch_Id').optional().isInt({ min: 1 }).withMessage('Branch must be a positive integer'),
  body('accountStatus').optional().isIn(['Active', 'Pending Approval', 'Deactivated']).withMessage('Invalid account status'),
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
        { employeeId: regex },
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
 * Admin: get any user by username
 * Staff: get ONLY own user document (strictly blocked from viewing other staff or admin)
 * Customer: blocked by route middleware
 */
const getUserByUsername = async (req, res, next) => {
  try {
    const requestedUsername = req.params.username.toLowerCase();

    // Customers must never access staff personal information
    if (req.user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied — customer cannot access user profile information',
      });
    }

    const user = await User.findOne({
      username: requestedUsername,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${req.params.username}' not found`,
      });
    }

    // RBAC: Staff can view ONLY their own personal information
    if (req.user.role === 'staff') {
      if (user.username.toLowerCase() !== req.user.username.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Access denied — staff members can only view their own personal information",
        });
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff
 * Admin only — create a new staff account with personal details and branch assignment.
 */
const createStaff = async (req, res, next) => {
  try {
    const {
      username,
      name,
      email,
      phone,
      password,
      int_Branch_Id,
      employeeId,
      address,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      accountStatus,
    } = req.body;

    const existing = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    // Auto-generate employeeId if omitted
    const assignedEmployeeId = employeeId?.trim() || `EMP-${Date.now().toString().slice(-4)}`;
    const status = accountStatus || 'Active';

    const staff = await User.create({
      username: username.trim(),
      password,
      name: name.trim(),
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      role: 'staff',
      int_Branch_Id: Number(int_Branch_Id),
      employeeId: assignedEmployeeId,
      address: address?.trim() || '',
      dateOfBirth: dateOfBirth?.trim() || '',
      emergencyContactName: emergencyContactName?.trim() || '',
      emergencyContactPhone: emergencyContactPhone?.trim() || '',
      accountStatus: status,
      active: status === 'Active',
      authProvider: 'local',
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      user: staff.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/staff/:username
 * Admin only — update a staff member's personal information, branch assignment, or status.
 */
const updateStaff = async (req, res, next) => {
  try {
    const targetUsername = req.params.username.toLowerCase().trim();
    const staff = await User.findOne({ username: targetUsername, role: 'staff' });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: `Staff account '${req.params.username}' not found`,
      });
    }

    const updatableFields = [
      'name',
      'email',
      'phone',
      'address',
      'employeeId',
      'dateOfBirth',
      'emergencyContactName',
      'emergencyContactPhone',
      'int_Branch_Id',
      'accountStatus',
      'active',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'int_Branch_Id') {
          staff.int_Branch_Id = Number(req.body.int_Branch_Id);
        } else if (typeof req.body[field] === 'string') {
          staff[field] = req.body[field].trim();
        } else {
          staff[field] = req.body[field];
        }
      }
    });

    if (req.body.accountStatus) {
      staff.active = req.body.accountStatus === 'Active';
    } else if (req.body.active !== undefined) {
      staff.accountStatus = req.body.active ? 'Active' : 'Deactivated';
    }

    await staff.save();

    res.json({
      success: true,
      message: `Staff '${staff.username}' updated successfully`,
      user: staff.toSessionObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/staff/:username/status
 * Admin only — set staff account status ('Active', 'Pending Approval', 'Deactivated') / approve staff.
 */
const updateStaffStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Pending Approval', 'Deactivated'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active, Pending Approval, or Deactivated',
      });
    }

    const targetUsername = req.params.username.toLowerCase().trim();
    const staff = await User.findOne({ username: targetUsername, role: 'staff' });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: `Staff account '${req.params.username}' not found`,
      });
    }

    staff.accountStatus = status;
    staff.active = status === 'Active';
    await staff.save();

    res.json({
      success: true,
      message: `Staff '${staff.username}' status set to ${status}`,
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
    user.accountStatus = user.active ? 'Active' : 'Deactivated';
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
  updateStaff,
  updateStaffRules,
  updateStaffStatus,
  toggleUserStatus,
  deleteUser,
};

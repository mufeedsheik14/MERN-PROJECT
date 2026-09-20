const express = require('express');
const router = express.Router();

const {
  register, registerRules,
  login, loginRules,
  getMe,
  updateMe, updateProfileRules,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
// POST /api/auth/register  — Customer self-registration
router.post('/register', registerRules, validate, register);

// POST /api/auth/login  — Login with username + password
router.post('/login', loginRules, validate, login);

// GET  /api/auth/me  — Get own profile (JWT required)
router.get('/me', protect, getMe);

// PUT  /api/auth/me  — Update own profile (JWT required)
router.put('/me', protect, updateProfileRules, validate, updateMe);

module.exports = router;

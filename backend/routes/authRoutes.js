const express = require('express');
const router = express.Router();

const {
  register, registerRules,
  login, loginRules,
  getMe,
  updateMe, updateProfileRules,
} = require('../controllers/authController');
const {
  getGoogleAuthStatus,
  initiateGoogleAuth,
  handleGoogleCallback,
} = require('../controllers/googleAuthController');
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

// ── Google OAuth 2.0 (Authorization Code Flow with PKCE & OpenID Connect) ──
// GET  /api/auth/google/status    — Check if Google OAuth is configured
router.get('/google/status', getGoogleAuthStatus);

// GET  /api/auth/google           — Start OAuth PKCE flow & redirect to Google consent
router.get('/google', initiateGoogleAuth);

// GET  /api/auth/google/callback  — OAuth callback: validate PKCE, exchange token, link/login user
router.get('/google/callback', handleGoogleCallback);

module.exports = router;


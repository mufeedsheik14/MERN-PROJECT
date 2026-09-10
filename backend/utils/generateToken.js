const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's _id, username, and role.
 * Expiry is controlled by JWT_EXPIRES_IN env var (default: 7d).
 *
 * @param {Object} payload - { id, username, role }
 * @returns {string} Signed JWT string
 */
const generateToken = ({ id, username, role }) => {
  return jwt.sign(
    { id, username, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;

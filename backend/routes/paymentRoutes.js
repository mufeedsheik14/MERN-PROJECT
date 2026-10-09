const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  recordPaymentFailure,
  getPaymentConfig,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public config endpoint: returns only public Key ID (never secret)
router.get('/config', getPaymentConfig);

// All payment transactions require authenticated user
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/failure', protect, recordPaymentFailure);

module.exports = router;

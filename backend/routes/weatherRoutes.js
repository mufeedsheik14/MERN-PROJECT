const express = require('express');
const router = express.Router();
const { getDestinationWeather } = require('../controllers/weatherController');

// GET /api/weather?city=<destination>
router.get('/', getDestinationWeather);

module.exports = router;

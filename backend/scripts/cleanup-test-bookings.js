const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Booking.deleteMany({
    int_Vehicle_Id: 101,
    dte_Pickup_Date: { $in: ['2026-10-05', '2026-10-06', '2026-10-15'] },
  });
  console.log('Cleaned up test records:', res.deletedCount);
  await mongoose.disconnect();
}

clean().catch(console.error);

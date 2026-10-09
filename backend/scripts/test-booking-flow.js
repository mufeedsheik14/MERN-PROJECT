const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config();

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

async function runTests() {
  console.log('--- Starting MongoDB Booking & Cancellation Tests ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Fetch test customer
  const customer = await User.findOne({ username: 'customer1' });
  if (!customer) throw new Error('Customer1 not found in DB');
  console.log(`Found test customer: ${customer.name} (@${customer.username}, ID: ${customer._id})`);

  // Generate JWT for test customer
  const token = jwt.sign(
    { id: customer._id, role: customer.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Generate JWT for customer2 (to test unauthorized cancel)
  const customer2 = await User.findOne({ username: 'customer2' });
  const token2 = jwt.sign(
    { id: customer2._id, role: customer2.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. Fetch vehicle #101
  const vehicle = await Vehicle.findOne({ int_Vehicle_Id: 101 });
  if (!vehicle) throw new Error('Vehicle 101 not found in DB');
  console.log(`Found test vehicle: ${vehicle.txt_Model_Name} (Rent: ₹${vehicle.dbl_Daily_Rent}/day)`);

  // Clean up any old test bookings for these test dates
  await Booking.deleteMany({
    int_Vehicle_Id: 101,
    dte_Pickup_Date: { $in: ['2026-10-05', '2026-10-06', '2026-10-15'] },
  });

  // Start temporary Express server to test real HTTP endpoints
  const app = require('../server');
  const http = require('http');
  const server = http.createServer(app);
  const testPort = 5099;

  await new Promise((resolve) => server.listen(testPort, resolve));
  console.log(`Test server running on port ${testPort}`);

  const baseUrl = `http://localhost:${testPort}/api/bookings`;

  try {
    // TEST 1: Create booking with valid dates, add-on, coupon
    console.log('\n[TEST 1] Create Booking via POST /api/bookings');
    const res1 = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        int_Vehicle_Id: 101,
        pickupDate: '2026-10-05',
        returnDate: '2026-10-08', // 3 days
        pickupBranch: 1,
        dropBranch: 1,
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
        addons: { insurance: true }, // +299/day
        couponCode: 'FIRST10', // 10% discount
      }),
    });

    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Created Booking #:', data1.booking?.txt_Booking_Number);
    console.log('Booking Status:', data1.booking?.status, `(ID: ${data1.booking?.int_Booking_Status_Id})`);
    console.log('Net Amount:', data1.booking?.dbl_Net_Amount);

    if (res1.status !== 201 || !data1.booking) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(data1)}`);
    }

    const booking1 = data1.booking;

    // Verify in MongoDB
    const docInDb = await Booking.findOne({ txt_Booking_Number: booking1.txt_Booking_Number });
    if (!docInDb) throw new Error('Booking was not found in MongoDB!');
    console.log('✅ TEST 1 PASSED: Booking saved and verified in MongoDB.');

    // TEST 2: Overlapping booking prevention
    console.log('\n[TEST 2] Double-booking prevention for overlapping dates (2026-10-06 to 2026-10-09)');
    const res2 = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        int_Vehicle_Id: 101,
        pickupDate: '2026-10-06',
        returnDate: '2026-10-09',
        pickupBranch: 1,
      }),
    });

    const data2 = await res2.json();
    console.log('Status (expected 409):', res2.status);
    console.log('Rejection Message:', data2.message);
    if (res2.status !== 409) {
      throw new Error(`Test 2 Failed: Expected 409 Conflict but got ${res2.status}`);
    }
    console.log('✅ TEST 2 PASSED: Overlapping booking blocked with 409 Conflict.');

    // TEST 3: Non-overlapping booking succeeds
    console.log('\n[TEST 3] Non-overlapping booking for future dates (2026-10-15 to 2026-10-18)');
    const res3 = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        int_Vehicle_Id: 101,
        pickupDate: '2026-10-15',
        returnDate: '2026-10-18',
        pickupBranch: 1,
      }),
    });

    const data3 = await res3.json();
    console.log('Status (expected 201):', res3.status);
    console.log('Created Booking #:', data3.booking?.txt_Booking_Number);
    if (res3.status !== 201) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(data3)}`);
    }
    console.log('✅ TEST 3 PASSED: Non-overlapping booking created successfully.');

    // TEST 4: Fetch user bookings via GET /api/bookings/my
    console.log('\n[TEST 4] Fetch customer reservations via GET /api/bookings/my');
    const res4 = await fetch(`${baseUrl}/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status);
    console.log('Total bookings returned for customer1:', data4.count);
    const found1 = data4.bookings.find((b) => b.txt_Booking_Number === booking1.txt_Booking_Number);
    if (!found1) throw new Error('Test 4 Failed: booking1 not found in customer bookings');
    console.log('✅ TEST 4 PASSED: Customer reservations retrieved from MongoDB.');

    // TEST 5: Unauthorized cancellation attempt by customer2
    console.log('\n[TEST 5] Unauthorized cancellation attempt by another customer');
    const res5 = await fetch(`${baseUrl}/${booking1.txt_Booking_Number}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({ reason: 'Malicious cancel' }),
    });
    console.log('Status (expected 403):', res5.status);
    if (res5.status !== 403) {
      throw new Error(`Test 5 Failed: Expected 403 Forbidden but got ${res5.status}`);
    }
    console.log('✅ TEST 5 PASSED: Unauthorized cancellation blocked.');

    // TEST 6: Authorized cancellation by owner
    console.log('\n[TEST 6] Cancel booking via PATCH /api/bookings/:id/cancel');
    const res6 = await fetch(`${baseUrl}/${booking1.txt_Booking_Number}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: 'Trip rescheduled' }),
    });
    const data6 = await res6.json();
    console.log('Status (expected 200):', res6.status);
    console.log('Updated Status:', data6.booking?.status, `(ID: ${data6.booking?.int_Booking_Status_Id})`);
    console.log('Cancelled At:', data6.booking?.cancelledAt);

    if (res6.status !== 200 || data6.booking?.status !== 'cancelled' || data6.booking?.int_Booking_Status_Id !== 5) {
      throw new Error(`Test 6 Failed: ${JSON.stringify(data6)}`);
    }

    // Verify in MongoDB directly
    const cancelledDbDoc = await Booking.findOne({ txt_Booking_Number: booking1.txt_Booking_Number });
    if (cancelledDbDoc.status !== 'cancelled' || cancelledDbDoc.int_Booking_Status_Id !== 5) {
      throw new Error('Test 6 Failed: MongoDB doc status not cancelled');
    }
    console.log('✅ TEST 6 PASSED: Booking cancelled and updated in MongoDB.');

    // TEST 7: Attempt to cancel already cancelled booking
    console.log('\n[TEST 7] Cancel already cancelled booking');
    const res7 = await fetch(`${baseUrl}/${booking1.txt_Booking_Number}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: 'Duplicate cancel' }),
    });
    console.log('Status (expected 400):', res7.status);
    if (res7.status !== 400) {
      throw new Error(`Test 7 Failed: Expected 400 but got ${res7.status}`);
    }
    console.log('✅ TEST 7 PASSED: Already cancelled booking rejected with 400.');

    // TEST 8: Vehicle availability after cancellation
    console.log('\n[TEST 8] Re-book dates (2026-10-05 to 2026-10-08) now that previous booking is cancelled');
    const res8 = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        int_Vehicle_Id: 101,
        pickupDate: '2026-10-05',
        returnDate: '2026-10-08',
        pickupBranch: 1,
      }),
    });
    const data8 = await res8.json();
    console.log('Status (expected 201):', res8.status);
    if (res8.status !== 201) {
      throw new Error(`Test 8 Failed: ${JSON.stringify(data8)}`);
    }
    console.log('✅ TEST 8 PASSED: Dates are freed for booking once prior reservation was cancelled.');

    console.log('\n=============================================');
    console.log('🎉 ALL 8 END-TO-END BOOKING TESTS PASSED! 🎉');
    console.log('=============================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

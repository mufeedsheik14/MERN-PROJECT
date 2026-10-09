require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Vehicle = require('../models/Vehicle');
const VehicleLocation = require('../models/VehicleLocation');
const User = require('../models/User');

let server;
let baseUrl;

async function run() {
  console.log('--- Starting Fleet GPS API Verification ---');

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }

  // Find or create test staff user and test vehicle
  let testUser = await User.findOne({ role: 'admin' });
  if (!testUser) {
    testUser = await User.findOne({ role: 'staff' });
  }

  let testVehicle = await Vehicle.findOne();
  if (!testVehicle) {
    console.error('No vehicles found in database to test.');
    process.exit(1);
  }

  console.log(`Using Test Vehicle: ${testVehicle.txt_Model_Name} (${testVehicle._id}, int_Vehicle_Id: ${testVehicle.int_Vehicle_Id})`);

  const token = jwt.sign(
    { id: testUser._id, role: testUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/fleet`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 1. Test Unauthenticated request
    console.log('\n[Test 1] POST /api/fleet/location without auth token...');
    const unauthRes = await fetch(`${baseUrl}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: testVehicle._id, latitude: 13.0827, longitude: 80.2707 }),
    });
    console.log(`Status: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) throw new Error('Unauthenticated request was not blocked');

    // 2. Test Real GPS Location Ingestion
    console.log('\n[Test 2] POST /api/fleet/location with valid JWT & GPS payload...');
    const postRes = await fetch(`${baseUrl}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vehicleId: testVehicle._id,
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 12,
        speed: 38,
        heading: 180,
        trackingStatus: 'active',
        source: 'mobile-gps',
      }),
    });
    const postData = await postRes.json();
    console.log(`Status: ${postRes.status} (Expected: 201)`);
    console.log('Saved Record:', {
      _id: postData.data?._id,
      latitude: postData.data?.latitude,
      longitude: postData.data?.longitude,
      speed: postData.data?.speed,
      source: postData.data?.source,
    });
    if (postRes.status !== 201 || !postData.success) {
      throw new Error(`Location ingestion failed: ${JSON.stringify(postData)}`);
    }

    // 3. Test GET Live Locations
    console.log('\n[Test 3] GET /api/fleet/live-locations...');
    const liveRes = await fetch(`${baseUrl}/live-locations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const liveData = await liveRes.json();
    console.log(`Status: ${liveRes.status}, Count: ${liveData.count}`);
    const foundVehicle = liveData.data.find(
      (d) => String(d.vehicleId?._id || d.vehicleId) === String(testVehicle._id)
    );
    if (!foundVehicle) {
      throw new Error('Newly tracked vehicle was not found in live-locations result');
    }
    console.log('Found Vehicle Telemetry in live-locations:', {
      latitude: foundVehicle.latitude,
      longitude: foundVehicle.longitude,
      trackingStatus: foundVehicle.trackingStatus,
    });

    // 4. Test GET Vehicle Location & Breadcrumb History
    console.log('\n[Test 4] GET /api/fleet/location/:vehicleId...');
    const histRes = await fetch(`${baseUrl}/location/${testVehicle._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const histData = await histRes.json();
    console.log(`Status: ${histRes.status}`);
    console.log(`History points count: ${histData.data?.history?.length}`);
    if (histRes.status !== 200 || !histData.data?.latest) {
      throw new Error('Failed to retrieve vehicle location history');
    }

    // 5. Test Stop Tracking
    console.log('\n[Test 5] POST /api/fleet/location with trackingStatus = "stopped"...');
    const stopRes = await fetch(`${baseUrl}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vehicleId: testVehicle._id,
        latitude: 13.0830,
        longitude: 80.2710,
        trackingStatus: 'stopped',
        source: 'mobile-gps',
      }),
    });
    const stopData = await stopRes.json();
    console.log(`Status: ${stopRes.status}, trackingStatus: ${stopData.data?.trackingStatus}`);
    if (stopData.data?.trackingStatus !== 'stopped') {
      throw new Error('trackingStatus was not set to stopped');
    }

    // Cleanup test records
    await VehicleLocation.deleteMany({ vehicleId: testVehicle._id });
    console.log('\n✅ All Fleet GPS backend API tests PASSED!');
  } catch (err) {
    console.error('\n❌ Test FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
}

run();

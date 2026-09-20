/**
 * test_staff_rbac.js
 * End-to-end verification script testing:
 * 1. Staff -> view own profile with all 11 fields
 * 2. Staff -> edit own personal info via PUT /api/auth/me
 * 3. Staff -> attempted tampering of role, branch, employeeId, accountStatus is blocked/ignored
 * 4. Staff -> accessing another staff's profile receives 403 Forbidden
 * 5. Admin -> view all staff via GET /api/users
 * 6. Admin -> update staff personal info and branch via PUT /api/users/staff/:username
 * 7. Admin -> update staff status via PATCH /api/users/staff/:username/status
 * 8. Customer -> accessing staff info receives 403 Forbidden
 * 9. Unauthenticated -> accessing staff info receives 401 Unauthorized
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

let server;
let baseUrl;

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Staff Profile & RBAC Verification Tests');
  console.log('====================================================\n');

  // Wait for mongoose connection if not yet open
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }

  // Clean up any old test users
  await User.deleteMany({
    username: {
      $in: ['test_staff_chennai', 'test_staff_madurai', 'test_admin_user', 'test_customer_user'],
    },
  });
  // Create users via .save() to properly trigger bcrypt pre('save') hash hook
  const staffDoc = new User({
    username: 'test_staff_chennai',
    name: 'Chennai Desk Test',
    email: 'chennai_test@roadready.com',
    phone: '9840112255',
    password: 'password123',
    role: 'staff',
    int_Branch_Id: 2,
    employeeId: 'RR-STF-002',
    address: '45 Mount Road, Chennai',
    dateOfBirth: '1990-11-23',
    emergencyContactName: 'Suresh Kumar',
    emergencyContactPhone: '9840119902',
    accountStatus: 'Active',
    active: true,
  });
  await staffDoc.save();
  const otherStaffDoc = new User({
    username: 'test_staff_madurai',
    name: 'Madurai Operations Test',
    email: 'madurai_test@roadready.com',
    phone: '9840112244',
    password: 'password123',
    role: 'staff',
    int_Branch_Id: 1,
    employeeId: 'RR-STF-001',
    address: '12 West Veli St, Madurai',
    dateOfBirth: '1992-05-14',
    emergencyContactName: 'Karthik Raja',
    emergencyContactPhone: '9840119901',
    accountStatus: 'Active',
    active: true,
  });
  await otherStaffDoc.save();

  const adminDoc = new User({
    username: 'test_admin_user',
    name: 'System Admin Test',
    email: 'admin_test@roadready.com',
    phone: '9840112233',
    password: 'password123',
    role: 'admin',
    accountStatus: 'Active',
    active: true,
  });
  await adminDoc.save();

  const customerDoc = new User({
    username: 'test_customer_user',
    name: 'Customer Test',
    email: 'customer_test@roadready.com',
    phone: '9840112288',
    password: 'password123',
    role: 'customer',
    accountStatus: 'Active',
    active: true,
  });
  await customerDoc.save();
  // Start ephemeral server
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  // Helper login
  async function getLoginToken(username, password) {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    return data.token;
  }

  const staffToken = await getLoginToken('test_staff_chennai', 'password123');
  const adminToken = await getLoginToken('test_admin_user', 'password123');
  const customerToken = await getLoginToken('test_customer_user', 'password123');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // ── TEST 1: Staff -> view own profile via GET /api/auth/me ────────
  console.log('--- Test Suite 1: Staff Profile Self-Service & RBAC ---');
  {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'Staff can fetch own profile via GET /api/auth/me');
    assert(data.user.name === 'Chennai Desk Test', 'Profile returns Full Name');
    assert(data.user.employeeId === 'RR-STF-002', 'Profile returns Employee ID');
    assert(data.user.email === 'chennai_test@roadready.com', 'Profile returns Email');
    assert(data.user.phone === '9840112255', 'Profile returns Phone Number');
    assert(data.user.address === '45 Mount Road, Chennai', 'Profile returns Address');
    assert(data.user.dateOfBirth === '1990-11-23', 'Profile returns Date of Birth');
    assert(data.user.emergencyContactName === 'Suresh Kumar', 'Profile returns Emergency Contact Name');
    assert(data.user.emergencyContactPhone === '9840119902', 'Profile returns Emergency Contact Phone');
    assert(data.user.int_Branch_Id === 2, 'Profile returns Branch');
    assert(data.user.role === 'staff', 'Profile returns Role');
    assert(data.user.accountStatus === 'Active', 'Profile returns Account Status');
  }

  // ── TEST 2: Staff -> edit own personal info via PUT /api/auth/me ──
  {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Chennai Desk Updated',
        phone: '9840117788',
        emergencyContactName: 'Kavitha Suresh',
        emergencyContactPhone: '9840118899',
        address: '100 Mount Road, Guindy, Chennai',
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'Staff can update personal fields via PUT /api/auth/me');
    assert(data.user.name === 'Chennai Desk Updated', 'Updated Full Name persisted');
    assert(data.user.phone === '9840117788', 'Updated Phone Number persisted');
    assert(data.user.emergencyContactName === 'Kavitha Suresh', 'Updated Emergency Contact Name persisted');
    assert(data.user.emergencyContactPhone === '9840118899', 'Updated Emergency Contact Phone persisted');
    assert(data.user.address === '100 Mount Road, Guindy, Chennai', 'Updated Address persisted');
  }

  // ── TEST 3: Staff -> cannot tamper with role, branch, employeeId, accountStatus ──
  {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        role: 'admin',
        int_Branch_Id: 99,
        employeeId: 'HACKED-ID-999',
        accountStatus: 'Deactivated',
      }),
    });
    // Either 400 (no valid fields) or ignored
    const verifyRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const verifyData = await verifyRes.json();
    assert(verifyData.user.role === 'staff', 'Tampering attempt blocked: role remains "staff"');
    assert(verifyData.user.int_Branch_Id === 2, 'Tampering attempt blocked: branch remains #2');
    assert(verifyData.user.employeeId === 'RR-STF-002', 'Tampering attempt blocked: employeeId remains unchanged');
    assert(verifyData.user.accountStatus === 'Active', 'Tampering attempt blocked: accountStatus remains "Active"');
  }

  // ── TEST 4: Staff -> access to another staff profile is blocked ──
  console.log('\n--- Test Suite 2: Privacy Rules: Staff cannot view other staff ---');
  {
    const res = await fetch(`${baseUrl}/users/test_staff_madurai`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(res.status === 403, 'Staff querying another staff profile receives 403 Forbidden');
  }

  // ── TEST 5: Staff -> access to own username via GET /api/users/:username works ──
  {
    const res = await fetch(`${baseUrl}/users/test_staff_chennai`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(res.status === 200, 'Staff querying own profile via GET /api/users/:username succeeds');
  }

  // ── TEST 6: Admin -> Staff Management ────────────────────────────
  console.log('\n--- Test Suite 3: Admin Staff Management ---');
  {
    const res = await fetch(`${baseUrl}/users?role=staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200 && Array.isArray(data.users), 'Admin can list all staff accounts');
  }

  // Admin updates staff info via PUT /api/users/staff/:username
  {
    const res = await fetch(`${baseUrl}/users/staff/test_staff_madurai`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Madurai Operations Lead',
        employeeId: 'RR-MDU-777',
        int_Branch_Id: 1,
        address: '500 Bypass Road, Madurai',
        accountStatus: 'Active',
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'Admin can update staff details via PUT /api/users/staff/:username');
    assert(data.user.name === 'Madurai Operations Lead', 'Admin updated staff name persisted');
    assert(data.user.employeeId === 'RR-MDU-777', 'Admin updated employee ID persisted');
  }

  // Admin updates staff status via PATCH /api/users/staff/:username/status
  {
    const res = await fetch(`${baseUrl}/users/staff/test_staff_madurai/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Pending Approval' }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.user.accountStatus === 'Pending Approval', 'Admin can set staff status to Pending Approval');

    // Approve staff back to Active
    const approveRes = await fetch(`${baseUrl}/users/staff/test_staff_madurai/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Active' }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.user.accountStatus === 'Active', 'Admin can approve staff back to Active');
  }

  // ── TEST 7: Customer -> No Access ─────────────────────────────────
  console.log('\n--- Test Suite 4: Customer Access Denied ---');
  {
    const res1 = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res1.status === 403, 'Customer cannot access GET /api/users (403 Forbidden)');

    const res2 = await fetch(`${baseUrl}/users/test_staff_chennai`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res2.status === 403, 'Customer cannot access staff profile (403 Forbidden)');

    const res3 = await fetch(`${baseUrl}/users/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ username: 'hacker_staff' }),
    });
    assert(res3.status === 403, 'Customer cannot create staff accounts (403 Forbidden)');
  }

  // ── TEST 8: Public / Unauthenticated -> No Access ────────────────
  console.log('\n--- Test Suite 5: Unauthenticated Access Denied ---');
  {
    const res1 = await fetch(`${baseUrl}/users`);
    assert(res1.status === 401, 'Unauthenticated GET /api/users blocked (401 Unauthorized)');

    const res2 = await fetch(`${baseUrl}/users/test_staff_chennai`);
    assert(res2.status === 401, 'Unauthenticated GET /api/users/:username blocked (401 Unauthorized)');

    const res3 = await fetch(`${baseUrl}/auth/me`);
    assert(res3.status === 401, 'Unauthenticated GET /api/auth/me blocked (401 Unauthorized)');
  }

  // Clean up test users
  await User.deleteMany({
    username: {
      $in: ['test_staff_chennai', 'test_staff_madurai', 'test_admin_user', 'test_customer_user'],
    },
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  server.close();
  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});

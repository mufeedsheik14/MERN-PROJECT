async function runApiTests() {
  console.log('🧪 Testing RoadReady Authentication and Google OAuth Endpoints...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:5000';

  // ── Test 1: Existing Customer Login with Email/Password ──
  console.log('--- Test 1: Existing Email/Password Authentication ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'customer1', password: 'user123' }),
    });
    const data = await res.json();
    assert(res.status === 200, `Customer login status is 200 (received ${res.status})`);
    assert(data.success === true, 'Customer login returned success: true');
    assert(Boolean(data.token), 'Customer login returned valid JWT token');
    assert(data.user?.role === 'customer', 'Customer role is customer');

    // Test protected route with customer token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user?.username === 'customer1', 'GET /api/auth/me works with customer token');
  } catch (err) {
    assert(false, `Customer login failed: ${err.message}`);
  }

  // ── Test 2: Existing Admin Login ──
  console.log('\n--- Test 2: Existing Admin Authentication & Protected Route ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.user?.role === 'admin', 'Admin login works and preserves admin role');
  } catch (err) {
    assert(false, `Admin login failed: ${err.message}`);
  }

  // ── Test 3: Google OAuth Status Endpoint ──
  console.log('\n--- Test 3: GET /api/auth/google/status ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/google/status`);
    const data = await res.json();
    assert(res.status === 200, 'Status endpoint returns 200 OK');
    assert(data.success === true, 'Status endpoint returns success: true');
    assert(typeof data.configured === 'boolean', `Status endpoint returns configured flag (${data.configured})`);
  } catch (err) {
    assert(false, `Status endpoint failed: ${err.message}`);
  }

  // ── Test 4: Google OAuth Initiation Endpoint Redirect ──
  console.log('\n--- Test 4: GET /api/auth/google Initiation Redirect ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/google`, { redirect: 'manual' });
    assert(res.status === 302, `Initiation endpoint responds with 302 Redirect (status ${res.status})`);
    const location = res.headers.get('location');
    assert(
      location && (location.includes('accounts.google.com') || location.includes('login?error=google_not_configured')),
      `Redirect target is valid: ${location}`
    );
  } catch (err) {
    assert(false, `Initiation redirect failed: ${err.message}`);
  }

  // ── Test 5: Google OAuth Callback Cancellation Handling ──
  console.log('\n--- Test 5: GET /api/auth/google/callback with user cancellation ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/google/callback?error=access_denied`, { redirect: 'manual' });
    assert(res.status === 302, `Cancellation responds with 302 Redirect (status ${res.status})`);
    const location = res.headers.get('location');
    assert(location && location.includes('error=cancelled'), `Redirected to login with error=cancelled (${location})`);
  } catch (err) {
    assert(false, `Cancellation callback failed: ${err.message}`);
  }

  // ── Test 6: Google OAuth Callback Invalid State / Missing Cookie ──
  console.log('\n--- Test 6: GET /api/auth/google/callback with missing/invalid PKCE state ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/google/callback?code=mock_code&state=fake_state`, { redirect: 'manual' });
    assert(res.status === 302, `State check responds with 302 Redirect (status ${res.status})`);
    const location = res.headers.get('location');
    assert(location && location.includes('error=invalid_state'), `State mismatch redirected to error=invalid_state (${location})`);
  } catch (err) {
    assert(false, `State check callback failed: ${err.message}`);
  }

  // ── Test 7: Registration endpoint still intact ──
  console.log('\n--- Test 7: Customer Self-Registration Endpoint ---');
  const tempUser = `test_reg_${Date.now().toString().slice(-4)}`;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: tempUser,
        name: 'Test Reg Customer',
        email: `${tempUser}@example.com`,
        phone: '9876543210',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert(res.status === 201, `Customer registration responds with 201 Created (status ${res.status})`);
    assert(data.user?.role === 'customer', 'New registered user has role customer');
  } catch (err) {
    assert(false, `Registration failed: ${err.message}`);
  }

  console.log('\n==========================================');
  console.log(`API Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==========================================\n');

  if (failed > 0) process.exit(1);
}

runApiTests();

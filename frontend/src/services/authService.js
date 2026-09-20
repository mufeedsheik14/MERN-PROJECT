const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "rr_auth_token";

export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function removeStoredToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Login with username and password.
 * POST http://localhost:5000/api/auth/login
 */
export async function loginApi({ username, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Login failed (Status ${response.status})`);
    }

    return data; // { success: true, token, user, message }
  } catch (err) {
    if (err.name === "TypeError" || err.message?.includes("Failed to fetch")) {
      throw new Error(
        "Unable to connect to the authentication server. Please check your connection or verify the backend is running at http://localhost:5000."
      );
    }
    throw err;
  }
}

/**
 * Register a new customer.
 * POST http://localhost:5000/api/auth/register
 */
export async function registerApi({ username, name, email, phone, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Registration failed (Status ${response.status})`);
    }

    return data; // { success: true, token, user, message }
  } catch (err) {
    if (err.name === "TypeError" || err.message?.includes("Failed to fetch")) {
      throw new Error(
        "Unable to connect to the authentication server. Please check your connection or verify the backend is running at http://localhost:5000."
      );
    }
    throw err;
  }
}

/**
 * Get current authenticated user profile using JWT.
 * GET http://localhost:5000/api/auth/me
 */
export async function getMeApi(token) {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error("No authorization token found");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Session verification failed (Status ${response.status})`);
    }

    return data; // { success: true, user }
  } catch (err) {
    if (err.name === "TypeError" || err.message?.includes("Failed to fetch")) {
      throw new Error("Backend server is currently unreachable. Will retry session verification.");
    }
    throw err;
  }
}

/**
 * Update authenticated user's own profile.
 * PUT http://localhost:5000/api/auth/me
 */
export async function updateProfileApi(updates, token) {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error("No authorization token found");
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Profile update failed (Status ${response.status})`);
  }

  return data; // { success: true, user, message }
}

/**
 * Get all staff members (Admin only).
 * GET http://localhost:5000/api/users?role=staff
 */
export async function getAllStaffApi(token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users?role=staff`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch staff members");
  }
  return data.users;
}

/**
 * Create a new staff account with personal info (Admin only).
 * POST http://localhost:5000/api/users/staff
 */
export async function createStaffApi(staffData, token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users/staff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(staffData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create staff account");
  }
  return data;
}

/**
 * Update a staff member's personal information (Admin only).
 * PUT http://localhost:5000/api/users/staff/:username
 */
export async function updateStaffApi(username, updates, token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users/staff/${encodeURIComponent(username)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update staff member");
  }
  return data;
}

/**
 * Update staff account status / approval (Admin only).
 * PATCH http://localhost:5000/api/users/staff/:username/status
 */
export async function updateStaffStatusApi(username, status, token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users/staff/${encodeURIComponent(username)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update staff status");
  }
  return data;
}

/**
 * Toggle user/staff active status (Admin only).
 * PATCH http://localhost:5000/api/users/:username/toggle
 */
export async function toggleStaffStatusApi(username, token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to toggle staff status");
  }
  return data;
}

/**
 * Get staff profile by username (Admin or Self only).
 * GET http://localhost:5000/api/users/:username
 */
export async function getStaffByUsernameApi(username, token) {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error("No authorization token found");

  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch user");
  }
  return data;
}

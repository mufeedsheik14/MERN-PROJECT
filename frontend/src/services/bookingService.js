import { getStoredToken } from "./authService";
import { API_BASE_URL } from "./apiConfig";

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Create a new booking backed by MongoDB.
 * POST /api/bookings
 *
 * @param {Object} bookingData
 * @returns {Promise<Object>} Created booking document
 */
export async function createBookingApi(bookingData) {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Authentication required. Please log in to complete your booking.");
  }

  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(bookingData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.message || `Booking failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.booking;
}

/**
 * Get current authenticated user's bookings from MongoDB.
 * GET /api/bookings/my
 *
 * @returns {Promise<Array>} List of bookings
 */
export async function getMyBookingsApi() {
  const token = getStoredToken();
  if (!token) return [];

  const response = await fetch(`${API_BASE_URL}/bookings/my`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Failed to fetch bookings (${response.status})`);
  }

  return data.bookings || [];
}

/**
 * Get all bookings across branches (Staff / Admin).
 * GET /api/bookings
 *
 * @param {Object} [params] - branch, status, etc.
 * @returns {Promise<Array>}
 */
export async function getAllBookingsApi(params = {}) {
  const token = getStoredToken();
  if (!token) return [];

  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, v);
  });

  const qs = query.toString();
  const url = `${API_BASE_URL}/bookings${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Failed to fetch all bookings (${response.status})`);
  }

  return data.bookings || [];
}

/**
 * Get single booking details by MongoDB ID or booking number.
 * GET /api/bookings/:id
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getBookingByIdApi(id) {
  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Failed to fetch booking ${id}`);
  }

  return data.booking;
}

/**
 * Cancel an existing booking in MongoDB.
 * PATCH /api/bookings/:id/cancel
 *
 * @param {string} id - MongoDB _id or txt_Booking_Number
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Updated booking document
 */
export async function cancelBookingApi(id, reason = "Cancelled by customer") {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Authentication required to cancel a booking.");
  }

  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.message || `Cancellation failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.booking;
}

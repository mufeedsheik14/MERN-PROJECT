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
 * Send real-time GPS telemetry pulse to backend
 * POST /api/fleet/location
 * 
 * @param {Object} locationData
 * @param {string|number} locationData.vehicleId
 * @param {number} locationData.latitude
 * @param {number} locationData.longitude
 * @param {number} [locationData.accuracy]
 * @param {number} [locationData.speed]
 * @param {number} [locationData.heading]
 * @param {Date|string} [locationData.timestamp]
 * @param {string} [locationData.trackingStatus] 'active' | 'stopped'
 * @param {string} [locationData.source] 'mobile-gps'
 */
export async function sendLocationUpdate(locationData) {
  const response = await fetch(`${API_BASE_URL}/fleet/location`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(locationData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || `Failed to record location (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data;
}

/**
 * Fetch latest GPS location for all tracked vehicles
 * GET /api/fleet/live-locations
 * 
 * @returns {Promise<Array>} List of latest vehicle locations
 */
export async function fetchLiveLocations() {
  const response = await fetch(`${API_BASE_URL}/fleet/live-locations`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || `Failed to fetch live locations (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data || [];
}

/**
 * Fetch latest location and recent breadcrumb history for a specific vehicle
 * GET /api/fleet/location/:vehicleId
 * 
 * @param {string|number} vehicleId
 * @returns {Promise<{vehicle: Object, latest: Object, history: Array}>}
 */
export async function fetchVehicleLocation(vehicleId) {
  const response = await fetch(`${API_BASE_URL}/fleet/location/${vehicleId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const error = new Error(data.message || `Failed to fetch vehicle location (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Fetch vehicles from the backend API with automatic retry (max 2 retries).
 * Calls GET http://localhost:5000/api/vehicles
 *
 * @param {Object} [params] - Optional query parameters (category, branch, fuel, search, etc.)
 * @param {number} [retries=2] - Maximum number of retries on network/startup failure
 * @param {number} [delayMs=600] - Base backoff delay in ms
 * @returns {Promise<Array>} - Array of vehicle documents from MongoDB
 */
export async function fetchVehicles(params = {}, retries = 2, delayMs = 600) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, val);
    }
  });

  const queryString = query.toString();
  const url = `${API_BASE_URL}/vehicles${queryString ? `?${queryString}` : ""}`;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        let message = `Failed to fetch vehicles (Status ${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          // Ignore json parse error
        }
        throw new Error(message);
      }

      const data = await response.json();
      return data.vehicles || [];
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Incremental backoff before retry (600ms, 1200ms)
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  const isNetworkError =
    lastError?.name === "TypeError" || lastError?.message?.includes("Failed to fetch");
  const friendlyMessage = isNetworkError
    ? "Unable to connect to the backend server. Please verify the backend API is running at http://localhost:5000."
    : (lastError?.message || "Failed to fetch vehicles from server.");

  const error = new Error(friendlyMessage);
  error.originalError = lastError;
  throw error;
}

/**
 * Fetch a single vehicle by its integer ID or MongoDB _id with retry.
 * Calls GET http://localhost:5000/api/vehicles/:id
 *
 * @param {string|number} id
 * @param {number} [retries=2]
 * @param {number} [delayMs=500]
 * @returns {Promise<Object>}
 */
export async function fetchVehicleById(id, retries = 2, delayMs = 500) {
  const url = `${API_BASE_URL}/vehicles/${id}`;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        let message = `Failed to fetch vehicle ${id} (Status ${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          // Ignore
        }
        throw new Error(message);
      }

      const data = await response.json();
      return data.vehicle;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch vehicle ${id}`);
}

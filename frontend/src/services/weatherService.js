/**
 * Weather Service
 *
 * Communicates with the backend weather endpoint (GET /api/weather?city=...)
 * to retrieve real-time destination weather for vehicle recommendations.
 * Secrets/API keys stay strictly on the backend.
 */
import { API_BASE_URL } from "./apiConfig";

export async function fetchDestinationWeather(destination) {
  if (!destination || !destination.trim()) {
    return { success: false, message: "No destination provided." };
  }

  const query = encodeURIComponent(destination.trim());
  const url = `${API_BASE_URL}/weather?city=${query}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        success: false,
        message: errData?.message || `Weather fetch failed with status ${res.status}`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Could not connect to weather endpoint:", err.message);
    return {
      success: false,
      message: "Weather service could not be reached.",
      error: err.message,
    };
  }
}

/**
 * Weather Controller
 * 
 * Fetches destination weather conditions for the AI Assistant vehicle recommendation flow.
 * - Supports OpenWeatherMap if WEATHER_API_KEY / OPENWEATHER_API_KEY is configured in .env.
 * - Seamlessly falls back to Open-Meteo (open meteorological API, no key required)
 *   so weather retrieval works out-of-the-box in local and production environments.
 */

// Helper to interpret WMO Weather Interpretation Codes from Open-Meteo
function interpretWmoCode(code) {
  if (code === 0) {
    return { condition: 'Clear', description: 'Clear skies and sunny weather', rain: false };
  }
  if (code === 1) {
    return { condition: 'Mainly Clear', description: 'Mostly sunny with slight clouds', rain: false };
  }
  if (code === 2) {
    return { condition: 'Partly Cloudy', description: 'Partly cloudy with pleasant conditions', rain: false };
  }
  if (code === 3) {
    return { condition: 'Overcast', description: 'Overcast cloudy skies', rain: false };
  }
  if (code === 45 || code === 48) {
    return { condition: 'Foggy', description: 'Foggy conditions, reduced visibility', rain: false };
  }
  if (code >= 51 && code <= 57) {
    return { condition: 'Drizzle', description: 'Light misty drizzle, roads may be slick', rain: true };
  }
  if (code >= 61 && code <= 67) {
    return { condition: 'Rain', description: 'Steady rainfall, wet road conditions', rain: true };
  }
  if (code >= 71 && code <= 77) {
    return { condition: 'Snow', description: 'Snowy cold conditions', rain: false };
  }
  if (code >= 80 && code <= 82) {
    return { condition: 'Showers', description: 'Scattered rain showers expected', rain: true };
  }
  if (code >= 85 && code <= 86) {
    return { condition: 'Snow Showers', description: 'Cold snow showers', rain: false };
  }
  if (code >= 95 && code <= 99) {
    return { condition: 'Thunderstorm', description: 'Thunderstorms and heavy downpour', rain: true };
  }
  return { condition: 'Cloudy', description: 'Cloudy weather', rain: false };
}

/**
 * Fetch weather using OpenWeatherMap API (requires API key)
 */
async function fetchFromOpenWeather(city, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    throw new Error(`OpenWeather HTTP ${response.status}`);
  }
  const data = await response.json();
  const mainCond = data.weather?.[0]?.main || 'Clear';
  const desc = data.weather?.[0]?.description || 'Clear skies';
  const isRain =
    mainCond.toLowerCase().includes('rain') ||
    mainCond.toLowerCase().includes('drizzle') ||
    mainCond.toLowerCase().includes('thunderstorm');

  return {
    success: true,
    destination: data.name || city,
    temperature: Math.round(data.main?.temp ?? 25),
    condition: mainCond,
    rain: isRain,
    description: desc.charAt(0).toUpperCase() + desc.slice(1),
    humidity: data.main?.humidity ?? 60,
    windSpeed: Math.round((data.wind?.speed ?? 3) * 3.6), // Convert m/s to km/h
    source: 'OpenWeatherMap',
  };
}

/**
 * Fetch weather using Open-Meteo Geocoding + Forecast API (free meteorological API, no key required)
 */
async function fetchFromOpenMeteo(city) {
  // 1. Geocode destination to latitude & longitude
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
  if (!geoRes.ok) throw new Error(`Open-Meteo Geocoding HTTP ${geoRes.status}`);

  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    return null;
  }

  const location = geoData.results[0];
  const { latitude, longitude, name, country } = location;

  // 2. Fetch current weather forecast
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
  const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) });
  if (!weatherRes.ok) throw new Error(`Open-Meteo Weather HTTP ${weatherRes.status}`);

  const weatherData = await weatherRes.json();
  const current = weatherData.current || {};
  const wmo = interpretWmoCode(current.weather_code);

  const isRain = wmo.rain || (current.precipitation && current.precipitation > 0);

  const displayDest =
    name.toLowerCase() === city.toLowerCase()
      ? `${name}${country ? `, ${country}` : ''}`
      : `${city.charAt(0).toUpperCase() + city.slice(1)} (${name}${country ? `, ${country}` : ''})`;

  return {
    success: true,
    destination: displayDest,
    temperature: Math.round(current.temperature_2m ?? 24),
    condition: wmo.condition,
    rain: Boolean(isRain),
    description: wmo.description,
    humidity: current.relative_humidity_2m ?? 55,
    windSpeed: Math.round(current.wind_speed_10m ?? 10),
    source: 'Open-Meteo',
  };
}

/**
 * GET /api/weather
 * Query: ?city=destination_name
 */
const getDestinationWeather = async (req, res) => {
  const city = (req.query.city || req.query.destination || req.query.q || '').trim();

  if (!city) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a destination city (e.g. ?city=Ooty or ?city=Chennai)',
    });
  }

  const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

  // 1. If an API key is configured, attempt OpenWeatherMap first
  if (apiKey) {
    try {
      const weather = await fetchFromOpenWeather(city, apiKey);
      return res.json(weather);
    } catch (err) {
      console.warn(`OpenWeatherMap lookup failed for "${city}": ${err.message}. Falling back to Open-Meteo.`);
    }
  }

  // 2. Fallback to Open-Meteo (open meteorological API)
  try {
    const meteoResult = await fetchFromOpenMeteo(city);
    if (meteoResult) {
      return res.json(meteoResult);
    }

    // If geocoding found no match
    return res.status(404).json({
      success: false,
      message: `Could not locate destination "${city}". Please verify the location name.`,
    });
  } catch (err) {
    console.error(`Weather lookup error for "${city}":`, err.message);
    return res.status(500).json({
      success: false,
      message: `Weather service temporarily unavailable for "${city}".`,
      error: err.message,
    });
  }
};

module.exports = {
  getDestinationWeather,
};

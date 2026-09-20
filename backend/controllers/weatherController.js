/**
 * Weather Controller
 * 
 * Fetches destination weather conditions for the AI Assistant vehicle recommendation flow.
 * - Supports OpenWeatherMap / WeatherAPI if WEATHER_API_KEY / OPENWEATHER_API_KEY is configured in .env.
 * - Seamlessly falls back to Open-Meteo meteorological API (free, reliable, no key required).
 * - Accurately resolves destination coordinates to Madurai, India (and other Indian destinations).
 * - Avoids stale forecast artifacts by returning current observation/analysis data.
 */

// Helper to interpret WMO Weather Interpretation Codes from Open-Meteo
function interpretWmoCode(code, precipitation = 0) {
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
    return { condition: 'Drizzle', description: 'Light misty drizzle, roads may be slick', rain: precipitation > 0 };
  }
  if (code >= 61 && code <= 67) {
    return { condition: 'Rain', description: 'Steady rainfall, wet road conditions', rain: precipitation > 0 };
  }
  if (code >= 71 && code <= 77) {
    return { condition: 'Snow', description: 'Snowy cold conditions', rain: false };
  }
  if (code >= 80 && code <= 82) {
    return { condition: 'Showers', description: 'Scattered rain showers', rain: precipitation > 0 };
  }
  if (code >= 85 && code <= 86) {
    return { condition: 'Snow Showers', description: 'Cold snow showers', rain: false };
  }
  if (code >= 95 && code <= 99) {
    // If thunderstorm code was flagged in a numerical model but current precipitation is 0,
    // do not report wet roads or heavy downpour
    if (precipitation === 0) {
      return { condition: 'Partly Cloudy', description: 'Cloudy with pleasant dry road conditions', rain: false };
    }
    return { condition: 'Thunderstorm', description: 'Thunderstorms and rain showers', rain: true };
  }
  return { condition: 'Cloudy', description: 'Cloudy weather', rain: false };
}

// Fallback coordinate map for primary branch locations and popular destinations in India
const KNOWN_COORDINATES = {
  madurai: { name: 'Madurai', country: 'India', admin1: 'Tamil Nadu', latitude: 9.919, longitude: 78.11953 },
  chennai: { name: 'Chennai', country: 'India', admin1: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  coimbatore: { name: 'Coimbatore', country: 'India', admin1: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
  ooty: { name: 'Ooty', country: 'India', admin1: 'Tamil Nadu', latitude: 11.4102, longitude: 76.6950 },
  udhagamandalam: { name: 'Ooty', country: 'India', admin1: 'Tamil Nadu', latitude: 11.4102, longitude: 76.6950 },
  bengaluru: { name: 'Bengaluru', country: 'India', admin1: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  bangalore: { name: 'Bengaluru', country: 'India', admin1: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
};

/**
 * Geocode destination to latitude and longitude.
 * Accurately resolves Indian destinations like Madurai, India.
 */
async function geocodeDestination(city) {
  const cleanCity = city.trim();
  const normalizedKey = cleanCity.toLowerCase().replace(/[^a-z]/g, '');

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=10&language=en&format=json`;

    const geoRes = await fetch(geoUrl, {
      signal: AbortSignal.timeout(7000),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const results = geoData.results || [];
      if (results.length > 0) {
        // Prioritize Indian destinations (especially for cities like Madurai, Chennai, Ooty)
        const isQuerySpecifyingCountry = cleanCity.toLowerCase().includes('india');
        const indianResults = results.filter(
          (r) => r.country_code === 'IN' || (r.country && r.country.toLowerCase() === 'india')
        );

        let match = null;
        if (indianResults.length > 0) {
          // Sort by population descending so major cities (e.g. Madurai city > 1M pop) are selected over small villages
          indianResults.sort((a, b) => (b.population || 0) - (a.population || 0));
          match = indianResults[0];
        } else if (!isQuerySpecifyingCountry) {
          match = results[0];
        } else {
          match = results[0];
        }

        if (match) {
          return {
            name: match.name,
            country: match.country,
            admin1: match.admin1,
            latitude: match.latitude,
            longitude: match.longitude,
          };
        }
      }
    }
  } catch (err) {
    console.warn(`Geocoding lookup network hitch for "${cleanCity}": ${err.message}`);
  }

  // Resilient fallback for primary locations
  if (KNOWN_COORDINATES[normalizedKey]) {
    return KNOWN_COORDINATES[normalizedKey];
  }

  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (normalizedKey.includes(key) || key.includes(normalizedKey)) {
      return coords;
    }
  }

  return null;
}

/**
 * Fetch weather from configured primary provider (OpenWeatherMap or WeatherAPI) using CURRENT conditions endpoint
 */
async function fetchFromConfiguredProvider(location, city, apiKey) {
  const { latitude, longitude, name, country } = location;

  // 1. Try OpenWeatherMap Current Weather Endpoint (/data/2.5/weather)
  try {
    let owUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    let response = await fetch(owUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });

    if (!response.ok && response.status !== 401 && response.status !== 403) {
      const q = country?.toLowerCase() === 'india' ? `${city},IN` : city;
      owUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;
      response = await fetch(owUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
    }

    if (response.ok) {
      const data = await response.json();
      const mainCond = data.weather?.[0]?.main || 'Clear';
      const desc = data.weather?.[0]?.description || 'Clear skies';
      const precip = Number(data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0);
      const isRain =
        mainCond.toLowerCase().includes('rain') ||
        mainCond.toLowerCase().includes('drizzle') ||
        mainCond.toLowerCase().includes('thunderstorm') ||
        precip > 0;

      const displayDest = `${name || data.name || city}${country ? `, ${country}` : ''}`;

      return {
        success: true,
        destination: displayDest,
        temperature: Math.round(data.main?.temp ?? 25),
        condition: mainCond,
        rain: isRain,
        precipitation: precip,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        humidity: data.main?.humidity ?? 60,
        windSpeed: Math.round((data.wind?.speed ?? 3) * 3.6), // Convert m/s to km/h
        source: 'OpenWeatherMap',
      };
    }
  } catch (err) {
    console.warn(`OpenWeatherMap lookup failed: ${err.message}`);
  }

  // 2. Try WeatherAPI Current Weather Endpoint (/v1/current.json)
  try {
    const wApiUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}&aqi=no`;
    const response = await fetch(wApiUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });

    if (response.ok) {
      const data = await response.json();
      const curr = data.current || {};
      const condText = curr.condition?.text || 'Clear';
      const precip = Number(curr.precip_mm ?? 0);
      const isRain =
        condText.toLowerCase().includes('rain') ||
        condText.toLowerCase().includes('drizzle') ||
        condText.toLowerCase().includes('thunderstorm') ||
        precip > 0;

      const displayDest = `${data.location?.name || name || city}${data.location?.country || country ? `, ${data.location?.country || country}` : ''}`;

      return {
        success: true,
        destination: displayDest,
        temperature: Math.round(curr.temp_c ?? 25),
        condition: condText,
        rain: isRain,
        precipitation: precip,
        description: condText,
        humidity: curr.humidity ?? 60,
        windSpeed: Math.round(curr.wind_kph ?? 10),
        source: 'WeatherAPI',
      };
    }
  } catch (err) {
    console.warn(`WeatherAPI lookup failed: ${err.message}`);
  }

  throw new Error('Configured WEATHER_API_KEY was invalid or failed');
}

/**
 * Fetch current weather from Open-Meteo fallback
 * Uses gfs_seamless global real-time analysis model for accurate current conditions.
 */
async function fetchFromOpenMeteo(location, city) {
  const { latitude, longitude, name, country } = location;

  // Request current weather observation attributes
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&models=gfs_seamless&timezone=auto`;

  let weatherRes = await fetch(weatherUrl, {
    signal: AbortSignal.timeout(5000),
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  });

  // If specific model fails, fall back to default endpoint
  if (!weatherRes.ok) {
    const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&timezone=auto`;
    weatherRes = await fetch(fallbackUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });
  }

  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo Weather HTTP ${weatherRes.status}`);
  }

  const weatherData = await weatherRes.json();
  const current = weatherData.current || {};
  const precip = Number(current.precipitation ?? current.rain ?? 0);
  const wmo = interpretWmoCode(current.weather_code, precip);

  const isRain = Boolean(wmo.rain && (precip > 0.2 || (current.rain && current.rain > 0)));

  const displayDest =
    name.toLowerCase() === city.toLowerCase()
      ? `${name}${country ? `, ${country}` : ''}`
      : `${city.charAt(0).toUpperCase() + city.slice(1)} (${name}${country ? `, ${country}` : ''})`;

  return {
    success: true,
    destination: displayDest,
    temperature: Math.round(current.temperature_2m ?? 24),
    condition: wmo.condition,
    rain: isRain,
    precipitation: precip,
    description: wmo.description,
    humidity: Math.round(current.relative_humidity_2m ?? 55),
    windSpeed: Math.round(current.wind_speed_10m ?? 10),
    source: 'Open-Meteo',
  };
}

/**
 * GET /api/weather
 * Query: ?city=destination_name
 */
const getDestinationWeather = async (req, res) => {
  // Prevent any browser or proxy caching of live weather observations
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  const city = (req.query.city || req.query.destination || req.query.q || '').trim();

  if (!city) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a destination city (e.g. ?city=Ooty or ?city=Chennai)',
    });
  }

  // 1. Resolve destination coordinates accurately (prioritizing Madurai, India)
  let location = null;
  try {
    location = await geocodeDestination(city);
  } catch (err) {
    console.warn(`Geocoding error for "${city}": ${err.message}`);
  }

  if (!location) {
    return res.status(404).json({
      success: false,
      message: `Could not locate destination "${city}". Please verify the location name.`,
    });
  }

  const apiKey = (process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || '').trim();

  // 2. If an API key is configured, use current-weather endpoint from configured provider
  if (apiKey) {
    try {
      const weather = await fetchFromConfiguredProvider(location, city, apiKey);
      return res.json(weather);
    } catch (err) {
      console.warn(`Primary weather provider lookup failed for "${city}": ${err.message}. Falling back to Open-Meteo.`);
    }
  }

  // 3. Fallback to Open-Meteo meteorological API with accurate current observation data
  try {
    const meteoResult = await fetchFromOpenMeteo(location, city);
    if (meteoResult) {
      return res.json(meteoResult);
    }

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

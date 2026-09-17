import { getBranchName, getCategoryName, getBrandName, vehicles as staticVehicles } from "../data/mockData";

/**
 * Weather-based Vehicle Recommendation Engine
 *
 * Matches destination weather conditions and passenger count
 * to live available fleet vehicles from MongoDB.
 */

const HILL_DESTINATIONS = [
  "ooty",
  "udhagamandalam",
  "munnar",
  "kodaikanal",
  "coorg",
  "wayanad",
  "manali",
  "shimla",
  "darjeeling",
  "yercaud",
  "vagamon",
  "chikmagalur",
];

export function getWeatherVehicleRecommendations({
  destination = "",
  passengers = 1,
  weatherData = null,
  vehicles = [],
}) {
  const pax = Math.max(1, parseInt(passengers, 10) || 1);
  const destLower = (destination || "").toLowerCase();
  const isHillStation = HILL_DESTINATIONS.some((h) => destLower.includes(h));

  // Only recommend available vehicles (txt_Vehicle_Status === "A")
  const fleetVehicles = (vehicles && vehicles.length > 0) ? vehicles : staticVehicles;
  const availableVehicles = fleetVehicles.filter((v) => v.txt_Vehicle_Status === "A");

  // Weather attributes
  const hasWeather = weatherData && weatherData.success !== false;
  const temp = hasWeather ? weatherData.temperature : 25;
  const isRain = hasWeather && Boolean(weatherData.rain);
  const condition = hasWeather ? weatherData.condition || "Clear" : "Unknown";

  // Filter vehicles with adequate seating capacity
  let matchingVehicles = availableVehicles.filter(
    (v) => (v.int_Seating_Capacity || 5) >= pax
  );

  let capacityNote = null;
  // If passenger count exceeds largest single vehicle capacity in fleet
  if (matchingVehicles.length === 0) {
    // Fall back to highest seating capacity available (e.g. 7-seaters)
    const maxCapacity = Math.max(...availableVehicles.map((v) => v.int_Seating_Capacity || 0), 5);
    matchingVehicles = availableVehicles.filter(
      (v) => (v.int_Seating_Capacity || 0) === maxCapacity
    );
    capacityNote = `Our largest vehicles seat up to ${maxCapacity} passengers. For a group of ${pax}, we recommend booking 2 vehicles or traveling in our spacious ${maxCapacity}-seater SUVs.`;
  }

  // Score each vehicle based on weather and route appropriateness
  const scored = matchingVehicles.map((v) => {
    let score = 50;
    const catName = (v.category || getCategoryName(v.int_Category_Id) || "").toLowerCase();
    const isSUV = catName.includes("suv") || v.int_Category_Id === 3;
    const isSedan = catName.includes("sedan") || v.int_Category_Id === 2;
    const isHatch = catName.includes("hatchback") || v.int_Category_Id === 1;
    const isBike = catName.includes("bike") || v.int_Category_Id === 4;

    let reason = "";

    // 1. Rain / Storm conditions
    if (isRain) {
      if (isBike) {
        score -= 200; // Open bikes unsafe in rain
      } else if (isSUV) {
        score += 40;
        reason = `High ground clearance, ABS, and superior wet-road traction ideal for rainy conditions in ${destination}.`;
      } else {
        score += 25;
        reason = `Enclosed cabin with climate control and defoggers to keep all ${pax} passengers dry and comfortable.`;
      }
    }
    // 2. Hill station or cold temperature (< 18°C)
    else if (isHillStation || temp < 18) {
      if (isSUV) {
        score += 45;
        reason = `High torque, fog lamps, and durable suspension ideal for hilly curves and ${temp}°C mountain weather.`;
      } else if (isSedan || isHatch) {
        score += 20;
        reason = `Comfortable heated cabin and smooth handling for navigating ${destination}.`;
      }
    }
    // 3. Hot weather (> 31°C)
    else if (temp > 31) {
      if (isSUV || isSedan) {
        score += 35;
        reason = `Powerful automatic air conditioning and tinted cabin keeping all ${pax} passengers cool in ${temp}°C heat.`;
      } else {
        score += 15;
        reason = `Air-conditioned ride offering great comfort in warm sunny weather.`;
      }
    }
    // 4. Pleasant / Clear weather (18°C - 31°C)
    else {
      if (pax <= 2 && isBike) {
        score += 30;
        reason = `Scenic open-air cruising in pleasant ${temp}°C ${condition.toLowerCase()} weather.`;
      } else if (isSedan || isHatch) {
        score += 35;
        reason = `Exceptional fuel economy and smooth highway cruising for a relaxing trip to ${destination}.`;
      } else {
        score += 30;
        reason = `Spacious seating and luggage space for ${pax} passengers in pleasant ${temp}°C weather.`;
      }
    }

    // Proximity / seating fit bonus: closer to actual passenger count without massive surplus
    const seatWaste = (v.int_Seating_Capacity || 5) - pax;
    if (seatWaste >= 0 && seatWaste <= 2) {
      score += 10;
    }

    // Default reason fallback
    if (!reason) {
      reason = `Accommodates ${v.int_Seating_Capacity} passengers comfortably with reliable performance.`;
    }

    return {
      vehicle: v,
      score,
      reason,
    };
  });

  // Sort descending by suitability score
  scored.sort((a, b) => b.score - a.score);

  // Take top 3 recommendations
  const topRecommendations = scored.slice(0, 3).map(({ vehicle, reason }) => {
    const brandName = vehicle.brand || getBrandName(vehicle.int_Brand_Id) || "";
    const modelName = vehicle.txt_Model_Name || "";
    const fullName = `${brandName} ${modelName}`.trim();
    const catName = vehicle.category || getCategoryName(vehicle.int_Category_Id) || "Car";
    const branchName = vehicle.branch || getBranchName(vehicle.int_Branch_Id) || "Main Branch";
    const vehicleId = vehicle._id ? String(vehicle._id) : String(vehicle.int_Vehicle_Id || vehicle.vehicleId || "");

    return {
      id: vehicleId,
      _id: vehicle._id ? String(vehicle._id) : undefined,
      int_Vehicle_Id: vehicle.int_Vehicle_Id,
      name: fullName,
      category: catName,
      seats: vehicle.int_Seating_Capacity || 5,
      dailyRent: vehicle.dbl_Daily_Rent || 0,
      image: vehicle.image || "",
      branch: branchName,
      fuelType: vehicle.fuelType || "Petrol",
      transmission: vehicle.transmission || "Manual",
      mileage: vehicle.mileage || "",
      reason,
    };
  });

  return {
    passengers: pax,
    destination,
    weatherData,
    capacityNote,
    recommendations: topRecommendations,
  };
}

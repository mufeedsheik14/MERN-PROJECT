import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useBookings } from "../../context/BookingContext";
import { useFleet } from "../../context/FleetContext";
import { branches, getBrandName, getBranchName } from "../../data/mockData";
import {
  sendLocationUpdate,
  fetchLiveLocations,
  fetchVehicleLocation,
} from "../../services/fleetService";

// Fix Leaflet default marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Branch hub fallback locations (standby positions when no live/stored GPS exists yet)
const BRANCH_COORDINATES = {
  1: { coord: [9.9252, 78.1198], name: "Madurai Central Hub" },
  2: { coord: [12.9941, 80.1709], name: "Chennai Airport Hub" },
  3: { coord: [11.0168, 76.9558], name: "Coimbatore Hub" },
  4: { coord: [12.9698, 77.7500], name: "Bengaluru Whitefield Hub" },
};

const DEFAULT_CENTER = [13.0827, 80.2707];

const VEHICLE_PALETTE = [
  "#F2894A", // Amber
  "#4FBE83", // Green
  "#60A5FA", // Sky Blue
  "#A78BFA", // Lavender
  "#EC4899", // Rose
  "#F59E0B", // Orange
  "#14B8A6", // Teal
  "#8B5CF6", // Purple
];

function makeVehicleMarkerIcon(color, isSelected, isMoving, isRealGps = false) {
  const size = isSelected ? 34 : 28;
  const pulseStyle = isMoving
    ? `box-shadow: 0 0 0 4px ${color}44, 0 4px 12px rgba(0,0,0,0.35);`
    : `box-shadow: 0 2px 8px rgba(0,0,0,0.25);`;

  const realGpsBadge = isRealGps
    ? `<span style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: #2A7A4A; border-radius: 50%; border: 1.5px solid #fff;"></span>`
    : "";

  return new L.DivIcon({
    className: "custom-fleet-marker",
    html: `
      <div style="
        position: relative;
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        ${pulseStyle}
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
        transform: scale(${isSelected ? 1.15 : 1});
      ">
        <span style="font-size: ${isSelected ? 16 : 13}px; line-height: 1;">🚗</span>
        ${realGpsBadge}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getRentalVehicleIdentifiers(rental, vehicles = []) {
  if (!rental) {
    return {
      bookingNumber: null,
      int_Vehicle_Id: null,
      vehicleObjId: null,
      vehicleIdentifier: null,
      matchedVehicle: null,
    };
  }

  const bookingNumber = rental.txt_Booking_Number || null;
  const rawIntId = rental.int_Vehicle_Id;
  const int_Vehicle_Id = rawIntId != null && !isNaN(Number(rawIntId)) ? Number(rawIntId) : null;

  const rawVehRef = rental.vehicle;
  const rawVehId = typeof rawVehRef === "object" && rawVehRef !== null ? rawVehRef._id : rawVehRef;
  const vehicleObjId = rawVehId ? String(rawVehId) : null;

  const matchedVehicle =
    vehicles.find((v) => {
      if (int_Vehicle_Id != null && (v.int_Vehicle_Id === int_Vehicle_Id || Number(v.int_Vehicle_Id) === int_Vehicle_Id)) return true;
      if (vehicleObjId && (String(v._id) === vehicleObjId || String(v.id) === vehicleObjId)) return true;
      return false;
    }) || null;

  const finalObjId = matchedVehicle?._id ? String(matchedVehicle._id) : vehicleObjId;
  const finalIntId = matchedVehicle?.int_Vehicle_Id != null ? Number(matchedVehicle.int_Vehicle_Id) : int_Vehicle_Id;
  const vehicleIdentifier = finalObjId || finalIntId;

  return {
    bookingNumber,
    int_Vehicle_Id: finalIntId,
    vehicleObjId: finalObjId,
    vehicleIdentifier,
    matchedVehicle,
  };
}

// Helper component inside MapContainer to smoothly pan/fly when coordinates update
function MapPanController({ targetCoord }) {
  const map = useMap();
  const prevCoordRef = useRef(null);

  useEffect(() => {
    if (!targetCoord || targetCoord[0] == null || targetCoord[1] == null) return;
    const [lat, lng] = targetCoord;
    const prev = prevCoordRef.current;
    if (!prev || Math.abs(prev[0] - lat) > 0.00005 || Math.abs(prev[1] - lng) > 0.00005) {
      prevCoordRef.current = [lat, lng];
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [targetCoord, map]);

  return null;
}

// In-memory cache for reverse-geocoded coordinates so we never repeatedly fetch the same area
const geoAddressCache = new Map();
const inFlightGeocodes = new Map();

/**
 * Reverse geocode coordinates to a concise, human-readable location name.
 * Uses OpenStreetMap Nominatim with fallback to BigDataCloud.
 * Returns null if network fails or times out, allowing immediate fallback to live coordinates.
 */
async function reverseGeocodeCoord(lat, lng) {
  if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) return null;
  const numLat = Number(lat);
  const numLng = Number(lng);
  const coordKey = `${numLat.toFixed(3)},${numLng.toFixed(3)}`;

  if (geoAddressCache.has(coordKey)) {
    return geoAddressCache.get(coordKey);
  }
  if (inFlightGeocodes.has(coordKey)) {
    return inFlightGeocodes.get(coordKey);
  }

  const promise = (async () => {
    // 1. Try OpenStreetMap Nominatim for detailed locality & county/city
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=14&addressdetails=1`,
        {
          headers: { "Accept-Language": "en" },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const primary =
          addr.suburb ||
          addr.village ||
          addr.neighbourhood ||
          addr.road ||
          addr.town ||
          addr.city_district ||
          addr.city;
        const secondary = addr.county || addr.city || addr.town || addr.state_district;
        let formatted = null;
        if (primary && secondary && primary.toLowerCase() !== secondary.toLowerCase()) {
          formatted = `${primary}, ${secondary}`;
        } else if (primary) {
          formatted = primary;
        } else if (secondary) {
          formatted = secondary;
        } else if (data.display_name) {
          formatted = data.display_name.split(",").slice(0, 2).map((s) => s.trim()).join(", ");
        }

        if (formatted) {
          geoAddressCache.set(coordKey, formatted);
          return formatted;
        }
      }
    } catch {
      // Fallback to secondary geocoder
    }

    // 2. Fallback to BigDataCloud (fast client-side CDN reverse geocoder)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numLat}&longitude=${numLng}&localityLanguage=en`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (res.ok) {
        const d = await res.json();
        let formatted = null;
        if (d.locality && d.city && d.locality.toLowerCase() !== d.city.toLowerCase()) {
          formatted = `${d.locality}, ${d.city}`;
        } else if (d.locality || d.city) {
          formatted = d.locality || d.city;
        } else if (d.principalSubdivision) {
          formatted = d.principalSubdivision;
        }

        if (formatted) {
          geoAddressCache.set(coordKey, formatted);
          return formatted;
        }
      }
    } catch {
      // Non-fatal
    }

    return null;
  })().finally(() => {
    inFlightGeocodes.delete(coordKey);
  });

  inFlightGeocodes.set(coordKey, promise);
  return promise;
}

export default function FleetLiveTracking({ branchFilter: initialBranchFilter = null, initialBookingId = null }) {
  const { bookings } = useBookings();
  const { vehicles } = useFleet();

  const [selectedBranch, setSelectedBranch] = useState(initialBranchFilter ?? "ALL");
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Real Phone GPS Watch State
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);
  const [activeTrackingBooking, setActiveTrackingBooking] = useState(null);
  const [activeTrackingVehicleId, setActiveTrackingVehicleId] = useState(null);
  const [deviceGpsData, setDeviceGpsData] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [liveLocationsMap, setLiveLocationsMap] = useState({}); // { [vehicleId]: locationDoc }
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState([]); // breadcrumb history
  const [backendSyncing, setBackendSyncing] = useState(false);
  const [geocodedLocations, setGeocodedLocations] = useState({}); // { [coordKey]: locationName }

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const isWatchingRef = useRef(false);
  const deviceGpsDataRef = useRef(null);
  const activeTrackingVehicleIdRef = useRef(null);

  // Filter ongoing active rental bookings (Status 3 = Ongoing)
  const activeRentals = useMemo(() => {
    return bookings.filter((b) => {
      if (b.int_Booking_Status_Id !== 3) return false;
      if (selectedBranch !== "ALL" && b.int_Pickup_Branch_Id !== Number(selectedBranch)) return false;
      return true;
    });
  }, [bookings, selectedBranch]);

  // Selected rental details
  const selectedRental = useMemo(() => {
    return activeRentals.find((r) => r.txt_Booking_Number === selectedBookingId) || activeRentals[0] || null;
  }, [activeRentals, selectedBookingId]);

  // Selected vehicle object from FleetContext
  const selectedVehicle = useMemo(() => {
    if (!selectedRental) return null;
    const { matchedVehicle } = getRentalVehicleIdentifiers(selectedRental, vehicles);
    return matchedVehicle;
  }, [vehicles, selectedRental]);

  // Initialize or re-sync selection
  useEffect(() => {
    if (activeRentals.length > 0 && (!selectedBookingId || !activeRentals.some((r) => r.txt_Booking_Number === selectedBookingId))) {
      setSelectedBookingId(initialBookingId || activeRentals[0].txt_Booking_Number);
    }
  }, [activeRentals, initialBookingId, selectedBookingId]);

  // ─────────────────────────────────────────────────────────────
  // 1. BACKEND LIVE LOCATIONS POLLING (Real GPS Mode)
  // ─────────────────────────────────────────────────────────────
  const loadBackendLiveLocations = useCallback(async () => {
    try {
      setBackendSyncing(true);
      const locations = await fetchLiveLocations();
      if (Array.isArray(locations)) {
        setLiveLocationsMap((prev) => {
          const nextMap = { ...prev };
          const curGps = deviceGpsDataRef.current;
          const curTrackId = activeTrackingVehicleIdRef.current;
          const isActivelyTracking = isWatchingRef.current && curGps;

          locations.forEach((loc) => {
            const locIntId = loc.int_Vehicle_Id != null ? Number(loc.int_Vehicle_Id) : null;
            const vId = loc.vehicleId?._id || loc.vehicleId;
            const locObjId = vId ? String(vId) : null;

            // Preserve local active Phone GPS telemetry if polled record is older
            const isMatchCurrentTracking =
              isActivelyTracking &&
              ((curGps.int_Vehicle_Id != null && locIntId === curGps.int_Vehicle_Id) ||
                (curGps.vehicleId && locObjId && String(curGps.vehicleId) === locObjId) ||
                (curTrackId && (curTrackId === locIntId || String(curTrackId) === locObjId)));

            if (isMatchCurrentTracking) {
              const locTime = loc.timestamp ? new Date(loc.timestamp).getTime() : 0;
              const curTime = curGps.timestamp ? new Date(curGps.timestamp).getTime() : 0;
              if (locTime <= curTime) {
                if (locIntId != null) nextMap[locIntId] = { ...loc, ...curGps };
                if (locObjId) nextMap[locObjId] = { ...loc, ...curGps };
                return;
              }
            }

            if (locIntId != null) nextMap[locIntId] = loc;
            if (locObjId) nextMap[locObjId] = loc;
          });

          return nextMap;
        });
        setLastSyncTime(new Date());
      }
    } catch {
      // Non-fatal background polling failure
    } finally {
      setBackendSyncing(false);
    }
  }, []);

  // Poll backend every 3.5s for live GPS positions
  useEffect(() => {
    loadBackendLiveLocations();
    pollIntervalRef.current = setInterval(loadBackendLiveLocations, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [loadBackendLiveLocations]);

  // Fetch breadcrumb history when selected vehicle changes
  useEffect(() => {
    if (!selectedRental) return;

    const { vehicleIdentifier, int_Vehicle_Id, vehicleObjId } = getRentalVehicleIdentifiers(selectedRental, vehicles);
    const vId = vehicleIdentifier || int_Vehicle_Id || vehicleObjId;
    if (!vId) return;

    fetchVehicleLocation(vId)
      .then((res) => {
        if (res?.history && Array.isArray(res.history)) {
          setSelectedVehicleHistory(res.history);
        }
      })
      .catch(() => {});
  }, [selectedRental, vehicles]);

  // ─────────────────────────────────────────────────────────────
  // 2. REAL PHONE GPS: navigator.geolocation.watchPosition()
  // ─────────────────────────────────────────────────────────────
  const startPhoneGps = useCallback(
    (rental) => {
      setGeoError(null);

      if (!("geolocation" in navigator)) {
        setGeoError("Geolocation is not supported by this browser. Please use Chrome, Safari, or a modern mobile browser.");
        return;
      }

      // Clear any prior active watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const {
        bookingNumber,
        int_Vehicle_Id: finalIntId,
        vehicleObjId,
        vehicleIdentifier,
      } = getRentalVehicleIdentifiers(rental, vehicles);

      const targetIdentifier = vehicleIdentifier || finalIntId || vehicleObjId;

      if (!targetIdentifier) {
        setGeoError("Vehicle identification failed. Please re-select the vehicle.");
        return;
      }

      // Immediately select this vehicle in the UI and mark tracking active
      setSelectedBookingId(bookingNumber || rental.txt_Booking_Number);
      setIsWatchingLocation(true);
      isWatchingRef.current = true;
      setActiveTrackingBooking(bookingNumber || rental.txt_Booking_Number);
      setActiveTrackingVehicleId(finalIntId || vehicleObjId || targetIdentifier);
      activeTrackingVehicleIdRef.current = finalIntId || vehicleObjId || targetIdentifier;

      // Handler for incoming GPS position reading
      const handleGpsReading = async (pos) => {
        setGeoError(null);
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const speedKmh = speed != null && speed > 0 ? Math.round(speed * 3.6) : 0;
        const readingTime = new Date(pos.timestamp || Date.now());

        const telemetry = {
          vehicleId: targetIdentifier,
          int_Vehicle_Id: finalIntId,
          latitude,
          longitude,
          accuracy: accuracy != null ? Math.round(accuracy) : null,
          speed: speedKmh,
          heading: heading != null ? Math.round(heading) : null,
          timestamp: readingTime,
          trackingStatus: "active",
          source: "mobile-gps",
        };

        // 1. Immediately update UI state with phone's live coordinates
        deviceGpsDataRef.current = telemetry;
        setDeviceGpsData(telemetry);
        setLastSyncTime(readingTime);
        setSelectedVehicleHistory((prev) => [
          ...prev,
          { latitude, longitude, timestamp: telemetry.timestamp },
        ]);

        // Immediate optimistic merge into liveLocationsMap so any card or marker immediately updates
        setLiveLocationsMap((prev) => {
          const updated = { ...prev };
          if (finalIntId != null) updated[finalIntId] = telemetry;
          if (vehicleObjId) updated[vehicleObjId] = telemetry;
          if (targetIdentifier) updated[String(targetIdentifier)] = telemetry;
          return updated;
        });

        // 2. Pan map to phone's current coordinates
        if (mapRef.current && typeof mapRef.current.flyTo === "function") {
          mapRef.current.flyTo([latitude, longitude], 14, { duration: 0.8 });
        }

        // 3. Transmit telemetry to MongoDB backend & merge response
        try {
          const savedRecord = await sendLocationUpdate(telemetry);
          if (savedRecord) {
            setLiveLocationsMap((prev) => {
              const updated = { ...prev };
              if (savedRecord.int_Vehicle_Id != null) updated[savedRecord.int_Vehicle_Id] = savedRecord;
              const vId = savedRecord.vehicleId?._id || savedRecord.vehicleId;
              if (vId) updated[String(vId)] = savedRecord;
              return updated;
            });
          }
        } catch (postErr) {
          console.warn("Telemetry transmission notice:", postErr.message);
        }
      };

      const handleGpsError = (err) => {
        let msg = "Unable to retrieve phone GPS position.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your mobile browser settings to track this vehicle.";
        } else if (err.code === 2) {
          msg = "GPS position unavailable. Please ensure device Location / GPS is turned ON.";
        } else if (err.code === 3) {
          msg = "GPS request timed out. Retrying location lock...";
        } else if (err.message) {
          msg = `GPS error: ${err.message}`;
        }
        setGeoError(msg);
      };

      // Watch options: enable high accuracy with a 20s timeout and 10s maximumAge
      const watchOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      };

      try {
        // Request immediate position fix first so the UI updates without delay
        navigator.geolocation.getCurrentPosition(
          handleGpsReading,
          (err) => {
            // Fallback for immediate fix if high-accuracy satellites are slow (e.g. indoors)
            if (err.code === 3) {
              navigator.geolocation.getCurrentPosition(
                handleGpsReading,
                handleGpsError,
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
              );
            } else {
              handleGpsError(err);
            }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
        );

        // Continuous watchPosition for live ongoing tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleGpsReading,
          handleGpsError,
          watchOptions
        );
      } catch (err) {
        setGeoError(`Geolocation initialization error: ${err.message}`);
        setIsWatchingLocation(false);
        isWatchingRef.current = false;
        setActiveTrackingBooking(null);
        setActiveTrackingVehicleId(null);
        activeTrackingVehicleIdRef.current = null;
      }
    },
    [vehicles]
  );

  const stopPhoneGps = useCallback(
    async (rental) => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      isWatchingRef.current = false;
      const lastKnown = deviceGpsDataRef.current;
      deviceGpsDataRef.current = null;
      activeTrackingVehicleIdRef.current = null;

      setIsWatchingLocation(false);
      setActiveTrackingBooking(null);
      setActiveTrackingVehicleId(null);
      setDeviceGpsData(null);

      // Notify backend that tracking is stopped
      if (rental) {
        const {
          int_Vehicle_Id: finalIntId,
          vehicleObjId,
          vehicleIdentifier,
        } = getRentalVehicleIdentifiers(rental, vehicles);

        const targetIdentifier = vehicleIdentifier || finalIntId || vehicleObjId;
        const stored =
          (finalIntId != null ? liveLocationsMap[finalIntId] : null) ||
          (vehicleObjId ? liveLocationsMap[vehicleObjId] : null);

        const lat = lastKnown?.latitude ?? stored?.latitude;
        const lng = lastKnown?.longitude ?? stored?.longitude;

        if (lat != null && lng != null && targetIdentifier) {
          try {
            const savedStopped = await sendLocationUpdate({
              vehicleId: targetIdentifier,
              int_Vehicle_Id: finalIntId,
              latitude: lat,
              longitude: lng,
              trackingStatus: "stopped",
              source: "mobile-gps",
            });
            if (savedStopped) {
              setLiveLocationsMap((prev) => {
                const updated = { ...prev };
                if (savedStopped.int_Vehicle_Id != null) updated[savedStopped.int_Vehicle_Id] = savedStopped;
                const vId = savedStopped.vehicleId?._id || savedStopped.vehicleId;
                if (vId) updated[String(vId)] = savedStopped;
                return updated;
              });
            }
          } catch {
            // Non-fatal
          }
        }
      }
    },
    [vehicles, liveLocationsMap]
  );

  // Clean up phone GPS watcher on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. COORDINATE RESOLVER FOR VEHICLES (Real GPS or MongoDB)
  // ─────────────────────────────────────────────────────────────
  const getVehicleCoordinates = useCallback(
    (rental) => {
      if (!rental) {
        return {
          coord: DEFAULT_CENTER,
          isLive: false,
          source: "Station Standby",
          accuracy: null,
          speed: 0,
          heading: null,
          lastUpdated: null,
          status: "standby",
        };
      }

      const {
        bookingNumber,
        int_Vehicle_Id,
        vehicleObjId,
      } = getRentalVehicleIdentifiers(rental, vehicles);

      // 1. If this phone is actively streaming this vehicle, use local phone GPS position
      const isActivelyWatchedOnDevice =
        isWatchingLocation &&
        deviceGpsData &&
        (
          (activeTrackingBooking && bookingNumber && activeTrackingBooking === bookingNumber) ||
          (activeTrackingVehicleId && (
            (int_Vehicle_Id != null && activeTrackingVehicleId === int_Vehicle_Id) ||
            (vehicleObjId && String(activeTrackingVehicleId) === String(vehicleObjId))
          ))
        );

      if (isActivelyWatchedOnDevice) {
        return {
          coord: [deviceGpsData.latitude, deviceGpsData.longitude],
          isLive: true,
          source: "Live Phone GPS",
          accuracy: deviceGpsData.accuracy,
          speed: deviceGpsData.speed ?? 0,
          heading: deviceGpsData.heading,
          lastUpdated: deviceGpsData.timestamp ? new Date(deviceGpsData.timestamp) : new Date(),
          status: "active",
        };
      }

      // 2. Check latest recorded backend position from MongoDB
      const backendRecord =
        (int_Vehicle_Id != null ? liveLocationsMap[int_Vehicle_Id] : null) ||
        (vehicleObjId ? liveLocationsMap[vehicleObjId] : null) ||
        (rental.vehicle ? liveLocationsMap[String(typeof rental.vehicle === 'object' ? rental.vehicle._id : rental.vehicle)] : null);

      if (backendRecord && backendRecord.latitude != null && backendRecord.longitude != null) {
        const recTime = backendRecord.timestamp ? new Date(backendRecord.timestamp) : null;
        // Consider live if marked active and transmitted via mobile GPS within recent 2 minutes
        const isRecent = recTime && (Date.now() - recTime.getTime() < 120000);
        const isLiveGps =
          backendRecord.trackingStatus === "active" &&
          (backendRecord.source === "mobile-gps" || backendRecord.source === "Live Phone GPS") &&
          isRecent;

        return {
          coord: [Number(backendRecord.latitude), Number(backendRecord.longitude)],
          isLive: isLiveGps,
          source: isLiveGps ? "Live Phone GPS" : "Stored MongoDB Location",
          accuracy: backendRecord.accuracy != null ? Number(backendRecord.accuracy) : null,
          speed: backendRecord.speed != null ? Number(backendRecord.speed) : 0,
          heading: backendRecord.heading != null ? Number(backendRecord.heading) : null,
          lastUpdated: recTime,
          status: backendRecord.trackingStatus || "stored",
        };
      }

      // 3. Fallback to branch pickup station when vehicle has no GPS data yet
      const branchCoord = BRANCH_COORDINATES[rental.int_Pickup_Branch_Id]?.coord || DEFAULT_CENTER;
      return {
        coord: branchCoord,
        isLive: false,
        source: "Station Standby",
        accuracy: null,
        speed: 0,
        heading: null,
        lastUpdated: null,
        status: "standby",
      };
    },
    [isWatchingLocation, deviceGpsData, activeTrackingBooking, activeTrackingVehicleId, vehicles, liveLocationsMap]
  );

  // Pan map when selected vehicle changes
  useEffect(() => {
    if (!selectedRental || !mapRef.current) return;
    const { coord } = getVehicleCoordinates(selectedRental);
    if (coord && mapRef.current) {
      mapRef.current.flyTo(coord, 13, { duration: 0.8 });
    }
  }, [selectedRental?.txt_Booking_Number, getVehicleCoordinates]);

  // Reverse geocode live or stored coordinates to provide human-readable location names
  useEffect(() => {
    let isCancelled = false;

    activeRentals.forEach((rental) => {
      const geo = getVehicleCoordinates(rental);
      const isDeviceTrackingThis =
        isWatchingLocation &&
        ((activeTrackingBooking && activeTrackingBooking === rental.txt_Booking_Number) ||
          (activeTrackingVehicleId &&
            (activeTrackingVehicleId === rental.int_Vehicle_Id ||
              String(activeTrackingVehicleId) === String(rental.vehicle?._id || rental.vehicle))));
      const isLiveGpsActive = geo.isLive || isDeviceTrackingThis;
      const isStoredGps = geo.source && geo.source.includes("MongoDB");

      if ((isLiveGpsActive || isStoredGps) && geo.coord && geo.coord[0] != null && geo.coord[1] != null) {
        const [lat, lng] = geo.coord;
        const coordKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;

        // Check if already cached in memory
        if (geoAddressCache.has(coordKey)) {
          const cached = geoAddressCache.get(coordKey);
          if (cached) {
            setGeocodedLocations((prev) => (prev[coordKey] === cached ? prev : { ...prev, [coordKey]: cached }));
          }
          return;
        }

        // Fetch reverse geocoded place name
        reverseGeocodeCoord(lat, lng).then((name) => {
          if (!isCancelled && name) {
            setGeocodedLocations((prev) => (prev[coordKey] === name ? prev : { ...prev, [coordKey]: name }));
          }
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeRentals, getVehicleCoordinates, isWatchingLocation, activeTrackingBooking, activeTrackingVehicleId]);

  // Helper to resolve the location display for a vehicle tracking card
  const getCardLocationDisplay = useCallback(
    (rental, geoStatus, isLiveGpsActive) => {
      const isStoredGps = geoStatus.source && geoStatus.source.includes("MongoDB");
      const hasGps = isLiveGpsActive || isStoredGps;

      // When tracking is stopped or no live GPS exists, and no stored GPS exists, display pickup branch
      if (!hasGps) {
        return getBranchName(rental.int_Pickup_Branch_Id);
      }

      const [lat, lng] = geoStatus.coord || [];
      if (lat == null || lng == null) {
        return getBranchName(rental.int_Pickup_Branch_Id);
      }

      const coordKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
      const readableLocation = geocodedLocations[coordKey] || geoAddressCache.get(coordKey);

      // If a human-readable location name is available from live GPS/reverse geocoding, show that
      if (readableLocation) {
        return readableLocation;
      }

      // Otherwise show the live/stored coordinates instead of a wrong branch name
      return `${Number(lat).toFixed(5)}°N, ${Number(lng).toFixed(5)}°E`;
    },
    [geocodedLocations]
  );

  // Filtered vehicle cards for search
  const filteredRentals = useMemo(() => {
    if (!searchQuery.trim()) return activeRentals;
    const q = searchQuery.toLowerCase();
    return activeRentals.filter((r) => {
      const vehicle = vehicles.find((v) => v.int_Vehicle_Id === r.int_Vehicle_Id);
      return (
        r.txt_Booking_Number.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.vehicleLabel?.toLowerCase().includes(q) ||
        vehicle?.txt_Model_Name?.toLowerCase().includes(q) ||
        vehicle?.txt_Registration_Number?.toLowerCase().includes(q)
      );
    });
  }, [activeRentals, searchQuery, vehicles]);

  const anyLiveTracking =
    isWatchingLocation ||
    Object.values(liveLocationsMap).some(
      (loc) =>
        loc &&
        loc.trackingStatus === "active" &&
        (loc.source === "mobile-gps" || loc.source === "Live Phone GPS") &&
        loc.timestamp &&
        Date.now() - new Date(loc.timestamp).getTime() < 120000
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Controls Banner */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: isWatchingLocation || anyLiveTracking ? "var(--signal-green-bg)" : "var(--accent-subtle)",
              color: isWatchingLocation || anyLiveTracking ? "var(--signal-green)" : "var(--accent)",
              border: `1px solid ${isWatchingLocation || anyLiveTracking ? "var(--signal-green)" : "var(--accent)"}`,
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "0.76rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isWatchingLocation || anyLiveTracking ? "var(--signal-green)" : "var(--accent)",
                display: "inline-block",
                boxShadow: isWatchingLocation || anyLiveTracking ? "0 0 6px var(--signal-green)" : "none",
              }}
            />
            {isWatchingLocation
              ? "PHONE GPS BROADCASTING ACTIVE"
              : anyLiveTracking
              ? "LIVE FLEET PHONE GPS ACTIVE"
              : "FLEET LIVE GPS TELEMETRY"}
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Tracking <strong style={{ color: "var(--text)" }}>{activeRentals.length}</strong> active rental vehicles
          </div>
        </div>

        {/* Global Controls & Branch Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Branch filter if not locked */}
          {initialBranchFilter == null && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{
                  fontSize: "0.8rem",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                }}
              >
                <option value="ALL">All Branches ({bookings.filter((b) => b.int_Booking_Status_Id === 3).length})</option>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync status indicator */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-faint)",
              background: "var(--bg-inset)",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🕒 Sync: <strong>{lastSyncTime.toLocaleTimeString()}</strong></span>
            {backendSyncing && <span style={{ color: "var(--accent)" }}>●</span>}
          </div>
        </div>
      </div>

      {/* Geolocation Error / Warning Banner */}
      {geoError && (
        <div
          style={{
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "var(--radius)",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontSize: "0.84rem",
            color: "#B03C2A",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <strong>GPS Telemetry Notice:</strong> {geoError}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            onClick={() => setGeoError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Vehicle Roster, Right Live Map & Telemetry Details */}
      {activeRentals.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: "60px 24px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "3rem" }}>🛰️</span>
          <h3 style={{ margin: 0 }}>No Ongoing Vehicle Trips</h3>
          <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "420px", fontSize: "0.9rem" }}>
            Live fleet tracking activates automatically when customer bookings are in <strong>Ongoing</strong> trip status.
            {selectedBranch !== "ALL" && ` No active ongoing rentals found for this branch.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "16px", minHeight: "620px" }}>
          {/* Left Column: Vehicle List Sidebar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "680px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {/* Search filter input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search vehicle, booking, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Vehicle List Cards */}
            {filteredRentals.map((rental, i) => {
              const { matchedVehicle: vehicle } = getRentalVehicleIdentifiers(rental, vehicles);
              const isSelected = rental.txt_Booking_Number === selectedRental?.txt_Booking_Number;
              const color = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];

              const geoStatus = getVehicleCoordinates(rental);
              const isDeviceTrackingThis =
                isWatchingLocation &&
                ((activeTrackingBooking && activeTrackingBooking === rental.txt_Booking_Number) ||
                  (activeTrackingVehicleId &&
                    (activeTrackingVehicleId === rental.int_Vehicle_Id ||
                      String(activeTrackingVehicleId) === String(rental.vehicle?._id || rental.vehicle))));

              const isLiveGpsActive = geoStatus.isLive || isDeviceTrackingThis;

              const tripStatusLabel = isLiveGpsActive
                ? "Live Phone GPS"
                : geoStatus.source.includes("MongoDB")
                ? "Stored Location"
                : "Standby";

              return (
                <div
                  key={rental.txt_Booking_Number}
                  onClick={() => setSelectedBookingId(rental.txt_Booking_Number)}
                  style={{
                    background: "var(--bg-elevated)",
                    border: `2px solid ${isSelected ? color : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "14px",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    boxShadow: isSelected ? `0 0 0 3px ${color}25, var(--shadow)` : "none",
                  }}
                >
                  {/* Top Header: Indicator, Vehicle Model, Status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: color,
                          flexShrink: 0,
                          boxShadow: isSelected ? `0 0 8px ${color}` : "none",
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {vehicle ? `${getBrandName(vehicle.int_Brand_Id)} ${vehicle.txt_Model_Name}` : rental.vehicleLabel}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", gap: "6px" }}>
                          <span>#{rental.txt_Booking_Number}</span>
                          {vehicle?.txt_Registration_Number && (
                            <span style={{ fontWeight: 600, color: "var(--accent)" }}>{vehicle.txt_Registration_Number}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                        background:
                          isLiveGpsActive
                            ? "var(--signal-green-bg)"
                            : geoStatus.source.includes("MongoDB")
                            ? "var(--accent-subtle)"
                            : "var(--signal-amber-bg)",
                        color:
                          isLiveGpsActive
                            ? "var(--signal-green)"
                            : geoStatus.source.includes("MongoDB")
                            ? "var(--accent)"
                            : "var(--signal-amber)",
                        border: `1px solid ${
                          isLiveGpsActive
                            ? "var(--signal-green)"
                            : geoStatus.source.includes("MongoDB")
                            ? "var(--accent)"
                            : "var(--signal-amber)"
                        }`,
                      }}
                    >
                      {isLiveGpsActive ? "● " : ""}
                      {tripStatusLabel}
                    </span>
                  </div>

                  {/* Customer and Location */}
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>👤 {rental.customerName || "Customer"} • 📍</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: isLiveGpsActive ? 600 : 400,
                        color: isLiveGpsActive ? "var(--text)" : "var(--text-muted)",
                      }}
                      title={getCardLocationDisplay(rental, geoStatus, isLiveGpsActive)}
                    >
                      {getCardLocationDisplay(rental, geoStatus, isLiveGpsActive)}
                    </span>
                  </div>

                  {/* Live Coordinates / Accuracy */}
                  <div
                    style={{
                      fontSize: "0.74rem",
                      background: "var(--bg-inset)",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <span>{isLiveGpsActive ? "📱" : "🌐"}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontWeight: isLiveGpsActive ? 700 : 500 }}>
                        {geoStatus.coord[0].toFixed(5)}°N, {geoStatus.coord[1].toFixed(5)}°E
                      </span>
                    </div>
                    {geoStatus.accuracy != null && (
                      <span style={{ fontSize: "0.68rem", color: isLiveGpsActive ? "var(--signal-green)" : "var(--text-muted)", whiteSpace: "nowrap", fontWeight: 600 }}>
                        ±{geoStatus.accuracy}m
                      </span>
                    )}
                  </div>

                  {/* Telemetry Stats: Speed, Source, Last Updated */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.60rem", color: "var(--text-faint)", textTransform: "uppercase" }}>GPS Speed</div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700 }}>
                        {geoStatus.speed != null ? `${geoStatus.speed} km/h` : "0 km/h"}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.60rem", color: "var(--text-faint)", textTransform: "uppercase" }}>Data Source</div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isLiveGpsActive ? "var(--signal-green)" : "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isLiveGpsActive ? "📱 Live Phone GPS" : geoStatus.source.includes("MongoDB") ? "MongoDB" : "Standby"}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.60rem", color: "var(--text-faint)", textTransform: "uppercase" }}>Updated</div>
                      <div style={{ fontSize: "0.70rem", fontWeight: 600, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {geoStatus.lastUpdated ? new Date(geoStatus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls - Real Phone GPS */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {isDeviceTrackingThis ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          flex: 1,
                          fontSize: "0.72rem",
                          padding: "6px 8px",
                          background: "var(--signal-amber-bg)",
                          color: "var(--signal-amber)",
                          borderColor: "var(--border)",
                          fontWeight: 700,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          stopPhoneGps(rental);
                        }}
                      >
                        ⏸ Stop Phone GPS
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          flex: 1,
                          fontSize: "0.72rem",
                          padding: "6px 8px",
                          background: "var(--signal-green-bg)",
                          color: "var(--signal-green)",
                          borderColor: "var(--signal-green)",
                          fontWeight: 700,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startPhoneGps(rental);
                        }}
                      >
                        📱 Track with Phone GPS
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Live Map with Interactive Markers & Overlay Details */}
          <div
            style={{
              position: "relative",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MapContainer
              center={
                selectedRental
                  ? getVehicleCoordinates(selectedRental).coord
                  : DEFAULT_CENTER
              }
              zoom={13}
              style={{ height: "100%", minHeight: "560px", width: "100%" }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Real Phone GPS Breadcrumb Trail */}
              {selectedVehicleHistory.length > 1 && (
                <Polyline
                  positions={selectedVehicleHistory.map((h) => [h.latitude, h.longitude])}
                  color="#2A7A4A"
                  weight={4}
                  opacity={0.8}
                />
              )}

              {/* Pan/Fly map smoothly whenever selected vehicle or phone coordinates change */}
              <MapPanController
                targetCoord={
                  selectedRental ? getVehicleCoordinates(selectedRental).coord : null
                }
              />

              {/* Vehicles on map */}
              {activeRentals.map((rental, i) => {
                const { matchedVehicle: vehicle } = getRentalVehicleIdentifiers(rental, vehicles);
                const isSelected = rental.txt_Booking_Number === selectedRental?.txt_Booking_Number;
                const color = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];
                const geo = getVehicleCoordinates(rental);
                const isDeviceTrackingThis =
                  isWatchingLocation &&
                  ((activeTrackingBooking && activeTrackingBooking === rental.txt_Booking_Number) ||
                    (activeTrackingVehicleId &&
                      (activeTrackingVehicleId === rental.int_Vehicle_Id ||
                        String(activeTrackingVehicleId) === String(rental.vehicle?._id || rental.vehicle))));
                const isLiveGpsActive = geo.isLive || isDeviceTrackingThis;

                return (
                  <Marker
                    key={rental.txt_Booking_Number}
                    position={geo.coord}
                    icon={makeVehicleMarkerIcon(color, isSelected, isLiveGpsActive, isLiveGpsActive)}
                    eventHandlers={{
                      click: () => setSelectedBookingId(rental.txt_Booking_Number),
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 210, fontFamily: "sans-serif", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "1rem" }}>🚗</span>
                          <strong style={{ fontSize: "0.9rem" }}>
                            {vehicle ? `${getBrandName(vehicle.int_Brand_Id)} ${vehicle.txt_Model_Name}` : rental.vehicleLabel}
                          </strong>
                        </div>
                        <div style={{ color: "#666", fontSize: "0.72rem", marginBottom: "6px" }}>
                          Reg: <strong>{vehicle?.txt_Registration_Number || "N/A"}</strong> • Trip #{rental.txt_Booking_Number}
                        </div>
                        <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #eee" }} />
                        <div>👤 <strong>Customer:</strong> {rental.customerName}</div>
                        <div>📡 <strong>Source:</strong> {isLiveGpsActive ? "📱 Live Phone GPS" : `💾 ${geo.source}`}</div>
                        <div>🌐 <strong>Coordinates:</strong> {geo.coord[0].toFixed(5)}° N, {geo.coord[1].toFixed(5)}° E</div>
                        {geo.accuracy != null && <div>🎯 <strong>Accuracy:</strong> ±{geo.accuracy} meters</div>}
                        <div>⚡ <strong>Speed:</strong> {geo.speed != null ? `${geo.speed} km/h` : "0 km/h"}</div>
                        <div>
                          🚦 <strong>Status:</strong>{" "}
                          <span style={{ fontWeight: 700, color: isLiveGpsActive ? "#2A7A4A" : geo.source.includes("MongoDB") ? "#1865AB" : "#B87E10" }}>
                            {isLiveGpsActive ? "Live Phone GPS" : geo.source.includes("MongoDB") ? "Stored in MongoDB" : "Standby"}
                          </span>
                        </div>
                        <div style={{ marginTop: "6px", fontSize: "0.68rem", color: "#888" }}>
                          Last Update: {geo.lastUpdated ? new Date(geo.lastUpdated).toLocaleTimeString() : lastSyncTime.toLocaleTimeString()}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Floating Telemetry Box for Selected Vehicle */}
            {selectedRental && (
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  right: "16px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "14px 18px",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  backdropFilter: "blur(8px)",
                }}
              >
                {(() => {
                  const { matchedVehicle: vehicle } = getRentalVehicleIdentifiers(selectedRental, vehicles);
                  const geo = getVehicleCoordinates(selectedRental);
                  const isDeviceTrackingThis =
                    isWatchingLocation &&
                    ((activeTrackingBooking && activeTrackingBooking === selectedRental.txt_Booking_Number) ||
                      (activeTrackingVehicleId &&
                        (activeTrackingVehicleId === selectedRental.int_Vehicle_Id ||
                          String(activeTrackingVehicleId) === String(selectedRental.vehicle?._id || selectedRental.vehicle))));
                  const isLiveGpsActive = geo.isLive || isDeviceTrackingThis;

                  return (
                    <>
                      {/* Vehicle & Trip Info */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "1.1rem" }}>🚘</span>
                          <strong style={{ fontSize: "1rem" }}>
                            {vehicle ? `${getBrandName(vehicle.int_Brand_Id)} ${vehicle.txt_Model_Name}` : selectedRental.vehicleLabel}
                          </strong>
                          {vehicle?.txt_Registration_Number && (
                            <span
                              style={{
                                background: "var(--accent-subtle)",
                                color: "var(--accent)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {vehicle.txt_Registration_Number}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Trip #{selectedRental.txt_Booking_Number} • Rented by <strong>{selectedRental.customerName}</strong>
                        </div>
                      </div>

                      {/* Current Real GPS Location */}
                      <div style={{ minWidth: "180px" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                          {isLiveGpsActive ? "Live Phone GPS Position" : geo.source.includes("MongoDB") ? "Stored MongoDB Location" : "Station Standby Location"}
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>
                          {geo.coord[0].toFixed(5)}° N, {geo.coord[1].toFixed(5)}° E
                        </div>
                        <div style={{ fontSize: "0.72rem", color: isLiveGpsActive ? "var(--signal-green)" : "var(--text-muted)" }}>
                          {isLiveGpsActive ? "📱 Live Phone GPS" : `💾 ${geo.source}`} {geo.accuracy ? `(±${geo.accuracy}m)` : ""}
                        </div>
                      </div>

                      {/* Status & Speed */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Telemetry Status
                          </div>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color:
                                isLiveGpsActive
                                  ? "var(--signal-green)"
                                  : geo.source.includes("MongoDB")
                                  ? "var(--accent)"
                                  : "var(--signal-amber)",
                            }}
                          >
                            {isLiveGpsActive ? "🟢 Live Phone GPS" : geo.source.includes("MongoDB") ? "💾 Stored in MongoDB" : "⏸ Standby"}
                          </span>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Speed
                          </div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                            {geo.speed != null ? `${geo.speed} km/h` : "0 km/h"}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Last Updated
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {geo.lastUpdated ? new Date(geo.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : lastSyncTime.toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Direct action button in telemetry box */}
                        <div>
                          {isDeviceTrackingThis ? (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                fontSize: "0.75rem",
                                padding: "6px 12px",
                                background: "var(--signal-amber-bg)",
                                color: "var(--signal-amber)",
                                borderColor: "var(--border)",
                                fontWeight: 700,
                              }}
                              onClick={() => stopPhoneGps(selectedRental)}
                            >
                              ⏸ Stop Tracking
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                fontSize: "0.75rem",
                                padding: "6px 12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              onClick={() => startPhoneGps(selectedRental)}
                            >
                              📱 Track with Phone GPS
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

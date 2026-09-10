import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useBookings } from "../../context/BookingContext";
import { useFleet } from "../../context/FleetContext";
import { branches, getBrandName, getBranchName } from "../../data/mockData";

// Fix Leaflet default marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Route 1: Chennai Hub -> Mahabalipuram ECR Scenic Corridor
const WAYPOINTS_CHENNAI = [
  { coord: [13.0827, 80.2707], name: "Chennai Central Hub" },
  { coord: [13.0475, 80.2541], name: "Royapettah - Anna Salai" },
  { coord: [13.0067, 80.2570], name: "Adyar Flyover Corridor" },
  { coord: [12.9675, 80.2590], name: "Thiruvanmiyur ECR" },
  { coord: [12.9056, 80.2285], name: "Sholinganallur Junction" },
  { coord: [12.8399, 80.2223], name: "Kelambakkam Crossroad" },
  { coord: [12.7214, 80.1834], name: "Thiruporur Bypass" },
  { coord: [12.6208, 80.1945], name: "Mahabalipuram North Point" },
  { coord: [12.6111, 80.1925], name: "Mahabalipuram Heritage Resort" },
];

// Route 2: Coimbatore Hub -> Pollachi & Valparai Gateway
const WAYPOINTS_COIMBATORE = [
  { coord: [11.0168, 76.9558], name: "Gandhipuram City Hub" },
  { coord: [11.0289, 76.9754], name: "Peelamedu Avinashi Road" },
  { coord: [11.0360, 77.0142], name: "Coimbatore Airport Corridor" },
  { coord: [10.9856, 76.9620], name: "Ukkadam Lake Tollway" },
  { coord: [10.8789, 76.9854], name: "Kinathukadavu Express Bypass" },
  { coord: [10.6609, 77.0048], name: "Pollachi Highway Center" },
  { coord: [10.5122, 76.9845], name: "Aliyar Foothills Gate" },
  { coord: [10.3262, 76.9554], name: "Valparai Ghat Point" },
];

function generateSmoothRoute(waypointList, stepsPerSegment = 22) {
  const points = [];
  for (let i = 0; i < waypointList.length - 1; i++) {
    const p1 = waypointList[i].coord;
    const p2 = waypointList[i + 1].coord;
    for (let j = 0; j <= stepsPerSegment; j++) {
      const t = j / stepsPerSegment;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      const nearestName = t < 0.5 ? waypointList[i].name : waypointList[i + 1].name;
      points.push({ coord: [lat, lng], locationName: nearestName });
    }
  }
  return points;
}

const ROUTE_DATA = {
  1: {
    name: "Chennai - ECR Corridor",
    points: generateSmoothRoute(WAYPOINTS_CHENNAI, 22),
    totalDistanceKm: 58.5,
    center: [12.85, 80.22],
  },
  2: {
    name: "Coimbatore - Western Corridor",
    points: generateSmoothRoute(WAYPOINTS_COIMBATORE, 24),
    totalDistanceKm: 64.2,
    center: [10.75, 76.97],
  },
};

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

function makeVehicleMarkerIcon(color, isSelected, isMoving) {
  const size = isSelected ? 34 : 28;
  const pulseStyle = isMoving
    ? `box-shadow: 0 0 0 4px ${color}44, 0 4px 12px rgba(0,0,0,0.35);`
    : `box-shadow: 0 2px 8px rgba(0,0,0,0.25);`;

  return new L.DivIcon({
    className: "custom-fleet-marker",
    html: `
      <div style="
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
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const startIcon = new L.DivIcon({
  className: "custom-route-icon",
  html: `<div style="background: #2A7A4A; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap;">📍 Start</div>`,
  iconAnchor: [24, 12],
});

const endIcon = new L.DivIcon({
  className: "custom-route-icon",
  html: `<div style="background: #B03C2A; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap;">🏁 End</div>`,
  iconAnchor: [24, 12],
});

export default function FleetLiveTracking({ branchFilter: initialBranchFilter = null, initialBookingId = null }) {
  const { bookings } = useBookings();
  const { vehicles } = useFleet();

  const [selectedBranch, setSelectedBranch] = useState(initialBranchFilter ?? "ALL");
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId);
  const [searchQuery, setSearchQuery] = useState("");
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const mapRef = useRef(null);
  const intervalRef = useRef(null);

  // Filter ongoing active rental bookings (Status 3 = Ongoing)
  const activeRentals = useMemo(() => {
    return bookings.filter((b) => {
      if (b.int_Booking_Status_Id !== 3) return false;
      if (selectedBranch !== "ALL" && b.int_Pickup_Branch_Id !== Number(selectedBranch)) return false;
      return true;
    });
  }, [bookings, selectedBranch]);

  // Simulation state per booking: { [bookingNumber]: { index, isPlaying } }
  const [simStateMap, setSimStateMap] = useState({});

  // Initialize or re-sync simulation states for active rentals
  useEffect(() => {
    setSimStateMap((prev) => {
      const next = { ...prev };
      activeRentals.forEach((rental, i) => {
        if (!next[rental.txt_Booking_Number]) {
          const route = ROUTE_DATA[rental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
          const totalPoints = route.points.length;
          // Stagger starting progress for visual variety
          const initialIndex = Math.min(
            Math.floor(((i * 3 + 1) / (activeRentals.length * 3 + 2)) * totalPoints * 0.7),
            totalPoints - 5
          );
          next[rental.txt_Booking_Number] = {
            index: Math.max(0, initialIndex),
            isPlaying: true, // Auto-start simulation for live feel
          };
        }
      });
      return next;
    });

    if (activeRentals.length > 0 && (!selectedBookingId || !activeRentals.some((r) => r.txt_Booking_Number === selectedBookingId))) {
      setSelectedBookingId(initialBookingId || activeRentals[0].txt_Booking_Number);
    }
  }, [activeRentals, initialBookingId, selectedBookingId]);

  // Interval driver for simulated movement
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const stepInterval = Math.max(200, Math.floor(600 / simSpeed));

    intervalRef.current = setInterval(() => {
      let movedAny = false;
      setSimStateMap((prev) => {
        const updated = { ...prev };
        activeRentals.forEach((rental) => {
          const current = updated[rental.txt_Booking_Number];
          if (!current || !current.isPlaying) return;

          const route = ROUTE_DATA[rental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
          const maxIdx = route.points.length - 1;

          if (current.index < maxIdx) {
            updated[rental.txt_Booking_Number] = {
              ...current,
              index: current.index + 1,
            };
            movedAny = true;
          } else {
            updated[rental.txt_Booking_Number] = {
              ...current,
              isPlaying: false,
            };
          }
        });
        return updated;
      });

      if (movedAny) {
        setLastSyncTime(new Date());
      }
    }, stepInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeRentals, simSpeed]);

  // Selected rental details
  const selectedRental = useMemo(() => {
    return activeRentals.find((r) => r.txt_Booking_Number === selectedBookingId) || activeRentals[0] || null;
  }, [activeRentals, selectedBookingId]);

  // Pan map when selected vehicle changes
  useEffect(() => {
    if (!selectedRental || !mapRef.current) return;
    const sim = simStateMap[selectedRental.txt_Booking_Number];
    const route = ROUTE_DATA[selectedRental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
    const point = route.points[sim?.index || 0];
    if (point && mapRef.current) {
      mapRef.current.flyTo(point.coord, 13, { duration: 0.8 });
    }
  }, [selectedRental?.txt_Booking_Number]);

  // Controls
  const togglePlay = (bookingNumber) => {
    setSimStateMap((prev) => {
      const current = prev[bookingNumber] || { index: 0, isPlaying: false };
      return {
        ...prev,
        [bookingNumber]: {
          ...current,
          isPlaying: !current.isPlaying,
        },
      };
    });
    setLastSyncTime(new Date());
  };

  const resetVehicle = (bookingNumber) => {
    setSimStateMap((prev) => ({
      ...prev,
      [bookingNumber]: {
        index: 0,
        isPlaying: false,
      },
    }));
    setLastSyncTime(new Date());
  };

  const playAll = () => {
    setSimStateMap((prev) => {
      const next = { ...prev };
      activeRentals.forEach((r) => {
        const curr = next[r.txt_Booking_Number] || { index: 0, isPlaying: false };
        const route = ROUTE_DATA[r.int_Pickup_Branch_Id] || ROUTE_DATA[1];
        if (curr.index < route.points.length - 1) {
          next[r.txt_Booking_Number] = { ...curr, isPlaying: true };
        }
      });
      return next;
    });
    setLastSyncTime(new Date());
  };

  const pauseAll = () => {
    setSimStateMap((prev) => {
      const next = { ...prev };
      activeRentals.forEach((r) => {
        const curr = next[r.txt_Booking_Number] || { index: 0, isPlaying: false };
        next[r.txt_Booking_Number] = { ...curr, isPlaying: false };
      });
      return next;
    });
    setLastSyncTime(new Date());
  };

  const anyPlaying = activeRentals.some((r) => simStateMap[r.txt_Booking_Number]?.isPlaying);

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

  // Active route to draw based on selected vehicle
  const currentRoute = selectedRental
    ? (ROUTE_DATA[selectedRental.int_Pickup_Branch_Id] || ROUTE_DATA[1])
    : ROUTE_DATA[1];

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
              background: "var(--signal-green-bg)",
              color: "var(--signal-green)",
              border: "1px solid var(--signal-green)",
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
                background: "var(--signal-green)",
                display: "inline-block",
                boxShadow: "0 0 6px var(--signal-green)",
              }}
            />
            LIVE FLEET TELEMETRY
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Tracking <strong style={{ color: "var(--text)" }}>{activeRentals.length}</strong> active rental vehicles
          </div>
        </div>

        {/* Global Controls */}
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

          {/* Speed selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Speed:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: simSpeed === spd ? "var(--accent)" : "var(--bg-inset)",
                  color: simSpeed === spd ? "#fff" : "var(--text)",
                  cursor: "pointer",
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: "0.8rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={anyPlaying ? pauseAll : playAll}
          >
            {anyPlaying ? "⏸ Pause All" : "▶ Play All"}
          </button>

          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-faint)",
              background: "var(--bg-inset)",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
            }}
          >
            🕒 Last update: <strong>{lastSyncTime.toLocaleTimeString()}</strong>
          </div>
        </div>
      </div>

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
              const vehicle = vehicles.find((v) => v.int_Vehicle_Id === rental.int_Vehicle_Id);
              const sim = simStateMap[rental.txt_Booking_Number] || { index: 0, isPlaying: false };
              const route = ROUTE_DATA[rental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
              const totalPoints = route.points.length;
              const progress = sim.index / Math.max(1, totalPoints - 1);
              const distTravelled = (progress * route.totalDistanceKm).toFixed(1);
              const distRemaining = (route.totalDistanceKm * (1 - progress)).toFixed(1);
              const etaMinutes = Math.ceil(((route.totalDistanceKm * (1 - progress)) / 42) * 60);

              const isSelected = rental.txt_Booking_Number === selectedRental?.txt_Booking_Number;
              const color = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];

              const isArrived = sim.index >= totalPoints - 1;
              const tripStatusLabel = isArrived ? "Arrived" : sim.isPlaying ? "In Transit" : "Paused";
              const currentPoint = route.points[sim.index] || route.points[0];

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
                          tripStatusLabel === "In Transit"
                            ? "var(--signal-green-bg)"
                            : tripStatusLabel === "Arrived"
                            ? "var(--accent-subtle)"
                            : "var(--signal-amber-bg)",
                        color:
                          tripStatusLabel === "In Transit"
                            ? "var(--signal-green)"
                            : tripStatusLabel === "Arrived"
                            ? "var(--accent)"
                            : "var(--signal-amber)",
                        border: `1px solid ${
                          tripStatusLabel === "In Transit"
                            ? "var(--signal-green)"
                            : tripStatusLabel === "Arrived"
                            ? "var(--accent)"
                            : "var(--signal-amber)"
                        }`,
                      }}
                    >
                      {tripStatusLabel === "In Transit" ? "● " : ""}
                      {tripStatusLabel}
                    </span>
                  </div>

                  {/* Customer and Branch */}
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    👤 {rental.customerName || "Customer"} • 📍 {getBranchName(rental.int_Pickup_Branch_Id)}
                  </div>

                  {/* Live Location Waypoint */}
                  <div
                    style={{
                      fontSize: "0.74rem",
                      background: "var(--bg-inset)",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>🧭</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>{currentPoint.locationName}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 5, background: "var(--bg-inset)", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, progress * 100)}%`,
                        background: color,
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {/* Stats Grid: Travelled, Remaining, ETA */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-faint)", textTransform: "uppercase" }}>Travelled</div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700 }}>{distTravelled} km</div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-faint)", textTransform: "uppercase" }}>Remaining</div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700 }}>{distRemaining} km</div>
                    </div>
                    <div style={{ background: "var(--bg-inset)", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-faint)", textTransform: "uppercase" }}>ETA</div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700, color: isArrived ? "var(--signal-green)" : "var(--accent)" }}>
                        {isArrived ? "Arrived" : `${etaMinutes}m`}
                      </div>
                    </div>
                  </div>

                  {/* Individual Controls */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        flex: 1,
                        fontSize: "0.72rem",
                        padding: "5px 8px",
                        background: sim.isPlaying ? "var(--signal-amber-bg)" : "var(--accent-subtle)",
                        color: sim.isPlaying ? "var(--signal-amber)" : "var(--accent)",
                        borderColor: "var(--border)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay(rental.txt_Booking_Number);
                      }}
                      disabled={isArrived}
                    >
                      {sim.isPlaying ? "⏸ Pause" : "▶ Start GPS"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "0.72rem", padding: "5px 10px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        resetVehicle(rental.txt_Booking_Number);
                      }}
                      title="Reset back to starting hub"
                    >
                      🔄 Reset
                    </button>
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
                  ? (ROUTE_DATA[selectedRental.int_Pickup_Branch_Id] || ROUTE_DATA[1]).points[
                      simStateMap[selectedRental.txt_Booking_Number]?.index || 0
                    ]?.coord || [13.0827, 80.2707]
                  : [13.0827, 80.2707]
              }
              zoom={12}
              style={{ height: "100%", minHeight: "560px", width: "100%" }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Full route polyline for the selected vehicle's corridor */}
              <Polyline
                positions={currentRoute.points.map((p) => p.coord)}
                color="var(--border-strong)"
                weight={3}
                opacity={0.45}
                dashArray="6 8"
              />

              {/* Start and Finish markers */}
              <Marker position={currentRoute.points[0].coord} icon={startIcon}>
                <Popup>
                  <strong>{currentRoute.points[0].locationName}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>Pickup Station</div>
                </Popup>
              </Marker>

              <Marker position={currentRoute.points[currentRoute.points.length - 1].coord} icon={endIcon}>
                <Popup>
                  <strong>{currentRoute.points[currentRoute.points.length - 1].locationName}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>Drop-off Hub</div>
                </Popup>
              </Marker>

              {/* Vehicles on map */}
              {activeRentals.map((rental, i) => {
                const vehicle = vehicles.find((v) => v.int_Vehicle_Id === rental.int_Vehicle_Id);
                const sim = simStateMap[rental.txt_Booking_Number] || { index: 0, isPlaying: false };
                const route = ROUTE_DATA[rental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
                const totalPoints = route.points.length;
                const point = route.points[sim.index] || route.points[0];
                const isSelected = rental.txt_Booking_Number === selectedRental?.txt_Booking_Number;
                const color = VEHICLE_PALETTE[i % VEHICLE_PALETTE.length];

                const progress = sim.index / Math.max(1, totalPoints - 1);
                const distTravelled = (progress * route.totalDistanceKm).toFixed(1);
                const distRemaining = (route.totalDistanceKm * (1 - progress)).toFixed(1);
                const eta = Math.ceil(((route.totalDistanceKm * (1 - progress)) / 42) * 60);
                const isArrived = sim.index >= totalPoints - 1;
                const statusLabel = isArrived ? "Arrived" : sim.isPlaying ? "In Transit" : "Paused";

                return (
                  <span key={rental.txt_Booking_Number}>
                    {/* Active completed route trace */}
                    {isSelected && (
                      <Polyline
                        positions={route.points.slice(0, sim.index + 1).map((p) => p.coord)}
                        color={color}
                        weight={5}
                        opacity={0.88}
                      />
                    )}

                    <Marker
                      position={point.coord}
                      icon={makeVehicleMarkerIcon(color, isSelected, sim.isPlaying)}
                      eventHandlers={{
                        click: () => setSelectedBookingId(rental.txt_Booking_Number),
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 200, fontFamily: "sans-serif", fontSize: "0.82rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "1rem" }}>🚗</span>
                            <strong style={{ fontSize: "0.9rem" }}>
                              {vehicle ? `${getBrandName(vehicle.int_Brand_Id)} ${vehicle.txt_Model_Name}` : rental.vehicleLabel}
                            </strong>
                          </div>
                          <div style={{ color: "#666", fontSize: "0.72rem", marginBottom: "6px" }}>
                            Reg: <strong>{vehicle?.txt_Registration_Number || "N/A"}</strong> • Booking #{rental.txt_Booking_Number}
                          </div>
                          <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #eee" }} />
                          <div>👤 <strong>Customer:</strong> {rental.customerName}</div>
                          <div>📍 <strong>Location:</strong> {point.locationName}</div>
                          <div>🌐 <strong>GPS:</strong> {point.coord[0].toFixed(4)}° N, {point.coord[1].toFixed(4)}° E</div>
                          <div>🚦 <strong>Status:</strong> <span style={{ fontWeight: 700, color: statusLabel === "In Transit" ? "#2A7A4A" : "#B87E10" }}>{statusLabel}</span></div>
                          <div>📏 <strong>Distance:</strong> {distTravelled} km / {route.totalDistanceKm} km</div>
                          <div>⏳ <strong>ETA:</strong> {isArrived ? "Arrived at destination" : `${eta} mins remaining`}</div>
                          <div style={{ marginTop: "6px", fontSize: "0.68rem", color: "#888" }}>
                            Synced: {lastSyncTime.toLocaleTimeString()}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </span>
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
                  const vehicle = vehicles.find((v) => v.int_Vehicle_Id === selectedRental.int_Vehicle_Id);
                  const sim = simStateMap[selectedRental.txt_Booking_Number] || { index: 0, isPlaying: false };
                  const route = ROUTE_DATA[selectedRental.int_Pickup_Branch_Id] || ROUTE_DATA[1];
                  const totalPoints = route.points.length;
                  const point = route.points[sim.index] || route.points[0];
                  const isArrived = sim.index >= totalPoints - 1;
                  const statusLabel = isArrived ? "Arrived" : sim.isPlaying ? "In Transit" : "Paused";
                  const progress = sim.index / Math.max(1, totalPoints - 1);
                  const distTravelled = (progress * route.totalDistanceKm).toFixed(1);
                  const distRemaining = (route.totalDistanceKm * (1 - progress)).toFixed(1);
                  const eta = Math.ceil(((route.totalDistanceKm * (1 - progress)) / 42) * 60);

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

                      {/* Current Location & GPS */}
                      <div style={{ minWidth: "160px" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                          Current Location
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                          {point.locationName}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {point.coord[0].toFixed(4)}° N, {point.coord[1].toFixed(4)}° E
                        </div>
                      </div>

                      {/* Status & ETA */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Trip Status
                          </div>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color:
                                statusLabel === "In Transit"
                                  ? "var(--signal-green)"
                                  : statusLabel === "Arrived"
                                  ? "var(--accent)"
                                  : "var(--signal-amber)",
                            }}
                          >
                            {statusLabel === "In Transit" ? "🟢 " : statusLabel === "Arrived" ? "🏁 " : "⏸ "}
                            {statusLabel}
                          </span>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Travelled / Total
                          </div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                            {distTravelled} / {route.totalDistanceKm} km
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            ETA
                          </div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)" }}>
                            {isArrived ? "Arrived" : `${eta} mins`}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 600 }}>
                            Last Sync
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {lastSyncTime.toLocaleTimeString()}
                          </div>
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

import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useFleet } from "../context/FleetContext";
import { useInteraction } from "../context/InteractionContext";
import StatusChip from "../components/StatusChip";
import BookingForm from "../components/BookingForm";
import ImageLightbox from "../components/ImageLightbox";
import VehicleReviews from "../components/VehicleReviews";
import {
  vehicles as staticVehicles,
  getBrandName,
  getCategoryName,
  getFuelName,
  getTransmissionName,
  getBranchName,
  getCategoryIcon,
} from "../data/mockData";

export default function VehicleDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { vehicles: fleetVehicles, loading } = useFleet();
  const { isWishlisted, toggleWishlist, isInCompare, toggleCompare } = useInteraction();

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Search in API fleet vehicles first, then static mock fallback
  const allVehicles = (fleetVehicles && fleetVehicles.length > 0) ? fleetVehicles : staticVehicles;
  const vehicle = allVehicles.find(
    (v) => String(v.int_Vehicle_Id) === String(id) || String(v._id) === String(id)
  );

  const brandName = vehicle ? getBrandName(vehicle.int_Brand_Id) : "";
  const fullName = vehicle ? `${brandName} ${vehicle.txt_Model_Name}` : "";
  const wishlisted = vehicle ? isWishlisted(vehicle.int_Vehicle_Id) : false;
  const compared = vehicle ? isInCompare(vehicle.int_Vehicle_Id) : false;

  useEffect(() => {
    if (vehicle) {
      document.title = `${fullName} · ${t("appName")}`;
    }
  }, [vehicle, fullName, t]);

  if (loading && !vehicle) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", display: "inline-block", animation: "spin 1.5s linear infinite" }}>
          ⚙️
        </div>
        <p style={{ color: "var(--text-muted)", marginTop: "12px" }}>Loading vehicle details...</p>
      </div>
    );
  }

  if (!vehicle) return <Navigate to="/vehicles" replace />;

  const specs = [
    { label: t("year"), value: vehicle.int_Manufacture_Year, icon: "📅" },
    { label: t("color"), value: vehicle.txt_Color, icon: "🎨" },
    { label: t("seats"), value: `${vehicle.int_Seating_Capacity} ${t("seats")}`, icon: "👥" },
    {
      label: t("odometer"),
      value: vehicle.int_Odometer_Reading ? `${vehicle.int_Odometer_Reading.toLocaleString("en-IN")} km` : (vehicle.mileage || "15,000 km"),
      icon: "⚡",
    },
    { label: t("weekly_rent"), value: `₹${Number(vehicle.dbl_Weekly_Rent || 0).toLocaleString("en-IN")}`, icon: "🏷️" },
    { label: t("security_deposit"), value: `₹${Number(vehicle.dbl_Security_Deposit || 0).toLocaleString("en-IN")}`, icon: "🛡️" },
  ];

  return (
    <div className="container" style={{ paddingBottom: "60px" }}>
      <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/vehicles" className="nav-link">
          ← {t("back")} {t("nav_vehicles")}
        </Link>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`btn btn-ghost ${wishlisted ? "active-heart" : ""}`}
            style={{ padding: "8px 14px", fontSize: "0.85rem", borderRadius: "999px" }}
            onClick={() => toggleWishlist(vehicle.int_Vehicle_Id, fullName)}
            title={wishlisted ? "Remove favorite" : "Add to favorites"}
          >
            {wishlisted ? "❤️ Saved" : "🤍 Save"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "8px 14px", fontSize: "0.85rem", borderRadius: "999px" }}
            onClick={() => toggleCompare(vehicle.int_Vehicle_Id, fullName)}
            title={compared ? "Remove from comparison" : "Compare with another vehicle"}
          >
            {compared ? "⚖️ Comparing" : "⚖️ Compare"}
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <div>
          {/* Main Hero Photo Card */}
          <div
            className="detail-hero-banner"
            onClick={() => vehicle.image && setIsLightboxOpen(true)}
            style={{ cursor: vehicle.image ? "pointer" : "default" }}
          >
            {vehicle.image ? (
              <>
                <img
                  src={vehicle.image}
                  alt={fullName}
                  className="detail-hero-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";
                  }}
                />
                <button
                  type="button"
                  className="btn-lightbox-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                >
                  🔍 View Full Photo
                </button>
              </>
            ) : (
              <span style={{ fontSize: "5rem" }}>{getCategoryIcon(vehicle.int_Category_Id)}</span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "20px" }}>
            <div>
              <div className="vehicle-cat">{getCategoryName(vehicle.int_Category_Id)}</div>
              <h1 style={{ marginBottom: "6px", fontSize: "2rem" }}>{fullName}</h1>
              <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                ⚙️ {getTransmissionName(vehicle.int_Transmission_Id)} · ⛽ {getFuelName(vehicle.int_Fuel_Type_Id)} · 📍 {getBranchName(vehicle.int_Branch_Id)}
              </div>
            </div>
            <StatusChip status={vehicle.txt_Vehicle_Status} />
          </div>

          {/* Key Specs Grid */}
          <div className="spec-grid" style={{ marginTop: "24px" }}>
            {specs.map((s) => (
              <div className="spec-item" key={s.label}>
                <div className="label">{s.icon} {s.label}</div>
                <div className="value">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Features Badges */}
          {vehicle.features && vehicle.features.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>Included Features &amp; Amenities:</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {vehicle.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="badge"
                    style={{
                      background: "var(--bg-inset)",
                      border: "1px solid var(--border)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                    }}
                  >
                    ✨ {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="price" style={{ fontSize: "1.8rem", marginTop: "24px" }}>
            ₹{Number(vehicle.dbl_Daily_Rent || 0).toLocaleString("en-IN")}{" "}
            <span style={{ fontSize: "0.95rem" }}>{t("per_day")}</span>
          </div>

          {/* Customer Reviews Section */}
          <VehicleReviews
            vehicleId={vehicle.int_Vehicle_Id || vehicle._id}
            vehicleName={fullName}
          />
        </div>

        {/* Right Column: Interactive Booking Form */}
        <div>
          <BookingForm vehicle={vehicle} />
        </div>
      </div>

      {/* Lightbox for Zoomable Image View */}
      {isLightboxOpen && vehicle.image && (
        <ImageLightbox
          images={[{ url: vehicle.image, label: `${fullName} - Main Photo` }]}
          activeIndex={0}
          onClose={() => setIsLightboxOpen(false)}
          vehicleTitle={fullName}
        />
      )}
    </div>
  );
}

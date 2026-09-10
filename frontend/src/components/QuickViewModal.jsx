import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useInteraction } from "../context/InteractionContext";
import { useLanguage } from "../context/LanguageContext";
import {
  getBrandName,
  getCategoryName,
  getFuelName,
  getTransmissionName,
  getBranchName,
} from "../data/mockData";
import StatusChip from "./StatusChip";

export default function QuickViewModal() {
  const {
    quickViewVehicle,
    closeQuickView,
    isWishlisted,
    toggleWishlist,
    isInCompare,
    toggleCompare,
  } = useInteraction();
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && quickViewVehicle) {
        closeQuickView();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickViewVehicle, closeQuickView]);

  if (!quickViewVehicle) return null;

  const veh = quickViewVehicle;
  const brandName = getBrandName(veh.int_Brand_Id);
  const fullName = `${brandName} ${veh.txt_Model_Name}`;
  const wishlisted = isWishlisted(veh.int_Vehicle_Id);
  const compared = isInCompare(veh.int_Vehicle_Id);

  return (
    <div className="modal-backdrop" onClick={closeQuickView}>
      <div
        className="modal-card quickview-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick View Vehicle"
      >
        <div className="modal-header" style={{ paddingBottom: "12px" }}>
          <div>
            <span className="vehicle-cat">{getCategoryName(veh.int_Category_Id)}</span>
            <h2 style={{ margin: "2px 0 0", fontSize: "1.3rem" }}>{fullName}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={closeQuickView}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="quickview-body">
          <div className="quickview-media">
            {veh.image ? (
              <img
                src={veh.image}
                alt={fullName}
                className="quickview-img"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";
                }}
              />
            ) : (
              <div className="quickview-fallback">🚗</div>
            )}
            <div className="quickview-status-badge">
              <StatusChip status={veh.txt_Vehicle_Status} />
            </div>
          </div>

          <div className="quickview-details">
            <div className="quickview-price-bar">
              <div className="price" style={{ fontSize: "1.45rem", margin: 0 }}>
                ₹{veh.dbl_Daily_Rent.toLocaleString("en-IN")}{" "}
                <span style={{ fontSize: "0.85rem" }}>{t("per_day")}</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className={`btn-action-round ${wishlisted ? "active-heart" : ""}`}
                  onClick={() => toggleWishlist(veh.int_Vehicle_Id, fullName)}
                  title={wishlisted ? "Remove favorite" : "Add to favorites"}
                >
                  {wishlisted ? "❤️" : "🤍"}
                </button>
                <button
                  type="button"
                  className={`btn-action-round ${compared ? "active-compare" : ""}`}
                  onClick={() => toggleCompare(veh.int_Vehicle_Id, fullName)}
                  title={compared ? "Remove comparison" : "Compare"}
                >
                  ⚖️
                </button>
              </div>
            </div>

            <div className="quickview-spec-grid">
              <div className="quickview-spec-item">
                <span className="lbl">⚙️ Transmission</span>
                <span className="val">{getTransmissionName(veh.int_Transmission_Id)}</span>
              </div>
              <div className="quickview-spec-item">
                <span className="lbl">⛽ Fuel Type</span>
                <span className="val">{getFuelName(veh.int_Fuel_Type_Id)}</span>
              </div>
              <div className="quickview-spec-item">
                <span className="lbl">👥 Seating</span>
                <span className="val">{veh.int_Seating_Capacity} Seats</span>
              </div>
              <div className="quickview-spec-item">
                <span className="lbl">📍 Location</span>
                <span className="val">{getBranchName(veh.int_Branch_Id)}</span>
              </div>
              <div className="quickview-spec-item">
                <span className="lbl">🛡️ Deposit</span>
                <span className="val">₹{veh.dbl_Security_Deposit.toLocaleString("en-IN")}</span>
              </div>
              <div className="quickview-spec-item">
                <span className="lbl">📅 Year</span>
                <span className="val">{veh.int_Manufacture_Year}</span>
              </div>
            </div>

            {veh.features && veh.features.length > 0 && (
              <div className="quickview-features">
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "6px" }}>
                  Key Features:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {veh.features.map((f) => (
                    <span key={f} className="badge" style={{ fontSize: "0.76rem" }}>
                      ✨ {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="quickview-cta-row">
              <Link
                to={`/vehicles/${veh.int_Vehicle_Id}`}
                onClick={closeQuickView}
                className="btn btn-ghost"
                style={{ flex: 1, textAlign: "center", padding: "10px 14px" }}
              >
                {t("view_details")} →
              </Link>
              <Link
                to={`/vehicles/${veh.int_Vehicle_Id}?book=true`}
                onClick={closeQuickView}
                className="btn btn-primary"
                style={{ flex: 1.2, textAlign: "center", padding: "10px 16px" }}
              >
                ⚡ {t("book_now")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

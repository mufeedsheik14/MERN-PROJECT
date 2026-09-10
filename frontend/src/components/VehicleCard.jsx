import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useInteraction } from "../context/InteractionContext";
import StatusChip from "./StatusChip";
import {
  getBrandName,
  getCategoryName,
  getFuelName,
  getTransmissionName,
  getBranchName,
  getCategoryIcon,
} from "../data/mockData";

export default function VehicleCard({ vehicle, viewMode = "grid" }) {
  const { t } = useLanguage();
  const { isCustomer } = useAuth();
  const { isWishlisted, toggleWishlist, openQuickView } = useInteraction();

  const brandName = getBrandName(vehicle.int_Brand_Id);
  const fullName = `${brandName} ${vehicle.txt_Model_Name}`;
  const isFav = isWishlisted(vehicle.int_Vehicle_Id);

  // Badges & tags
  const isElectric = vehicle.int_Fuel_Type_Id === 3;
  const isBudget = vehicle.dbl_Daily_Rent <= 2200;

  if (viewMode === "list") {
    return (
      <div className="vehicle-card vehicle-card-list">
        <div className="vehicle-thumb vehicle-thumb-list">
          <StatusChip status={vehicle.txt_Vehicle_Status} />

          <div className="card-actions-row">
            <button
              type="button"
              className={`btn-action-round ${isFav ? "active-heart" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(vehicle.int_Vehicle_Id, fullName);
              }}
              title={isFav ? "Remove favorite" : "Add to favorites"}
              aria-label="Wishlist"
            >
              {isFav ? "❤️" : "🤍"}
            </button>
            <button
              type="button"
              className="btn-action-round"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickView(vehicle);
              }}
              title="Quick View"
              aria-label="Quick View"
            >
              👁️
            </button>
          </div>

          {vehicle.image ? (
            <img
              src={vehicle.image}
              alt={fullName}
              className="vehicle-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";
              }}
            />
          ) : (
            <span style={{ fontSize: "3rem" }}>{getCategoryIcon(vehicle.int_Category_Id)}</span>
          )}
        </div>

        <div className="vehicle-body vehicle-body-list">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div>
              <div className="vehicle-cat">{getCategoryName(vehicle.int_Category_Id)}</div>
              <div className="vehicle-name" style={{ fontSize: "1.15rem" }}>{fullName}</div>
            </div>
            <div className="price" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              ₹{Number(vehicle.dbl_Daily_Rent || 0).toLocaleString("en-IN")}{" "}
              <span style={{ fontSize: "0.8rem" }}>{t("per_day")}</span>
            </div>
          </div>

          <div className="vehicle-meta" style={{ marginTop: "6px" }}>
            <span>⚙️ {getTransmissionName(vehicle.int_Transmission_Id)}</span>
            <span>⛽ {getFuelName(vehicle.int_Fuel_Type_Id)}</span>
            <span>👥 {vehicle.int_Seating_Capacity} {t("seats")}</span>
            <span>📍 {getBranchName(vehicle.int_Branch_Id)}</span>
          </div>

          {vehicle.features && vehicle.features.length > 0 && (
            <div className="vehicle-features-chips" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
              {vehicle.features.slice(0, 3).map((f, i) => (
                <span key={i} className="badge badge-subtle" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          )}

          <div className="vehicle-footer" style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <Link
              to={`/vehicles/${vehicle.int_Vehicle_Id || vehicle._id}`}
              className="btn btn-primary"
              style={{ padding: "8px 20px", fontSize: "0.85rem", textDecoration: "none" }}
            >
              {t("view_details")} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="vehicle-card">
      <div className="vehicle-thumb">
        <StatusChip status={vehicle.txt_Vehicle_Status} />

        <div className="card-actions-row">
          <button
            type="button"
            className={`btn-action-round ${isFav ? "active-heart" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(vehicle.int_Vehicle_Id, fullName);
            }}
            title={isFav ? "Remove favorite" : "Add to favorites"}
            aria-label="Wishlist"
          >
            {isFav ? "❤️" : "🤍"}
          </button>
          <button
            type="button"
            className="btn-action-round"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openQuickView(vehicle);
            }}
            title="Quick View"
            aria-label="Quick View"
          >
            👁️
          </button>
        </div>

        {isElectric && (
          <span className="card-quick-tag tag-electric" style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
            ⚡ Electric
          </span>
        )}
        {!isElectric && isBudget && (
          <span className="card-quick-tag tag-deal" style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
            🏷️ Deal
          </span>
        )}

        {vehicle.image ? (
          <img
            src={vehicle.image}
            alt={fullName}
            className="vehicle-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";
            }}
          />
        ) : (
          <span style={{ fontSize: "3.2rem" }}>{getCategoryIcon(vehicle.int_Category_Id)}</span>
        )}
      </div>

      <div className="vehicle-body">
        <div className="vehicle-cat">{getCategoryName(vehicle.int_Category_Id)}</div>
        <div className="vehicle-name">{fullName}</div>

        <div className="vehicle-meta">
          <span>⚙️ {getTransmissionName(vehicle.int_Transmission_Id)}</span>
          <span>⛽ {getFuelName(vehicle.int_Fuel_Type_Id)}</span>
          <span>👥 {vehicle.int_Seating_Capacity} {t("seats")}</span>
        </div>

        <div className="vehicle-meta" style={{ marginTop: "2px" }}>
          <span>📍 {getBranchName(vehicle.int_Branch_Id)}</span>
          {vehicle.mileage && <span>⚡ {vehicle.mileage}</span>}
        </div>

        <div className="vehicle-footer">
          <div className="price">
            ₹{Number(vehicle.dbl_Daily_Rent || 0).toLocaleString("en-IN")}{" "}
            <span>{t("per_day")}</span>
          </div>
          <Link
            to={`/vehicles/${vehicle.int_Vehicle_Id || vehicle._id}`}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.85rem", textDecoration: "none" }}
          >
            {t("view_details")}
          </Link>
        </div>
      </div>
    </div>
  );
}

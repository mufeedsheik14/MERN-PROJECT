import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useInteraction } from "../context/InteractionContext";
import { useFleet } from "../context/FleetContext";
import { useLanguage } from "../context/LanguageContext";
import { getBrandName, getCategoryName, getBranchName } from "../data/mockData";
import StatusChip from "./StatusChip";

export default function WishlistDrawer() {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist, clearWishlist } =
    useInteraction();
  const { vehicles } = useFleet();
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isWishlistOpen) {
        setIsWishlistOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWishlistOpen, setIsWishlistOpen]);

  if (!isWishlistOpen) return null;

  const savedVehicles = wishlist
    .map((id) => vehicles.find((v) => v.int_Vehicle_Id === id))
    .filter(Boolean);

  return (
    <div className="drawer-backdrop" onClick={() => setIsWishlistOpen(false)}>
      <div
        className="wishlist-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wishlist Drawer"
      >
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.3rem" }}>❤️</span>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Saved Favorites</h3>
            <span className="wishlist-count-pill">{savedVehicles.length}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {savedVehicles.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                onClick={clearWishlist}
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsWishlistOpen(false)}
              aria-label="Close wishlist"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {savedVehicles.length === 0 ? (
            <div className="wishlist-empty">
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🤍</div>
              <h4>No favorites saved yet</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Tap the heart icon on any vehicle card to easily save and compare rides for your upcoming trip.
              </p>
              <Link
                to="/vehicles"
                className="btn btn-primary"
                onClick={() => setIsWishlistOpen(false)}
                style={{ marginTop: "16px" }}
              >
                Explore Fleet ➔
              </Link>
            </div>
          ) : (
            <div className="wishlist-list">
              {savedVehicles.map((veh) => (
                <div key={veh.int_Vehicle_Id} className="wishlist-card">
                  <div className="wishlist-thumb-wrap">
                    {veh.image ? (
                      <img
                        src={veh.image}
                        alt={veh.txt_Model_Name}
                        className="wishlist-thumb"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>🚗</span>
                    )}
                  </div>

                  <div className="wishlist-info">
                    <div className="wishlist-category">{getCategoryName(veh.int_Category_Id)}</div>
                    <div className="wishlist-name">
                      {getBrandName(veh.int_Brand_Id)} {veh.txt_Model_Name}
                    </div>
                    <div className="wishlist-meta">
                      <span>📍 {getBranchName(veh.int_Branch_Id)}</span>
                      <span>·</span>
                      <StatusChip status={veh.txt_Vehicle_Status} />
                    </div>
                    <div className="wishlist-price">
                      ₹{veh.dbl_Daily_Rent.toLocaleString("en-IN")}{" "}
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 400 }}>
                        /day
                      </span>
                    </div>

                    <div className="wishlist-actions">
                      <Link
                        to={`/vehicles/${veh.int_Vehicle_Id}`}
                        onClick={() => setIsWishlistOpen(false)}
                        className="btn btn-ghost"
                        style={{ padding: "6px 10px", fontSize: "0.8rem", flex: 1, textAlign: "center" }}
                      >
                        {t("view_details")}
                      </Link>
                      <Link
                        to={`/vehicles/${veh.int_Vehicle_Id}?book=true`}
                        onClick={() => setIsWishlistOpen(false)}
                        className="btn btn-primary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1, textAlign: "center" }}
                      >
                        {t("book_now")}
                      </Link>
                      <button
                        type="button"
                        className="wishlist-remove-btn"
                        onClick={() => toggleWishlist(veh.int_Vehicle_Id, veh.txt_Model_Name)}
                        title="Remove from favorites"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

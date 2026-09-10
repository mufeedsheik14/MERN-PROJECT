import { useInteraction } from "../context/InteractionContext";
import { useFleet } from "../context/FleetContext";
import { getBrandName } from "../data/mockData";

export default function CompareDock() {
  const { compareList, toggleCompare, clearCompare, setIsCompareModalOpen } = useInteraction();
  const { vehicles } = useFleet();

  if (!compareList || compareList.length === 0) return null;

  const comparedVehicles = compareList
    .map((id) => vehicles.find((v) => v.int_Vehicle_Id === id))
    .filter(Boolean);

  return (
    <div className="compare-dock" role="region" aria-label="Vehicle comparison dock">
      <div className="compare-dock-inner">
        <div className="compare-dock-info">
          <div className="compare-dock-title">
            <span>⚖️ Compare Vehicles</span>
            <span className="compare-badge">{comparedVehicles.length} / 4</span>
          </div>
          <div className="compare-dock-hint">
            {comparedVehicles.length === 1
              ? "Select at least 1 more vehicle to compare specs"
              : "Compare specifications, features & rates side-by-side"}
          </div>
        </div>

        <div className="compare-dock-items">
          {comparedVehicles.map((veh) => (
            <div key={veh.int_Vehicle_Id} className="compare-dock-chip">
              {veh.image ? (
                <img
                  src={veh.image}
                  alt={veh.txt_Model_Name}
                  className="compare-dock-thumb"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <span className="compare-dock-fallback">🚗</span>
              )}
              <div className="compare-dock-chip-text">
                <span className="compare-dock-name">
                  {getBrandName(veh.int_Brand_Id)} {veh.txt_Model_Name}
                </span>
                <span className="compare-dock-price">₹{veh.dbl_Daily_Rent}/d</span>
              </div>
              <button
                type="button"
                className="compare-dock-remove"
                onClick={() => toggleCompare(veh.int_Vehicle_Id, veh.txt_Model_Name)}
                title="Remove from comparison"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="compare-dock-actions">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
            onClick={clearCompare}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            disabled={comparedVehicles.length < 2}
            onClick={() => setIsCompareModalOpen(true)}
          >
            Compare Now ({comparedVehicles.length}) ➔
          </button>
        </div>
      </div>
    </div>
  );
}

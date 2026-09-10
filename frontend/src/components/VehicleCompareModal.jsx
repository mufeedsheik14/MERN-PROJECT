import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useInteraction } from "../context/InteractionContext";
import { useFleet } from "../context/FleetContext";
import { useLanguage } from "../context/LanguageContext";
import {
  getBrandName,
  getCategoryName,
  getFuelName,
  getTransmissionName,
  getBranchName,
} from "../data/mockData";
import StatusChip from "./StatusChip";

export default function VehicleCompareModal() {
  const { compareList, isCompareModalOpen, setIsCompareModalOpen, toggleCompare } =
    useInteraction();
  const { vehicles } = useFleet();
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isCompareModalOpen) {
        setIsCompareModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompareModalOpen, setIsCompareModalOpen]);

  if (!isCompareModalOpen || !compareList || compareList.length === 0) return null;

  const comparedVehicles = compareList
    .map((id) => vehicles.find((v) => v.int_Vehicle_Id === id))
    .filter(Boolean);

  if (comparedVehicles.length === 0) return null;

  // Find lowest price vehicle to highlight
  const lowestPrice = Math.min(...comparedVehicles.map((v) => v.dbl_Daily_Rent));

  return (
    <div className="modal-backdrop" onClick={() => setIsCompareModalOpen(false)}>
      <div
        className="modal-card compare-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>⚖️ Vehicle Comparison</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
              Comparing {comparedVehicles.length} vehicles side-by-side
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsCompareModalOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-header-cell">Vehicle Details</th>
                {comparedVehicles.map((veh) => {
                  const isLowest = veh.dbl_Daily_Rent === lowestPrice && comparedVehicles.length > 1;
                  return (
                    <th key={veh.int_Vehicle_Id} className="compare-col-header">
                      <div className="compare-vehicle-card-header">
                        <button
                          type="button"
                          className="compare-remove-btn"
                          onClick={() => toggleCompare(veh.int_Vehicle_Id, veh.txt_Model_Name)}
                          title="Remove vehicle"
                        >
                          ✕
                        </button>
                        <div className="compare-img-wrap">
                          {veh.image ? (
                            <img
                              src={veh.image}
                              alt={veh.txt_Model_Name}
                              className="compare-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "2rem" }}>🚗</span>
                          )}
                        </div>
                        <div className="compare-vname">
                          {getBrandName(veh.int_Brand_Id)} {veh.txt_Model_Name}
                        </div>
                        <div className="compare-vcat">{getCategoryName(veh.int_Category_Id)}</div>
                        <div className="compare-vrate">
                          ₹{veh.dbl_Daily_Rent.toLocaleString("en-IN")}{" "}
                          <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>/day</span>
                          {isLowest && <span className="compare-best-deal">Best Value</span>}
                        </div>
                        <div style={{ marginTop: "8px" }}>
                          <StatusChip status={veh.txt_Vehicle_Status} />
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="compare-label-cell">Category</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    {getCategoryName(v.int_Category_Id)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Seating</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    👥 {v.int_Seating_Capacity} Seats
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Fuel Type</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    ⛽ {getFuelName(v.int_Fuel_Type_Id)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Transmission</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    ⚙️ {getTransmissionName(v.int_Transmission_Id)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Weekly Rate</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    ₹{v.dbl_Weekly_Rent.toLocaleString("en-IN")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Security Deposit</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    ₹{v.dbl_Security_Deposit.toLocaleString("en-IN")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Branch Location</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    📍 {getBranchName(v.int_Branch_Id)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Mileage / Year</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    {v.mileage || `${v.int_Odometer_Reading} km`} · {v.int_Manufacture_Year}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Key Features</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {v.features && v.features.length > 0 ? (
                        v.features.map((f) => (
                          <span key={f} className="badge" style={{ fontSize: "0.72rem" }}>
                            {f}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Standard</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="compare-label-cell">Action</td>
                {comparedVehicles.map((v) => (
                  <td key={v.int_Vehicle_Id} className="compare-val-cell">
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <Link
                        to={`/vehicles/${v.int_Vehicle_Id}`}
                        onClick={() => setIsCompareModalOpen(false)}
                        className="btn btn-ghost"
                        style={{ padding: "7px 12px", fontSize: "0.82rem", textAlign: "center" }}
                      >
                        {t("view_details")}
                      </Link>
                      <Link
                        to={`/vehicles/${v.int_Vehicle_Id}?book=true`}
                        onClick={() => setIsCompareModalOpen(false)}
                        className="btn btn-primary"
                        style={{ padding: "7px 12px", fontSize: "0.82rem", textAlign: "center" }}
                      >
                        {t("book_now")}
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useFleet } from "../../context/FleetContext";
import {
  branches,
  categories,
  brands,
  fuelTypes,
  transmissionTypes,
  getBranchName,
  getCategoryName,
  getBrandName,
  getFuelName,
  getTransmissionName,
} from "../../data/mockData";

const AVAILABLE_FEATURES = [
  "Air Conditioner",
  "Power Steering",
  "ABS",
  "Dual Airbags",
  "Bluetooth Connectivity",
  "Touchscreen Display",
  "Sunroof",
  "360 Degree Camera",
  "Fast Charging Support",
  "Cruise Control",
  "Leather Seats",
];

export default function AddVehicleModal({ isOpen, onClose, branchLock = null }) {
  const { t } = useLanguage();
  const { addVehicle } = useFleet();

  const [form, setForm] = useState({
    txt_Model_Name: "",
    txt_Registration_Number: "",
    int_Category_Id: 1,
    int_Brand_Id: 1,
    int_Branch_Id: branchLock ? Number(branchLock) : 1,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 1,
    int_Manufacture_Year: 2024,
    int_Seating_Capacity: 5,
    txt_Color: "Pearl White",
    dbl_Daily_Rent: 1500,
    dbl_Weekly_Rent: 9000,
    dbl_Security_Deposit: 3000,
    int_Odometer_Reading: 12000,
    mileage: "21.5 km/l",
    txt_Vehicle_Status: "A",
    description: "",
  });

  const [selectedFeatures, setSelectedFeatures] = useState([
    "Air Conditioner",
    "Power Steering",
    "Bluetooth Connectivity",
  ]);

  // Image upload
  const [vehicleImageFile, setVehicleImageFile] = useState(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState(null);

  // Documents
  const [rcFile, setRcFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);

  if (!isOpen) return null;

  const resetAll = () => {
    if (vehicleImagePreview) URL.revokeObjectURL(vehicleImagePreview);
    setVehicleImageFile(null);
    setVehicleImagePreview(null);
    setRcFile(null);
    setInsuranceFile(null);
    setForm({
      txt_Model_Name: "",
      txt_Registration_Number: "",
      int_Category_Id: 1,
      int_Brand_Id: 1,
      int_Branch_Id: branchLock ? Number(branchLock) : 1,
      int_Fuel_Type_Id: 1,
      int_Transmission_Id: 1,
      int_Manufacture_Year: 2024,
      int_Seating_Capacity: 5,
      txt_Color: "Pearl White",
      dbl_Daily_Rent: 1500,
      dbl_Weekly_Rent: 9000,
      dbl_Security_Deposit: 3000,
      int_Odometer_Reading: 12000,
      mileage: "21.5 km/l",
      txt_Vehicle_Status: "A",
      description: "",
    });
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (vehicleImagePreview) URL.revokeObjectURL(vehicleImagePreview);
    setVehicleImageFile(file);
    setVehicleImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (vehicleImagePreview) URL.revokeObjectURL(vehicleImagePreview);
    setVehicleImageFile(null);
    setVehicleImagePreview(null);
  };

  const toggleFeature = (feat) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const handleDailyRentChange = (daily) => {
    const dVal = Number(daily);
    setForm((prev) => ({
      ...prev,
      dbl_Daily_Rent: dVal,
      dbl_Weekly_Rent: Math.round(dVal * 6),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const catId = Number(form.int_Category_Id);
    const brandId = Number(form.int_Brand_Id);
    const branchId = Number(form.int_Branch_Id);
    const fuelId = Number(form.int_Fuel_Type_Id);
    const transId = Number(form.int_Transmission_Id);

    const brandName = getBrandName(brandId);
    const catName = getCategoryName(catId);
    const branchName = getBranchName(branchId);
    const fuelName = getFuelName(fuelId);
    const transName = getTransmissionName(transId);

    const fullModelName = form.txt_Model_Name.trim();
    const regNum = form.txt_Registration_Number.trim().toUpperCase();

    // Default image if none uploaded
    const finalImage = vehicleImagePreview || (catId === 4 || catId === 5 ? "/vehicles/classic-350.jpg" : "/vehicles/maruti-swift.jpg");

    // Unified dual-schema data object
    const newVehicleRecord = {
      // Database prefix schema
      int_Category_Id: catId,
      int_Brand_Id: brandId,
      int_Branch_Id: branchId,
      int_Fuel_Type_Id: fuelId,
      int_Transmission_Id: transId,
      int_Manufacture_Year: Number(form.int_Manufacture_Year),
      int_Seating_Capacity: Number(form.int_Seating_Capacity),
      txt_Model_Name: fullModelName,
      txt_Registration_Number: regNum,
      txt_Color: form.txt_Color.trim() || "Pearl White",
      dbl_Daily_Rent: Number(form.dbl_Daily_Rent),
      dbl_Weekly_Rent: Number(form.dbl_Weekly_Rent || form.dbl_Daily_Rent * 6),
      dbl_Security_Deposit: Number(form.dbl_Security_Deposit || 3000),
      int_Odometer_Reading: Number(form.int_Odometer_Reading || 12000),
      txt_Vehicle_Status: form.txt_Vehicle_Status || "A",

      // camelCase schema
      brand: brandName,
      model: fullModelName,
      category: catName,
      registrationNumber: regNum,
      manufacturingYear: Number(form.int_Manufacture_Year),
      fuelType: fuelName,
      transmission: transName,
      seatingCapacity: Number(form.int_Seating_Capacity),
      color: form.txt_Color.trim() || "Pearl White",
      mileage: form.mileage.trim() || (fuelId === 3 ? "350 km/charge" : "20.5 km/l"),
      dailyRate: Number(form.dbl_Daily_Rent),
      weeklyRate: Number(form.dbl_Weekly_Rent || form.dbl_Daily_Rent * 6),
      securityDeposit: Number(form.dbl_Security_Deposit || 3000),
      branch: branchName,
      availabilityStatus: form.txt_Vehicle_Status === "M" ? "Maintenance" : "Available",
      image: finalImage,
      description: form.description.trim() || `Well-maintained ${brandName} ${fullModelName} ready for rent.`,
      features: selectedFeatures.length > 0 ? selectedFeatures : ["Air Conditioner", "Power Steering", "Bluetooth Connectivity"],
      documents: {
        rc: rcFile ? { name: rcFile.name, type: rcFile.type } : null,
        insurance: insuranceFile ? { name: insuranceFile.name, type: insuranceFile.type } : null,
      },
    };

    addVehicle(newVehicleRecord);
    handleClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "28px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.35rem" }}>🚗 {t("add_vehicle")}</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Complete vehicle specifications, pricing, documents, and preview image.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.4rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: IDENTITY & CLASSIFICATION */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              1. Basic Identification
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Model Name *</label>
                <input
                  required
                  value={form.txt_Model_Name}
                  onChange={(e) => setForm({ ...form, txt_Model_Name: e.target.value })}
                  placeholder="e.g. Scorpio-N Z8 or Swift VXI"
                />
              </div>

              <div className="form-row">
                <label>Registration Number *</label>
                <input
                  required
                  value={form.txt_Registration_Number}
                  onChange={(e) => setForm({ ...form, txt_Registration_Number: e.target.value })}
                  placeholder="e.g. TN01-AB-4500"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Brand *</label>
                <select
                  value={form.int_Brand_Id}
                  onChange={(e) => setForm({ ...form, int_Brand_Id: Number(e.target.value) })}
                >
                  {brands.map((br) => (
                    <option key={br.int_Brand_Id} value={br.int_Brand_Id}>
                      {br.txt_Brand_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Category / Type *</label>
                <select
                  value={form.int_Category_Id}
                  onChange={(e) => setForm({ ...form, int_Category_Id: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.int_Category_Id} value={c.int_Category_Id}>
                      {c.txt_Category_Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: TECHNICAL SPECIFICATIONS */}
          <div style={{ marginBottom: "18px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              2. Technical Specifications
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Fuel Type *</label>
                <select
                  value={form.int_Fuel_Type_Id}
                  onChange={(e) => setForm({ ...form, int_Fuel_Type_Id: Number(e.target.value) })}
                >
                  {fuelTypes.map((f) => (
                    <option key={f.int_Fuel_Type_Id} value={f.int_Fuel_Type_Id}>
                      {f.txt_Fuel_Type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Transmission *</label>
                <select
                  value={form.int_Transmission_Id}
                  onChange={(e) => setForm({ ...form, int_Transmission_Id: Number(e.target.value) })}
                >
                  {transmissionTypes.map((tItem) => (
                    <option key={tItem.int_Transmission_Id} value={tItem.int_Transmission_Id}>
                      {tItem.txt_Transmission_Type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Seating Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={form.int_Seating_Capacity}
                  onChange={(e) => setForm({ ...form, int_Seating_Capacity: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Manufacture Year *</label>
                <input
                  type="number"
                  min="2018"
                  max="2026"
                  required
                  value={form.int_Manufacture_Year}
                  onChange={(e) => setForm({ ...form, int_Manufacture_Year: Number(e.target.value) })}
                />
              </div>

              <div className="form-row">
                <label>Color</label>
                <input
                  value={form.txt_Color}
                  onChange={(e) => setForm({ ...form, txt_Color: e.target.value })}
                  placeholder="e.g. Pearl White"
                />
              </div>

              <div className="form-row">
                <label>Mileage / Range</label>
                <input
                  value={form.mileage}
                  onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                  placeholder="e.g. 21 km/l or 350 km"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION, PRICING & STATUS */}
          <div style={{ marginBottom: "18px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              3. Branch Location, Rates & Status
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Assigned Branch *</label>
                <select
                  value={form.int_Branch_Id}
                  disabled={Boolean(branchLock)}
                  onChange={(e) => setForm({ ...form, int_Branch_Id: Number(e.target.value) })}
                >
                  {branches.map((b) => (
                    <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                      {b.txt_Branch_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Availability Status *</label>
                <select
                  value={form.txt_Vehicle_Status}
                  onChange={(e) => setForm({ ...form, txt_Vehicle_Status: e.target.value })}
                >
                  <option value="A">Available for Booking</option>
                  <option value="M">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div className="form-row">
                <label>Daily Rent (₹) *</label>
                <input
                  type="number"
                  min="200"
                  required
                  value={form.dbl_Daily_Rent}
                  onChange={(e) => handleDailyRentChange(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Weekly Rent (₹)</label>
                <input
                  type="number"
                  min="1000"
                  value={form.dbl_Weekly_Rent}
                  onChange={(e) => setForm({ ...form, dbl_Weekly_Rent: Number(e.target.value) })}
                />
              </div>

              <div className="form-row">
                <label>Security Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.dbl_Security_Deposit}
                  onChange={(e) => setForm({ ...form, dbl_Security_Deposit: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: FEATURES & DESCRIPTION */}
          <div style={{ marginBottom: "18px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              4. Features & Highlights
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {AVAILABLE_FEATURES.map((feat) => {
                const isSelected = selectedFeatures.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      background: isSelected ? "var(--accent-subtle)" : "var(--bg-inset)",
                      color: isSelected ? "var(--accent)" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {feat}
                  </button>
                );
              })}
            </div>

            <div className="form-row">
              <label>Vehicle Description</label>
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Key highlights, comfort features, ideal use case..."
                style={{ fontSize: "0.88rem" }}
              />
            </div>
          </div>

          {/* SECTION 5: VEHICLE IMAGE UPLOAD */}
          <div style={{ marginBottom: "18px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "1rem" }}>🖼️</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Vehicle Image Upload (JPG, JPEG, PNG)
              </span>
            </div>

            {vehicleImagePreview ? (
              <div
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                }}
              >
                <img
                  src={vehicleImagePreview}
                  alt="Vehicle preview"
                  style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
                />
                <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "6px" }}>
                  <label
                    htmlFor="addModalImgReplace"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    Replace
                    <input
                      id="addModalImgReplace"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      style={{ display: "none" }}
                      onChange={handleImageChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      background: "rgba(176,60,42,0.85)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
                    padding: "10px 12px 6px",
                    fontSize: "0.75rem",
                    color: "#fff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {vehicleImageFile?.name}
                </div>
              </div>
            ) : (
              <label
                htmlFor="addModalImgUpload"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  border: "2px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "24px 16px",
                  cursor: "pointer",
                  background: "var(--bg-inset)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-subtle)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg-inset)";
                }}
              >
                <span style={{ fontSize: "1.6rem" }}>📷</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Click to upload vehicle photo</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>Supports JPG, JPEG, PNG</span>
                <input
                  id="addModalImgUpload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          {/* SECTION 6: VEHICLE DOCUMENTS UPLOAD */}
          <div style={{ marginBottom: "20px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1rem" }}>📄</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Vehicle Compliance Documents
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Registration Certificate (RC) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: rcFile ? "var(--signal-green-bg)" : "var(--bg-inset)",
                  border: `1px solid ${rcFile ? "var(--signal-green)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{rcFile ? "✅" : "📋"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>
                    Registration Certificate (RC)
                  </div>
                  <div style={{ fontSize: "0.74rem", color: rcFile ? "var(--signal-green)" : "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rcFile ? rcFile.name : "PDF, JPG, JPEG, PNG"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <label
                    htmlFor="modalRcUpload"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                      cursor: "pointer",
                      padding: "4px 10px",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      background: "var(--accent-subtle)",
                    }}
                  >
                    {rcFile ? "Replace" : "Upload"}
                    <input
                      id="modalRcUpload"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      style={{ display: "none" }}
                      onChange={(e) => e.target.files[0] && setRcFile(e.target.files[0])}
                    />
                  </label>
                  {rcFile && (
                    <button
                      type="button"
                      onClick={() => setRcFile(null)}
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--signal-red)",
                        cursor: "pointer",
                        padding: "4px 10px",
                        border: "1px solid var(--signal-red)",
                        borderRadius: "6px",
                        background: "var(--signal-red-bg)",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Insurance Certificate */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: insuranceFile ? "var(--signal-green-bg)" : "var(--bg-inset)",
                  border: `1px solid ${insuranceFile ? "var(--signal-green)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{insuranceFile ? "✅" : "🛡️"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>
                    Insurance Certificate
                  </div>
                  <div style={{ fontSize: "0.74rem", color: insuranceFile ? "var(--signal-green)" : "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {insuranceFile ? insuranceFile.name : "PDF, JPG, JPEG, PNG"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <label
                    htmlFor="modalInsuranceUpload"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                      cursor: "pointer",
                      padding: "4px 10px",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      background: "var(--accent-subtle)",
                    }}
                  >
                    {insuranceFile ? "Replace" : "Upload"}
                    <input
                      id="modalInsuranceUpload"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      style={{ display: "none" }}
                      onChange={(e) => e.target.files[0] && setInsuranceFile(e.target.files[0])}
                    />
                  </label>
                  {insuranceFile && (
                    <button
                      type="button"
                      onClick={() => setInsuranceFile(null)}
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--signal-red)",
                        cursor: "pointer",
                        padding: "4px 10px",
                        border: "1px solid var(--signal-red)",
                        borderRadius: "6px",
                        background: "var(--signal-red-bg)",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              {t("cancel")}
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }}>
              {t("save_vehicle")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

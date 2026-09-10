import { useLanguage } from "../context/LanguageContext";
import { categories, fuelTypes, transmissionTypes, branches } from "../data/mockData";

export default function Filters({
  filters,
  onChange,
  onReset,
  viewMode = "grid",
  onViewModeChange,
  totalResults,
}) {
  const { t } = useLanguage();

  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const setQuickTag = (tag) => {
    onChange({ ...filters, quickTag: filters.quickTag === tag ? "" : tag });
  };

  return (
    <div className="filters-container-box">
      {/* Primary search and dropdowns bar */}
      <div className="filters-main-bar">
        <div className="filters-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="filter-search-input"
            placeholder={t("search_placeholder") || "Search brand, model, color..."}
            value={filters.search}
            onChange={update("search")}
          />
          {filters.search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onChange({ ...filters, search: "" })}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-select-group">
          <select value={filters.category} onChange={update("category")} className="filter-select">
            <option value="">{t("filter_category") || "Category"}: All</option>
            {categories.map((c) => (
              <option key={c.int_Category_Id} value={c.int_Category_Id}>
                {c.txt_Icon || "🚗"} {c.txt_Category_Name}
              </option>
            ))}
          </select>

          <select value={filters.fuel} onChange={update("fuel")} className="filter-select">
            <option value="">{t("filter_fuel") || "Fuel"}: All</option>
            {fuelTypes.map((f) => (
              <option key={f.int_Fuel_Type_Id} value={f.int_Fuel_Type_Id}>
                {f.txt_Fuel_Type}
              </option>
            ))}
          </select>

          <select value={filters.transmission} onChange={update("transmission")} className="filter-select">
            <option value="">{t("filter_transmission") || "Transmission"}: All</option>
            {transmissionTypes.map((tt) => (
              <option key={tt.int_Transmission_Id} value={tt.int_Transmission_Id}>
                {tt.txt_Transmission_Type}
              </option>
            ))}
          </select>

          <select value={filters.branch} onChange={update("branch")} className="filter-select">
            <option value="">{t("filter_branch") || "Branch"}: All</option>
            {branches.map((b) => (
              <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                📍 {b.txt_Branch_Name}
              </option>
            ))}
          </select>

          <select value={filters.sort} onChange={update("sort")} className="filter-select">
            <option value="name">Sort: Brand / Model</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => onViewModeChange("grid")}
              title="Grid View"
            >
              ▦
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => onViewModeChange("list")}
              title="List View"
            >
              ☰
            </button>
          </div>
        )}
      </div>

      {/* Quick Filters Tag Strip + Price Slider + Reset */}
      <div className="filters-sub-bar">
        <div className="quick-tags-wrap">
          <span className="quick-tags-label">Quick:</span>
          <button
            type="button"
            className={`quick-tag-chip ${filters.quickTag === "electric" ? "active" : ""}`}
            onClick={() => setQuickTag("electric")}
          >
            ⚡ Electric
          </button>
          <button
            type="button"
            className={`quick-tag-chip ${filters.quickTag === "automatic" ? "active" : ""}`}
            onClick={() => setQuickTag("automatic")}
          >
            ⚙️ Automatic
          </button>
          <button
            type="button"
            className={`quick-tag-chip ${filters.quickTag === "budget" ? "active" : ""}`}
            onClick={() => setQuickTag("budget")}
          >
            🏷️ Budget (&le; ₹2,500)
          </button>
          <button
            type="button"
            className={`quick-tag-chip ${filters.quickTag === "family" ? "active" : ""}`}
            onClick={() => setQuickTag("family")}
          >
            👨‍👩‍👧 Family (5+ Seats)
          </button>
        </div>

        <div className="filters-actions-wrap">
          <div className="price-slider-wrap">
            <span className="price-slider-label">
              Max: <strong>₹{(filters.maxPrice || 10000).toLocaleString("en-IN")}</strong>
            </span>
            <input
              type="range"
              min="500"
              max="10000"
              step="200"
              value={filters.maxPrice || 10000}
              onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
              className="price-slider"
            />
          </div>

          {onReset && (
            <button type="button" className="filter-reset-btn" onClick={onReset}>
              🔄 Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

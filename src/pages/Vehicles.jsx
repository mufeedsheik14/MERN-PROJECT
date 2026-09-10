import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useFleet } from "../context/FleetContext";
import Filters from "../components/Filters";
import VehicleCard from "../components/VehicleCard";
import {
  getBrandName,
  getCategoryName,
  matchCategory,
  filterCategories,
} from "../data/mockData";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  fuel: "",
  transmission: "",
  branch: "",
  sort: "name",
  maxPrice: 10000,
  quickTag: "",
};

export default function Vehicles() {
  const { t } = useLanguage();
  const { vehicles, loading, error, refetchVehicles } = useFleet();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState("grid");
  const [localFilters, setLocalFilters] = useState(DEFAULT_FILTERS);

  // Derive effective filters from URL params and local state
  const filters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...localFilters,
      category: searchParams.get("category") ?? localFilters.category,
      branch: searchParams.get("branch") ?? localFilters.branch,
      search: searchParams.get("search") ?? localFilters.search,
      fuel: searchParams.get("fuel") ?? localFilters.fuel,
      quickTag: searchParams.get("quickTag") ?? localFilters.quickTag,
    }),
    [searchParams, localFilters]
  );

  useEffect(() => {
    document.title = `${t("nav_vehicles")} · ${t("appName")}`;
  }, [t]);

  const handleFilterChange = useCallback(
    (next) => {
      setLocalFilters(next);
      const params = new URLSearchParams();
      if (next.category) params.set("category", next.category);
      if (next.branch) params.set("branch", next.branch);
      if (next.search) params.set("search", next.search);
      if (next.fuel) params.set("fuel", next.fuel);
      if (next.quickTag) params.set("quickTag", next.quickTag);
      setSearchParams(params);
    },
    [setSearchParams]
  );

  const handleResetFilters = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS);
    setSearchParams({});
  }, [setSearchParams]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const map = {};
    (vehicles || []).forEach((v) => {
      filterCategories.forEach((fc) => {
        if (!fc.id) return;
        if (matchCategory(v.int_Category_Id, fc.id)) {
          map[fc.id] = (map[fc.id] || 0) + 1;
        }
      });
    });
    return map;
  }, [vehicles]);

  // Filtered & sorted vehicle list
  const filteredVehicles = useMemo(() => {
    let list = (vehicles || []).filter((v) => {
      const searchLower = filters.search.toLowerCase();
      const brandName = getBrandName(v.int_Brand_Id).toLowerCase();
      const modelName = (v.txt_Model_Name || "").toLowerCase();
      const categoryName = getCategoryName(v.int_Category_Id).toLowerCase();
      const regNumber = (v.txt_Registration_Number || "").toLowerCase();

      const searchMatch =
        !filters.search ||
        brandName.includes(searchLower) ||
        modelName.includes(searchLower) ||
        categoryName.includes(searchLower) ||
        regNumber.includes(searchLower);

      const categoryMatch =
        !filters.category || matchCategory(v.int_Category_Id, filters.category);
      const fuelMatch =
        !filters.fuel || String(v.int_Fuel_Type_Id) === filters.fuel;
      const transmissionMatch =
        !filters.transmission || String(v.int_Transmission_Id) === filters.transmission;
      const branchMatch =
        !filters.branch || String(v.int_Branch_Id) === filters.branch;

      // Price slider filter
      const priceMatch = !filters.maxPrice || v.dbl_Daily_Rent <= filters.maxPrice;

      // Quick Tag filters
      let tagMatch = true;
      if (filters.quickTag === "electric") {
        tagMatch = v.int_Fuel_Type_Id === 3;
      } else if (filters.quickTag === "automatic") {
        tagMatch = v.int_Transmission_Id === 2;
      } else if (filters.quickTag === "budget") {
        tagMatch = v.dbl_Daily_Rent <= 2500;
      } else if (filters.quickTag === "family") {
        tagMatch = v.int_Seating_Capacity >= 5;
      }

      return (
        searchMatch &&
        categoryMatch &&
        fuelMatch &&
        transmissionMatch &&
        branchMatch &&
        priceMatch &&
        tagMatch
      );
    });

    if (filters.sort === "price_low") {
      list = [...list].sort((a, b) => a.dbl_Daily_Rent - b.dbl_Daily_Rent);
    } else if (filters.sort === "price_high") {
      list = [...list].sort((a, b) => b.dbl_Daily_Rent - a.dbl_Daily_Rent);
    } else {
      list = [...list].sort((a, b) =>
        getBrandName(a.int_Brand_Id).localeCompare(getBrandName(b.int_Brand_Id))
      );
    }

    return list;
  }, [filters, vehicles]);

  return (
    <div className="container" style={{ paddingBottom: "48px" }}>
      <div className="vehicles-header-row">
        <div>
          <h1 style={{ marginTop: "32px", marginBottom: "4px" }}>{t("nav_vehicles")}</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
            Explore premium and economy rides with instant reservations &amp; doorstep delivery
          </p>
        </div>

        <div className="results-count-badge">
          <span>{filteredVehicles.length}</span> rides available
        </div>
      </div>

      {/* Interactive Category Chips Strip */}
      <div className="category-chips-strip">
        <button
          type="button"
          className={`category-pill-chip ${!filters.category ? "active" : ""}`}
          onClick={() => handleFilterChange({ ...filters, category: "" })}
        >
          <span className="pill-icon">🌐</span>
          <span className="pill-name">All</span>
          <span className="pill-count">{(vehicles || []).length}</span>
        </button>

        {filterCategories
          .filter((fc) => fc.id)
          .map((c) => {
            const count = categoryCounts[c.id] || 0;
            const isActive = filters.category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`category-pill-chip ${isActive ? "active" : ""}`}
                onClick={() =>
                  handleFilterChange({
                    ...filters,
                    category: isActive ? "" : c.id,
                  })
                }
              >
                <span className="pill-icon">{c.icon || "🚗"}</span>
                <span className="pill-name">{c.name}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
      </div>

      <Filters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={filteredVehicles.length}
      />

      {loading && (vehicles || []).length === 0 ? (
        <div className="empty-state" style={{ padding: "70px 20px" }}>
          <div
            style={{
              fontSize: "2.8rem",
              marginBottom: "16px",
              display: "inline-block",
              animation: "spin 1.5s linear infinite",
            }}
          >
            ⚙️
          </div>
          <h3>Connecting to Fleet Database...</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "420px", margin: "8px auto 0" }}>
            Fetching live vehicles from RoadReady backend API.
          </p>
        </div>
      ) : error && (vehicles || []).length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 20px" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "16px" }}>⚠️</div>
          <h3 style={{ color: "var(--signal-red, #ef4444)" }}>Unable to Load Vehicles</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 20px" }}>
            {error || "Could not retrieve vehicle fleet from backend API."}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => refetchVehicles?.()}>
            🔄 Retry Connection
          </button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</div>
          <h3>{t("no_results")}</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "420px", margin: "8px auto 20px" }}>
            We couldn't find any vehicles matching your active criteria. Try loosening your filters or resetting them.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleResetFilters}>
            🔄 Reset All Filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "list" ? "vehicle-list-layout" : "vehicle-grid"}>
          {filteredVehicles.map((v) => (
            <VehicleCard key={v.int_Vehicle_Id || v._id} vehicle={v} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}

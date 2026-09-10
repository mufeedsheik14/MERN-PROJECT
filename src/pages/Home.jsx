import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useFleet } from "../context/FleetContext";
import VehicleCard from "../components/VehicleCard";
import HeroDriveAnimation from "../components/HeroDriveAnimation";
import { branches, matchCategory } from "../data/mockData";

export default function Home() {
  const { t } = useLanguage();
  const { vehicles, loading, refetchVehicles } = useFleet();

  const [activeCategoryTab, setActiveCategoryTab] = useState("all");

  useEffect(() => {
    if (!loading && (!vehicles || vehicles.length === 0)) {
      refetchVehicles();
    }
  }, [vehicles, loading, refetchVehicles]);

  const categoryTabs = [
    { id: "all", label: "✨ All Rides", icon: "" },
    { id: "hatchback", label: "🚗 Hatchback", icon: "" },
    { id: "sedan", label: "🚘 Sedan", icon: "" },
    { id: "suv", label: "🚙 SUV", icon: "" },
    { id: "electric", label: "⚡ Electric", icon: "" },
    { id: "bike", label: "🏍️ Bike", icon: "" },
  ];

  // Filter available vehicles based on active tab
  const displayedVehicles = useMemo(() => {
    const list = vehicles || [];
    const available = list.filter(
      (v) => v.txt_Vehicle_Status === "A" || v.availabilityStatus === "Available"
    );
    const pool = available.length > 0 ? available : list;
    if (activeCategoryTab === "all") return pool.slice(0, 6);
    if (activeCategoryTab === "electric") return pool.filter((v) => v.int_Fuel_Type_Id === 3).slice(0, 6);
    return pool.filter((v) => matchCategory(v.int_Category_Id, activeCategoryTab)).slice(0, 6);
  }, [vehicles, activeCategoryTab]);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          {/* Each element has its own staggered entrance class */}
          <div className="eyebrow hero-anim-eyebrow">
            {branches.length} {t("filter_branch")}s · Tamil Nadu &amp; beyond
          </div>
          <h1 className="hero-anim-h1">{t("hero_title")}</h1>
          <p className="hero-anim-p">{t("hero_subtitle", { branches: branches.length })}</p>
          <div className="hero-anim-btn">
            <Link to="/vehicles" className="btn btn-primary">
              {t("hero_cta")} →
            </Link>
          </div>
        </div>

        {/* Prominent car driving animation across the hero bottom */}
        <HeroDriveAnimation />
      </section>

      <div className="container" style={{ paddingBottom: "54px" }}>
        <div className="section-title" style={{ alignItems: "flex-end" }}>
          <div>
            <h2 style={{ marginTop: "36px", marginBottom: "4px" }}>{t("nav_vehicles")}</h2>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              ⚡ Instant booking · Doorstep handover · Verified RC &amp; Insurance
            </div>
          </div>
          <Link to="/vehicles" className="nav-link">
            {t("view_details")} →
          </Link>
        </div>

        {/* Interactive Category Filter Tabs on Home */}
        <div className="home-category-tabs" role="tablist" aria-label="Vehicle Categories">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryTab === tab.id}
              className={`home-tab-pill ${activeCategoryTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveCategoryTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (!vehicles || vehicles.length === 0) ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: "2rem", display: "inline-block", animation: "spin 1.5s linear infinite" }}>⚙️</div>
            <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>Loading rides from fleet...</p>
          </div>
        ) : displayedVehicles.length === 0 ? (
          <div className="empty-state" style={{ padding: "36px" }}>
            <p style={{ color: "var(--text-muted)" }}>No vehicles found in this category right now.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveCategoryTab("all")}
            >
              Show All Available Rides
            </button>
          </div>
        ) : (
          <div className="vehicle-grid">
            {displayedVehicles.map((v) => (
              <VehicleCard key={v.int_Vehicle_Id || v._id} vehicle={v} />
            ))}
          </div>
        )}

      </div>
    </>
  );
}

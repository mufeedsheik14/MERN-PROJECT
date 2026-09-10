import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { fetchVehicles } from "../services/vehicleService";
import {
  coupons as initialCoupons,
  categories as initialCategories,
  brands as initialBrands,
} from "../data/mockData";

const FleetContext = createContext(undefined);

const COUPONS_STORAGE_KEY = "rr_coupons";

function loadStoredCoupons() {
  try {
    const stored = window.localStorage.getItem(COUPONS_STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(initialCoupons));
      return initialCoupons;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialCoupons;
  } catch {
    return initialCoupons;
  }
}

export function FleetProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coupons, setCoupons] = useState(loadStoredCoupons);
  const [categories, setCategories] = useState(initialCategories);
  const [brands, setBrands] = useState(initialBrands);

  // In-flight promise tracker to prevent duplicate concurrent network requests
  const inFlightPromiseRef = useRef(null);

  const loadVehicles = useCallback(async () => {
    // If a request is already running, reuse the active promise to avoid duplicate requests
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    setLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const data = await fetchVehicles();
        if (Array.isArray(data)) {
          setVehicles(data);
          setError(null);
        }
        return data;
      } catch (err) {
        setError(err.message || "Failed to load vehicles from server.");
        throw err;
      } finally {
        setLoading(false);
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    loadVehicles().catch(() => {
      // Error state already set inside loadVehicles
    });
  }, [loadVehicles]);

  useEffect(() => {
    window.localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
  }, [coupons]);

  const addVehicle = useCallback((newVeh) => {
    const nextId = Math.max(100, ...vehicles.map((v) => v.int_Vehicle_Id || 0)) + 1;
    const created = {
      ...newVeh,
      int_Vehicle_Id: nextId,
      vehicleId: nextId,
      txt_Vehicle_Status: newVeh.txt_Vehicle_Status || "A",
      availabilityStatus: newVeh.txt_Vehicle_Status === "M" ? "Maintenance" : "Available",
    };
    setVehicles((prev) => [created, ...prev]);
    return created;
  }, [vehicles]);

  const updateVehicle = useCallback((id, updates) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.int_Vehicle_Id === id || v.vehicleId === id) {
          const updatedStatus = updates.txt_Vehicle_Status || v.txt_Vehicle_Status;
          return {
            ...v,
            ...updates,
            availabilityStatus:
              updatedStatus === "A"
                ? "Available"
                : updatedStatus === "M"
                ? "Maintenance"
                : "Inactive",
          };
        }
        return v;
      })
    );
  }, []);

  const deleteVehicle = useCallback((id) => {
    setVehicles((prev) => prev.filter((v) => v.int_Vehicle_Id !== id && v.vehicleId !== id));
  }, []);

  const setVehicleStatus = useCallback((id, status) => {
    updateVehicle(id, { txt_Vehicle_Status: status });
  }, [updateVehicle]);

  const addCoupon = useCallback((coupon) => {
    setCoupons((prev) => {
      const code = coupon.txt_Coupon_Code.trim().toUpperCase();
      const filtered = prev.filter((c) => c.txt_Coupon_Code.toUpperCase() !== code);
      return [
        {
          txt_Coupon_Code: code,
          dbl_Discount_Percent: Number(coupon.dbl_Discount_Percent),
          dbl_Max_Discount_Amount: Number(coupon.dbl_Max_Discount_Amount),
          dte_Valid_To: coupon.dte_Valid_To,
        },
        ...filtered,
      ];
    });
  }, []);

  const deleteCoupon = useCallback((code) => {
    setCoupons((prev) =>
      prev.filter((c) => c.txt_Coupon_Code.toUpperCase() !== code.toUpperCase())
    );
  }, []);

  const addCategory = useCallback((cat) => {
    setCategories((prev) => [
      ...prev,
      {
        int_Category_Id: prev.length + 1,
        txt_Category_Name: cat.txt_Category_Name,
        txt_Icon: cat.txt_Icon || "🚗",
      },
    ]);
  }, []);

  const addBrand = useCallback((brand) => {
    setBrands((prev) => [
      ...prev,
      {
        int_Brand_Id: prev.length + 1,
        txt_Brand_Name: brand.txt_Brand_Name,
      },
    ]);
  }, []);

  const value = useMemo(
    () => ({
      vehicles,
      loading,
      error,
      refetchVehicles: loadVehicles,
      coupons,
      categories,
      brands,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      setVehicleStatus,
      addCoupon,
      deleteCoupon,
      addCategory,
      addBrand,
    }),
    [
      vehicles,
      loading,
      error,
      loadVehicles,
      coupons,
      categories,
      brands,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      setVehicleStatus,
      addCoupon,
      deleteCoupon,
      addCategory,
      addBrand,
    ]
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within a FleetProvider");
  return ctx;
}

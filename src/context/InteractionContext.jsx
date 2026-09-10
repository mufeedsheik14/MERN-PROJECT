import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const InteractionContext = createContext(undefined);

const WISHLIST_KEY = "rr_wishlist";
const COMPARE_KEY = "rr_compare";

function loadLocalStorageArray(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function InteractionProvider({ children }) {
  // --- Wishlist State ---
  const [wishlist, setWishlist] = useState(() => loadLocalStorageArray(WISHLIST_KEY));
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch {
      // ignore storage errors
    }
  }, [wishlist]);

  // --- Comparison State ---
  const [compareList, setCompareList] = useState(() => loadLocalStorageArray(COMPARE_KEY));
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
    } catch {
      // ignore
    }
  }, [compareList]);

  // --- Quick View State ---
  const [quickViewVehicle, setQuickViewVehicle] = useState(null);

  // --- Toast System State ---
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", icon = null) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type, icon }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Wishlist actions ---
  const toggleWishlist = useCallback(
    (vehicleId, vehicleName = "") => {
      const exists = wishlist.includes(vehicleId);
      if (exists) {
        showToast(`Removed ${vehicleName || "vehicle"} from favorites`, "info", "🤍");
        setWishlist((prev) => prev.filter((id) => id !== vehicleId));
      } else {
        showToast(`Added ${vehicleName || "vehicle"} to favorites!`, "success", "❤️");
        setWishlist((prev) => [...prev, vehicleId]);
      }
    },
    [wishlist, showToast]
  );

  const isWishlisted = useCallback((vehicleId) => wishlist.includes(vehicleId), [wishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    showToast("Cleared your favorites", "info", "🗑️");
  }, [showToast]);

  // --- Compare actions ---
  const toggleCompare = useCallback(
    (vehicleId, vehicleName = "") => {
      const exists = compareList.includes(vehicleId);
      if (exists) {
        showToast(`Removed from comparison`, "info", "⚖️");
        setCompareList((prev) => prev.filter((id) => id !== vehicleId));
      } else {
        if (compareList.length >= 4) {
          showToast("You can compare up to 4 vehicles at a time", "warning", "⚠️");
          return;
        }
        showToast(`Added ${vehicleName || "vehicle"} to comparison`, "success", "⚖️");
        setCompareList((prev) => [...prev, vehicleId]);
      }
    },
    [compareList, showToast]
  );

  const isInCompare = useCallback((vehicleId) => compareList.includes(vehicleId), [compareList]);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    setIsCompareModalOpen(false);
  }, []);

  // --- Quick view actions ---
  const openQuickView = useCallback((vehicle) => {
    setQuickViewVehicle(vehicle);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewVehicle(null);
  }, []);

  const value = useMemo(
    () => ({
      wishlist,
      isWishlisted,
      toggleWishlist,
      clearWishlist,
      isWishlistOpen,
      setIsWishlistOpen,

      compareList,
      isInCompare,
      toggleCompare,
      clearCompare,
      isCompareModalOpen,
      setIsCompareModalOpen,

      quickViewVehicle,
      openQuickView,
      closeQuickView,

      toasts,
      showToast,
      removeToast,
    }),
    [
      wishlist,
      isWishlisted,
      toggleWishlist,
      clearWishlist,
      isWishlistOpen,
      compareList,
      isInCompare,
      toggleCompare,
      clearCompare,
      isCompareModalOpen,
      quickViewVehicle,
      openQuickView,
      closeQuickView,
      toasts,
      showToast,
      removeToast,
    ]
  );

  return <InteractionContext.Provider value={value}>{children}</InteractionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInteraction() {
  const ctx = useContext(InteractionContext);
  if (!ctx) {
    throw new Error("useInteraction must be used within an InteractionProvider");
  }
  return ctx;
}

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  createBookingApi,
  getMyBookingsApi,
  getAllBookingsApi,
  cancelBookingApi,
} from "../services/bookingService";

const BookingContext = createContext(undefined);

/**
 * Reducer for booking state updates.
 * Predictable, event-driven state mutations.
 */
function bookingReducer(state, action) {
  switch (action.type) {
    case "ADD_BOOKING": {
      const exists = state.some(
        (b) =>
          b.txt_Booking_Number === action.payload.txt_Booking_Number ||
          (action.payload._id && b._id === action.payload._id)
      );
      if (exists) {
        return state.map((b) =>
          b.txt_Booking_Number === action.payload.txt_Booking_Number ||
          (action.payload._id && b._id === action.payload._id)
            ? action.payload
            : b
        );
      }
      return [action.payload, ...state];
    }
    case "CANCEL_BOOKING":
      return state.map((b) =>
        b.txt_Booking_Number === action.payload || b._id === action.payload
          ? { ...b, int_Booking_Status_Id: 5, status: "cancelled" }
          : b
      );
    case "UPDATE_STATUS": {
      const statusMap = {
        1: "pending",
        2: "confirmed",
        3: "ongoing",
        4: "completed",
        5: "cancelled",
      };
      return state.map((b) =>
        b.txt_Booking_Number === action.payload.bookingNumber ||
        b._id === action.payload.bookingNumber
          ? {
              ...b,
              int_Booking_Status_Id: action.payload.statusId,
              status: statusMap[action.payload.statusId] || "pending",
            }
          : b
      );
    }
    case "HYDRATE":
      return Array.isArray(action.payload) ? action.payload : [];
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const { user, isAdmin, isStaff } = useAuth();
  const [bookings, dispatch] = useReducer(bookingReducer, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch real bookings from MongoDB backend whenever user session changes
  const refreshBookings = useCallback(async () => {
    if (!user) {
      dispatch({ type: "HYDRATE", payload: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list =
        isAdmin || isStaff
          ? await getAllBookingsApi()
          : await getMyBookingsApi();
      dispatch({ type: "HYDRATE", payload: list });
    } catch (err) {
      console.warn("Could not fetch bookings from backend:", err.message);
      setError(err.message);
      dispatch({ type: "HYDRATE", payload: [] });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isStaff]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // Create booking via backend API and append to state
  const addBooking = useCallback(async (bookingData) => {
    const created = await createBookingApi(bookingData);
    dispatch({ type: "ADD_BOOKING", payload: created });
    return created;
  }, []);

  // Cancel booking via backend API and update state
  const cancelBooking = useCallback(async (bookingNumber, reason) => {
    const updated = await cancelBookingApi(bookingNumber, reason);
    dispatch({
      type: "CANCEL_BOOKING",
      payload: updated.txt_Booking_Number || bookingNumber,
    });
    return updated;
  }, []);

  // Update booking in local context (e.g. after payment verification)
  const updateBooking = useCallback((updated) => {
    dispatch({ type: "ADD_BOOKING", payload: updated });
  }, []);

  // Update status (staff/admin)
  const updateBookingStatus = useCallback((bookingNumber, statusId) => {
    dispatch({
      type: "UPDATE_STATUS",
      payload: { bookingNumber, statusId: Number(statusId) },
    });
  }, []);

  const value = useMemo(
    () => ({
      bookings,
      loading,
      error,
      addBooking,
      updateBooking,
      cancelBooking,
      updateBookingStatus,
      refreshBookings,
    }),
    [bookings, loading, error, addBooking, updateBooking, cancelBooking, updateBookingStatus, refreshBookings]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}

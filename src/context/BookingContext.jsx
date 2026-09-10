import { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from "react";
import { INITIAL_MOCK_BOOKINGS } from "../data/mockData";

const BookingContext = createContext(undefined);

const STORAGE_KEY = "rr_bookings";

function loadInitialBookings() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_BOOKINGS));
      return INITIAL_MOCK_BOOKINGS;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MOCK_BOOKINGS;
  } catch {
    return INITIAL_MOCK_BOOKINGS;
  }
}

// useReducer: bookings behave like a small event-sourced list.
// ADD_BOOKING / CANCEL_BOOKING / UPDATE_STATUS are the mutations allowed,
// which keeps booking state changes predictable and testable.
function bookingReducer(state, action) {
  switch (action.type) {
    case "ADD_BOOKING":
      return [action.payload, ...state];
    case "CANCEL_BOOKING":
      return state.map((b) =>
        b.txt_Booking_Number === action.payload ? { ...b, int_Booking_Status_Id: 5 } : b
      );
    case "UPDATE_STATUS":
      return state.map((b) =>
        b.txt_Booking_Number === action.payload.bookingNumber
          ? { ...b, int_Booking_Status_Id: action.payload.statusId }
          : b
      );
    case "HYDRATE":
      return action.payload;
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [bookings, dispatch] = useReducer(bookingReducer, [], loadInitialBookings);

  // Persist every time the reducer state changes.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }, [bookings]);

  const addBooking = useCallback((booking) => {
    dispatch({ type: "ADD_BOOKING", payload: booking });
  }, []);

  const cancelBooking = useCallback((bookingNumber) => {
    dispatch({ type: "CANCEL_BOOKING", payload: bookingNumber });
  }, []);

  const updateBookingStatus = useCallback((bookingNumber, statusId) => {
    dispatch({
      type: "UPDATE_STATUS",
      payload: { bookingNumber, statusId: Number(statusId) },
    });
  }, []);

  const value = useMemo(
    () => ({ bookings, addBooking, cancelBooking, updateBookingStatus }),
    [bookings, addBooking, cancelBooking, updateBookingStatus]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookings must be used within a BookingProvider");
  return ctx;
}

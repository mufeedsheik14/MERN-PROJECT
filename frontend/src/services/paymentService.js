import { getStoredToken } from "./authService";
import { API_BASE_URL } from "./apiConfig";

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Dynamically load Razorpay Checkout script if not already present.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Fetch public payment config (Key ID, mode)
 * GET /api/payments/config
 */
export async function getPaymentConfigApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/config`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to load payment config:", err);
    return { success: false, keyId: "" };
  }
}

/**
 * Request server to create a Razorpay TEST Order for an existing booking.
 * Amount is derived exclusively from server-side trusted booking net amount.
 * POST /api/payments/create-order
 *
 * @param {string} bookingId
 * @returns {Promise<Object>} Order details with orderId, amount (paise), currency, public keyId
 */
export async function createPaymentOrderApi(bookingId) {
  const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ bookingId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.message || `Payment initialization failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Verify Razorpay payment signature on backend.
 * POST /api/payments/verify
 *
 * @param {Object} paymentPayload
 * @returns {Promise<Object>} Updated booking with status Confirmed and paymentStatus Paid
 */
export async function verifyPaymentApi({
  bookingId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const response = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.message || `Payment verification failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Record payment failure or cancellation on backend.
 * POST /api/payments/failure
 *
 * @param {Object} payload
 */
export async function recordPaymentFailureApi({
  bookingId,
  razorpay_order_id,
  reason,
  error,
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/failure`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        bookingId,
        razorpay_order_id,
        reason,
        error,
      }),
    });
    return await response.json();
  } catch (err) {
    console.warn("Could not record payment failure to server:", err);
    return { success: false };
  }
}

/**
 * Detect if client is a mobile device or touch viewport.
 */
export function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

/**
 * Launch official Razorpay Checkout with method prefill and payment blocks.
 */
export async function openRazorpayCheckout({
  orderData,
  method = "upi",
  onSuccess,
  onFailure,
  onDismiss,
}) {
  // If in mock simulation mode (dummy test key), Razorpay's remote server at checkout.razorpay.com
  // does not have rzp_test_mock in its database. Trying to connect will cause checkout.js to
  // execute window.alert("Oops! Something went wrong.\n..."), which blocks the browser.
  if (orderData?.isMockMode || orderData?.keyId === "rzp_test_mock" || orderData?.keyId?.startsWith("rzp_test_mock_")) {
    return { isMock: true };
  }

  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error("Razorpay Checkout SDK failed to load. Please check your network connection.");
  }

  const prefill = {
    name: orderData.booking?.customerName || "",
    email: orderData.booking?.email || "",
    contact: orderData.booking?.phone || "",
    method: method,
  };

  const options = {
    key: orderData.keyId,
    amount: orderData.amount, // in paise
    currency: orderData.currency || "INR",
    name: "RoadReady Rentals",
    description: `Rental Booking #${orderData.booking?.bookingNumber}`,
    prefill: prefill,
    theme: {
      color: "#E0632B", // RoadReady brand accent
    },
    notes: {
      bookingNumber: orderData.booking?.bookingNumber,
      vehicle: orderData.booking?.vehicleLabel,
      method: method,
    },
    handler: function (response) {
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  };

  if (orderData.orderId && !orderData.isMockMode && !orderData.orderId.startsWith("order_test_")) {
    options.order_id = orderData.orderId;
  }

  // Intercept window.alert while opening Razorpay Checkout to prevent native browser blocking popups
  const originalAlert = window.alert;
  let alertCaptured = null;
  window.alert = function (message) {
    alertCaptured = message;
    console.warn("Intercepted Razorpay Checkout popup alert:", message);
  };

  try {
    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response) {
      if (onFailure) {
        onFailure(response.error || { description: "Payment processing failed" });
      }
    });

    rzp.open();

    // Restore alert after checkout finishes opening or faults
    setTimeout(() => {
      window.alert = originalAlert;
      if (alertCaptured && onFailure) {
        onFailure({ description: alertCaptured });
      }
    }, 1500);

    return rzp;
  } catch (err) {
    window.alert = originalAlert;
    throw err;
  }
}

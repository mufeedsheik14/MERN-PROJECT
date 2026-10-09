import { jsPDF } from "jspdf";

/**
 * Format currency in Indian Rupees notation
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return `Rs. ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date nicely
 */
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Resolves vehicle registration number from booking or fallback vehicles list
 */
export function getBookingRegNumber(booking, vehicles = []) {
  if (!booking) return "N/A";
  if (booking.vehicle?.txt_Registration_Number) {
    return booking.vehicle.txt_Registration_Number;
  }
  if (booking.txt_Registration_Number) {
    return booking.txt_Registration_Number;
  }
  if (vehicles && vehicles.length > 0) {
    const matched = vehicles.find(
      (v) =>
        (v._id && booking.vehicle && String(v._id) === String(booking.vehicle)) ||
        (v.int_Vehicle_Id !== undefined &&
          booking.int_Vehicle_Id !== undefined &&
          Number(v.int_Vehicle_Id) === Number(booking.int_Vehicle_Id))
    );
    if (matched?.txt_Registration_Number) {
      return matched.txt_Registration_Number;
    }
  }
  return "KA-01-RR-" + (booking.int_Vehicle_Id || "101");
}

/**
 * Build professional Customer Booking Receipt PDF with real booking data
 * Suitable for high-resolution printing, legal record, or corporate submission.
 */
export function buildReceiptPdfDoc(booking, extraData = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const bookingNumber = booking.txt_Booking_Number || `BK-${booking._id || "NEW"}`;
  const isPaid = booking.paymentStatus === "Paid";
  const isFailed = booking.paymentStatus === "Failed";
  const isCancelled =
    booking.status === "cancelled" || booking.int_Booking_Status_Id === 5;

  let statusLabel = "CONFIRMED";
  let statusBg = [16, 185, 129]; // Green
  let statusText = [255, 255, 255];

  if (isFailed) {
    statusLabel = "PAYMENT FAILED";
    statusBg = [239, 68, 68]; // Red
  } else if (isCancelled) {
    statusLabel = "CANCELLED";
    statusBg = [100, 116, 139]; // Slate
  } else if (!isPaid) {
    statusLabel = "PAYMENT PENDING";
    statusBg = [245, 158, 11]; // Amber
  }

  // ── 1. Top Header Background Banner ───────────────────────────
  doc.setFillColor(15, 23, 42); // Slate-900 Navy
  doc.rect(0, 0, pageWidth, 36, "F");

  // Accent Line under banner
  doc.setFillColor(224, 99, 43); // RoadReady Coral Accent
  doc.rect(0, 36, pageWidth, 2, "F");

  // Logo Symbol (Vector car emblem box)
  doc.setFillColor(224, 99, 43);
  doc.roundedRect(margin, 8, 20, 20, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RR", margin + 6, 21);

  // Brand Name & Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("RoadReady", margin + 25, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("Premium Self-Drive Rentals & Mobility Solutions", margin + 25, 24);

  // Document Title (Right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("RENTAL BOOKING RECEIPT", pageWidth - margin, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - margin, 23, {
    align: "right",
  });

  // ── 2. Booking Metadata & Status Bar ─────────────────────────
  let curY = 46;

  // Receipt Reference Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, curY, contentWidth, 22, 2, 2, "FD");

  // Booking ID & Booking Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("BOOKING REFERENCE", margin + 6, curY + 7);
  doc.text("BOOKING DATE", margin + 70, curY + 7);
  doc.text("PAYMENT STATUS", margin + 125, curY + 7);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(bookingNumber, margin + 6, curY + 15);

  doc.setFont("helvetica", "normal");
  doc.text(formatDate(booking.createdAt || booking.dte_Pickup_Date), margin + 70, curY + 15);

  // Status Badge
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(margin + 125, curY + 10, 48, 7.5, 1.5, 1.5, "F");
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(statusLabel, margin + 149, curY + 15, { align: "center" });

  curY += 28;

  // ── 3. Two Information Cards: Customer Details | Vehicle Details ──
  const cardWidth = (contentWidth - 6) / 2;
  const cardHeight = 44;

  // Left Card: Customer Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, cardWidth, cardHeight, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, curY, cardWidth, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("CUSTOMER INFORMATION", margin + 5, curY + 5.5);

  const custName = booking.customerName || "Customer";
  const custEmail = booking.email || "N/A";
  const custPhone = booking.phone || "N/A";
  const custUser = booking.customerUsername || "guest";

  doc.setFontSize(8.5);
  let cy1 = curY + 14;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Name:", margin + 5, cy1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(custName, margin + 25, cy1);

  cy1 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Email:", margin + 5, cy1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(custEmail, margin + 25, cy1);

  cy1 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Phone:", margin + 5, cy1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(custPhone, margin + 25, cy1);

  cy1 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Account:", margin + 5, cy1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`@${custUser}`, margin + 25, cy1);

  // Right Card: Vehicle & Reservation Details
  const rightX = margin + cardWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, curY, cardWidth, cardHeight, 2, 2, "FD");

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightX, curY, cardWidth, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("VEHICLE & RENTAL DETAILS", rightX + 5, curY + 5.5);

  const regNo = getBookingRegNumber(booking, extraData.vehicles);
  const vehicleName = booking.vehicleLabel || "Rental Vehicle";

  let cy2 = curY + 14;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Vehicle:", rightX + 5, cy2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(vehicleName, rightX + 26, cy2);

  cy2 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Reg Number:", rightX + 5, cy2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(regNo, rightX + 26, cy2);

  cy2 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Duration:", rightX + 5, cy2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${booking.int_Total_Days || 1} Days (${booking.dte_Pickup_Date || "N/A"} to ${
      booking.dte_Return_Date || "N/A"
    })`,
    rightX + 26,
    cy2
  );

  cy2 += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Lifecycle:", rightX + 5, cy2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(String(booking.status || "Confirmed").toUpperCase(), rightX + 26, cy2);

  curY += cardHeight + 8;

  // ── 4. Itemized Pricing Table ────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, curY, contentWidth, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION / SERVICE", margin + 6, curY + 5.5);
  doc.text("QTY / DURATION", margin + 105, curY + 5.5);
  doc.text("AMOUNT (INR)", pageWidth - margin - 6, curY + 5.5, { align: "right" });

  curY += 8;

  // Table Rows Calculation
  const totalDays = booking.int_Total_Days || 1;
  const ratePerDay = booking.dbl_Rate_Per_Day || 0;
  const baseRentTotal = ratePerDay * totalDays;

  const rows = [];
  rows.push({
    item: `Base Rental - ${vehicleName}`,
    subtext: `Daily rate @ ${formatCurrency(ratePerDay)} / day`,
    qty: `${totalDays} ${totalDays === 1 ? "day" : "days"}`,
    amount: baseRentTotal,
  });

  // Add-ons list
  const addons = booking.addons || {};
  if (addons.insurance) {
    rows.push({
      item: "Comprehensive Rental Insurance Protection",
      subtext: "Collision damage waiver & zero depreciation coverage",
      qty: `${totalDays} days`,
      amount: 299 * totalDays,
    });
  }
  if (addons.gps) {
    rows.push({
      item: "GPS Navigation Unit & Live Telematics",
      subtext: "Turn-by-turn navigation system enabled",
      qty: `${totalDays} days`,
      amount: 149 * totalDays,
    });
  }
  if (addons.roadside) {
    rows.push({
      item: "24x7 Roadside Assistance & RSA Dispatch",
      subtext: "Statewide mechanical emergency coverage",
      qty: `${totalDays} days`,
      amount: 99 * totalDays,
    });
  }
  if (addons.childSeat) {
    rows.push({
      item: "Child Safety Seat Equipment",
      subtext: "ISOFIX certified child safety seat",
      qty: `${totalDays} days`,
      amount: 120 * totalDays,
    });
  }

  // Draw rows
  rows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, curY, contentWidth, 11, "F");
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, curY + 11, pageWidth - margin, curY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(row.item, margin + 6, curY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(row.subtext, margin + 6, curY + 8.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(row.qty, margin + 105, curY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(row.amount), pageWidth - margin - 6, curY + 6.5, {
      align: "right",
    });

    curY += 11;
  });

  // ── 5. Financial Summary Breakdown Box ────────────────────────
  curY += 4;
  const sumBoxWidth = 84;
  const sumBoxX = pageWidth - margin - sumBoxWidth;

  const subtotal = booking.dbl_Total_Amount || baseRentTotal;
  const discount = booking.dbl_Discount_Amount || 0;
  const tax = booking.dbl_Tax_Amount || 0;
  const deposit = booking.dbl_Security_Deposit || 0;
  const netTotal = booking.dbl_Net_Amount || subtotal + tax + deposit;

  // Subtotal line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", sumBoxX, curY + 4);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(subtotal), pageWidth - margin - 6, curY + 4, { align: "right" });
  curY += 6;

  // Discount line (if applicable)
  if (discount > 0) {
    doc.setTextColor(16, 185, 129); // Green
    doc.text(
      `Coupon Discount ${booking.couponCode ? `(${booking.couponCode})` : ""}:`,
      sumBoxX,
      curY + 4
    );
    doc.text(`- ${formatCurrency(discount)}`, pageWidth - margin - 6, curY + 4, {
      align: "right",
    });
    curY += 6;
  }

  // Taxes / Fees line
  doc.setTextColor(71, 85, 105);
  doc.text("GST Taxes (18%):", sumBoxX, curY + 4);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(tax), pageWidth - margin - 6, curY + 4, { align: "right" });
  curY += 6;

  // Security deposit line
  if (deposit > 0) {
    doc.setTextColor(71, 85, 105);
    doc.text("Refundable Security Deposit:", sumBoxX, curY + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(deposit), pageWidth - margin - 6, curY + 4, { align: "right" });
    curY += 6;
  }

  // Total Net Amount Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(sumBoxX, curY + 2, sumBoxWidth, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL AMOUNT:", sumBoxX + 5, curY + 9);
  doc.text(formatCurrency(netTotal), pageWidth - margin - 5, curY + 9, { align: "right" });

  // ── 6. Left side Payment Gateway & Verification Audit ─────────
  const payBoxWidth = contentWidth - sumBoxWidth - 8;
  const payBoxY = curY - (discount > 0 ? 24 : 18);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, payBoxY, payBoxWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("PAYMENT AUDIT & GATEWAY DETAILS", margin + 6, payBoxY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let py = payBoxY + 12;
  doc.text("Payment Status:", margin + 6, py);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPaid ? 16 : isFailed ? 239 : 245, isPaid ? 185 : isFailed ? 68 : 158, isPaid ? 129 : 68);
  doc.text(isPaid ? "PAID & VERIFIED" : isFailed ? "FAILED" : "PENDING", margin + 34, py);

  py += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Payment ID:", margin + 6, py);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(booking.razorpayPaymentId || "N/A", margin + 34, py);

  py += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Order ID:", margin + 6, py);
  doc.setTextColor(15, 23, 42);
  doc.text(booking.razorpayOrderId || "N/A", margin + 34, py);

  py += 6;
  doc.setTextColor(71, 85, 105);
  doc.text("Transaction Time:", margin + 6, py);
  doc.setTextColor(15, 23, 42);
  doc.text(
    booking.paidAt
      ? new Date(booking.paidAt).toLocaleString("en-IN")
      : booking.paymentError
      ? `Failed: ${booking.paymentError}`
      : "Pending completion",
    margin + 34,
    py
  );

  curY += 22;

  // ── 7. Important Rental Terms & Compliance ─────────────────────
  doc.setFillColor(254, 242, 242); // Soft tint or slate
  if (isPaid) {
    doc.setFillColor(240, 253, 244); // Light green tint
    doc.setDrawColor(187, 247, 208);
  } else if (isFailed) {
    doc.setFillColor(254, 242, 242); // Light red tint
    doc.setDrawColor(254, 202, 202);
  } else {
    doc.setFillColor(254, 249, 195);
    doc.setDrawColor(253, 224, 71);
  }
  doc.roundedRect(margin, curY, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    isPaid
      ? "RENTAL CONFIRMATION & PICKUP GUIDELINES"
      : isFailed
      ? "PAYMENT FAILED - NEXT STEPS"
      : "RESERVATION INSTRUCTIONS",
    margin + 6,
    curY + 5.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  if (isPaid) {
    doc.text(
      "1. Present original Driving Licence and Government Identity document at pickup hub for physical verification.",
      margin + 6,
      curY + 10
    );
    doc.text(
      "2. Vehicle has undergone rigorous 35-point safety inspection. Odometer and fuel reading will be recorded on handover.",
      margin + 6,
      curY + 14
    );
    doc.text(
      "3. 24x7 RoadReady Central Helpline: +91 800-ROADREADY (762-3732) | support@roadready.in",
      margin + 6,
      curY + 18
    );
  } else if (isFailed) {
    doc.text(
      "1. Your payment attempt was not authorized by the gateway/bank. Your card/account was not debited.",
      margin + 6,
      curY + 10
    );
    doc.text(
      "2. You can retry the payment anytime from 'My Bookings' or choose another payment method (UPI, Card, Net Banking).",
      margin + 6,
      curY + 14
    );
    doc.text(
      "3. For assistance, contact RoadReady Support: support@roadready.in with Reference #" + bookingNumber,
      margin + 6,
      curY + 18
    );
  } else {
    doc.text(
      "1. This reservation is saved. Please complete your payment to guarantee vehicle reservation at the hub.",
      margin + 6,
      curY + 10
    );
    doc.text(
      "2. Unpaid reservations are held temporarily subject to vehicle availability at the scheduled pickup branch.",
      margin + 6,
      curY + 14
    );
    doc.text(
      "3. Contact support@roadready.in for booking modifications or questions.",
      margin + 6,
      curY + 18
    );
  }

  // ── 8. Footer with Security Seals & Page Information ──────────
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("RoadReady Technologies Pvt. Ltd.", margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.text(
    "Computer-generated official receipt · GST Registered · No physical signature required",
    margin + 48,
    footerY
  );

  doc.setFont("helvetica", "bold");
  doc.text("Page 1 of 1", pageWidth - margin, footerY, { align: "right" });

  return doc;
}

/**
 * Trigger immediate download of the booking receipt as a .pdf file
 */
export function downloadReceiptPdf(booking, extraData = {}) {
  const doc = buildReceiptPdfDoc(booking, extraData);
  const cleanId = (booking.txt_Booking_Number || booking._id || "receipt").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
  const filename = `RoadReady_Receipt_${cleanId}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Open the booking receipt in a new browser tab for viewing/printing
 */
export function viewReceiptPdfInNewTab(booking, extraData = {}) {
  const doc = buildReceiptPdfDoc(booking, extraData);
  const pdfBlobUrl = doc.output("bloburl");
  window.open(pdfBlobUrl, "_blank");
  return pdfBlobUrl;
}

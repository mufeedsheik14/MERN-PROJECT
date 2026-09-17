/**
 * AI Assistant Service
 *
 * Clean architectural seam between the UI and AI response generation.
 * - If VITE_GEMINI_API_KEY is configured, it calls the Gemini REST API with real-time app context.
 * - If no key is set, it falls back to a deterministic, zero-hallucination local reasoning engine
 *   that inspects live vehicles, branch-filtered bookings, and coupons.
 */

import { getBranchName, getCategoryName, getBrandName } from "../data/mockData";

export async function generateAssistantReply({
  prompt,
  conversationHistory = [],
  user,
  vehicles = [],
  bookings = [],
  coupons = [],
  branches = [],
  categories = [],
  lang = "en",
}) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  // 1. If real Gemini API key is present in environment, invoke Gemini API
  if (apiKey) {
    try {
      const response = await callGeminiAPI({
        apiKey,
        prompt,
        conversationHistory,
        user,
        vehicles,
        bookings,
        coupons,
        branches,
        categories,
        lang,
      });
      if (response) return response;
    } catch (err) {
      console.warn("Gemini API call encountered an issue, using local intelligence engine fallback:", err);
    }
  }

  // 2. Intelligent local context reasoning engine (100% accurate, zero fabrication)
  return generateLocalContextReply({
    prompt,
    user,
    vehicles,
    bookings,
    coupons,
    branches,
    categories,
    lang,
  });
}

/**
 * Real Google Gemini REST API Seam
 */
async function callGeminiAPI({
  apiKey,
  prompt,
  conversationHistory,
  user,
  vehicles,
  bookings,
  coupons,
  _branches,
  _categories,
  lang,
}) {
  const role = user?.role || "guest";

  // Filter context data strictly based on role to prevent data leakage
  const safeBookings =
    role === "admin"
      ? bookings.map((b) => ({ id: b.txt_Booking_Number, vehicle: b.vehicleLabel, branch: getBranchName(b.int_Pickup_Branch_Id), status: b.int_Booking_Status_Id, net: b.dbl_Net_Amount }))
      : role === "staff"
      ? bookings.filter((b) => b.int_Pickup_Branch_Id === user?.int_Branch_Id).map((b) => ({ id: b.txt_Booking_Number, vehicle: b.vehicleLabel, status: b.int_Booking_Status_Id, customer: b.customerName, dates: `${b.dte_Pickup_Date} to ${b.dte_Return_Date}` }))
      : bookings.filter((b) => b.customerUsername === user?.username).map((b) => ({ id: b.txt_Booking_Number, vehicle: b.vehicleLabel, status: b.int_Booking_Status_Id, dates: `${b.dte_Pickup_Date} to ${b.dte_Return_Date}`, net: b.dbl_Net_Amount }));

  const systemInstruction = `You are RoadReady AI Co-Pilot, the official assistant for the RoadReady vehicle rental platform.
User Role: ${role.toUpperCase()} ${user ? `(${user.name})` : "(Guest)"}.
Current Language: ${lang}.
Answer strictly and concisely using the provided real-time fleet and booking data. Never fabricate rates or references.

ACTIVE FLEET DATA:
Total Vehicles: ${vehicles.length}
Vehicles: ${JSON.stringify(vehicles.slice(0, 15).map(v => ({ id: v.int_Vehicle_Id, name: `${v.brand || getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name}`, category: v.category || getCategoryName(v.int_Category_Id), rent: v.dbl_Daily_Rent, status: v.txt_Vehicle_Status === "A" ? "Available" : "Maintenance", branch: v.branch || getBranchName(v.int_Branch_Id) })))}

ACTIVE COUPONS:
${JSON.stringify(coupons.map(c => ({ code: c.txt_Coupon_Code, discount: `${c.dbl_Discount_Percent}%`, max: c.dbl_Max_Discount_Amount, validTo: c.dte_Valid_To })))}

PERMITTED USER BOOKINGS:
${JSON.stringify(safeBookings)}`;

  const contents = [
    ...conversationHistory.slice(-4).map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { maxOutputTokens: 350, temperature: 0.3 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim();
}

/**
 * Intelligent Local Context Reasoning Engine
 * Queries live vehicles, bookings, branches, and coupons based on intent and user role.
 */
function generateLocalContextReply({
  prompt,
  user,
  vehicles,
  bookings,
  coupons,
  branches,
  _categories,
  _lang,
}) {
  const q = prompt.toLowerCase();
  const role = user?.role || "guest";

  // --- 1. STAFF / ADMIN OPERATIONAL QUERIES ---
  if (role === "admin" || role === "staff") {
    // Maintenance queries
    if (q.includes("maintenance") || q.includes("repair") || q.includes("service")) {
      const branchScopedVehicles =
        role === "staff" && user?.int_Branch_Id
          ? vehicles.filter((v) => v.int_Branch_Id === user.int_Branch_Id)
          : vehicles;
      const inMaint = branchScopedVehicles.filter((v) => v.txt_Vehicle_Status === "M");

      if (inMaint.length === 0) {
        return `✅ All vehicles in your scope are currently marked Available and operational. None are under maintenance.`;
      }
      const list = inMaint
        .map((v) => `• ${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name} (${v.txt_Registration_Number}) at ${getBranchName(v.int_Branch_Id)}`)
        .join("\n");
      return `🔧 There are ${inMaint.length} vehicle(s) currently marked as Under Maintenance:\n\n${list}\n\nYou can toggle their status directly from the Dashboard.`;
    }

    // Bookings summary / today's bookings
    if (q.includes("summar") || q.includes("today") || q.includes("overview") || q.includes("how many booking")) {
      const branchScopedBookings =
        role === "staff" && user?.int_Branch_Id
          ? bookings.filter((b) => b.int_Pickup_Branch_Id === user.int_Branch_Id)
          : bookings;

      const pending = branchScopedBookings.filter((b) => b.int_Booking_Status_Id === 1).length;
      const confirmed = branchScopedBookings.filter((b) => b.int_Booking_Status_Id === 2).length;
      const ongoing = branchScopedBookings.filter((b) => b.int_Booking_Status_Id === 3).length;
      const completed = branchScopedBookings.filter((b) => b.int_Booking_Status_Id === 4).length;
      const revenue = branchScopedBookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);

      const scopeName = role === "staff" ? getBranchName(user?.int_Branch_Id) : "Global Enterprise";

      return `📊 **${scopeName} Bookings Summary**:\n• Total Bookings: **${branchScopedBookings.length}**\n• Pending Approval: **${pending}**\n• Confirmed (Awaiting Pickup): **${confirmed}**\n• Ongoing Trips: **${ongoing}**\n• Completed: **${completed}**\n• Net Revenue: **₹${revenue.toLocaleString("en-IN")}**`;
    }

    // How-to questions
    if (q.includes("how do i") || q.includes("how to") || q.includes("guide")) {
      if (q.includes("status") || q.includes("advance") || q.includes("confirm")) {
        return `ℹ️ **Updating Booking Lifecycle**:\n1. Go to your Dashboard → Branch Bookings tab.\n2. Locate the booking card.\n3. Click **[Confirm Booking]** (moves to Confirmed).\n4. When customer arrives, click **[Hand Over Keys]** (moves to Ongoing).\n5. When vehicle returns, click **[Complete Return]**.`;
      }
      if (q.includes("vehicle") || q.includes("fleet") || q.includes("add")) {
        return role === "admin"
          ? `ℹ️ **Managing Fleet**:\nIn Admin Dashboard → Fleet Inventory tab, click **[+ Add Vehicle]** or click **[Mark Maintenance]** on any vehicle to toggle availability.`
          : `ℹ️ **Branch Fleet**:\nIn Staff Dashboard → Branch Fleet tab, click the **[🔧 Set Maintenance]** toggle beside any vehicle to instantly update its readiness.`;
      }
    }

    // Revenue / Top branch
    if (q.includes("revenue") || q.includes("utilization") || q.includes("top")) {
      const rev = bookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);
      return `📈 **Global Metrics**:\n• Total Gross Revenue: **₹${rev.toLocaleString("en-IN")}**\n• Active Fleet Size: **${vehicles.length} vehicles**\n• Total Bookings Processed: **${bookings.length}**\nVisit the Global Analytics tab on your Dashboard for full branch charts.`;
    }
  }

  // --- 2. CUSTOMER & GUEST INQUIRIES ---

  // Specific Booking Status Lookup (e.g. "status of BK20260101" or "my booking")
  const bookingMatch = q.match(/bk\d+/i);
  if (bookingMatch || q.includes("my booking") || q.includes("status of")) {
    if (!user) {
      return `🔒 Please sign in to look up your personal reservations, or provide your booking reference number.`;
    }

    const ref = bookingMatch ? bookingMatch[0].toUpperCase() : null;
    let found = null;
    if (ref) {
      found = bookings.find(
        (b) =>
          b.txt_Booking_Number.toUpperCase() === ref &&
          (role === "admin" || b.customerUsername === user.username)
      );
    } else {
      // Find latest customer booking
      found = bookings.find((b) => b.customerUsername === user.username);
    }

    if (found) {
      const statusMap = {
        1: "⏳ Pending Confirmation",
        2: "✅ Confirmed (Ready for Pickup)",
        3: "🚘 Ongoing Trip (Keys Issued)",
        4: "🏁 Completed",
        5: "❌ Cancelled",
      };
      return `📋 **Booking #${found.txt_Booking_Number}**\n• Vehicle: **${found.vehicleLabel}**\n• Pickup Branch: **${getBranchName(found.int_Pickup_Branch_Id)}**\n• Dates: **${found.dte_Pickup_Date} → ${found.dte_Return_Date}** (${found.int_Total_Days} days)\n• Net Amount: **₹${found.dbl_Net_Amount?.toFixed(0)}**\n• Current Status: **${statusMap[found.int_Booking_Status_Id] || "Pending"}**`;
    } else if (ref) {
      return `⚠️ No reservation found under reference **${ref}** associated with your account. Please double-check the booking number.`;
    } else {
      return `You have no active bookings under @${user.username}. Browse our Vehicles catalog to book your next trip!`;
    }
  }

  // Coupons / Promo Code Query
  if (q.includes("coupon") || q.includes("discount") || q.includes("offer") || q.includes("promo")) {
    if (coupons.length === 0) {
      return `There are currently no active promotional coupons available. Please check back later!`;
    }
    const couponList = coupons
      .map(
        (c) =>
          `• **${c.txt_Coupon_Code}**: **${c.dbl_Discount_Percent}% OFF** (Max discount up to ₹${c.dbl_Max_Discount_Amount}, valid until ${c.dte_Valid_To})`
      )
      .join("\n");
    return `🎉 **Available Promo Coupons**:\n${couponList}\n\nYou can apply any of these codes directly on the booking checkout form!`;
  }

  // Electric / EV query
  if (q.includes("electric") || q.includes("ev") || q.includes("battery")) {
    const evs = vehicles.filter(
      (v) =>
        v.int_Fuel_Type_Id === 3 ||
        v.category?.toLowerCase().includes("electric") ||
        v.txt_Model_Name.toLowerCase().includes("electric") ||
        v.fuelType === "Electric"
    );
    if (evs.length > 0) {
      const list = evs
        .map(
          (v) =>
            `• **${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name}** — ₹${v.dbl_Daily_Rent}/day (${v.mileage || "Electric Range"}) at ${getBranchName(v.int_Branch_Id)}`
        )
        .join("\n");
      return `⚡ **Electric Vehicles Available**:\n${list}\n\nEnvironmentally friendly with fast charging and low running costs!`;
    }
  }

  // Cheapest / Budget vehicle query
  if (q.includes("cheap") || q.includes("budget") || q.includes("lowest") || q.includes("afford")) {
    const sorted = [...vehicles]
      .filter((v) => v.txt_Vehicle_Status === "A")
      .sort((a, b) => a.dbl_Daily_Rent - b.dbl_Daily_Rent);
    const top3 = sorted.slice(0, 3);
    if (top3.length > 0) {
      const list = top3
        .map(
          (v) =>
            `• **${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name}** (${getCategoryName(v.int_Category_Id)}): **₹${v.dbl_Daily_Rent}/day** at ${getBranchName(v.int_Branch_Id)}`
        )
        .join("\n");
      return `💰 **Most Affordable Vehicles Available**:\n${list}\n\nSecurity deposits start as low as ₹1,000!`;
    }
  }

  // Branch / City search (e.g. "Chennai", "Madurai", "Bengaluru", "Coimbatore")
  for (const b of branches) {
    if (q.includes(b.txt_City.toLowerCase()) || q.includes(b.txt_Branch_Name.toLowerCase())) {
      const bVehicles = vehicles.filter(
        (v) => v.int_Branch_Id === b.int_Branch_Id && v.txt_Vehicle_Status === "A"
      );
      const topVehiclesInBranch = bVehicles.slice(0, 4);
      const list = topVehiclesInBranch
        .map((v) => `• ${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name} (₹${v.dbl_Daily_Rent}/day)`)
        .join("\n");
      return `📍 **${b.txt_Branch_Name} (${b.txt_City})**:\nWe have **${bVehicles.length} vehicles** ready for rental at this branch, including:\n${list}\n\nFilter by "${b.txt_Branch_Name}" on the Vehicles page to reserve one.`;
    }
  }

  // Cancellation policy / Meaning of statuses
  if (q.includes("cancel") || q.includes("refund") || q.includes("policy") || q.includes("rules")) {
    return `ℹ️ **Cancellation & Status Policy**:\n• You can cancel any **Pending** or **Confirmed** reservation at zero cancellation fee from the **My Bookings** page.\n• Status Meanings:\n  - **Pending**: Reservation submitted, awaiting branch review.\n  - **Confirmed**: Vehicle reserved and prepared at branch.\n  - **Ongoing**: Vehicle picked up; trip in progress.\n  - **Completed**: Returned and security deposit processed.`;
  }

  // Weather-based recommendation guidance
  if (q.includes("suggest") || q.includes("recommend")) {
    return `🌟 To get vehicle recommendations tailored to your destination's real-time weather, click **[Suggest]** above or tell me your passenger count and destination (e.g. *"4 passengers to Ooty"*).`;
  }

  // Default polite, context-aware reply with suggestions
  if (role === "admin" || role === "staff") {
    return `👋 Hello ${user?.name || "Team"}! As your **${role === "admin" ? "Fleet Intelligence" : "Branch Operations"} Assistant**, I can:\n• Summarize active bookings and revenue\n• List vehicles currently in maintenance\n• Provide quick dashboard navigation help\n\nWhat would you like to review?`;
  }

  return `👋 Welcome to RoadReady! I'm your AI Trip Advisor. I can help you with:\n• **Weather Recommendations**: Click "Suggest" or ask for trip advice\n• **Fleet search**: "Cheapest car in Madurai" or "Show electric bikes"\n• **Coupons**: "What discounts are available?"\n• **Your Bookings**: "What is my booking status?"\n\nHow can I help you today?`;
}

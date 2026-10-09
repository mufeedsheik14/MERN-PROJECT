const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

// ── Standard Add-on Rates (per day in INR) ──────────────────────────────────
const ADDON_RATES = {
  insurance: 299,
  gps: 149,
  roadside: 99,
  childSeat: 120,
};

const TAX_RATE = 0.18; // 18% GST

// ── Verified Promo Coupons ──────────────────────────────────────────────────
const PROMO_COUPONS = {
  FIRST10: { percent: 10, maxDiscount: 500, validUntil: '2026-12-31' },
  ROADREADY20: { percent: 20, maxDiscount: 1000, validUntil: '2026-12-31' },
  WEEKEND15: { percent: 15, maxDiscount: 750, validUntil: '2026-12-31' },
  FESTIVE25: { percent: 25, maxDiscount: 1500, validUntil: '2026-12-31' },
};

/**
 * Helper to calculate rental duration in days between two date strings (YYYY-MM-DD).
 */
function calculateDays(pickupStr, returnStr) {
  const p = new Date(`${pickupStr}T00:00:00.000Z`);
  const r = new Date(`${returnStr}T00:00:00.000Z`);
  const diffMs = r.getTime() - p.getTime();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

/**
 * POST /api/bookings
 * Customer — create a new booking backed by MongoDB.
 */
const createBooking = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to book a vehicle',
      });
    }

    const {
      int_Vehicle_Id,
      vehicleId,
      pickupDate,
      returnDate,
      dte_Pickup_Date,
      dte_Return_Date,
      pickupBranch,
      dropBranch,
      int_Pickup_Branch_Id,
      int_Drop_Branch_Id,
      customerName,
      phone,
      email,
      addons = {},
      couponCode = '',
    } = req.body;

    const reqPickup = (pickupDate || dte_Pickup_Date || '').trim();
    const reqReturn = (returnDate || dte_Return_Date || '').trim();

    if (!reqPickup || !reqReturn) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date and return date are required',
      });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(reqPickup) || !dateRegex.test(reqReturn)) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be in YYYY-MM-DD format',
      });
    }

    const pickupUtc = new Date(`${reqPickup}T00:00:00.000Z`);
    const returnUtc = new Date(`${reqReturn}T23:59:59.999Z`);

    if (isNaN(pickupUtc.getTime()) || isNaN(returnUtc.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup or return date provided',
      });
    }

    if (returnUtc <= pickupUtc) {
      return res.status(400).json({
        success: false,
        message: 'Return date must be after pickup date',
      });
    }

    const totalDays = calculateDays(reqPickup, reqReturn);
    if (totalDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Rental duration must be at least 1 day',
      });
    }

    // 1. Locate vehicle by integer ID or Mongo ObjectId
    let vehicle = null;
    const searchId = int_Vehicle_Id ?? vehicleId;

    if (searchId !== undefined && searchId !== null) {
      if (typeof searchId === 'number' || !isNaN(Number(searchId))) {
        vehicle = await Vehicle.findOne({ int_Vehicle_Id: Number(searchId) });
      } else if (mongoose.Types.ObjectId.isValid(searchId)) {
        vehicle = await Vehicle.findById(searchId);
      }
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found. Please verify the selected vehicle.',
      });
    }

    // 2. Verify vehicle status is available
    if (vehicle.txt_Vehicle_Status === 'M') {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is currently undergoing routine maintenance and cannot be reserved.',
      });
    }

    if (vehicle.txt_Vehicle_Status === 'I') {
      return res.status(400).json({
        success: false,
        message: 'This vehicle is currently inactive.',
      });
    }

    // 3. Prevent Overlapping Bookings for the same vehicle
    // Check if there are any non-cancelled bookings overlapping with requested date window
    const overlappingBooking = await Booking.findOne({
      int_Vehicle_Id: vehicle.int_Vehicle_Id,
      int_Booking_Status_Id: { $ne: 5 }, // Not cancelled
      status: { $ne: 'cancelled' },
      startDate: { $lte: returnUtc },
      endDate: { $gte: pickupUtc },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: `Vehicle "${vehicle.txt_Model_Name}" is already reserved for the selected dates (${overlappingBooking.dte_Pickup_Date} to ${overlappingBooking.dte_Return_Date}). Please choose different dates or select another vehicle.`,
      });
    }

    // 4. Secure Server-Side Price Calculation (do not trust client totals)
    let dailyAddonsTotal = 0;
    if (addons.insurance) dailyAddonsTotal += ADDON_RATES.insurance;
    if (addons.gps) dailyAddonsTotal += ADDON_RATES.gps;
    if (addons.roadside) dailyAddonsTotal += ADDON_RATES.roadside;
    if (addons.childSeat) dailyAddonsTotal += ADDON_RATES.childSeat;

    const baseDailyRate = vehicle.dbl_Daily_Rent;
    const effectiveDailyRate = baseDailyRate + dailyAddonsTotal;
    const subtotal = totalDays * effectiveDailyRate;

    // Apply promo coupon if valid
    let discountAmount = 0;
    const cleanCoupon = (couponCode || '').trim().toUpperCase();
    if (cleanCoupon && PROMO_COUPONS[cleanCoupon]) {
      const coupon = PROMO_COUPONS[cleanCoupon];
      const validUntil = new Date(`${coupon.validUntil}T23:59:59.999Z`);
      if (new Date() <= validUntil) {
        const calculatedDiscount = (subtotal * coupon.percent) / 100;
        discountAmount = Math.min(calculatedDiscount, coupon.maxDiscount);
      }
    }

    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const taxAmount = Math.round(taxableAmount * TAX_RATE);
    const securityDeposit = vehicle.dbl_Security_Deposit || 0;
    const netAmount = taxableAmount + taxAmount + securityDeposit;

    // 5. Generate Unique Booking Number
    const timestampSuffix = Date.now().toString().slice(-7);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${timestampSuffix}${randomSuffix}`;

    const branchPickup = Number(int_Pickup_Branch_Id ?? pickupBranch ?? vehicle.int_Branch_Id);
    const branchDrop = Number(int_Drop_Branch_Id ?? dropBranch ?? branchPickup);

    // 6. Create MongoDB Booking Document
    const newBooking = new Booking({
      txt_Booking_Number: bookingNumber,
      user: user._id,
      vehicle: vehicle._id,
      int_Vehicle_Id: vehicle.int_Vehicle_Id,
      vehicleLabel: vehicle.txt_Model_Name,
      customerName: (customerName || user.name || 'Customer').trim(),
      customerUsername: user.username,
      phone: (phone || user.phone || '').trim(),
      email: (email || user.email || '').trim(),
      int_Pickup_Branch_Id: branchPickup,
      int_Drop_Branch_Id: branchDrop,
      dte_Pickup_Date: reqPickup,
      dte_Return_Date: reqReturn,
      startDate: pickupUtc,
      endDate: returnUtc,
      int_Total_Days: totalDays,
      dbl_Rate_Per_Day: baseDailyRate,
      dbl_Total_Amount: subtotal,
      dbl_Discount_Amount: discountAmount,
      dbl_Tax_Amount: taxAmount,
      dbl_Security_Deposit: securityDeposit,
      dbl_Net_Amount: netAmount,
      int_Booking_Status_Id: 1, // Pending
      status: 'pending',
      addons: {
        insurance: Boolean(addons.insurance),
        gps: Boolean(addons.gps),
        roadside: Boolean(addons.roadside),
        childSeat: Boolean(addons.childSeat),
      },
      couponCode: cleanCoupon,
    });

    await newBooking.save();

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: newBooking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/my
 * Customer — get authenticated user's bookings.
 */
const getMyBookings = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const query = user.role === 'admin' && req.query.all === 'true'
      ? {}
      : {
          $or: [
            { user: user._id },
            { customerUsername: user.username },
            ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
          ],
        };

    const bookings = await Booking.find(query)
      .populate('vehicle', 'txt_Registration_Number txt_Model_Name txt_Color int_Vehicle_Id')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings
 * Admin/Staff — list all bookings (optional branch filter).
 */
const getAllBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.branch) {
      filter.int_Pickup_Branch_Id = Number(req.query.branch);
    }
    if (req.query.status) {
      filter.int_Booking_Status_Id = Number(req.query.status);
    }

    const bookings = await Booking.find(filter)
      .populate('vehicle', 'txt_Registration_Number txt_Model_Name txt_Color int_Vehicle_Id')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id
 * Customer / Admin / Staff — get booking details by ID or booking number.
 */
const getBookingById = async (req, res, next) => {
  try {
    const user = req.user;
    const id = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { txt_Booking_Number: id.toUpperCase() };

    const booking = await Booking.findOne(query)
      .populate('vehicle', 'txt_Registration_Number txt_Model_Name txt_Color int_Vehicle_Id');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Booking "${id}" not found`,
      });
    }

    // Enforce ownership unless staff/admin
    const isOwner =
      booking.user.toString() === user._id.toString() ||
      booking.customerUsername === user.username ||
      (user.email && booking.email.toLowerCase() === user.email.toLowerCase());

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this booking',
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * Customer — cancel an existing booking.
 * Preserves history and sets status to 'cancelled' (statusId: 5).
 */
const cancelBooking = async (req, res, next) => {
  try {
    const user = req.user;
    const id = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { txt_Booking_Number: id.toUpperCase() };

    const booking = await Booking.findOne(query);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Booking "${id}" not found`,
      });
    }

    // Verify ownership or staff/admin authority
    const isOwner =
      booking.user.toString() === user._id.toString() ||
      booking.customerUsername === user.username ||
      (user.email && booking.email.toLowerCase() === user.email.toLowerCase());

    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this booking',
      });
    }

    // Verify not already cancelled
    if (booking.status === 'cancelled' || booking.int_Booking_Status_Id === 5) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been cancelled',
        booking,
      });
    }

    // Verify booking is not already completed (statusId 4)
    if (booking.int_Booking_Status_Id === 4) {
      return res.status(400).json({
        success: false,
        message: 'Completed bookings cannot be cancelled',
      });
    }

    // Update status in MongoDB
    booking.status = 'cancelled';
    booking.int_Booking_Status_Id = 5;
    if (booking.paymentStatus === 'Pending') {
      booking.paymentStatus = 'Cancelled';
    }
    booking.cancelledAt = new Date();
    booking.cancelledBy = user._id;
    booking.cancellationReason = (req.body.reason || 'Cancelled by customer').trim();

    await booking.save();

    res.json({
      success: true,
      message: `Booking #${booking.txt_Booking_Number} has been successfully cancelled`,
      booking,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancelBooking,
};

const mongoose = require('mongoose');

/**
 * Booking Schema
 * Links reservations to authenticated users, vehicles, branches, and date ranges.
 * Fully compatible with both numeric status IDs and string status labels.
 */
const bookingSchema = new mongoose.Schema(
  {
    // Unique human-readable booking identifier (e.g. BK-20260920-123456)
    txt_Booking_Number: {
      type: String,
      required: [true, 'Booking number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Reference to authenticated User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    // Reference to Vehicle
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle reference is required'],
      index: true,
    },

    // Legacy integer vehicle ID (for fast query and frontend compatibility)
    int_Vehicle_Id: {
      type: Number,
      required: [true, 'Vehicle ID is required'],
      index: true,
    },

    // Display vehicle label (e.g. 'Swift VXI')
    vehicleLabel: {
      type: String,
      required: [true, 'Vehicle label is required'],
      trim: true,
    },

    // Customer contact details
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },

    customerUsername: {
      type: String,
      required: [true, 'Customer username is required'],
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },

    // Branch locations
    int_Pickup_Branch_Id: {
      type: Number,
      required: [true, 'Pickup branch is required'],
    },

    int_Drop_Branch_Id: {
      type: Number,
      required: [true, 'Drop branch is required'],
    },

    // Date range
    dte_Pickup_Date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Pickup date is required'],
    },

    dte_Return_Date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Return date is required'],
    },

    startDate: {
      type: Date,
      index: true,
    },

    endDate: {
      type: Date,
      index: true,
    },

    int_Total_Days: {
      type: Number,
      required: [true, 'Total rental days is required'],
      min: [1, 'Rental duration must be at least 1 day'],
    },

    // Pricing breakdown (calculated on backend)
    dbl_Rate_Per_Day: {
      type: Number,
      required: [true, 'Rate per day is required'],
      min: [0, 'Daily rate cannot be negative'],
    },

    dbl_Total_Amount: {
      type: Number,
      required: [true, 'Subtotal amount is required'],
      min: [0, 'Subtotal cannot be negative'],
    },

    dbl_Discount_Amount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },

    dbl_Tax_Amount: {
      type: Number,
      required: [true, 'Tax amount is required'],
      min: [0, 'Tax amount cannot be negative'],
    },

    dbl_Security_Deposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative'],
    },

    dbl_Net_Amount: {
      type: Number,
      required: [true, 'Net total amount is required'],
      min: [0, 'Net amount cannot be negative'],
    },

    /**
     * Booking status:
     * 1 = Pending
     * 2 = Confirmed
     * 3 = Ongoing
     * 4 = Completed
     * 5 = Cancelled
     */
    int_Booking_Status_Id: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      default: 1,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Selected Add-ons
    addons: {
      insurance: { type: Boolean, default: false },
      gps: { type: Boolean, default: false },
      roadside: { type: Boolean, default: false },
      childSeat: { type: Boolean, default: false },
    },

    couponCode: {
      type: String,
      trim: true,
      default: '',
    },

    // Cancellation audit
    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },

    // Payment fields (Razorpay TEST Mode)
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },

    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },

    razorpaySignature: {
      type: String,
      trim: true,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paymentError: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Composite indexes for fast availability queries and customer history lookup
bookingSchema.index({ int_Vehicle_Id: 1, startDate: 1, endDate: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

// Automatically sync startDate, endDate, and status label before saving
bookingSchema.pre('save', function (next) {
  if (this.dte_Pickup_Date && (!this.startDate || this.isModified('dte_Pickup_Date'))) {
    this.startDate = new Date(`${this.dte_Pickup_Date}T00:00:00.000Z`);
  }
  if (this.dte_Return_Date && (!this.endDate || this.isModified('dte_Return_Date'))) {
    this.endDate = new Date(`${this.dte_Return_Date}T23:59:59.999Z`);
  }

  // Keep int_Booking_Status_Id and status in sync
  if (this.isModified('status') && !this.isModified('int_Booking_Status_Id')) {
    const statusMap = {
      pending: 1,
      confirmed: 2,
      ongoing: 3,
      completed: 4,
      cancelled: 5,
    };
    if (statusMap[this.status]) {
      this.int_Booking_Status_Id = statusMap[this.status];
    }
  } else if (this.isModified('int_Booking_Status_Id') && !this.isModified('status')) {
    const idMap = {
      1: 'pending',
      2: 'confirmed',
      3: 'ongoing',
      4: 'completed',
      5: 'cancelled',
    };
    if (idMap[this.int_Booking_Status_Id]) {
      this.status = idMap[this.int_Booking_Status_Id];
    }
  }

  next();
});

module.exports = mongoose.model('Booking', bookingSchema);

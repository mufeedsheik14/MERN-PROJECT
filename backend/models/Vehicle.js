const mongoose = require('mongoose');

/**
 * Vehicle schema mirrors both the DB-style (int_, txt_, dbl_) fields
 * from tbl_Vehicle and the camelCase fields used by the React frontend.
 * All 15 mock vehicles from mockData.js can be seeded via POST /api/vehicles/seed.
 */
const vehicleSchema = new mongoose.Schema(
  {
    // ── Legacy integer ID (matches mockData vehicleId) ─────────
    int_Vehicle_Id: {
      type: Number,
      unique: true,
      sparse: true, // allows null during auto-creation, enforces uniqueness when set
    },

    // ── DB-style fields (from tbl_Vehicle) ────────────────────
    txt_Registration_Number: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    int_Category_Id: {
      type: Number,
      required: [true, 'Category is required'],
    },

    int_Brand_Id: {
      type: Number,
      required: [true, 'Brand is required'],
    },

    txt_Model_Name: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
    },

    int_Manufacture_Year: {
      type: Number,
      required: [true, 'Manufacture year is required'],
      min: [1990, 'Year must be 1990 or later'],
      max: [new Date().getFullYear() + 2, 'Year cannot be more than 2 years in the future'],
    },

    int_Fuel_Type_Id: {
      type: Number,
      required: [true, 'Fuel type is required'],
    },

    int_Transmission_Id: {
      type: Number,
      required: [true, 'Transmission type is required'],
    },

    int_Seating_Capacity: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [1, 'Seating capacity must be at least 1'],
    },

    txt_Color: {
      type: String,
      trim: true,
      default: '',
    },

    dbl_Daily_Rent: {
      type: Number,
      required: [true, 'Daily rent is required'],
      min: [0, 'Daily rent cannot be negative'],
    },

    dbl_Weekly_Rent: {
      type: Number,
      default: 0,
      min: [0, 'Weekly rent cannot be negative'],
    },

    dbl_Security_Deposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative'],
    },

    int_Odometer_Reading: {
      type: Number,
      default: 0,
      min: [0, 'Odometer reading cannot be negative'],
    },

    /**
     * Vehicle status codes (from mockData):
     *  A = Available
     *  B = Booked
     *  M = Maintenance
     *  I = Inactive
     */
    txt_Vehicle_Status: {
      type: String,
      enum: {
        values: ['A', 'B', 'M', 'I'],
        message: 'Status must be A (Available), B (Booked), M (Maintenance), or I (Inactive)',
      },
      default: 'A',
    },

    int_Branch_Id: {
      type: Number,
      required: [true, 'Branch is required'],
    },

    // ── camelCase / human-readable fields (used by frontend UI) ─
    mileage: {
      type: String,
      trim: true,
      default: '',
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    features: {
      type: [String],
      default: [],
    },

    image: {
      type: String,
      trim: true,
      default: '',
    },

    /**
     * Derived human-readable status for frontend display.
     * Kept in sync with txt_Vehicle_Status via a pre-save hook.
     */
    availabilityStatus: {
      type: String,
      default: 'Available',
    },
  },
  {
    timestamps: true,
    // Add virtual id field so frontend can use both _id and int_Vehicle_Id
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────
vehicleSchema.index({ int_Category_Id: 1 });
vehicleSchema.index({ int_Branch_Id: 1 });
vehicleSchema.index({ txt_Vehicle_Status: 1 });
vehicleSchema.index({ int_Fuel_Type_Id: 1 });
vehicleSchema.index({ int_Transmission_Id: 1 });
vehicleSchema.index({ dbl_Daily_Rent: 1 });
// Text index for search across model, color, and description
vehicleSchema.index(
  { txt_Model_Name: 'text', txt_Color: 'text', description: 'text' },
  { name: 'vehicle_text_search' }
);

// ── Status code → human label map ────────────────────────────
const STATUS_LABELS = {
  A: 'Available',
  B: 'Booked',
  M: 'Maintenance',
  I: 'Inactive',
};

// ── Pre-save: keep availabilityStatus in sync ─────────────────
vehicleSchema.pre('save', function (next) {
  if (this.isModified('txt_Vehicle_Status')) {
    this.availabilityStatus = STATUS_LABELS[this.txt_Vehicle_Status] || 'Unknown';
  }
  next();
});

// ── Pre-findOneAndUpdate: sync availabilityStatus on updates ──
vehicleSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.txt_Vehicle_Status) {
    update.availabilityStatus = STATUS_LABELS[update.txt_Vehicle_Status] || 'Unknown';
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

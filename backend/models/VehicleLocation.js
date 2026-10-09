const mongoose = require('mongoose');

/**
 * VehicleLocation / Telemetry Schema
 * Stores real-time GPS coordinates and telemetry sent from mobile phones / GPS trackers.
 */
const vehicleLocationSchema = new mongoose.Schema(
  {
    // Reference to Vehicle
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
      index: true,
    },

    // Numeric vehicle ID for fast lookup matching legacy mock data
    int_Vehicle_Id: {
      type: Number,
      index: true,
    },

    // Geographic Coordinates
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },

    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },

    // Accuracy in meters (from GeolocationCoordinates.accuracy)
    accuracy: {
      type: Number,
      default: null,
    },

    // Speed in m/s or km/h (from GeolocationCoordinates.speed)
    speed: {
      type: Number,
      default: null,
    },

    // Heading in degrees 0-360 (from GeolocationCoordinates.heading)
    heading: {
      type: Number,
      default: null,
    },

    // Timestamp recorded on device
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Tracking status: 'active' when sending live pulses, 'stopped' when user halted tracking
    trackingStatus: {
      type: String,
      enum: ['active', 'stopped'],
      default: 'active',
      index: true,
    },

    // Telemetry source identifier
    source: {
      type: String,
      default: 'mobile-gps',
    },

    // User account who pushed this telemetry update
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to quickly fetch latest positions and history by vehicle
vehicleLocationSchema.index({ vehicleId: 1, timestamp: -1 });
vehicleLocationSchema.index({ int_Vehicle_Id: 1, timestamp: -1 });

module.exports = mongoose.model('VehicleLocation', vehicleLocationSchema);

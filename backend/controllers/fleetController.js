const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const VehicleLocation = require('../models/VehicleLocation');

/**
 * Helper to resolve a Vehicle document by either ObjectId or legacy int_Vehicle_Id
 */
async function resolveVehicle(identifier) {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const v = await Vehicle.findById(identifier);
    if (v) return v;
  }
  const numericId = Number(identifier);
  if (!isNaN(numericId)) {
    return await Vehicle.findOne({ int_Vehicle_Id: numericId });
  }
  return null;
}

/**
 * POST /api/fleet/location
 * Ingests a GPS location telemetry pulse from a mobile phone / tracker.
 * JWT protected.
 */
exports.recordLocation = async (req, res, next) => {
  try {
    const {
      vehicleId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      timestamp,
      trackingStatus = 'active',
      source = 'mobile-gps',
    } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required',
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be between -90 and 90.',
      });
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be between -180 and 180.',
      });
    }

    // Resolve vehicle
    const vehicle = await resolveVehicle(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle with ID ${vehicleId} not found`,
      });
    }

    const locationRecord = await VehicleLocation.create({
      vehicleId: vehicle._id,
      int_Vehicle_Id: vehicle.int_Vehicle_Id,
      latitude: latNum,
      longitude: lngNum,
      accuracy: accuracy != null ? Number(accuracy) : null,
      speed: speed != null ? Number(speed) : null,
      heading: heading != null ? Number(heading) : null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      trackingStatus: trackingStatus === 'stopped' ? 'stopped' : 'active',
      source,
      updatedBy: req.user ? req.user._id : null,
    });

    res.status(201).json({
      success: true,
      message: 'Location recorded successfully',
      data: locationRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fleet/live-locations
 * Returns the most recent location recorded for each vehicle.
 * JWT protected for Staff / Admin.
 */
exports.getLiveLocations = async (req, res, next) => {
  try {
    // Aggregate to get the single latest location per vehicleId
    const latestLocations = await VehicleLocation.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$vehicleId',
          latestRecord: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$latestRecord' },
      },
    ]);

    // Populate vehicle details
    await VehicleLocation.populate(latestLocations, {
      path: 'vehicleId',
      select: 'txt_Registration_Number txt_Model_Name int_Vehicle_Id int_Branch_Id txt_Vehicle_Status availabilityStatus',
    });

    res.json({
      success: true,
      count: latestLocations.length,
      data: latestLocations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fleet/location/:vehicleId
 * Returns the latest location and recent path breadcrumbs for a specific vehicle.
 * JWT protected for Staff / Admin.
 */
exports.getVehicleLocation = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await resolveVehicle(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle ${vehicleId} not found`,
      });
    }

    // Fetch the last 50 location entries to draw breadcrumb route
    const history = await VehicleLocation.find({ vehicleId: vehicle._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const latest = history.length > 0 ? history[0] : null;

    res.json({
      success: true,
      data: {
        vehicle: {
          _id: vehicle._id,
          int_Vehicle_Id: vehicle.int_Vehicle_Id,
          txt_Registration_Number: vehicle.txt_Registration_Number,
          txt_Model_Name: vehicle.txt_Model_Name,
          int_Branch_Id: vehicle.int_Branch_Id,
          availabilityStatus: vehicle.availabilityStatus,
        },
        latest,
        history: history.reverse(), // chronologically ordered for polyline tracing
      },
    });
  } catch (error) {
    next(error);
  }
};

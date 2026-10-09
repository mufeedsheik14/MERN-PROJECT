const { body } = require('express-validator');
const Vehicle = require('../models/Vehicle');

// ── Validation rules ──────────────────────────────────────────────────────────

const vehicleRules = [
  body('txt_Registration_Number')
    .trim()
    .notEmpty().withMessage('Registration number is required'),

  body('int_Category_Id')
    .notEmpty().withMessage('Category ID is required')
    .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),

  body('int_Brand_Id')
    .notEmpty().withMessage('Brand ID is required')
    .isInt({ min: 1 }).withMessage('Brand ID must be a positive integer'),

  body('txt_Model_Name')
    .trim()
    .notEmpty().withMessage('Model name is required'),

  body('int_Manufacture_Year')
    .notEmpty().withMessage('Manufacture year is required')
    .isInt({ min: 1990 }).withMessage('Year must be 1990 or later'),

  body('int_Fuel_Type_Id')
    .notEmpty().withMessage('Fuel type is required')
    .isInt({ min: 1 }).withMessage('Fuel type must be a positive integer'),

  body('int_Transmission_Id')
    .notEmpty().withMessage('Transmission type is required')
    .isInt({ min: 1 }).withMessage('Transmission must be a positive integer'),

  body('int_Seating_Capacity')
    .notEmpty().withMessage('Seating capacity is required')
    .isInt({ min: 1 }).withMessage('Seating capacity must be at least 1'),

  body('dbl_Daily_Rent')
    .notEmpty().withMessage('Daily rent is required')
    .isFloat({ min: 0 }).withMessage('Daily rent must be a positive number'),

  body('int_Branch_Id')
    .notEmpty().withMessage('Branch is required')
    .isInt({ min: 1 }).withMessage('Branch must be a positive integer'),

  body('txt_Vehicle_Status')
    .optional()
    .isIn(['A', 'B', 'M', 'I']).withMessage('Status must be A, B, M, or I'),
];

// ── Seed data (mirrors mockData.js vehicles array exactly) ────────────────────
const SEED_VEHICLES = [
  {
    int_Vehicle_Id: 101, txt_Registration_Number: 'TN59-AB-1234',
    int_Category_Id: 1, int_Brand_Id: 1, txt_Model_Name: 'Swift VXI',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 1, int_Transmission_Id: 1,
    int_Seating_Capacity: 5, txt_Color: 'Pearl White',
    dbl_Daily_Rent: 1400, dbl_Weekly_Rent: 8500, dbl_Security_Deposit: 3000,
    int_Odometer_Reading: 18500, txt_Vehicle_Status: 'A', int_Branch_Id: 1,
    mileage: '22.3 km/l', availabilityStatus: 'Available',
    image: '/vehicles/maruti-swift.jpg',
    description: 'A popular, sporty hatchback with excellent fuel efficiency and comfort, perfect for navigating city traffic.',
    features: ['Air Conditioner', 'Power Steering', 'ABS', 'Dual Airbags', 'Bluetooth Connectivity'],
  },
  {
    int_Vehicle_Id: 102, txt_Registration_Number: 'TN22-CD-4521',
    int_Category_Id: 2, int_Brand_Id: 2, txt_Model_Name: 'Verna SX',
    int_Manufacture_Year: 2022, int_Fuel_Type_Id: 2, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Phantom Black',
    dbl_Daily_Rent: 2600, dbl_Weekly_Rent: 16000, dbl_Security_Deposit: 5000,
    int_Odometer_Reading: 32000, txt_Vehicle_Status: 'A', int_Branch_Id: 2,
    mileage: '19.2 km/l', availabilityStatus: 'Available',
    image: '/vehicles/hyundai-verna.jpg',
    description: 'A premium sedan with a striking futuristic design, ventilated seats, and responsive turbocharged performance.',
    features: ['Ventilated Seats', 'Digital Instrument Cluster', 'Wireless Charging', 'Ambient Lighting', 'ABS with EBD'],
  },
  {
    int_Vehicle_Id: 103, txt_Registration_Number: 'TN37-EF-7788',
    int_Category_Id: 3, int_Brand_Id: 4, txt_Model_Name: 'XUV700 AX7',
    int_Manufacture_Year: 2024, int_Fuel_Type_Id: 2, int_Transmission_Id: 2,
    int_Seating_Capacity: 7, txt_Color: 'Midnight Blue',
    dbl_Daily_Rent: 4200, dbl_Weekly_Rent: 26000, dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 9800, txt_Vehicle_Status: 'B', int_Branch_Id: 4,
    mileage: '14.5 km/l', availabilityStatus: 'Booked',
    image: '/vehicles/mahindra-xuv700.jpg',
    description: 'A highly advanced mid-size SUV featuring a panoramic sunroof, modern ADAS systems, and a dual-screen cockpit layout.',
    features: ['Skyroof', 'ADAS System', '360 Degree Camera', 'Dual HD Screens', 'Smart Door Handles'],
  },
  {
    int_Vehicle_Id: 104, txt_Registration_Number: 'TN59-GH-3390',
    int_Category_Id: 4, int_Brand_Id: 5, txt_Model_Name: 'Classic 350',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 1, int_Transmission_Id: 1,
    int_Seating_Capacity: 2, txt_Color: 'Chrome Red',
    dbl_Daily_Rent: 900, dbl_Weekly_Rent: 5400, dbl_Security_Deposit: 2000,
    int_Odometer_Reading: 12400, txt_Vehicle_Status: 'A', int_Branch_Id: 1,
    mileage: '35 km/l', availabilityStatus: 'Available',
    image: '/vehicles/royal-enfield-classic-350.jpg',
    description: 'The classic cruiser motorcycle known for its signature thump, timeless style, and comfortable upright riding posture.',
    features: ['Dual Channel ABS', 'Electric Start', 'Retro Analogue Console', 'Alloy Wheels', 'Chrome Finish'],
  },
  {
    int_Vehicle_Id: 105, txt_Registration_Number: 'TN66-IJ-5567',
    int_Category_Id: 5, int_Brand_Id: 6, txt_Model_Name: 'Dost+',
    int_Manufacture_Year: 2021, int_Fuel_Type_Id: 2, int_Transmission_Id: 1,
    int_Seating_Capacity: 2, txt_Color: 'Steel Grey',
    dbl_Daily_Rent: 2100, dbl_Weekly_Rent: 13000, dbl_Security_Deposit: 4000,
    int_Odometer_Reading: 54200, txt_Vehicle_Status: 'M', int_Branch_Id: 3,
    mileage: '17.6 km/l', availabilityStatus: 'Maintenance',
    image: '/vehicles/ashok-leyland-dost.jpg',
    description: 'A highly efficient commercial small truck built to transport cargo across short and long distances with ease.',
    features: ['Large Load Body', 'Power Steering', 'Comfort Cabin', 'High Payload Capacity', 'Mobile Charger Socket'],
  },
  {
    int_Vehicle_Id: 106, txt_Registration_Number: 'TN09-KL-9012',
    int_Category_Id: 3, int_Brand_Id: 3, txt_Model_Name: 'Nexon EV',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 3, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Sky Blue',
    dbl_Daily_Rent: 3900, dbl_Weekly_Rent: 24000, dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 6100, txt_Vehicle_Status: 'A', int_Branch_Id: 3,
    mileage: '312 km range', availabilityStatus: 'Available',
    image: '/vehicles/tata-nexon-ev.jpg',
    description: "India's most popular electric SUV, offering a silent and smooth drive with modern tech features and zero emissions.",
    features: ['Ziptron Technology', '10.25-inch Touchscreen', 'Regen Braking', 'Electric Sunroof', 'Connected Car Tech'],
  },
  {
    int_Vehicle_Id: 107, txt_Registration_Number: 'TN01-MN-6654',
    int_Category_Id: 2, int_Brand_Id: 7, txt_Model_Name: 'City ZX',
    int_Manufacture_Year: 2022, int_Fuel_Type_Id: 5, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Lunar Silver',
    dbl_Daily_Rent: 2900, dbl_Weekly_Rent: 17500, dbl_Security_Deposit: 5500,
    int_Odometer_Reading: 21000, txt_Vehicle_Status: 'A', int_Branch_Id: 2,
    mileage: '26.5 km/l', availabilityStatus: 'Available',
    image: '/vehicles/honda-city.jpg',
    description: 'The iconic premium sedan offering top-notch luxury, a smooth hybrid powertrain, and advanced active safety features.',
    features: ['Sunroof', 'Leather Seats', 'Cruise Control', 'LaneWatch Camera', 'ADAS Safety Suite'],
  },
  {
    int_Vehicle_Id: 108, txt_Registration_Number: 'TN59-OP-1123',
    int_Category_Id: 4, int_Brand_Id: 7, txt_Model_Name: 'Activa 6G',
    int_Manufacture_Year: 2024, int_Fuel_Type_Id: 1, int_Transmission_Id: 2,
    int_Seating_Capacity: 2, txt_Color: 'Matte Green',
    dbl_Daily_Rent: 500, dbl_Weekly_Rent: 3000, dbl_Security_Deposit: 1000,
    int_Odometer_Reading: 2300, txt_Vehicle_Status: 'A', int_Branch_Id: 1,
    mileage: '48 km/l', availabilityStatus: 'Available',
    image: '/vehicles/honda-activa.jpg',
    description: 'Renowned family scooter, offering bulletproof reliability, an exceptionally smooth engine, and high mileage.',
    features: ['Silent Start System', 'LED Headlight', 'Telescopic Suspension', 'External Fuel Fill Option', 'Metal Body'],
  },
  {
    int_Vehicle_Id: 109, txt_Registration_Number: 'TN37-QR-8899',
    int_Category_Id: 3, int_Brand_Id: 8, txt_Model_Name: 'Fortuner Sigma4',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 2, int_Transmission_Id: 2,
    int_Seating_Capacity: 7, txt_Color: 'Titan Grey',
    dbl_Daily_Rent: 4800, dbl_Weekly_Rent: 30000, dbl_Security_Deposit: 10000,
    int_Odometer_Reading: 15600, txt_Vehicle_Status: 'I', int_Branch_Id: 4,
    mileage: '12.8 km/l', availabilityStatus: 'Inactive',
    image: '/vehicles/toyota-fortuner.jpg',
    description: 'A dominant and premium full-size SUV designed to conquer off-road terrains while keeping passengers in ultimate comfort.',
    features: ['4x4 Drive System', 'Leather Upholstery', 'Power Tailgate', '7 Airbags', 'Hill Assist Control'],
  },
  {
    int_Vehicle_Id: 110, txt_Registration_Number: 'TN66-ST-4470',
    int_Category_Id: 3, int_Brand_Id: 8, txt_Model_Name: 'Hilux Revo',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 2, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Ocean Blue',
    dbl_Daily_Rent: 3800, dbl_Weekly_Rent: 24000, dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 14200, txt_Vehicle_Status: 'A', int_Branch_Id: 3,
    mileage: '13.6 km/l', availabilityStatus: 'Available',
    image: '/vehicles/toyota-hilux.jpg',
    description: 'An ultra-durable lifestyle pickup truck with a large cargo bed, heavy towing capacity, and premium off-road driving aids.',
    features: ['Towing Package', 'Cargo Bed Cover', 'Differential Lock', 'Touchscreen Infotainment', 'All-Terrain Tyres'],
  },
  {
    int_Vehicle_Id: 111, txt_Registration_Number: 'TN59-UV-9988',
    int_Category_Id: 3, int_Brand_Id: 8, txt_Model_Name: 'Innova Crysta',
    int_Manufacture_Year: 2022, int_Fuel_Type_Id: 2, int_Transmission_Id: 1,
    int_Seating_Capacity: 8, txt_Color: 'Pearl White',
    dbl_Daily_Rent: 3200, dbl_Weekly_Rent: 20000, dbl_Security_Deposit: 6000,
    int_Odometer_Reading: 28500, txt_Vehicle_Status: 'A', int_Branch_Id: 1,
    mileage: '15.4 km/l', availabilityStatus: 'Available',
    image: '/vehicles/toyota-innova-crysta.jpg',
    description: 'The undisputed king of passenger vans, offering unmatched comfort, ride reliability, and spacious multi-row seating.',
    features: ['Automatic Climate Control', 'Captain Seats', 'Ambient Roof Lighting', 'Rear AC Vents', '7 Airbags'],
  },
  {
    int_Vehicle_Id: 112, txt_Registration_Number: 'TN22-WX-1122',
    int_Category_Id: 2, int_Brand_Id: 11, txt_Model_Name: 'C-Class',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 1, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Obsidian Black',
    dbl_Daily_Rent: 6900, dbl_Weekly_Rent: 42000, dbl_Security_Deposit: 20000,
    int_Odometer_Reading: 8200, txt_Vehicle_Status: 'A', int_Branch_Id: 2,
    mileage: '16.1 km/l', availabilityStatus: 'Available',
    image: '/vehicles/mercedes-c-class.jpg',
    description: 'An executive luxury sedan offering cutting-edge dashboard technology, premium leather interior, and a whisper-quiet ride.',
    features: ['Panoramic Sunroof', 'Burmester Surround Sound', 'Active Park Assist', 'Ambient Lighting 64 Colors', 'Dual Zone Climate Control'],
  },
  {
    int_Vehicle_Id: 113, txt_Registration_Number: 'TN37-YZ-3344',
    int_Category_Id: 4, int_Brand_Id: 12, txt_Model_Name: 'RV400',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 3, int_Transmission_Id: 2,
    int_Seating_Capacity: 2, txt_Color: 'Revolt Red',
    dbl_Daily_Rent: 800, dbl_Weekly_Rent: 4800, dbl_Security_Deposit: 2500,
    int_Odometer_Reading: 4100, txt_Vehicle_Status: 'A', int_Branch_Id: 4,
    mileage: '150 km range', availabilityStatus: 'Available',
    image: '/vehicles/revolt-rv400.jpg',
    description: 'A smart electric street motorcycle with custom exhaust speaker sounds, swappable battery network, and app features.',
    features: ['Custom Exhaust Sounds', 'Swappable Battery Support', 'LED Lighting System', 'Riding Modes (Eco, Normal, Sport)', 'App Connectivity'],
  },
  {
    int_Vehicle_Id: 114, txt_Registration_Number: 'TN01-AB-8877',
    int_Category_Id: 4, int_Brand_Id: 10, txt_Model_Name: 'Jupiter',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 1, int_Transmission_Id: 2,
    int_Seating_Capacity: 2, txt_Color: 'Mystic Grey',
    dbl_Daily_Rent: 600, dbl_Weekly_Rent: 3500, dbl_Security_Deposit: 1000,
    int_Odometer_Reading: 6700, txt_Vehicle_Status: 'A', int_Branch_Id: 2,
    mileage: '50 km/l', availabilityStatus: 'Available',
    image: '/vehicles/tvs-jupiter.jpg',
    description: 'A practical and highly comfortable scooter offering excellent fuel efficiency, large legroom, and a smooth ride.',
    features: ['External Fuel Fill', 'LED Headlamp', 'Large Underseat Storage', 'Alloy Wheels', 'USB Charger'],
  },
  {
    int_Vehicle_Id: 115, txt_Registration_Number: 'TN66-CD-9900',
    int_Category_Id: 1, int_Brand_Id: 2, txt_Model_Name: 'i20 Asta',
    int_Manufacture_Year: 2023, int_Fuel_Type_Id: 1, int_Transmission_Id: 2,
    int_Seating_Capacity: 5, txt_Color: 'Fiery Red',
    dbl_Daily_Rent: 1700, dbl_Weekly_Rent: 10000, dbl_Security_Deposit: 3500,
    int_Odometer_Reading: 11200, txt_Vehicle_Status: 'A', int_Branch_Id: 3,
    mileage: '20.3 km/l', availabilityStatus: 'Available',
    image: '/vehicles/hyundai-i20.jpg',
    description: 'A premium hatchback loaded with high-tech features, sleek styling, and comfortable interior cabin space.',
    features: ['Touchscreen Infotainment', 'Sunroof', 'Rear Parking Camera', 'LED DRLs', 'Automatic Climate Control'],
  },
];

// ── Controller functions ──────────────────────────────────────────────────────

/**
 * GET /api/vehicles
 * Public — list all vehicles with optional filtering.
 * Query params:
 *   status        → txt_Vehicle_Status  (A|B|M|I)
 *   category      → int_Category_Id
 *   branch        → int_Branch_Id
 *   fuel          → int_Fuel_Type_Id
 *   transmission  → int_Transmission_Id
 *   search        → text search on model name, color, description
 *   minRate       → dbl_Daily_Rent >=
 *   maxRate       → dbl_Daily_Rent <=
 *   sortBy        → field to sort by (default: int_Vehicle_Id)
 *   order         → asc | desc
 */
const getVehicles = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) filter.txt_Vehicle_Status = req.query.status;
    if (req.query.category) filter.int_Category_Id = Number(req.query.category);
    if (req.query.branch) filter.int_Branch_Id = Number(req.query.branch);
    if (req.query.fuel) filter.int_Fuel_Type_Id = Number(req.query.fuel);
    if (req.query.transmission) filter.int_Transmission_Id = Number(req.query.transmission);

    if (req.query.minRate || req.query.maxRate) {
      filter.dbl_Daily_Rent = {};
      if (req.query.minRate) filter.dbl_Daily_Rent.$gte = Number(req.query.minRate);
      if (req.query.maxRate) filter.dbl_Daily_Rent.$lte = Number(req.query.maxRate);
    }

    // Text search using the text index
    let query;
    if (req.query.search) {
      query = Vehicle.find(
        { $text: { $search: req.query.search }, ...filter },
        { score: { $meta: 'textScore' } }
      );
    } else {
      query = Vehicle.find(filter);
    }

    // Sorting
    const sortField = req.query.sortBy || 'int_Vehicle_Id';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;
    query = query.sort({ [sortField]: sortOrder });

    const vehicles = await query;

    res.json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vehicles/:id
 * Public — get single vehicle by int_Vehicle_Id.
 */
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({
      int_Vehicle_Id: Number(req.params.id),
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle with ID ${req.params.id} not found`,
      });
    }

    res.json({ success: true, vehicle });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vehicles
 * Admin/Staff — create a new vehicle.
 */
const createVehicle = async (req, res, next) => {
  try {
    // Auto-assign int_Vehicle_Id if not provided
    if (!req.body.int_Vehicle_Id) {
      const last = await Vehicle.findOne().sort({ int_Vehicle_Id: -1 }).select('int_Vehicle_Id');
      req.body.int_Vehicle_Id = last ? last.int_Vehicle_Id + 1 : 1;
    }

    const vehicle = await Vehicle.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/vehicles/:id
 * Admin/Staff — update vehicle by int_Vehicle_Id.
 */
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { int_Vehicle_Id: Number(req.params.id) },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle with ID ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vehicles/:id
 * Admin only — permanently delete a vehicle by int_Vehicle_Id.
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      int_Vehicle_Id: Number(req.params.id),
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle with ID ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Vehicle #${req.params.id} (${vehicle.txt_Model_Name}) has been deleted`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vehicles/seed
 * Dev only — seeds the database with all 15 vehicles from mockData.js.
 * Uses upsert so it is safe to run multiple times.
 */
const seedVehicles = async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Seeding is disabled in production',
    });
  }

  try {
    const results = await Promise.all(
      SEED_VEHICLES.map((v) =>
        Vehicle.findOneAndUpdate(
          { int_Vehicle_Id: v.int_Vehicle_Id },
          v,
          { upsert: true, new: true, runValidators: true }
        )
      )
    );

    res.status(201).json({
      success: true,
      message: `Seeded ${results.length} vehicles successfully`,
      count: results.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  vehicleRules,
  updateVehicle,
  deleteVehicle,
  seedVehicles,
};

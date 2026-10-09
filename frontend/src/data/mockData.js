// Mock data modeled directly on the DB design (tbl_Branch, tbl_VehicleCategory,
// tbl_VehicleBrand, tbl_FuelType, tbl_TransmissionType, tbl_Vehicle, tbl_Coupon,
// tbl_BookingStatus). In a real app these would come from REST endpoints backed
// by the SQL schema in the uploaded spreadsheet.

export const branches = [
  { int_Branch_Id: 1, txt_Branch_Name: "Madurai Central", txt_City: "Madurai" },
  { int_Branch_Id: 2, txt_Branch_Name: "Chennai Airport", txt_City: "Chennai" },
  { int_Branch_Id: 3, txt_Branch_Name: "Coimbatore RS Puram", txt_City: "Coimbatore" },
  { int_Branch_Id: 4, txt_Branch_Name: "Bengaluru Whitefield", txt_City: "Bengaluru" },
];

export const categories = [
  { int_Category_Id: 1, txt_Category_Name: "Hatchback", txt_Icon: "🚗" },
  { int_Category_Id: 2, txt_Category_Name: "Sedan", txt_Icon: "🏎️" },
  { int_Category_Id: 3, txt_Category_Name: "SUV", txt_Icon: "🚙" },
  { int_Category_Id: 4, txt_Category_Name: "Two Wheeler / Scooter", txt_Icon: "🏍️" },
  { int_Category_Id: 5, txt_Category_Name: "Commercial", txt_Icon: "🚚" },
];

export const brands = [
  { int_Brand_Id: 1, txt_Brand_Name: "Maruti Suzuki" },
  { int_Brand_Id: 2, txt_Brand_Name: "Hyundai" },
  { int_Brand_Id: 3, txt_Brand_Name: "Tata" },
  { int_Brand_Id: 4, txt_Brand_Name: "Mahindra" },
  { int_Brand_Id: 5, txt_Brand_Name: "Royal Enfield" },
  { int_Brand_Id: 6, txt_Brand_Name: "Ashok Leyland" },
  { int_Brand_Id: 7, txt_Brand_Name: "Honda" },
  { int_Brand_Id: 8, txt_Brand_Name: "Toyota" },
  { int_Brand_Id: 9, txt_Brand_Name: "Kia" },
  { int_Brand_Id: 10, txt_Brand_Name: "TVS" },
  { int_Brand_Id: 11, txt_Brand_Name: "Mercedes-Benz" },
  { int_Brand_Id: 12, txt_Brand_Name: "Revolt" },
];

export const fuelTypes = [
  { int_Fuel_Type_Id: 1, txt_Fuel_Type: "Petrol" },
  { int_Fuel_Type_Id: 2, txt_Fuel_Type: "Diesel" },
  { int_Fuel_Type_Id: 3, txt_Fuel_Type: "Electric" },
  { int_Fuel_Type_Id: 4, txt_Fuel_Type: "CNG" },
  { int_Fuel_Type_Id: 5, txt_Fuel_Type: "Hybrid" },
];

export const transmissionTypes = [
  { int_Transmission_Id: 1, txt_Transmission_Type: "Manual" },
  { int_Transmission_Id: 2, txt_Transmission_Type: "Automatic" },
];

export const bookingStatuses = [
  { int_Booking_Status_Id: 1, key: "status_pending" },
  { int_Booking_Status_Id: 2, key: "status_confirmed" },
  { int_Booking_Status_Id: 3, key: "status_ongoing" },
  { int_Booking_Status_Id: 4, key: "status_completed" },
  { int_Booking_Status_Id: 5, key: "status_cancelled" },
];

export const coupons = [
  {
    txt_Coupon_Code: "FIRST10",
    dbl_Discount_Percent: 10,
    dbl_Max_Discount_Amount: 500,
    dte_Valid_To: "2027-12-31",
  },
  {
    txt_Coupon_Code: "ROAD20",
    dbl_Discount_Percent: 20,
    dbl_Max_Discount_Amount: 1200,
    dte_Valid_To: "2027-12-31",
  },
];

// tbl_Vehicle rows, joined with brand/category/fuel/transmission names for convenience
export const vehicles = [
  {
    int_Vehicle_Id: 101,
    txt_Registration_Number: "TN59-AB-1234",
    int_Category_Id: 1,
    int_Brand_Id: 1,
    txt_Model_Name: "Swift VXI",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 1,
    int_Seating_Capacity: 5,
    txt_Color: "Pearl White",
    dbl_Daily_Rent: 1400,
    dbl_Weekly_Rent: 8500,
    dbl_Security_Deposit: 3000,
    int_Odometer_Reading: 18500,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 1,
    mileage: "22.3 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/maruti-swift.jpg",
    description: "A popular, sporty hatchback with excellent fuel efficiency and comfort, perfect for navigating city traffic.",
    features: ["Air Conditioner", "Power Steering", "ABS", "Dual Airbags", "Bluetooth Connectivity"],
  },
  {
    int_Vehicle_Id: 102,
    txt_Registration_Number: "TN22-CD-4521",
    int_Category_Id: 2,
    int_Brand_Id: 2,
    txt_Model_Name: "Verna SX",
    int_Manufacture_Year: 2022,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Phantom Black",
    dbl_Daily_Rent: 2600,
    dbl_Weekly_Rent: 16000,
    dbl_Security_Deposit: 5000,
    int_Odometer_Reading: 32000,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 2,
    mileage: "19.2 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/hyundai-verna.jpg",
    description: "A premium sedan with a striking futuristic design, ventilated seats, and responsive turbocharged performance.",
    features: ["Ventilated Seats", "Digital Instrument Cluster", "Wireless Charging", "Ambient Lighting", "ABS with EBD"],
  },
  {
    int_Vehicle_Id: 103,
    txt_Registration_Number: "TN37-EF-7788",
    int_Category_Id: 3,
    int_Brand_Id: 4,
    txt_Model_Name: "XUV700 AX7",
    int_Manufacture_Year: 2024,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 7,
    txt_Color: "Midnight Blue",
    dbl_Daily_Rent: 4200,
    dbl_Weekly_Rent: 26000,
    dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 9800,
    txt_Vehicle_Status: "B",
    int_Branch_Id: 4,
    mileage: "14.5 km/l",
    availabilityStatus: "Booked",
    image: "/vehicles/mahindra-xuv700.jpg",
    description: "A highly advanced mid-size SUV featuring a panoramic sunroof, modern ADAS systems, and a dual-screen cockpit layout.",
    features: ["Skyroof", "ADAS System", "360 Degree Camera", "Dual HD Screens", "Smart Door Handles"],
  },
  {
    int_Vehicle_Id: 104,
    txt_Registration_Number: "TN59-GH-3390",
    int_Category_Id: 4,
    int_Brand_Id: 5,
    txt_Model_Name: "Classic 350",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 1,
    int_Seating_Capacity: 2,
    txt_Color: "Chrome Red",
    dbl_Daily_Rent: 900,
    dbl_Weekly_Rent: 5400,
    dbl_Security_Deposit: 2000,
    int_Odometer_Reading: 12400,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 1,
    mileage: "35 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/royal-enfield-classic-350.jpg",
    description: "The classic cruiser motorcycle known for its signature thump, timeless style, and comfortable upright riding posture.",
    features: ["Dual Channel ABS", "Electric Start", "Retro Analogue Console", "Alloy Wheels", "Chrome Finish"],
  },
  {
    int_Vehicle_Id: 105,
    txt_Registration_Number: "TN66-IJ-5567",
    int_Category_Id: 5,
    int_Brand_Id: 6,
    txt_Model_Name: "Dost+",
    int_Manufacture_Year: 2021,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 1,
    int_Seating_Capacity: 2,
    txt_Color: "Steel Grey",
    dbl_Daily_Rent: 2100,
    dbl_Weekly_Rent: 13000,
    dbl_Security_Deposit: 4000,
    int_Odometer_Reading: 54200,
    txt_Vehicle_Status: "M",
    int_Branch_Id: 3,
    mileage: "17.6 km/l",
    availabilityStatus: "Maintenance",
    image: "/vehicles/ashok-leyland-dost.jpg",
    description: "A highly efficient commercial small truck built to transport cargo across short and long distances with ease.",
    features: ["Large Load Body", "Power Steering", "Comfort Cabin", "High Payload Capacity", "Mobile Charger Socket"],
  },
  {
    int_Vehicle_Id: 106,
    txt_Registration_Number: "TN09-KL-9012",
    int_Category_Id: 3,
    int_Brand_Id: 3,
    txt_Model_Name: "Nexon EV",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 3,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Sky Blue",
    dbl_Daily_Rent: 3900,
    dbl_Weekly_Rent: 24000,
    dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 6100,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 3,
    mileage: "312 km range",
    availabilityStatus: "Available",
    image: "/vehicles/tata-nexon-ev.jpg",
    description: "India's most popular electric SUV, offering a silent and smooth drive with modern tech features and zero emissions.",
    features: ["Ziptron Technology", "10.25-inch Touchscreen", "Regen Braking", "Electric Sunroof", "Connected Car Tech"],
  },
  {
    int_Vehicle_Id: 107,
    txt_Registration_Number: "TN01-MN-6654",
    int_Category_Id: 2,
    int_Brand_Id: 7,
    txt_Model_Name: "City ZX",
    int_Manufacture_Year: 2022,
    int_Fuel_Type_Id: 5,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Lunar Silver",
    dbl_Daily_Rent: 2900,
    dbl_Weekly_Rent: 17500,
    dbl_Security_Deposit: 5500,
    int_Odometer_Reading: 21000,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 2,
    mileage: "26.5 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/honda-city.jpg",
    description: "The iconic premium sedan offering top-notch luxury, a smooth hybrid powertrain, and advanced active safety features.",
    features: ["Sunroof", "Leather Seats", "Cruise Control", "LaneWatch Camera", "ADAS Safety Suite"],
  },
  {
    int_Vehicle_Id: 108,
    txt_Registration_Number: "TN59-OP-1123",
    int_Category_Id: 4,
    int_Brand_Id: 7,
    txt_Model_Name: "Activa 6G",
    int_Manufacture_Year: 2024,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 2,
    txt_Color: "Matte Green",
    dbl_Daily_Rent: 500,
    dbl_Weekly_Rent: 3000,
    dbl_Security_Deposit: 1000,
    int_Odometer_Reading: 2300,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 1,
    mileage: "48 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/honda-activa.jpg",
    description: "Renowned family scooter, offering bulletproof reliability, an exceptionally smooth engine, and high mileage.",
    features: ["Silent Start System", "LED Headlight", "Telescopic Suspension", "External Fuel Fill Option", "Metal Body"],
  },
  {
    int_Vehicle_Id: 109,
    txt_Registration_Number: "TN37-QR-8899",
    int_Category_Id: 3,
    int_Brand_Id: 8,
    txt_Model_Name: "Fortuner Sigma4",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 7,
    txt_Color: "Titan Grey",
    dbl_Daily_Rent: 4800,
    dbl_Weekly_Rent: 30000,
    dbl_Security_Deposit: 10000,
    int_Odometer_Reading: 15600,
    txt_Vehicle_Status: "I",
    int_Branch_Id: 4,
    mileage: "12.8 km/l",
    availabilityStatus: "Inactive",
    image: "/vehicles/toyota-fortuner.jpg",
    description: "A dominant and premium full-size SUV designed to conquer off-road terrains while keeping passengers in ultimate comfort.",
    features: ["4x4 Drive System", "Leather Upholstery", "Power Tailgate", "7 Airbags", "Hill Assist Control"],
  },
  {
    int_Vehicle_Id: 110,
    txt_Registration_Number: "TN66-ST-4470",
    int_Category_Id: 3,
    int_Brand_Id: 8,
    txt_Model_Name: "Hilux Revo",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Ocean Blue",
    dbl_Daily_Rent: 3800,
    dbl_Weekly_Rent: 24000,
    dbl_Security_Deposit: 8000,
    int_Odometer_Reading: 14200,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 3,
    mileage: "13.6 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/toyota-hilux.jpg",
    description: "An ultra-durable lifestyle pickup truck with a large cargo bed, heavy towing capacity, and premium off-road driving aids.",
    features: ["Towing Package", "Cargo Bed Cover", "Differential Lock", "Touchscreen Infotainment", "All-Terrain Tyres"],
  },
  {
    int_Vehicle_Id: 111,
    txt_Registration_Number: "TN59-UV-9988",
    int_Category_Id: 3,
    int_Brand_Id: 8,
    txt_Model_Name: "Innova Crysta",
    int_Manufacture_Year: 2022,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 1,
    int_Seating_Capacity: 8,
    txt_Color: "Pearl White",
    dbl_Daily_Rent: 3200,
    dbl_Weekly_Rent: 20000,
    dbl_Security_Deposit: 6000,
    int_Odometer_Reading: 28500,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 1,
    mileage: "15.4 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/toyota-innova-crysta.jpg",
    description: "The undisputed king of passenger vans, offering unmatched comfort, ride reliability, and spacious multi-row seating.",
    features: ["Automatic Climate Control", "Captain Seats", "Ambient Roof Lighting", "Rear AC Vents", "7 Airbags"],
  },
  {
    int_Vehicle_Id: 112,
    txt_Registration_Number: "TN22-WX-1122",
    int_Category_Id: 2,
    int_Brand_Id: 11,
    txt_Model_Name: "C-Class",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Obsidian Black",
    dbl_Daily_Rent: 6900,
    dbl_Weekly_Rent: 42000,
    dbl_Security_Deposit: 20000,
    int_Odometer_Reading: 8200,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 2,
    mileage: "16.1 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/mercedes-c-class.jpg",
    description: "An executive luxury sedan offering cutting-edge dashboard technology, premium leather interior, and a whisper-quiet ride.",
    features: ["Panoramic Sunroof", "Burmester Surround Sound", "Active Park Assist", "Ambient Lighting 64 Colors", "Dual Zone Climate Control"],
  },
  {
    int_Vehicle_Id: 113,
    txt_Registration_Number: "TN37-YZ-3344",
    int_Category_Id: 4,
    int_Brand_Id: 12,
    txt_Model_Name: "RV400",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 3,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 2,
    txt_Color: "Revolt Red",
    dbl_Daily_Rent: 800,
    dbl_Weekly_Rent: 4800,
    dbl_Security_Deposit: 2500,
    int_Odometer_Reading: 4100,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 4,
    mileage: "150 km range",
    availabilityStatus: "Available",
    image: "/vehicles/revolt-rv400.jpg",
    description: "A smart electric street motorcycle with custom exhaust speaker sounds, swappable battery network, and app features.",
    features: ["Custom Exhaust Sounds", "Swappable Battery Support", "LED Lighting System", "Riding Modes (Eco, Normal, Sport)", "App Connectivity"],
  },
  {
    int_Vehicle_Id: 114,
    txt_Registration_Number: "TN01-AB-8877",
    int_Category_Id: 4,
    int_Brand_Id: 10,
    txt_Model_Name: "Jupiter",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 2,
    txt_Color: "Mystic Grey",
    dbl_Daily_Rent: 600,
    dbl_Weekly_Rent: 3500,
    dbl_Security_Deposit: 1000,
    int_Odometer_Reading: 6700,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 2,
    mileage: "50 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/tvs-jupiter.jpg",
    description: "A practical and highly comfortable scooter offering excellent fuel efficiency, large legroom, and a smooth ride.",
    features: ["External Fuel Fill", "LED Headlamp", "Large Underseat Storage", "Alloy Wheels", "USB Charger"],
  },
  {
    int_Vehicle_Id: 115,
    txt_Registration_Number: "TN66-CD-9900",
    int_Category_Id: 1,
    int_Brand_Id: 2,
    txt_Model_Name: "i20 Asta",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 1,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Fiery Red",
    dbl_Daily_Rent: 1700,
    dbl_Weekly_Rent: 10000,
    dbl_Security_Deposit: 3500,
    int_Odometer_Reading: 11200,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 3,
    mileage: "20.3 km/l",
    availabilityStatus: "Available",
    image: "/vehicles/hyundai-i20.jpg",
    description: "A premium hatchback loaded with high-tech features, sleek styling, and comfortable interior cabin space.",
    features: ["Touchscreen Infotainment", "Sunroof", "Rear Parking Camera", "LED DRLs", "Automatic Climate Control"],
  },
];

// Lookup helpers
export const getBranchName = (id) =>
  branches.find((b) => b.int_Branch_Id === Number(id))?.txt_Branch_Name ?? "-";

export const getCategoryName = (id) =>
  categories.find((c) => c.int_Category_Id === Number(id))?.txt_Category_Name ?? "-";

export const getBrandName = (id) => {
  if (!id) return "-";
  if (typeof id === "object" && id !== null) {
    return id.txt_Brand_Name || id.name || "-";
  }
  const numericId = Number(id);
  const found = brands.find((b) => b.int_Brand_Id === numericId);
  return found?.txt_Brand_Name ?? (!isNaN(numericId) && numericId > 0 ? `Brand #${id}` : "-");
};

export const getFuelName = (id) =>
  fuelTypes.find((f) => f.int_Fuel_Type_Id === Number(id))?.txt_Fuel_Type ?? "-";

export const getTransmissionName = (id) =>
  transmissionTypes.find((t) => t.int_Transmission_Id === Number(id))?.txt_Transmission_Type ?? "-";

export const getCategoryIcon = (id) => {
  switch (Number(id)) {
    case 1: return "🚗";
    case 2: return "🏎️";
    case 3: return "🚙";
    case 4: return "🏍️";
    case 5: return "🚚";
    default: return "🚗";
  }
};

export const filterCategories = [
  { id: "", name: "All", icon: "🌐" },
  { id: "hatchback", name: "Hatchbacks", icon: "🚗" },
  { id: "sedan", name: "Sedans", icon: "🏎️" },
  { id: "suv", name: "SUVs", icon: "🚙" },
  { id: "bike", name: "Two Wheeler / Scooter", icon: "🏍️" },
  { id: "commercial", name: "Commercial", icon: "🚚" },
];

export const getCategoryIdFromFilter = (filterVal) => {
  if (!filterVal) return "";
  const num = Number(filterVal);
  if (!isNaN(num) && num > 0) return String(num);
  const slugMap = {
    hatchback: "1",
    sedan: "2",
    suv: "3",
    bike: "4",
    scooter: "4",
    "two wheeler": "4",
    commercial: "5",
  };
  return slugMap[String(filterVal).toLowerCase()] || "";
};

export const matchCategory = (vehicleCategoryId, filterId) => {
  if (!filterId) return true;

  const vCatId = Number(vehicleCategoryId);
  const fId = String(filterId).toLowerCase().trim();

  // If filterId is numeric category ID
  if (!isNaN(Number(fId)) && Number(fId) > 0) {
    return vCatId === Number(fId);
  }

  // Commercial / Truck
  if (
    fId === "commercial" ||
    fId === "truck" ||
    fId === "5" ||
    fId.includes("commercial") ||
    fId.includes("truck")
  ) {
    return vCatId === 5;
  }

  // Two Wheeler / Scooter / Bike
  if (
    fId === "bike" ||
    fId === "scooter" ||
    fId === "two wheeler" ||
    fId === "4" ||
    fId.includes("bike") ||
    fId.includes("scooter") ||
    fId.includes("two wheeler") ||
    fId.includes("two-wheeler")
  ) {
    return vCatId === 4;
  }

  // SUV
  if (fId === "suv" || fId === "3" || fId.includes("suv")) {
    return vCatId === 3;
  }

  // Sedan
  if (fId === "sedan" || fId === "2" || fId.includes("sedan")) {
    return vCatId === 2;
  }

  // Hatchback
  if (fId === "hatchback" || fId === "1" || fId.includes("hatchback")) {
    return vCatId === 1;
  }

  const category = categories.find((c) => c.int_Category_Id === vCatId);
  if (!category) return false;

  const catName = category.txt_Category_Name.toLowerCase();
};

export const STAFF_CREDENTIALS = { username: "admin", password: "admin123", name: "Admin" };

export const STAFF_MOCK_ACCOUNTS = [
  { username: "staff_madurai", password: "staff123", int_Branch_Id: 1, emoji: "🏛️" },
  { username: "staff_chennai", password: "staff123", int_Branch_Id: 2, emoji: "✈️" },
  { username: "staff_coimbatore", password: "staff123", int_Branch_Id: 3, emoji: "🏭" },
  { username: "staff_bengaluru", password: "staff123", int_Branch_Id: 4, emoji: "💻" },
];

export const MOCK_USERS = [
  {
    username: "admin",
    password: "admin123",
    name: "System Admin",
    role: "admin",
    email: "admin@roadready.com",
    phone: "9840112233",
    active: true,
  },
  {
    username: "staff_madurai",
    password: "staff123",
    name: "Madurai Operations",
    role: "staff",
    int_Branch_Id: 1,
    employeeId: "RR-STF-101",
    email: "madurai@roadready.com",
    phone: "9840112244",
    address: "12 West Veli Street, Madurai, Tamil Nadu 625001",
    dateOfBirth: "1992-05-14",
    emergencyContactName: "Karthik Raja",
    emergencyContactPhone: "9840119901",
    accountStatus: "Active",
    active: true,
  },
  {
    username: "staff_chennai",
    password: "staff123",
    name: "Chennai Desk",
    role: "staff",
    int_Branch_Id: 2,
    employeeId: "RR-STF-102",
    email: "chennai@roadready.com",
    phone: "9840112255",
    address: "45 Mount Road, Guindy, Chennai, Tamil Nadu 600032",
    dateOfBirth: "1990-11-23",
    emergencyContactName: "Suresh Kumar",
    emergencyContactPhone: "9840119902",
    accountStatus: "Active",
    active: true,
  },
  {
    username: "staff_coimbatore",
    password: "staff123",
    name: "Coimbatore Hub",
    role: "staff",
    int_Branch_Id: 3,
    employeeId: "RR-STF-103",
    email: "coimbatore@roadready.com",
    phone: "9840112266",
    address: "78 Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004",
    dateOfBirth: "1994-03-08",
    emergencyContactName: "Anitha Devi",
    emergencyContactPhone: "9840119903",
    accountStatus: "Active",
    active: true,
  },
  {
    username: "staff_bengaluru",
    password: "staff123",
    name: "Bengaluru Operations",
    role: "staff",
    int_Branch_Id: 4,
    employeeId: "RR-STF-104",
    email: "bengaluru@roadready.com",
    phone: "9840112277",
    address: "21 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
    dateOfBirth: "1988-09-17",
    emergencyContactName: "Ramesh Rao",
    emergencyContactPhone: "9840119904",
    accountStatus: "Active",
    active: true,
  },
  {
    username: "customer1",
    password: "user123",
    name: "Rahul Sharma",
    role: "customer",
    email: "rahul@example.com",
    phone: "9840112288",
    active: true,
  },
  {
    username: "customer2",
    password: "user123",
    name: "Priya Patel",
    role: "customer",
    email: "priya@example.com",
    phone: "9840112299",
    active: true,
  },
];

export const INITIAL_MOCK_BOOKINGS = [
  {
    txt_Booking_Number: "BK-2026-001",
    int_Vehicle_Id: 101,
    customerUsername: "customer1",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "9840112288",
    int_Branch_Id: 1,
    dte_Start_Date: "2026-09-10",
    dte_End_Date: "2026-09-13",
    int_Booking_Status_Id: 2,
    dbl_Total_Amount: 4200,
  },
  {
    txt_Booking_Number: "BK-2026-002",
    int_Vehicle_Id: 102,
    customerUsername: "customer2",
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "9840112299",
    int_Branch_Id: 2,
    dte_Start_Date: "2026-09-12",
    dte_End_Date: "2026-09-15",
    int_Booking_Status_Id: 1,
    dbl_Total_Amount: 7800,
  },
];


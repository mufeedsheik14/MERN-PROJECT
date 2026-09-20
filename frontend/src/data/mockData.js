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
  { int_Category_Id: 1, txt_Category_Name: "Hatchback" },
  { int_Category_Id: 2, txt_Category_Name: "Sedan" },
  { int_Category_Id: 3, txt_Category_Name: "SUV" },
  { int_Category_Id: 4, txt_Category_Name: "Bike" },
  { int_Category_Id: 5, txt_Category_Name: "Truck" },
];

export const brands = [
  { int_Brand_Id: 1, txt_Brand_Name: "Maruti Suzuki" },
  { int_Brand_Id: 2, txt_Brand_Name: "Hyundai" },
  { int_Brand_Id: 3, txt_Brand_Name: "Tata" },
  { int_Brand_Id: 4, txt_Brand_Name: "Mahindra" },
  { int_Brand_Id: 5, txt_Brand_Name: "Royal Enfield" },
  { int_Brand_Id: 6, txt_Brand_Name: "Ashok Leyland" },
  { int_Brand_Id: 7, txt_Brand_Name: "Honda" },
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
  },
  {
    int_Vehicle_Id: 106,
    txt_Registration_Number: "TN09-KL-9012",
    int_Category_Id: 1,
    int_Brand_Id: 3,
    txt_Model_Name: "Tiago XZ",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 3,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Sky Blue",
    dbl_Daily_Rent: 1600,
    dbl_Weekly_Rent: 9800,
    dbl_Security_Deposit: 3200,
    int_Odometer_Reading: 6100,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 3,
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
  },
  {
    int_Vehicle_Id: 108,
    txt_Registration_Number: "TN59-OP-1123",
    int_Category_Id: 4,
    int_Brand_Id: 1,
    txt_Model_Name: "Access 125",
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
  },
  {
    int_Vehicle_Id: 109,
    txt_Registration_Number: "TN37-QR-8899",
    int_Category_Id: 3,
    int_Brand_Id: 2,
    txt_Model_Name: "Creta SX(O)",
    int_Manufacture_Year: 2023,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 2,
    int_Seating_Capacity: 5,
    txt_Color: "Titan Grey",
    dbl_Daily_Rent: 3400,
    dbl_Weekly_Rent: 21000,
    dbl_Security_Deposit: 6000,
    int_Odometer_Reading: 15600,
    txt_Vehicle_Status: "I",
    int_Branch_Id: 4,
  },
  {
    int_Vehicle_Id: 110,
    txt_Registration_Number: "TN66-ST-4470",
    int_Category_Id: 5,
    int_Brand_Id: 3,
    txt_Model_Name: "Ace Gold",
    int_Manufacture_Year: 2020,
    int_Fuel_Type_Id: 2,
    int_Transmission_Id: 1,
    int_Seating_Capacity: 2,
    txt_Color: "Ocean Blue",
    dbl_Daily_Rent: 1900,
    dbl_Weekly_Rent: 11500,
    dbl_Security_Deposit: 3800,
    int_Odometer_Reading: 61200,
    txt_Vehicle_Status: "A",
    int_Branch_Id: 3,
  },
];

// Lookup helpers
export const getBranchName = (id) => branches.find((b) => b.int_Branch_Id === id)?.txt_Branch_Name ?? "-";
export const getCategoryName = (id) => categories.find((c) => c.int_Category_Id === id)?.txt_Category_Name ?? "-";
export const getBrandName = (id) => brands.find((b) => b.int_Brand_Id === id)?.txt_Brand_Name ?? "-";
export const getFuelName = (id) => fuelTypes.find((f) => f.int_Fuel_Type_Id === id)?.txt_Fuel_Type ?? "-";
export const getTransmissionName = (id) =>
  transmissionTypes.find((t) => t.int_Transmission_Id === id)?.txt_Transmission_Type ?? "-";

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
  { id: "bike", name: "Bikes & Scooters", icon: "🏍️" },
  { id: "truck", name: "Commercial Trucks", icon: "🚚" },
];

export const matchCategory = (vehicleCategoryId, filterId) => {
  if (!filterId) return true;
  const category = categories.find((c) => c.int_Category_Id === vehicleCategoryId);
  if (!category) return false;

  const catName = category.txt_Category_Name.toLowerCase();
  const filter = filterId.toLowerCase();

  return catName.includes(filter);
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


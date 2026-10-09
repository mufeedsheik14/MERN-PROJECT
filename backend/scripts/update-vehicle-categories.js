const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

async function updateCategories() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Update mappings:
  // 105: Ashok Leyland Dost+ -> 5 (Commercial)
  // 108: Activa 6G -> 4 (Two Wheeler / Scooter)
  // 114: TVS Jupiter -> 4 (Two Wheeler / Scooter)
  // 113: RV400 -> 4 (Two Wheeler / Scooter)
  // 106: Nexon EV -> 3 (SUV)
  // 110: Hilux Revo -> 3 (SUV)
  // 111: Innova Crysta -> 3 (SUV)
  // 112: C-Class -> 2 (Sedan)

  const updates = [
    { int_Vehicle_Id: 105, int_Category_Id: 5, label: 'Ashok Leyland Dost+ -> Commercial (5)' },
    { int_Vehicle_Id: 108, int_Category_Id: 4, label: 'Activa 6G -> Two Wheeler/Scooter (4)' },
    { int_Vehicle_Id: 114, int_Category_Id: 4, label: 'TVS Jupiter -> Two Wheeler/Scooter (4)' },
    { int_Vehicle_Id: 113, int_Category_Id: 4, label: 'RV400 -> Two Wheeler/Scooter (4)' },
    { int_Vehicle_Id: 106, int_Category_Id: 3, label: 'Nexon EV -> SUV (3)' },
    { int_Vehicle_Id: 110, int_Category_Id: 3, label: 'Hilux Revo -> SUV (3)' },
    { int_Vehicle_Id: 111, int_Category_Id: 3, label: 'Innova Crysta -> SUV (3)' },
    { int_Vehicle_Id: 112, int_Category_Id: 2, label: 'C-Class -> Sedan (2)' },
  ];

  for (const u of updates) {
    const res = await Vehicle.updateOne(
      { int_Vehicle_Id: u.int_Vehicle_Id },
      { $set: { int_Category_Id: u.int_Category_Id } }
    );
    console.log(`Updated ${u.label}: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  }

  // Verify all 15 vehicles
  console.log('\n--- Final Verification of Vehicles in MongoDB ---');
  const all = await Vehicle.find({}).sort({ int_Vehicle_Id: 1 }).select('int_Vehicle_Id txt_Model_Name int_Category_Id');
  all.forEach((v) => {
    console.log(`[#${v.int_Vehicle_Id}] ${v.txt_Model_Name.padEnd(16)} -> Category ID: ${v.int_Category_Id}`);
  });

  await mongoose.disconnect();
}

updateCategories().catch(console.error);

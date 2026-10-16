const dns = require('node:dns');

try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (dnsErr) {
  console.warn('⚠️ Custom DNS servers could not be set, falling back to system resolver:', dnsErr.message);
}
const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 * Exits the process if connection fails (fail-fast strategy).
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ has these defaults built in; listed for clarity
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

// config/db.js — MongoDB connection via Mongoose
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.error('⚠️  Server will continue — start MongoDB to enable data persistence.');
  }
};

module.exports = connectDB;

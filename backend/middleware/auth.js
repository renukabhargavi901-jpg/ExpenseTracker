// middleware/auth.js — JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log(`🔑 Token found in Authorization header`);
  }
  // Or check cookie
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log(`🔑 Token found in cookie`);
  }

  if (!token) {
    console.log(`❌ No token provided - Access denied`);
    return res.status(401).json({ success: false, message: 'Not authorized — no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ Token verified for user ID: ${decoded.id}`);
    
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      console.log(`❌ User not found in database for ID: ${decoded.id}`);
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    console.log(`✅ User loaded: ${req.user.name}`);
    next();
  } catch (err) {
    console.error(`❌ Token verification failed:`, err.message);
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect };

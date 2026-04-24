// routes/auth.js — Authentication routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
};

// ======================
// 🔐 SIGNUP
// ======================
router.post('/signup', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    email = email.trim().toLowerCase();
    name = name.trim();

    console.log(`👤 Signup attempt for email: ${email}`);

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`❌ Email already registered: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    console.log(`✅ Creating new user: ${name} (${email})`);

    const user = await User.create({
      name,
      email,
      password,
    });

    console.log(`✅ User created with ID: ${user._id}`);

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
    });
  }
});

// ======================
// 🔐 LOGIN (FIXED)
// ======================
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password',
      });
    }

    email = email.trim().toLowerCase();

    console.log(`🔐 Login attempt for: ${email}`);

    // ✅ FIX: allow login via email OR username (name)
    const user = await User.findOne({
      $or: [
        { email: email },
        { name: email },
      ],
    }).select('+password');

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`❌ Password mismatch for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    console.log(`✅ Login success for user: ${user._id}`);

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// ======================
// 🚪 LOGOUT
// ======================
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ======================
// 👤 GET CURRENT USER
// ======================
const { protect } = require('../middleware/auth');

router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

module.exports = router;
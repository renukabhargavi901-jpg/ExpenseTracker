// models/Budget.js — Budget Goal schema
const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Budget goal name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [1, 'Target must be at least 1'],
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
  },
  achieved: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Budget', BudgetSchema);

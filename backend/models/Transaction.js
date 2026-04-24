// models/Transaction.js — Transaction schema
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Transaction type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Salary', 'Freelance', 'Investment', 'Gift', 'Other Income',
      'Food', 'House', 'Electricity', 'Shopping', 'Transport',
      'Healthcare', 'Education', 'Entertainment', 'Travel', 'Other Expense'
    ],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: '',
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);

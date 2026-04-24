// routes/budgets.js — CRUD for budget goals
const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/budgets — list all budgets with progress info
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Calculate current balance for progress tracking
    const transactions = await Transaction.find({ user: req.user._id });
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });
    const balance = totalIncome - totalExpense;

    const now = new Date();
    const enriched = budgets.map(b => {
      const progress = Math.min((balance / b.targetAmount) * 100, 100);
      const isAchieved = balance >= b.targetAmount;
      const isExpired = !isAchieved && new Date(b.deadline) < now;
      return {
        ...b.toObject(),
        currentBalance: balance,
        progress: Math.max(progress, 0),
        isAchieved,
        isExpired,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/budgets — create budget goal
router.post('/', async (req, res) => {
  try {
    const { name, targetAmount, deadline } = req.body;
    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ success: false, message: 'name, targetAmount, and deadline are required' });
    }
    const budget = await Budget.create({
      user: req.user._id,
      name,
      targetAmount: parseFloat(targetAmount),
      deadline: new Date(deadline),
    });
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/budgets/:id — update budget goal
router.put('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, data: budget });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/budgets/:id — delete budget
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

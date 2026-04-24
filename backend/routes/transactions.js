// routes/transactions.js — CRUD for transactions
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// GET /api/transactions/summary — totals for dashboard (MUST be before /:id)
router.get('/summary', async (req, res) => {
  try {
    console.log(`📊 Fetching summary for user: ${req.user._id}`);
    const transactions = await Transaction.find({ user: req.user._id });
    console.log(`📊 Found ${transactions.length} transactions`);

    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;
    console.log(`✅ Summary: Income=${totalIncome}, Expense=${totalExpense}, Balance=${balance}`);
    res.json({ success: true, data: { totalIncome, totalExpense, balance } });
  } catch (err) {
    console.error('❌ Summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions/by-category — category breakdown for analytics (MUST be before /:id)
router.get('/by-category', async (req, res) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: { category: '$category', type: '$type' }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions — get all transactions (optional ?category= filter) (defined last for generic matching)
router.get('/', async (req, res) => {
  try {
    console.log(`📝 Fetching transactions for user: ${req.user._id}`);
    const filter = { user: req.user._id };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.type) filter.type = req.query.type;

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    console.log(`📝 Found ${transactions.length} transactions with filter:`, filter);
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (err) {
    console.error('❌ Transactions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions — add transaction
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    if (!type || !amount || !category) {
      return res.status(400).json({ success: false, message: 'type, amount, and category are required' });
    }
    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/transactions/:id — edit transaction
router.put('/:id', async (req, res) => {
  try {
    let transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    const { type, amount, category, description, date } = req.body;
    transaction.type = type || transaction.type;
    transaction.amount = amount ? parseFloat(amount) : transaction.amount;
    transaction.category = category || transaction.category;
    transaction.description = description !== undefined ? description : transaction.description;
    transaction.date = date ? new Date(date) : transaction.date;
    await transaction.save();
    res.json({ success: true, data: transaction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/transactions/:id — delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

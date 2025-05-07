const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Collection = require('../models/Collection');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware'); // Add this

router.get('/dashboard', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Get both today's bills and all unpaid bills
    const billsDueToday = await Bill.find({ 
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { status: { $in: ['Unpaid', 'Partially Paid'] } }
      ]
    });

    const collectionsToday = await Collection.find({ 
      collectedOn: { $gte: startOfDay, $lte: endOfDay } 
    }).populate('bill');

    let totalBillAmount = 0;
    let totalPaidAmount = 0;
    let totalRemainingAmount = 0;

    collectionsToday.forEach((collection) => {
      totalPaidAmount += collection.amountCollected;
    });

    billsDueToday.forEach((bill) => {
      totalBillAmount += bill.amount;
      totalRemainingAmount += bill.dueAmount;
    });

    const totalStaff = await User.countDocuments({ role: 'staff' });

    const recentCollections = await Collection.find()
      .sort({ collectedOn: -1 })
      .limit(5)
      .populate('bill collectedBy');

    res.json({
      success: true,
      totalBillAmount,
      totalPaidAmount,
      totalRemainingAmount,
      totalStaff,
      recentCollections,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard data',
      error: err.message 
    });
  }
});

module.exports = router;
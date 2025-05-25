const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Collection = require('../models/Collection');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const moment = require('moment');

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

    // Get collection trends
    const collectionTrends = {
      daily: await getDailyCollectionTrends(),
      weekly: await getWeeklyCollectionTrends(),
      monthly: await getMonthlyCollectionTrends()
    };

    // Get DSR-wise collection data
    const dsrCollections = await getDSRCollections();
    const outstandingDSRs = await getOutstandingDSRs();

    res.json({
      success: true,
      totalBillAmount,
      totalPaidAmount,
      totalRemainingAmount,
      totalStaff,
      recentCollections,
      collectionTrends,
      dsrCollections,
      outstandingDSRs
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

// Helper functions for collection trends
async function getDailyCollectionTrends() {
  const hours = [8, 10, 12, 14, 16, 18]; // 8AM to 6PM in 2-hour intervals
  const today = moment().startOf('day');
  const labels = [];
  const data = [];

  for (const hour of hours) {
    const start = moment(today).add(hour, 'hours');
    const end = moment(start).add(2, 'hours');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: start.toDate(),
        $lt: end.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(start.format('hA'));
    data.push(total);
  }

  return { labels, data };
}

async function getWeeklyCollectionTrends() {
  const labels = [];
  const data = [];
  const days = 7;

  // Start from beginning of current week (Sunday)
  const weekStart = moment().startOf('week');
  
  for (let i = 0; i < days; i++) {
    const day = moment(weekStart).add(i, 'days');
    const start = day.startOf('day');
    const end = day.endOf('day');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(day.format('ddd'));
    data.push(total);
  }

  return { labels, data };
}

async function getMonthlyCollectionTrends() {
  const labels = [];
  const data = [];
  const weeks = 4;

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = moment().subtract(i, 'weeks').startOf('week');
    const weekEnd = moment(weekStart).endOf('week');
    
    const collections = await Collection.find({
      collectedOn: {
        $gte: weekStart.toDate(),
        $lte: weekEnd.toDate()
      }
    });

    const total = collections.reduce((sum, collection) => sum + collection.amountCollected, 0);
    
    labels.push(`Week ${weeks - i}`);
    data.push(total);
  }

  return { labels, data };
}

// Get DSR-wise collection data
async function getDSRCollections() {
  const dsrs = await User.find({ role: 'staff' }).select('name');
  
  const result = await Collection.aggregate([
    {
      $match: {
        collectedOn: {
          $gte: moment().startOf('month').toDate(),
          $lte: moment().endOf('month').toDate()
        }
      }
    },
    {
      $group: {
        _id: '$collectedBy',
        totalCollection: { $sum: '$amountCollected' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'dsr'
      }
    },
    {
      $unwind: '$dsr'
    },
    {
      $project: {
        dsrName: '$dsr.name',
        totalCollection: 1,
        count: 1
      }
    },
    {
      $sort: { totalCollection: -1 }
    }
  ]);

  return result;
}

// Get outstanding DSRs (top performers)
async function getOutstandingDSRs() {
  const result = await Collection.aggregate([
    {
      $group: {
        _id: '$collectedBy',
        totalCollection: { $sum: '$amountCollected' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'dsr'
      }
    },
    {
      $unwind: '$dsr'
    },
    {
      $project: {
        dsrName: '$dsr.name',
        totalCollection: 1,
        count: 1
      }
    },
    {
      $sort: { totalCollection: -1 }
    },
    {
      $limit: 5
    }
  ]);

  return result;
}

module.exports = router;
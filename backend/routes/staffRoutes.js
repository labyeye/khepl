const express = require("express");
const router = express.Router();
const { protect, staffOnly } = require("../middleware/authMiddleware");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");


router.get("/dashboard", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all bills assigned to this staff member
    const allBills = await Bill.find({ assignedTo: req.user._id });

    // Calculate totals from all bills
    const totalBillAmount = allBills.reduce(
      (sum, bill) => sum + (bill.amount || 0), 
      0
    );

    // Get today's collections
    const todayCollections = await Collection.find({
      collectedOn: { $gte: today, $lt: tomorrow },
      collectedBy: req.user._id
    }).populate("bill", "billNumber retailer amount");

    const totalCollectedToday = todayCollections.reduce(
      (sum, c) => sum + (c.amountCollected || 0), 
      0
    );

    // Get bills with due amount
    const billsWithDue = allBills.filter(bill => 
      (bill.dueAmount || bill.amount) > 0
    );

    // Get completed bills (paid in full)
    const completedBills = allBills.filter(bill => 
      (bill.dueAmount || 0) <= 0
    );

    // Get overdue bills
    const overdueBillsCount = await Bill.countDocuments({
      assignedTo: req.user._id,
      dueDate: { $lt: today },
      dueAmount: { $gt: 0 }
    });

    // Format collections for response
    const formattedCollections = todayCollections.map(c => ({
      billNumber: c.bill?.billNumber || "Unknown",
      retailer: c.bill?.retailer || "Unknown",
      amount: c.amountCollected,
      date: c.collectedOn,
      status: "Completed"
    }));

    res.json({
      staffName: req.user.name,
      totalBillAmount,
      totalCollectedToday,
      totalBillsWithDue: billsWithDue.length,
      totalCompletedBills: completedBills.length,
      overdueBillsCount,
      collectionsToday: formattedCollections,
      recentCollections: formattedCollections.slice(0, 5)
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
router.get("/bills-history", protect, staffOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { assignedTo: req.user._id };

    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate("assignedTo")
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Bill.countDocuments(filter);

    res.json({
      bills,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalBills: count,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching bills history", error: err.message });
  }
});


router.put("/mark-paid/:id", protect, staffOnly, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.assignedTo.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this bill" });
    }

    bill.status = "Paid";
    bill.paymentDate = new Date();
    await bill.save();

    res.json({ message: "Bill marked as paid", bill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update bill status", error: err.message });
  }
});

module.exports = router;
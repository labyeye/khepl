const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      trim: true,
      uppercase: true
    },
    retailer: {
      type: String,
      required: [true, "Retailer name is required"],
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
      set: v => parseFloat(v.toFixed(2))
    },
    dueAmount: {
      type: Number,
      required: [true, "Due amount is required"],
      min: [0, "Due amount cannot be negative"],
      set: v => parseFloat(v.toFixed(2)),
      validate: {
        validator: function(value) {
          return value <= this.amount;
        },
        message: 'Due amount cannot exceed total bill amount'
      }
    },
    collectionDay: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: [true, "Collection day is required"]
    },
    outstandingDays: {
      type: Number,
      min: 0,
      default: 0
    },
    billDate: {
      type: Date,
      required: [true, "Bill date is required"]
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Partially Paid"],
      default: "Unpaid"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    assignedToName: {
      type: String,
      trim: true
    },
    assignedDate: {
      type: Date
    },
    collections: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection'
    }],
    paymentDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Cheque", "Bank Transfer", "UPI", "Other"]
    },
    notes: {
      type: String,
      trim: true
    },
    history: [{
      action: String,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changedAt: { type: Date, default: Date.now },
      changes: Object
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add virtuals and methods as before...

// Virtual for total collected amount
BillSchema.virtual('collectedAmount').get(function() {
  return this.amount - this.dueAmount;
});

// Virtual for checking if bill is overdue
BillSchema.virtual('isOverdue').get(function() {
  return this.status !== "Paid" && new Date() > this.dueDate;
});

// Pre-save hook to maintain data consistency
BillSchema.pre("save", function (next) {
  // Ensure dueAmount doesn't exceed amount
  if (this.dueAmount > this.amount) {
    this.dueAmount = this.amount;
  }

  // Auto-update status based on payments
  if (this.isModified('dueAmount')) {
    if (this.dueAmount <= 0) {
      this.status = "Paid";
      this.paymentDate = this.paymentDate || new Date();
    } else if (this.dueAmount < this.amount) {
      this.status = "Partially Paid";
    } else {
      this.status = "Unpaid";
    }
  }

  // Set assigned date when assigning staff
  if (this.isModified("assignedTo") && this.assignedTo) {
    this.assignedDate = new Date();
  }

  next();
});

// Method to calculate remaining amount (more accurate version)
BillSchema.methods.calculateRemainingAmount = async function() {
  await this.populate('collections');
  const totalCollected = this.collections.reduce(
    (sum, collection) => sum + collection.amountCollected, 0
  );
  return Math.max(0, this.amount - totalCollected);
};

// Method to update payment status
BillSchema.methods.updatePaymentStatus = async function() {
  const remainingAmount = await this.calculateRemainingAmount();
  
  if (remainingAmount <= 0) {
    this.status = "Paid";
    this.paymentDate = new Date();
  } else if (remainingAmount < this.amount) {
    this.status = "Partially Paid";
  } else {
    this.status = "Unpaid";
  }
  
  this.dueAmount = remainingAmount;
  return this.save();
};

// Indexes
BillSchema.index({ dueDate: 1 });
BillSchema.index({ billNumber: 1 }, { unique: true });
BillSchema.index({ retailer: 1 });
BillSchema.index({ status: 1 });
BillSchema.index({ assignedTo: 1 });
BillSchema.index({ assignedDate: 1 });
BillSchema.index({ paymentDate: 1 });

module.exports = mongoose.model("Bill", BillSchema);
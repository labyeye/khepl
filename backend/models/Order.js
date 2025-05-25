// models/Order.js
const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  scheme: {
    type: Number,
    default: 0
  },
  otherScheme: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"]
  },
  netPrice: {
    type: Number,
    required: true
  },
  totalLitres: {
    type: Number,
    required: true
  },
  totalSale: {
    type: Number,
    required: true
  },
  remarks: {
    type: String,
    trim: true
  }
});

const OrderSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Retailer",
    required: true
  },
  retailerName: {
    type: String,
    required: true
  },
  items: [OrderItemSchema],
  totalOrderValue: {
    type: Number,
    required: true
  },
  totalLitres: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Cancelled"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
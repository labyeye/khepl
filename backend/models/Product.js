// models/Product.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "Product code is required"],
    trim: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true
  },
  mrp: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  weight: {
    type: Number,
    required: [true, "Weight is required"],
    min: [0, "Weight cannot be negative"]
  },
  scheme: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: [true, "Stock quantity is required"],
    min: [0, "Stock cannot be negative"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  company: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
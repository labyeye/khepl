// models/Retailer.js
const mongoose = require("mongoose");

const RetailerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Retailer name is required"],
    trim: true,
    index: true
  },
  address1: {
    type: String,
    required: [true, "Address line 1 is required"],
    trim: true
  },
  address2: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dayAssigned: {  // Add this field
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    trim: true
  },
}, { timestamps: true });

module.exports = mongoose.model("Retailer", RetailerSchema);
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const Retailer = require("../models/Retailer"); // Add this import
const ExcelJS = require("exceljs");
router.get("/export/excel", protect, adminOnly, async (req, res) => {
  try {
    // Get the same filtered orders as the regular GET endpoint
    const { startDate, endDate, retailerId, status } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (retailerId) {
      filter.retailer = retailerId;
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("retailer", "name address1")
      .sort({ createdAt: -1 });

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Add headers with your requested columns
    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 15 },
      { header: "Retailer Name - Address", key: "retailer", width: 40 },
      { header: "Code", key: "code", width: 15 },
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Price", key: "price", width: 12 },
      { header: "Qty", key: "quantity", width: 10 },
      { header: "Scheme", key: "scheme", width: 12 },
      { header: "Other Scheme", key: "otherScheme", width: 12 },
      { header: "Total Scheme", key: "totalScheme", width: 12 },
      { header: "Net Price", key: "netPrice", width: 12 },
      { header: "Total Litre", key: "totalLitre", width: 12 },
      { header: "Total Sale", key: "totalSale", width: 12 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Created By", key: "createdBy", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Style for headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { wrapText: true };

    // Add data rows
    orders.forEach((order) => {
      // For each item in the order, add a row
      order.items.forEach((item) => {
        const totalScheme = item.scheme + item.otherScheme;

        worksheet.addRow({
          orderId: order._id.toString().slice(-6), // Show only last 6 chars
          retailer: `${order.retailerName} - ${order.retailer?.address1 || ""}`,
          code: item.code,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          scheme: item.scheme,
          otherScheme: item.otherScheme,
          totalScheme: totalScheme,
          netPrice: item.netPrice,
          totalLitre: item.totalLitres,
          totalSale: item.totalSale,
          createdAt: order.createdAt.toLocaleString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          createdBy: order.createdByName,
          status: order.status,
        });
      });

      // Add empty row between orders if you want separation
      // worksheet.addRow([]);
    });

    // Format currency columns
    const currencyColumns = [
      "price",
      "scheme",
      "otherScheme",
      "totalScheme",
      "netPrice",
      "totalSale",
    ];
    currencyColumns.forEach((col) => {
      worksheet.getColumn(col).numFmt = "₹#,##0.00";
    });

    // Format date column
    worksheet.getColumn("createdAt").alignment = { horizontal: "left" };

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders_export_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Failed to generate Excel export" });
  }
});router.post("/", protect, async (req, res) => {
  try {
    const { retailerId, items } = req.body;

    // Validate retailer
    const retailer = await Retailer.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Process each item and update product stock
    const orderItems = [];
    let totalOrderValue = 0;
    let totalLitres = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${product.name}. Available: ${product.stock}`,
        });
      }

      // Calculate values using product.price and product.scheme
      const totalScheme = product.scheme + (item.otherScheme || 0);
      const netPrice = (item.quantity * product.price) - (item.quantity * totalScheme);
      const totalSale = netPrice;
      const totalItemLitres = item.quantity * product.weight;

      orderItems.push({
        product: product._id,
        code: product.code,
        name: product.name,
        price: product.price,
        weight: product.weight,
        scheme: product.scheme,
        otherScheme: item.otherScheme || 0,
        quantity: item.quantity,
        netPrice,
        totalLitres: totalItemLitres,
        totalSale,
        remarks: item.remarks || "",
      });

      // Update totals
      totalOrderValue += totalSale;
      totalLitres += totalItemLitres;

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Create order
    const order = new Order({
      retailer: retailer._id,
      retailerName: retailer.name,
      items: orderItems,
      totalOrderValue,
      totalLitres,
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all orders (admin)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, retailerId, status } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (retailerId) {
      filter.retailer = retailerId;
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("retailer", "name address1")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get orders for staff
router.get("/staff", protect, async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user._id })
      .populate("retailer", "name address1")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
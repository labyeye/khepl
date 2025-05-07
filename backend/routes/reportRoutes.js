const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const exceljs = require("exceljs");
const PDFDocument = require("pdfkit");
const { format } = require("date-fns");
// Update the getFilteredPaymentDetails function:
const getFilteredPaymentDetails = (paymentMode, paymentDetails) => {
  if (!paymentDetails) {
    return paymentMode === "cash" ? { receiptNumber: "Money Received" } : null;
  }

  const modeSpecificDetails = {
    upi: ["upiId", "transactionId"],
    cash: ["receiptNumber"],
    cheque: ["chequeNumber", "bankName"],
    bank_transfer: ["transactionId", "bankName"],
  };

  const relevantKeys = modeSpecificDetails[paymentMode] || [];
  const filteredDetails = {};

  relevantKeys.forEach((key) => {
    if (paymentDetails[key] && paymentDetails[key] !== "undefined") {
      filteredDetails[key] = paymentDetails[key];
    }
  });

  return Object.keys(filteredDetails).length > 0 ? filteredDetails : null;
};


function endOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
function startOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

router.get(
  "/export/today-collections/excel",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const cleanPaymentDetails = (paymentDetails) => {
        if (!paymentDetails) return {};

        const cleaned = {};
        Object.entries(paymentDetails).forEach(([key, value]) => {
          if (value && value !== "undefined" && value !== "null") {
            cleaned[key] = value;
          }
        });
        return cleaned;
      };
      const collections = await Collection.find({
        collectedOn: {
          $gte: today,
          $lt: tomorrow,
        },
      })
        .populate({
          path: "bill",
          select:
            "billNumber retailer amount dueAmount status billDate assignedTo",
          populate: {
            path: "assignedTo",
            select: "name",
          },
        })
        .populate("collectedBy", "name");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Today's Collections");

      worksheet.columns = [
        { header: "Retailer", key: "retailer", width: 25 },
        { header: "Bill Number", key: "billNumber", width: 15 },
        { header: "Bill Date", key: "billDate", width: 15 },
        { header: "Collection Amount", key: "collectionAmount", width: 20 },
        { header: "Due Amount", key: "dueAmount", width: 15 },
        { header: "Payment Mode", key: "paymentMode", width: 15 },
        { header: "Payment Date", key: "paymentDate", width: 15 },
        { header: "Collected By", key: "collectedBy", width: 20 },
        { header: "Cheque No", key: "chequeNumber", width: 15 },
        { header: "Bank Name", key: "bankName", width: 20 },
        { header: "UPI ID", key: "upiId", width: 25 },
        { header: "Transaction ID", key: "transactionId", width: 25 },
        { header: "Receipt No", key: "receiptNumber", width: 15 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F81BD" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });


      collections.forEach((collection) => {
        const paymentDetails = collection.paymentDetails || {};
        
        worksheet.addRow({
          retailer: collection.bill?.retailer || "N/A",
          billNumber: collection.bill?.billNumber || "N/A",
          billDate: collection.bill?.billDate
            ? format(new Date(collection.bill.billDate), "dd/MM/yyyy")
            : "N/A",
          collectionAmount: collection.amountCollected,
          dueAmount: collection.bill?.dueAmount || 0,
          paymentMode: collection.paymentMode,
          paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
          collectedBy: collection.collectedBy?.name || "System",
          chequeNumber: paymentDetails.chequeNumber || "",
          bankName: paymentDetails.bankName || "",
          upiId: paymentDetails.upiId || "",
          transactionId: paymentDetails.transactionId || paymentDetails.upiTransactionId || "",
          receiptNumber: collection.paymentMode === "cash" 
      ? (paymentDetails.receiptNumber || "Money Received")
      : ""
        });
      });

      [4, 5, 8].forEach((colNum) => {
        worksheet.columns[colNum].numFmt = "#,##0.00";
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(
          Math.max(maxLength + 2, column.header.length + 2),
          50
        );
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=today_collections_${format(
          new Date(),
          "yyyyMMdd"
        )}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Excel export error:", err);
      res.status(500).json({
        message: "Failed to export today's collections",
        error: err.message,
      });
    }
  }
);
// Add a new route for today's collections
router.get("/today-collections", protect, adminOnly, async (req, res) => {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // First find collections for today
    const todayCollections = await Collection.find({
      collectedOn: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }).populate("collectedBy", "name");

    // Then find bills associated with these collections
    const billIds = todayCollections.map((c) => c.bill);
    const reports = await Bill.find({
      _id: { $in: billIds },
    })
      .populate("assignedTo", "name")
      .sort({ billDate: -1 });

    // Combine the data
    const formattedReports = reports.map((report) => {
      const billCollections = todayCollections.filter(
        (c) => c.bill.toString() === report._id.toString()
      );

      return {
        _id: report._id,
        retailer: report.retailer,
        billNumber: report.billNumber,
        billDate: report.billDate,
        dueAmount: report.dueAmount,
        collections: billCollections.map((collection) => ({
          _id: collection._id,
          amountCollected: collection.amountCollected,
          paymentMode: collection.paymentMode,
          paymentDate: collection.collectedOn,
          paymentDetails: collection.paymentDetails,
          collectedByName: collection.collectedBy?.name || "System",
        })),
      };
    });

    res.json(formattedReports);
  } catch (err) {
    console.error("Today collections error:", err);
    res.status(500).json({
      message: "Error fetching today's collections",
      error: err.message,
    });
  }
});
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const formattedReports = reports.map((report) => ({
      _id: report._id,
      retailer: report.retailer,
      billNumber: report.billNumber,
      billDate: report.billDate,
      collections: report.collections.map((collection) => ({
        _id: collection._id,
        amountCollected: collection.amountCollected,
        paymentMode: collection.paymentMode,
        paymentDate: collection.collectedOn,
        paymentDetails: collection.paymentDetails,
        collectedByName: collection.collectedBy?.name || "System",
      })),
      dueAmount: report.dueAmount,
    }));

    res.json(formattedReports);
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({
      message: "Error generating report",
      error: err.message,
    });
  }
});

// Export to Excel
router.get("/export/excel", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Collections Report");

    // Add headers
    worksheet.columns = [
      { header: "Retailer", key: "retailer", width: 25 },
      { header: "Bill Number", key: "billNumber", width: 15 },
      { header: "Bill Date", key: "billDate", width: 15 },
      { header: "Collection Amount", key: "collectionAmount", width: 20 },
      { header: "Due Amount", key: "dueAmount", width: 15 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Payment Details", key: "paymentDetails", width: 30 },
    ];

    // Add data
    reports.forEach((report) => {
      if (report.collections.length > 0) {
        report.collections.forEach((collection) => {
          let paymentDetails = "";
          if (collection.paymentDetails) {
            paymentDetails = Object.entries(collection.paymentDetails)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n");
          }

          worksheet.addRow({
            retailer: report.retailer,
            billNumber: report.billNumber,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            collectionAmount: collection.amountCollected,
            dueAmount: report.dueAmount,
            paymentMode: collection.paymentMode,
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails: getFilteredPaymentDetails(
              collection.paymentMode,
              collection.paymentDetails
            ),
          });
        });
      } else {
        worksheet.addRow({
          retailer: report.retailer,
          billNumber: report.billNumber,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          collectionAmount: collection.amountCollected,
          dueAmount: report.dueAmount,
          paymentMode: collection.paymentMode,
          paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
          collectedBy: collection.collectedBy?.name || "System",
          paymentDetails: getFilteredPaymentDetails(
            collection.paymentMode,
            collection.paymentDetails
          ),
        });
      }
    });

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=collections_report.xlsx"
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      message: "Error exporting to Excel",
      error: err.message,
    });
  }
});
// In reportRoutes.js - modify the Excel export route
router.get("/export/excel", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Collections Report");

    // Add headers with styling
    worksheet.columns = [
      { header: "Bill Number", key: "billNumber", width: 20 },
      { header: "Retailer", key: "retailer", width: 30 },
      { header: "Bill Date", key: "billDate", width: 15 },
      {
        header: "Bill Amount",
        key: "amount",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      {
        header: "Due Amount",
        key: "dueAmount",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
      {
        header: "Collection Amount",
        key: "collectionAmount",
        width: 20,
        style: { numFmt: "#,##0.00" },
      },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Payment Details", key: "paymentDetails", width: 40 },
    ];

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F81BD" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add data rows
    reports.forEach((report) => {
      if (report.collections.length > 0) {
        report.collections.forEach((collection) => {
          let paymentDetails = "";
          if (collection.paymentDetails) {
            paymentDetails = Object.entries(collection.paymentDetails)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
          }

          worksheet.addRow({
            retailer: report.retailer,
            billNumber: report.billNumber,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            collectionAmount: collection.amountCollected,
            dueAmount: report.dueAmount,
            paymentMode: collection.paymentMode,
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails,
          });
        });
      } else {
        worksheet.addRow({
          retailer: report.retailer,
          billNumber: report.billNumber,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          dueAmount: report.dueAmount,
          collectionAmount: 0,
          paymentMode: "N/A",
          paymentDate: "N/A",
          collectedBy: "N/A",
          paymentDetails: "No collections",
        });
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=collections_report_${format(
        new Date(),
        "yyyyMMdd_HHmmss"
      )}.xlsx`
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      message: "Error exporting to Excel",
      error: err.message,
    });
  }
});

module.exports = router;

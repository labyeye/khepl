const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");

const {
  protect,
  adminOnly,
  staffOnly,
} = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      billNumber,
      retailer,
      amount,
      dueAmount,
      dueDate,
      billDate,
      status,
      collectionDay,
    } = req.body;

    const newBill = new Bill({
      billNumber,
      retailer,
      amount,
      dueAmount: dueAmount || amount,
      dueDate,
      billDate,
      collectionDay,
      status: status || "Unpaid",
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(500).json({ message: "Failed to add bill", error: err.message });
  }
});
router.post("/collections", protect, async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      collectedBy: req.user._id,
    };

    const newCollection = new Collection(collectionData);
    await newCollection.save();

    res.status(201).json(newCollection);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create collection", error: err.message });
  }
});
router.put("/:billId/assign", protect, adminOnly, async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }

    const bill = await Bill.findByIdAndUpdate(
      req.params.billId,
      {
        assignedTo: staffId,
        assignedDate: new Date(),
      },
      { new: true }
    ).populate("assignedTo", "name");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({
      _id: bill._id,
      billNumber: bill.billNumber,
      retailer: bill.retailer,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status,
      assignedTo: bill.assignedTo?._id || null,
      assignedToName: bill.assignedTo?.name || null,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to assign bill", error: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.assignedTo = req.user._id;
    }

    const bills = await Bill.find(query)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        select: "amountCollected paymentDate paymentMode",
      })
      .sort({ dueDate: 1 })
      .lean();

    const processedBills = bills.map((bill) => {
      const collectedAmount =
        bill.collections.reduce(
          (sum, collection) => sum + (collection.amountCollected || 0),
          0
        ) || 0;

      const dueAmount = Math.max(0, bill.amount - collectedAmount);

      let status = bill.status;
      if (collectedAmount >= bill.amount) {
        status = "Paid";
      } else if (collectedAmount > 0) {
        status = "Partially Paid";
      }

      return {
        ...bill,
        amountCollected: collectedAmount,
        dueAmount,
        status,
        assignedTo: bill.assignedTo?._id || null,
        assignedToName: bill.assignedTo?.name || null,
      };
    });

    res.json(processedBills);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: err.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const { status, dueAmount } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (dueAmount !== undefined && dueAmount < 0) {
      return res.status(400).json({ message: "Due amount cannot be negative" });
    }
    if (status !== undefined) bill.status = status;
    if (dueAmount !== undefined) bill.dueAmount = dueAmount;

    await bill.save();

    res.json(bill);
  } catch (err) {
    res.status(500).json({
      message: "Failed to update bill",
      error: err.message,
    });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Collection.deleteMany({ bill: req.params.id });
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete bill", error: err.message });
  }
});
router.post(
  "/import",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const { PassThrough } = require("stream");
    const progressStream = new PassThrough();
    const errors = [];
    const importedBills = [];
    const staffMap = new Map();
    let processedRows = 0;
    let totalRows = 0;

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Day abbreviations mapping
      const dayAbbreviations = {
        MON: "Monday",
        TUE: "Tuesday",
        WED: "Wednesday",
        THU: "Thursday",
        FRI: "Friday",
        SAT: "Saturday",
        SUN: "Sunday",
      };

      // Read file with cellDates option to properly handle Excel dates
      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      });

      // Validate we have data
      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      totalRows = jsonData.length;

      try {
        const User = require("../models/User");
        const staffMembers = await User.find({ role: "staff" }).lean();
        staffMembers.forEach((staff) => {
          staffMap.set(staff.name.toUpperCase(), staff._id);
        });
      } catch (err) {
        console.warn("Could not load staff members:", err.message);
      }

      // Track processed bills by bill number AND customer name
      const processedBills = {};

      // Set headers for streaming response
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");

      for (const [index, row] of jsonData.entries()) {
        try {
          // Skip header row if present
          if (
            index === 0 &&
            (row.CustName === "CustName" || row.BillNo === "BillNo")
          ) {
            continue;
          }

          // Get values with case-insensitive field names
          const getValue = (obj, possibleNames) => {
            const key = Object.keys(obj).find((k) =>
              possibleNames.some(
                (name) => k.toLowerCase() === name.toLowerCase()
              )
            );
            return key ? obj[key] : null;
          };

          const custName = getValue(row, ["custname", "customer", "retailer"]);
          const billNo = getValue(row, ["billno", "billnumber", "bill no"]);
          const billDateValue = getValue(row, ["billdate", "date"]);
          const billAmt = getValue(row, ["billamt", "amount"]);
          const billRec = getValue(row, ["billrec", "received amount"]);
          const billBalance = getValue(row, ["billbalance", "balance"]);
          const staffName = getValue(row, ["staff name", "staff"]);
          const collectionDayInput = getValue(row, ["day", "collectionday"]);

          // Skip if this is a header row or empty row
          if (!custName && !billNo && !billAmt) {
            continue;
          }

          // Validate required fields
          if (!custName || !billNo || !billAmt || !billDateValue) {
            errors.push(`Row ${index + 2}: Missing required fields`);
            continue;
          }

          // Process collection day (accept both full names and abbreviations)
          let collectionDay = "Sunday"; // Default to Sunday if empty

          if (collectionDayInput) {
            if (dayAbbreviations[collectionDayInput?.toUpperCase()]) {
              collectionDay =
                dayAbbreviations[collectionDayInput.toUpperCase()];
            } else if (
              [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].includes(collectionDayInput)
            ) {
              collectionDay = collectionDayInput;
            } else {
              errors.push(
                `Row ${
                  index + 2
                }: Invalid collection day format "${collectionDayInput}" - defaulting to Sunday`
              );
            }
          }

          // Check for duplicate bill number AND customer name in this import
          const billKey = `${billNo}_${custName}`.toUpperCase();
          if (processedBills[billKey]) {
            errors.push(
              `Row ${
                index + 2
              }: Duplicate bill ${billNo} for customer ${custName} in this file`
            );
            continue;
          }
          processedBills[billKey] = true;

          // Parse date - handle Excel date objects and strings
          let billDate;
          if (billDateValue instanceof Date) {
            billDate = billDateValue;
          } else if (typeof billDateValue === "number") {
            // Handle Excel serial dates
            billDate = new Date((billDateValue - (25567 + 1)) * 86400 * 1000);
          } else {
            // Try parsing as string
            billDate = new Date(billDateValue);
            if (isNaN(billDate.getTime())) {
              // Try alternative date formats if the first attempt fails
              billDate = new Date(
                billDateValue.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")
              );
            }
          }

          if (isNaN(billDate.getTime())) {
            errors.push(
              `Row ${index + 2}: Invalid date format for ${billDateValue}`
            );
            continue;
          }

          // Parse amounts
          const amount = parseFloat(String(billAmt).replace(/,/g, "")) || 0;
          const received = parseFloat(String(billRec).replace(/,/g, "")) || 0;
          const balance =
            parseFloat(String(billBalance).replace(/,/g, "")) ||
            amount - received;

          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${index + 2}: Invalid amount`);
            continue;
          }

          // Determine status
          let status = "Unpaid";
          if (balance <= 0) {
            status = "Paid";
          } else if (received > 0) {
            status = "Partially Paid";
          }

          // Create bill data object
          const billData = {
            billNumber: billNo,
            retailer: custName,
            amount: amount,
            dueAmount: balance,
            billDate: billDate,
            collectionDay: collectionDay,
            status: status,
            assignedTo: staffName
              ? staffMap.get(staffName.toUpperCase())
              : null,
          };

          try {
            // Check if bill already exists in database
            const existingBill = await Bill.findOne({
              billNumber: billNo,
              retailer: custName,
            });

            if (existingBill) {
              errors.push(
                `Row ${
                  index + 2
                }: Bill number ${billNo} for customer ${custName} already exists in database`
              );
              continue;
            }

            // Create and save new bill
            const newBill = new Bill(billData);
            await newBill.save();
            importedBills.push(newBill);
          } catch (saveError) {
            errors.push(`Row ${index + 2}: ${saveError.message}`);
          }

          processedRows++;
          res.write(
            JSON.stringify({
              type: "progress",
              current: processedRows,
              total: totalRows,
            }) + "\n"
          );
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      // Send final result
      const finalResult = {
        type: "result",
        importedCount: importedBills.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      };
      res.write(JSON.stringify(finalResult) + "\n");

      // Clean up uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (error) {
      console.error("Import error:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.write(
        JSON.stringify({
          type: "error",
          message: "Failed to import bills",
          error: error.message,
        }) + "\n"
      );
    } finally {
      res.end();
    }
  }
);
router.get("/assigned-customers", protect, staffOnly, async (req, res) => {
  try {
    const bills = await Bill.find({ assignedTo: req.user._id }).distinct(
      "retailer"
    );
    res.json(bills);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch assigned customers",
      error: err.message,
    });
  }
});

router.get("/by-collection-day/:day", protect, async (req, res) => {
  try {
    const bills = await Bill.find({
      collectionDay: req.params.day,
      assignedTo: req.user._id,
      status: { $ne: "Paid" },
    })
      .populate("collections")
      .lean();

    res.json(bills);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: err.message });
  }
});
router.get("/bills-assigned-today", protect, staffOnly, async (req, res) => {
  try {
    const query = {
      assignedTo: req.user._id,
      status: { $ne: "Paid" },
    };

    // Only add collectionDay filter if specific day is requested
    if (req.query.collectionDay && req.query.collectionDay !== "All") {
      query.collectionDay = req.query.collectionDay;
    }

    const bills = await Bill.find(query).populate("assignedTo", "name").lean();

    res.json(bills);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching bills assigned today",
      error: err.message,
    });
  }
});

module.exports = router;

// routes/retailerRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const Retailer = require("../models/Retailer");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const User = require("../models/User");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, address1, address2, assignedTo, dayAssigned } = req.body;
    console.log("Creating retailer:", { name, address1, assignedTo });

    const retailer = new Retailer({
      name,
      address1,
      address2,
      assignedTo,
      dayAssigned,
      createdBy: req.user._id,
    });

    await retailer.save();
    console.log("Retailer saved:", retailer);
    res.status(201).json(retailer);
  } catch (err) {
    console.error("Error saving retailer:", err);
    res.status(400).json({ message: err.message });
  }
});
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, address1, address2, assignedTo, dayAssigned } = req.body;
    console.log("Creating retailer:", { name, address1, assignedTo }); // Debug log

    const retailer = new Retailer({
      name,
      address1,
      address2,
      assignedTo,
      dayAssigned,
      createdBy: req.user._id,
    });

    await retailer.save();
    console.log("Retailer saved:", retailer);
    res.status(201).json(retailer);
  } catch (err) {
    console.error("Error saving retailer:", err);
    res.status(400).json({ message: err.message });
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
    const importedRetailers = [];
    let processedRows = 0;
    let totalRows = 0;
    const cleanup = () => {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };

    try {
      if (!req.file) {
        cleanup();
        return res.status(400).json({ message: "No file uploaded" });
      }
      const dayAbbreviations = {
        MON: "Monday",
        TUE: "Tuesday",
        WED: "Wednesday",
        THU: "Thursday",
        FRI: "Friday",
        SAT: "Saturday",
        SUN: "Sunday",
      };

      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] || [];
      const lowerHeaders = headers.map((h) => String(h).toLowerCase().trim());

      const nameCol = lowerHeaders.findIndex((h) => h.includes("name"));
      const addr1Col = lowerHeaders.findIndex(
        (h) => h.includes("address 1") || h.includes("address1")
      );
      const addr2Col = lowerHeaders.findIndex(
        (h) => h.includes("address 2") || h.includes("address2")
      );
      const dayAssignedCol = lowerHeaders.findIndex(
        (h) => h.includes("day assigned") || h.includes("dayassigned")
      );
      const assignedToCol = lowerHeaders.findIndex(
        (h) => h.includes("assigned to") || h.includes("assignedto")
      );

      if (nameCol === -1 || addr1Col === -1) {
        return res.status(400).json({ message: "Required columns not found" });
      }

      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");

      totalRows = jsonData.length - 1;

      for (const [index, row] of jsonData.entries()) {
        if (index === 0) continue;

        try {
          if (!row[nameCol] && !row[addr1Col]) continue;
          const name = row[nameCol]?.trim();
          const address1 = row[addr1Col]?.trim();
          const address2 = addr2Col !== -1 ? row[addr2Col]?.trim() : "";
          const dayAssigned =
            dayAssignedCol !== -1 ? row[dayAssignedCol]?.trim() : "";
          let processedDayAssigned = dayAssigned;
          if (dayAbbreviations[dayAssigned?.toUpperCase()]) {
            processedDayAssigned = dayAbbreviations[dayAssigned.toUpperCase()];
          } else if (
            ![
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].includes(dayAssigned)
          ) {
            processedDayAssigned = "";
          }
          let assignedTo = null;
          if (assignedToCol !== -1 && row[assignedToCol]) {
            const assignedToName = row[assignedToCol]?.trim();
            const staff = await User.findOne({
              name: { $regex: new RegExp(assignedToName, "i") },
              role: "staff",
            });
            assignedTo = staff?._id || null;
            if (!staff) {
              errors.push(
                `Row ${index + 1}: Staff member "${assignedToName}" not found`
              );
            }
          }

          if (!name || !address1) {
            errors.push(`Row ${index + 1}: Missing required fields`);
            continue;
          }
          const existingRetailer = await Retailer.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          });
          if (existingRetailer) {
            errors.push(
              `Row ${
                index + 1
              }: Retailer with exact name "${name}" already exists`
            );
            continue;
          }

          // Create and save new retailer
          const retailer = new Retailer({
            name,
            address1,
            address2,
            dayAssigned: processedDayAssigned,
            assignedTo,
            createdBy: req.user._id,
          });

          await retailer.save();
          importedRetailers.push(retailer);

          processedRows++;
          res.write(
            JSON.stringify({
              type: "progress",
              current: processedRows,
              total: totalRows,
            }) + "\n"
          );
        } catch (err) {
          errors.push(`Row ${index + 1}: ${err.message}`);
        }
      }

      // Send final result
      const finalResult = {
        type: "result",
        importedCount: importedRetailers.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      };
      res.write(JSON.stringify(finalResult) + "\n");
    } catch (error) {
      console.error("Import error:", error);
      res.write(
        JSON.stringify({
          type: "error",
          message: "Failed to import retailers",
          error: error.message,
        }) + "\n"
      );
    } finally {
      cleanup();
      try {
        res.end();
      } catch (err) {
        console.error("Error ending response:", err);
      }
    }
  }
);

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, address1, address2, assignedTo, dayAssigned } = req.body;
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    retailer.name = name !== undefined ? name : retailer.name;
    retailer.address1 = address1 !== undefined ? address1 : retailer.address1;
    retailer.address2 = address2 !== undefined ? address2 : retailer.address2;
    retailer.assignedTo =
      assignedTo !== undefined ? assignedTo : retailer.assignedTo;
    retailer.dayAssigned =
      dayAssigned !== undefined ? dayAssigned : retailer.dayAssigned;
    retailer.updatedAt = Date.now();

    await retailer.save();
    res.json(retailer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Add validation for retailer ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid retailer ID" });
    }

    await retailer.deleteOne();
    res.json({ message: "Retailer removed successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      message: "Failed to delete retailer",
      error: err.message,
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const retailers = await Retailer.find({})
      .populate("assignedTo", "name")
      .populate("createdBy", "name")
      .sort({ name: 1 });
    res.json(retailers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { staffId } = req.body;
    const retailer = await Retailer.findByIdAndUpdate(
      req.params.id,
      { assignedTo: staffId },
      { new: true }
    );
    res.json(retailer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const retailers = await Retailer.find({})
      .populate("assignedTo", "name")
      .sort({ name: 1 });

    // Prepare CSV data
    const csvData = [
      ["Name", "Address 1", "Address 2", "Day Assigned", "Assigned To"],
      ...retailers.map((retailer) => [
        retailer.name,
        retailer.address1,
        retailer.address2 || "",
        retailer.dayAssigned || "",
        retailer.assignedTo?.name || "",
      ]),
    ];
    const csvString = csvData.map((row) => row.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=retailers_export.csv"
    );

    // Send the CSV
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;

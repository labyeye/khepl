const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const fs = require("fs");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { code, name, price, weight, scheme, stock, company } = req.body;
    
    const product = new Product({
      code: code.toUpperCase(),
      name,
      price,
      weight,
      scheme,
      stock,
      company
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});// In the /import route, replace the current implementation with:

router.post("/import", protect, adminOnly, upload.single("file"), async (req, res) => {
  const { PassThrough } = require("stream");
  const progressStream = new PassThrough();
  const errors = [];
  const importedProducts = [];
  let processedRows = 0;
  let totalRows = 0;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read the workbook
    const workbook = xlsx.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Get headers
    const headers = jsonData[0] || [];
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    
    // Find column indexes
    const codeCol = lowerHeaders.findIndex(h => h.includes('code'));
    const nameCol = lowerHeaders.findIndex(h => h.includes('product name') || h.includes('name'));
    const mrpCol = lowerHeaders.findIndex(h => h.includes('mrp'));
    const priceCol = lowerHeaders.findIndex(h => h.includes('price'));
    const weightCol = lowerHeaders.findIndex(h => h.includes('weight'));
    const schemeCol = lowerHeaders.findIndex(h => h.includes('scheme'));
    const stockCol = lowerHeaders.findIndex(h => h.includes('stock'));
    const companyCol = lowerHeaders.findIndex(h => h.includes('company') || h.includes('company name'));

    if (codeCol === -1 || nameCol === -1 || priceCol === -1 || weightCol === -1 || stockCol === -1) {
      return res.status(400).json({ message: "Required columns not found" });
    }

    // Set up streaming response
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");

    // Process rows
    totalRows = jsonData.length - 1; // Subtract header row

    for (const [index, row] of jsonData.entries()) {
      if (index === 0) continue; // Skip header row

      try {
        // Skip empty rows
        if (!row[codeCol] && !row[nameCol]) continue;

        const code = row[codeCol]?.toString().trim();
        const name = row[nameCol]?.toString().trim();
        const mrp = parseFloat(row[mrpCol]) || 0;
        const price = parseFloat(row[priceCol]) || 0;
        const weight = parseFloat(row[weightCol]) || 0;
        const scheme = schemeCol !== -1 ? parseFloat(row[schemeCol]) || 0 : 0;
        const stock = parseInt(row[stockCol]) || 0;
        const company = companyCol !== -1 ? row[companyCol]?.toString().trim() : "";

        if (!code || !name || isNaN(price) || isNaN(weight) || isNaN(stock)) {
          errors.push(`Row ${index + 1}: Missing or invalid required fields`);
          continue;
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ code: code.toUpperCase() });
        if (existingProduct) {
          errors.push(`Row ${index + 1}: Product with code ${code} already exists`);
          continue;
        }

        // Create and save new product
        const product = new Product({
          code: code.toUpperCase(),
          name,
          mrp,
          price,
          weight,
          scheme,
          stock,
          company
        });

        await product.save();
        importedProducts.push(product);

        processedRows++;
        res.write(JSON.stringify({
          type: "progress",
          current: processedRows,
          total: totalRows,
        }) + "\n");
      } catch (err) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    }

    // Send final result
    const finalResult = {
      type: "result",
      importedCount: importedProducts.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    };
    res.write(JSON.stringify(finalResult) + "\n");

  } catch (error) {
    console.error("Import error:", error);
    res.write(JSON.stringify({
      type: "error",
      message: "Failed to import products",
      error: error.message,
    }) + "\n");
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.end();
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) {
      filter.company = req.query.company;
    }
    const products = await Product.find(filter).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update product stock
router.patch("/:id/stock", protect, adminOnly, async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Add this route after the existing routes
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    
    // Prepare CSV data
    const csvData = [
      ["Code", "Product Name", "MRP", "Price", "Weight", "Scheme", "Stock", "Company"],
      ...products.map(product => [
        product.code,
        product.name,
        product.mrp || 0,
        product.price,
        product.weight,
        product.scheme || 0,
        product.stock,
        product.company || ""
      ])
    ];
    
    // Convert to CSV string
    const csvString = csvData.map(row => row.join(",")).join("\n");
    
    // Set response headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_export.csv");
    
    // Send the CSV
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
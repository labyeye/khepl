// ProductAdd.js
import React, { useState } from "react";
import axios from "axios";
import * as xlsx from "xlsx";
import styled from "styled-components";
import Layout from "../components/Layout";

const ProductAdd = () => {
  const [manualProduct, setManualProduct] = useState({
    code: "",
    name: "",
    mrp: "",
    price: "",
    weight: "",
    scheme: "",
    stock: "",
    company: "",
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!manualProduct.code) errors.code = "Product code is required";
    if (!manualProduct.name) errors.name = "Product name is required";
    if (!manualProduct.price || isNaN(manualProduct.price))
      errors.price = "Valid price is required";
    if (!manualProduct.weight || isNaN(manualProduct.weight))
      errors.weight = "Valid weight is required";
    if (!manualProduct.stock || isNaN(manualProduct.stock))
      errors.stock = "Valid stock quantity is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://kalahanu-outstanding.onrender.com/api/products",
        {
          ...manualProduct,
          price: parseFloat(manualProduct.price),
          weight: parseFloat(manualProduct.weight),
          scheme: parseFloat(manualProduct.scheme || 0),
          stock: parseInt(manualProduct.stock),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage("Product added successfully");
      setManualProduct({
        code: "",
        name: "",
        price: "",
        weight: "",
        scheme: "",
        stock: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setError("");
  };

  const validateExcelStructure = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = xlsx.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

          const headers = jsonData[0] || [];
          const lowerHeaders = headers.map((h) =>
            String(h).toLowerCase().trim()
          );

          // Check for required columns (case-insensitive)
          const hasCode = lowerHeaders.some((h) => h.includes("code"));
          const hasName = lowerHeaders.some(
            (h) => h.includes("product name") || h.includes("name")
          );
          const hasMrp = lowerHeaders.some((h) => h.includes("mrp"));
          const hasPrice = lowerHeaders.some((h) => h.includes("price"));
          const hasWeight = lowerHeaders.some((h) => h.includes("weight"));
          const hasScheme = lowerHeaders.some((h) => h.includes("scheme"));
          const hasStock = lowerHeaders.some((h) => h.includes("stock"));
          const hasCompany = lowerHeaders.some(
            (h) => h.includes("company") || h.includes("company name")
          );

          if (!hasCode) resolve("Missing required column: Code");
          else if (!hasName) resolve("Missing required column: Product Name");
          else if (!hasMrp) resolve("Missing required column: MRP");
          else if (!hasPrice) resolve("Missing required column: Price");
          else if (!hasWeight) resolve("Missing required column: Weight");
          else if (!hasScheme) resolve("Missing required column: Scheme");
          else if (!hasStock) resolve("Missing required column: Stock");
          else if (!hasCompany) resolve("Missing required column: Company");
          else resolve(null);
        } catch (error) {
          resolve("Error reading Excel file: " + error.message);
        }
      };
      reader.onerror = () => {
        resolve("Error reading file. Please check if the file is valid.");
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const validationError = await validateExcelStructure(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setImportProgress({ current: 0, total: 0 });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://kalahanu-outstanding.onrender.com/api/products/import",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              setImportProgress({
                current: data.current,
                total: data.total,
              });
            } else if (data.type === "result") {
              setMessage(
                `Successfully imported ${data.importedCount} products. ${data.errorCount} records had errors.`
              );
              if (data.errorCount > 0) {
                const exampleErrors = data.errors?.join(";\n") || "";
                setError(
                  `Some rows had errors. Examples:\n${exampleErrors}${
                    data.errorCount > 10 ? "\n...and more" : ""
                  }`
                );
              }
            } else if (data.type === "error") {
              setError(data.message || "Failed to import products");
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }

      setFile(null);
      document.getElementById("fileInput").value = "";
    } catch (error) {
      console.error("Error importing file:", error);
      setError(error.message || "Failed to import products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Add Products</PageHeader>

      {/* Manual Product Entry Form */}
      <FormContainer onSubmit={handleManualSubmit}>
        <SectionHeader>Manual Product Entry</SectionHeader>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              type="text"
              name="company"
              value={manualProduct.company}
              onChange={handleManualInputChange}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="code">Product Code</Label>
            <Input
              id="code"
              type="text"
              name="code"
              value={manualProduct.code}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.code}
            />
            {fieldErrors.code && <ErrorText>{fieldErrors.code}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              type="text"
              name="name"
              value={manualProduct.name}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.name}
            />
            {fieldErrors.name && <ErrorText>{fieldErrors.name}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              name="price"
              value={manualProduct.price}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.price}
            />
            {fieldErrors.price && <ErrorText>{fieldErrors.price}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="weight">Weight (kg/ltr)</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              name="weight"
              value={manualProduct.weight}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.weight}
            />
            {fieldErrors.weight && <ErrorText>{fieldErrors.weight}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="scheme">Scheme (₹)</Label>
            <Input
              id="scheme"
              type="number"
              step="0.01"
              name="scheme"
              value={manualProduct.scheme}
              onChange={handleManualInputChange}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              name="stock"
              value={manualProduct.stock}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.stock}
            />
            {fieldErrors.stock && <ErrorText>{fieldErrors.stock}</ErrorText>}
          </FormGroup>
        </FormGrid>

        <ButtonContainer>
          <Button type="submit" disabled={loading || !file}>
            {loading
              ? importProgress.total > 0
                ? `Importing ${importProgress.current} of ${importProgress.total} rows`
                : "Processing..."
              : "Upload Products"}
          </Button>
          {loading && importProgress.total > 0 && (
            <ProgressBar>
              <ProgressFill
                width={`${
                  (importProgress.current / importProgress.total) * 100
                }%`}
              />
            </ProgressBar>
          )}
        </ButtonContainer>
      </FormContainer>

      {/* Excel File Upload Form */}
      <FormContainer onSubmit={handleImport}>
        <SectionHeader>Upload Products (Excel)</SectionHeader>
        <FileUploadContainer>
          <FileInputLabel>
            <FileInput
              id="fileInput"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <span>Choose File</span>
          </FileInputLabel>
          <FileName>{file ? file.name : "No file chosen"}</FileName>
        </FileUploadContainer>

        <ButtonContainer>
          <Button type="submit" disabled={loading || !file}>
            {loading ? "Processing..." : "Upload Products"}
          </Button>
        </ButtonContainer>

        <NoteText>
          Note: Excel file should have columns for Code, Product Name, Price,
          Weight, Scheme (optional), and Stock.
        </NoteText>
      </FormContainer>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};

// Styled components (similar to your BillAdd.js styles)
const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
`;

const FormContainer = styled.form`
  background: white;
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
`;

const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #444;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
`;
const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #4299e1;
  width: ${(props) => props.width};
  transition: width 0.3s ease;
`;
const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.625rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  max-width: 200px;
`;

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.625rem 1rem;
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #cbd5e0;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: center;
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  font-size: 0.875rem;
  color: #4a5568;
`;

const NoteText = styled.p`
  font-size: 0.875rem;
  color: #718096;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: #c6f6d5;
  color: #2f855a;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  white-space: pre-line;
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
`;

export default ProductAdd;

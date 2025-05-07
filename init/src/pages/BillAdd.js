import React, { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import * as xlsx from "xlsx";
const BillsAdd = () => {
  const [file, setFile] = useState(null);
  const [manualBill, setManualBill] = useState({
    billNumber: "",
    retailer: "",
    amount: "",
    dueAmount: "",
    dueDate: "",
    billDate: "",
    status: "Unpaid",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const API_URL = "https://laxmi-lube.onrender.com/api";
  const handleImport = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setImportProgress({ current: 0, total: 0 });
  
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
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
  
      const response = await fetch(`${API_URL}/bills/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
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
  
        // Keep the last incomplete line in the buffer
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
                `Successfully imported ${data.importedCount} bills. ${data.errorCount} records had errors.`
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
              setError(data.message || "Failed to import bills");
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
      setError(error.message || "Failed to import bills");
    } finally {
      setLoading(false);
    }
  };



  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage("");
    setError("");
  };

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualBill((prevBill) => ({
      ...prevBill,
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

    if (!manualBill.billNumber) errors.billNumber = "Bill number is required";
    if (!manualBill.retailer) errors.retailer = "Retailer is required";
    if (!manualBill.amount) errors.amount = "Amount is required";
    if (!manualBill.collectionDay)
      errors.collectionDay = "Collection day is required";

    if (manualBill.amount && isNaN(parseFloat(manualBill.amount)))
      errors.amount = "Amount must be a number";
    if (!manualBill.dueAmount) errors.dueAmount = "Due amount is required";
    if (manualBill.dueAmount && isNaN(parseFloat(manualBill.dueAmount)))
      errors.dueAmount = "Due amount must be a number";
    if (!manualBill.dueDate) errors.dueDate = "Due date is required";
    if (!manualBill.billDate) errors.billDate = "Bill date is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const validateExcelStructure = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = xlsx.read(data, { type: "array", cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

          const headers = jsonData[0] || [];
          const lowerHeaders = headers.map((h) =>
            String(h).toLowerCase().trim()
          );

          const requiredColumns = [
            "billno",
            "custname",
            "billamt",
            "billdate",
            "day",
          ];

          const missingColumns = requiredColumns.filter(
            (col) => !lowerHeaders.includes(col.toLowerCase())
          );

          if (missingColumns.length > 0) {
            resolve(`Missing required columns: ${missingColumns.join(", ")}`);
            return;
          }

          if (jsonData.length > 1) {
            const dateColIndex = headers.findIndex((h) =>
              ["billdate", "date"].includes(String(h).toLowerCase())
            );

            if (dateColIndex !== -1) {
              const dateValue = jsonData[1][dateColIndex];
              if (dateValue && isNaN(new Date(dateValue).getTime())) {
                resolve("Invalid date format in Bill Date column");
                return;
              }
            }
          }

          resolve(null);
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

  const handleManualSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!validateForm()) {
      setError("Please fix the errors in the form.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await axios.post(`${API_URL}/bills`, manualBill, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Bill added successfully");
      setManualBill({
        billNumber: "",
        retailer: "",
        amount: "",
        dueAmount: "",
        dueDate: "",
        billDate: "",
        status: "Unpaid",
      });
    } catch (error) {
      console.error("Error adding bill:", error);

      if (error.response) {
        if (error.response.data && error.response.data.errors) {
          const backendErrors = error.response.data.errors;
          setError(`Failed to add bill: ${backendErrors.join(", ")}`);
        } else if (error.response.data && error.response.data.message) {
          setError(`Failed to add bill: ${error.response.data.message}`);
        } else {
          setError(
            `Failed to add bill: Server returned status ${error.response.status}`
          );
        }
      } else if (error.request) {
        setError(
          "Failed to add bill: No response received from server. Please check your network connection."
        );
      } else {
        setError(`Failed to add bill: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Add Bills</PageHeader>

      {/* Manual Bill Entry Form */}
      <FormContainer onSubmit={handleManualSubmit}>
        <SectionHeader>Manual Bill Entry</SectionHeader>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="billNumber">Bill Number</Label>
            <Input
              id="billNumber"
              type="text"
              name="billNumber"
              placeholder="Enter bill number"
              value={manualBill.billNumber}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.billNumber}
            />
            {fieldErrors.billNumber && (
              <ErrorText>{fieldErrors.billNumber}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="retailer">Retailer</Label>
            <Input
              id="retailer"
              type="text"
              name="retailer"
              placeholder="Enter retailer name"
              value={manualBill.retailer}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.retailer}
            />
            {fieldErrors.retailer && (
              <ErrorText>{fieldErrors.retailer}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="amount">Total Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              name="amount"
              placeholder="0.00"
              value={manualBill.amount}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.amount}
            />
            {fieldErrors.amount && <ErrorText>{fieldErrors.amount}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="collectionDay">Collection Day</Label>
            <Select
              id="collectionDay"
              name="collectionDay"
              value={manualBill.collectionDay}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.collectionDay}
            >
              <option value="">Select Day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </Select>
            {fieldErrors.collectionDay && (
              <ErrorText>{fieldErrors.collectionDay}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="dueAmount">Due Amount</Label>
            <Input
              id="dueAmount"
              type="number"
              step="0.01"
              name="dueAmount"
              placeholder="0.00"
              value={manualBill.dueAmount}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.dueAmount}
            />
            {fieldErrors.dueAmount && (
              <ErrorText>{fieldErrors.dueAmount}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              name="dueDate"
              value={manualBill.dueDate}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.dueDate}
            />
            {fieldErrors.dueDate && (
              <ErrorText>{fieldErrors.dueDate}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="billDate">Bill Date</Label>
            <Input
              id="billDate"
              type="date"
              name="billDate"
              value={manualBill.billDate}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.billDate}
            />
            {fieldErrors.billDate && (
              <ErrorText>{fieldErrors.billDate}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              value={manualBill.status}
              onChange={handleManualInputChange}
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
            </Select>
          </FormGroup>
        </FormGrid>

        <ButtonContainer>
          <Button type="submit" disabled={loading || !file}>
            {loading
              ? importProgress.total > 0
                ? `Importing ${importProgress.current} of ${importProgress.total} rows`
                : "Processing..."
              : "Upload Bills"}
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
        <SectionHeader>Upload Bills (Excel)</SectionHeader>
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
            {loading
              ? importProgress.total > 0
                ? `Importing ${importProgress.current} of ${importProgress.total} rows`
                : "Processing..."
              : "Upload Bills"}
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

        <NoteText>
          Note: Excel file should have columns for Bill Number, Retailer,
          Amount, Due Amount, Due Date, Bill Date, and Status (optional).
        </NoteText>
      </FormContainer>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};

export default BillsAdd;

// Styled Components
const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 2rem;
    text-align: left;
  }
`;

const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #444;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;
const ProgressText = styled.span`
  font-size: 0.8rem;
  color: #666;
  margin-left: 1rem;
  align-self: center;
`;
const FormContainer = styled.form`
  background: white;
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
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
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
  font-size: 0.875rem;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background-color: white;
  min-height: 2.5rem;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  min-height: 2.5rem;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
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
  transition: all 0.2s ease;
  width: 100%;
  max-width: 200px;

  &:hover {
    background-color: #3182ce;
  }

  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 0.75rem 1.25rem;
  }
`;

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
  }
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
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background-color: #e2e8f0;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  font-size: 0.875rem;
  color: #4a5568;
  word-break: break-all;

  @media (min-width: 768px) {
    font-size: 1rem;
    margin-left: 1rem;
  }
`;

const NoteText = styled.p`
  font-size: 0.875rem;
  color: #718096;
  margin-top: 1rem;
  line-height: 1.5;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: #c6f6d5;
  color: #2f855a;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 1rem 1.25rem;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  white-space: pre-line;

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 1rem 1.25rem;
  }
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;

  @media (min-width: 768px) {
    font-size: 0.875rem;
  }
`;

// RetailerAdd.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as xlsx from "xlsx";
import styled from "styled-components";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
const RetailerAdd = () => {
  const navigate = useNavigate();
  const [manualRetailer, setManualRetailer] = useState({
    name: "",
    address1: "",
    address2: "",
    assignedTo: "",
    dayAssigned: "",
  });
  const [staffList, setStaffList] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [redirectTimer, setRedirectTimer] = useState(null);

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
        "https://kalahanu-outstanding.onrender.com/api/retailers",
        {
          name: manualRetailer.name,
          address1: manualRetailer.address1,
          address2: manualRetailer.address2,
          assignedTo: manualRetailer.assignedTo,
          dayAssigned: manualRetailer.dayAssigned,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage(
        "Retailer added successfully! Redirecting to retailer list..."
      );
      setManualRetailer({
        name: "",
        address1: "",
        address2: "",
        assignedTo: "",
        dayAssigned: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add retailer");
      console.error("Error adding retailer:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "https://kalahanu-outstanding.onrender.com/api/users/staff",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStaffList(response.data);
      } catch (err) {
        console.error("Failed to fetch staff", err);
      }
    };
    fetchStaff();
  }, []);

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualRetailer((prev) => ({
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
    if (!manualRetailer.name) errors.name = "Retailer name is required";
    if (!manualRetailer.address1)
      errors.address1 = "Address line 1 is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

          // Required columns
          const requiredColumns = ["retailer name", "address 1"];
          const missingColumns = requiredColumns.filter(
            (col) => !lowerHeaders.includes(col.toLowerCase())
          );

          if (missingColumns.length > 0) {
            resolve(`Missing required columns: ${missingColumns.join(", ")}`);
            return;
          }          
          const allowedColumns = [
            "retailer name",
            "address 1",
            "address 2",
            "assigned to",
            "day assigned",
          ];
          const unrecognizedColumns = headers.filter(
            (h) => !allowedColumns.includes(h.toLowerCase().trim())
          );

          if (unrecognizedColumns.length > 0) {
            resolve(
              `Warning: Unrecognized columns will be ignored: ${unrecognizedColumns.join(
                ", "
              )}`
            );
            return;
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
        "https://kalahanu-outstanding.onrender.com/api/retailers/import",
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
                `Successfully imported ${data.importedCount} retailers. ${data.errorCount} records had errors.`
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
              setError(data.message || "Failed to import retailers");
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
      setError(error.message || "Failed to import retailers");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate("/retailers");
  };

  return (
    <Layout>
      <PageHeader>Add Retailers</PageHeader>

      <ButtonContainer>
        <BackButton onClick={handleBackToList}>
          Back to Retailer List
        </BackButton>
      </ButtonContainer>

      {/* Manual Retailer Entry Form */}
      <FormContainer onSubmit={handleManualSubmit}>
        <SectionHeader>Manual Retailer Entry</SectionHeader>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="name">Retailer Name</Label>
            <Input
              id="name"
              type="text"
              name="name"
              value={manualRetailer.name}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.name}
            />
            {fieldErrors.name && <ErrorText>{fieldErrors.name}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="address1">Address Line 1</Label>
            <Input
              id="address1"
              type="text"
              name="address1"
              value={manualRetailer.address1}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.address1}
            />
            {fieldErrors.address1 && (
              <ErrorText>{fieldErrors.address1}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="address2">Address Line 2 (Optional)</Label>
            <Input
              id="address2"
              type="text"
              name="address2"
              value={manualRetailer.address2}
              onChange={handleManualInputChange}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="dayAssigned">Day Assigned</Label>
            <Select
              id="dayAssigned"
              name="dayAssigned"
              value={manualRetailer.dayAssigned || ""}
              onChange={handleManualInputChange}
            >
              <option value="">Any Day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="assignedTo">Assign To Staff</Label>
            <Select
              id="assignedTo"
              name="assignedTo"
              value={manualRetailer.assignedTo || ""}
              onChange={handleManualInputChange}
            >
              <option value="">Select Staff</option>
              {staffList.map((staff) => (
                <option key={staff._id} value={staff._id}>
                  {staff.name}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormGrid>

        <ButtonContainer>
          <SubmitButton type="submit" disabled={loading || !file}>
            {loading
              ? importProgress.total > 0
                ? `Importing ${importProgress.current} of ${importProgress.total} rows`
                : "Processing..."
              : "Upload Retailers"}
          </SubmitButton>
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
        <SectionHeader>Upload Retailers (Excel)</SectionHeader>
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
          <SubmitButton type="submit" disabled={loading || !file}>
            {loading ? "Processing..." : "Upload Retailers"}
          </SubmitButton>
        </ButtonContainer>

        <NoteText>
          Note: Excel file should have columns for Retailer Name, Address 1
          (required), and Address 2 (optional).
        </NoteText>
      </FormContainer>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};
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
const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  color: #333;
  cursor: pointer;
  &:focus {
    border-color: #4299e1;
    outline: none;
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
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
`;

const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
`;

const BackButton = styled.button`
  padding: 0.625rem 1rem;
  background-color: #718096;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
`;

const SubmitButton = styled.button`
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

export default RetailerAdd;

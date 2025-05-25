import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";

const RetailerForm = ({ retailer, onClose, onSuccess, staffList = [] }) => {
  const [formData, setFormData] = useState({
    name: "",
    address1: "",
    address2: "",
    assignedTo: "",
    dayAssigned: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (retailer) {
      setFormData({
        name: retailer.name,
        address1: retailer.address1,
        address2: retailer.address2 || "",
        assignedTo: retailer.assignedTo || "",
        dayAssigned: retailer.dayAssigned || "",
      });
    }
  }, [retailer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = retailer
        ? `https://kalahanu-outstanding.onrender.com/api/retailers/${retailer._id}`
        : "https://kalahanu-outstanding.onrender.com/api/retailers";

      const method = retailer ? "put" : "post";

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormHeader>
        {retailer ? "Edit Retailer" : "Add New Retailer"}
        <CloseButton onClick={onClose}>×</CloseButton>
      </FormHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FormGroup>
        <Label>Retailer Name</Label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </FormGroup>

      <FormGroup>
        <Label>Address Line 1</Label>
        <Input
          type="text"
          name="address1"
          value={formData.address1}
          onChange={handleChange}
          required
        />
      </FormGroup>

      <FormGroup>
        <Label>Address Line 2 (Optional)</Label>
        <Input
          type="text"
          name="address2"
          value={formData.address2}
          onChange={handleChange}
        />
      </FormGroup>

      <FormGroup>
        <Label>Day Assigned</Label>
        <Select
          name="dayAssigned"
          value={formData.dayAssigned}
          onChange={handleChange}
        >
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
        <Label>Assign To Staff</Label>
        <Select
          name="assignedTo"
          value={formData.assignedTo}
          onChange={handleChange}
        >
          <option value="">Select Staff</option>
          {staffList.map((staff) => (
            <option key={staff._id} value={staff._id}>
              {staff.name}
            </option>
          ))}
        </Select>
      </FormGroup>

      <ButtonContainer>
        <Button type="button" onClick={onClose} secondary>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Save"}
        </Button>
      </ButtonContainer>
    </FormContainer>
  );
};

// Styled components
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormHeader = styled.h2`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${(props) => (props.secondary ? "#f0f0f0" : "#4299e1")};
  color: ${(props) => (props.secondary ? "#333" : "white")};
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const ErrorMessage = styled.div`
  color: #e53e3e;
  padding: 0.5rem;
  background-color: #fed7d7;
  border-radius: 4px;
`;

export default RetailerForm;
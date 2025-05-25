import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import { FaSearch, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import RetailerForm from "./RetailerForm";
import { useLocation, useNavigate } from "react-router-dom";

const RetailerList = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.refresh) {
      navigate(location.pathname, { replace: true });
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [location, navigate]);

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
        setStaffList([]);
      }
    };
    fetchStaff();
  }, []);

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://kalahanu-outstanding.onrender.com/api/retailers",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Retailers data received:", response.data);
      setRetailers(response.data);
    } catch (err) {
      setError("Failed to fetch retailers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [refreshTrigger]);
  const getStaffName = (staffId) => {
    if (staffId && typeof staffId === "object") {
      return staffId.name || "Unassigned";
    }
    const staff = staffList.find((s) => s._id === staffId);
    return staff ? staff.name : "Unassigned";
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this retailer?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://kalahanu-outstanding.onrender.com/api/retailers/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setError("");
      fetchRetailers();
    } catch (err) {
      console.error("Delete error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete retailer. Please try again."
      );
    }
  };
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://kalahanu-outstanding.onrender.com/api/retailers/export",
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob", // Important for file downloads
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "retailers_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to export retailers. Please try again.");
    }
  };
  // Edit retailer
  const handleEdit = (retailer) => {
    setEditingRetailer(retailer);
    setShowForm(true);
  };

  // Add new retailer directly from list
  const handleAddNew = () => {
    setEditingRetailer(null);
    setShowForm(true);
  };

  // Close form and refresh list
  const handleFormClose = () => {
    setShowForm(false);
    setEditingRetailer(null);
  };

  // Form success handler
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRetailer(null);
    fetchRetailers(); // Explicitly fetch retailers when form is successful
  };

  const filteredRetailers = retailers.filter(
    (retailer) =>
      retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.address1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (retailer.address2 &&
        retailer.address2.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <PageHeader>Retailer List</PageHeader>

      <ActionsContainer>
        <SearchContainer>
          <FaSearch />
          <SearchInput
            type="text"
            placeholder="Search retailers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        <ButtonGroup>
          <AddButton onClick={handleAddNew}>
            <FaPlus /> Add New
          </AddButton>
          <ExportButton onClick={handleExport}>Export to CSV</ExportButton>
        </ButtonGroup>
      </ActionsContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingMessage>Loading retailers...</LoadingMessage>
      ) : filteredRetailers.length === 0 ? (
        <EmptyMessage>No retailers found</EmptyMessage>
      ) : (
        <RetailersTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Assigned To</th>
              <th>Day</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRetailers.map((retailer) => (
              <tr key={retailer._id}>
                <td>{retailer.name}</td>
                <td>
                  <div>{retailer.address1}</div>
                  {retailer.address2 && <div>{retailer.address2}</div>}
                </td>
                <td>
                  {retailer.assignedTo
                    ? getStaffName(retailer.assignedTo)
                    : "Unassigned"}
                </td>
                <td>{retailer.dayAssigned || "Unassigned"}</td>
                <td>
                  <ActionButtons>
                    <EditButton onClick={() => handleEdit(retailer)}>
                      <FaEdit />
                    </EditButton>
                    <DeleteButton onClick={() => handleDelete(retailer._id)}>
                      <FaTrash />
                    </DeleteButton>
                  </ActionButtons>
                </td>
              </tr>
            ))}
          </tbody>
        </RetailersTable>
      )}

      {/* Edit Form Modal */}
      {showForm && (
        <ModalOverlay>
          <ModalContent>
            <RetailerForm
              retailer={editingRetailer}
              onClose={handleFormClose}
              onSuccess={handleFormSuccess}
              staffList={staffList}
            />
          </ModalContent>
        </ModalOverlay>
      )}
    </Layout>
  );
};

// Add these new styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

// Styled components (similar to other list components)
const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
`;

const ActionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #f8f9fc;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  width: 100%;
  max-width: 400px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  margin-left: 0.5rem;
  width: 100%;
  outline: none;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const LoadingMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: #718096;
`;

const EmptyMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: #718096;
  border: 1px dashed #cbd5e0;
  border-radius: 0.375rem;
`;
const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #38a169;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
`;

const RetailersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    background-color: #f8f9fc;
    font-weight: 600;
    color: #4a5568;
  }

  tr:hover {
    background-color: #f8fafc;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const EditButton = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
`;

const DeleteButton = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: #e53e3e;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
`;

export default RetailerList;

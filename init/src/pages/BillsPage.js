import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import {
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaSearch,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import Layout from "../components/Layout";

const BillsPage = () => {
  const [bills, setBills] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found.");
        }

        const [billsResponse, staffResponse] = await Promise.all([
          axios.get("https://laxmi-lube.onrender.com/api/bills", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          axios.get("https://laxmi-lube.onrender.com/api/users/staff", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

        setBills(billsResponse.data);
        setStaff(staffResponse.data);
      } catch (err) {
        setError("Failed to load bills. Please try again later.");
        setTimeout(() => setError(""), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openAssignModal = (bill) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };
  const handleEditBill = (bill) => {
    console.log("Edit bill", bill);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBill(null);
  };

  const handleAssignStaff = async (e) => {
    e.preventDefault();
    const staffId = e.target.staffId.value;

    if (!staffId || !selectedBill) {
      setError("Please select a staff member");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `https://laxmi-lube.onrender.com/api/bills/${selectedBill._id}/assign`,
        { staffId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill._id === selectedBill._id ? response.data : bill
        )
      );

      setMessage("Bill successfully assigned to staff member");
      setTimeout(() => setMessage(""), 5000);
      closeModal();
    } catch (err) {
      setError("Failed to assign staff. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`https://laxmi-lube.onrender.com/api/bills/${billId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBills(bills.filter((bill) => bill._id !== billId));
      setMessage("Bill successfully deleted");
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError("Failed to delete bill. Please try again.");
      setTimeout(() => setError(""), 5000);
    }
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.retailer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.assignedTo &&
        staff
          .find((s) => s._id === bill.assignedTo)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Layout>
      <PageContainer>
        <Header>
          <Title>
            <FaFileInvoiceDollar size={24} />
            <h1>Bills Management</h1>
          </Title>
          <SearchBox>
            <FaSearch />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>
        </Header>

        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}

        {loading ? (
          <LoadingIndicator>
            <Spinner />
            Loading bills...
          </LoadingIndicator>
        ) : (
          <>
            <TableContainer>
              <BillsTable>
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Retailer</th>
                    <th>Amount</th>
                    <th>Bill Date</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
<tbody>
  {filteredBills.length > 0 ? (
    filteredBills.map((bill) => (
      <tr key={bill._id}>
        <td>{bill.billNumber}</td>
        <td>{bill.retailer}</td>
        <td>{formatCurrency(bill.amount)}</td>
        <td>{new Date(bill.billDate).toLocaleDateString()}</td> {/* Changed from dueDate to billDate */}
        <td>
          <StatusBadge status={bill.status}>
            {bill.status}
          </StatusBadge>
        </td>
        <td>{bill.assignedToName || "Not Assigned"}</td>
        <td>
          <ActionButtons>
            <AssignButton onClick={() => openAssignModal(bill)}>
              <FaUserPlus />
            </AssignButton>
            <EditButton onClick={() => handleEditBill(bill)}>
              <FaEdit />
            </EditButton>
            <DeleteButton onClick={() => handleDeleteBill(bill._id)}>
              <FaTrash />
            </DeleteButton>
          </ActionButtons>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
        No bills found matching your search
      </td>
    </tr>
  )}
</tbody>
              </BillsTable>
            </TableContainer>

            {/* Modal for Assigning Staff */}
            {isModalOpen && selectedBill && (
              <ModalOverlay>
                <ModalContent>
                  <ModalHeader>
                    <h3>Assign Bill #{selectedBill.billNumber}</h3>
                    <CloseButton onClick={closeModal}>×</CloseButton>
                  </ModalHeader>
                  <Form onSubmit={handleAssignStaff}>
                    <FormGroup>
                      <label>Select Staff Member</label>
                      <Select name="staffId">
                        <option value="">Select a staff member</option>
                        {staff.map((staffMember) => (
                          <option key={staffMember._id} value={staffMember._id}>
                            {staffMember.name}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                    <ButtonGroup>
                      <PrimaryButton type="submit">Assign Staff</PrimaryButton>
                      <SecondaryButton type="button" onClick={closeModal}>
                        Cancel
                      </SecondaryButton>
                    </ButtonGroup>
                  </Form>
                </ModalContent>
              </ModalOverlay>
            )}
          </>
        )}
      </PageContainer>
    </Layout>
  );
};
const PageContainer = styled.div`
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  h1 {
    font-size: 1.5rem;
    color: #2d3748;
    margin: 0;
  }

  svg {
    color: #4a5568;
  }

  @media (min-width: 768px) {
    h1 {
      font-size: 1.8rem;
    }
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;

  input {
    border: none;
    outline: none;
    padding: 0.5rem;
    width: 100%;
    font-size: 1rem;
  }

  svg {
    color: #a0aec0;
    margin-right: 0.5rem;
  }

  @media (min-width: 768px) {
    width: 300px;
  }
`;

const Message = styled.div`
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: ${(props) =>
    props.type === "error" ? "#fff5f5" : "#f0fff4"};
  color: ${(props) => (props.type === "error" ? "#e53e3e" : "#38a169")};
  border-left: 4px solid
    ${(props) => (props.type === "error" ? "#e53e3e" : "#38a169")};

  @media (min-width: 768px) {
    padding: 1rem;
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #4a5568;
  gap: 1rem;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #4299e1;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
`;

const BillsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 600px;

  th {
    background-color: #f7fafc;
    color: #4a5568;
    font-weight: 600;
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.875rem;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
    color: #2d3748;
    font-size: 0.875rem;
  }

  tr:hover td {
    background-color: #f8fafc;
  }

  @media (min-width: 768px) {
    th, td {
      padding: 1rem;
      font-size: 1rem;
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background-color: ${(props) =>
    props.status === "paid"
      ? "#ebf8ff"
      : props.status === "pending"
      ? "#fff5f5"
      : "#f0fff4"};
  color: ${(props) =>
    props.status === "paid"
      ? "#3182ce"
      : props.status === "pending"
      ? "#e53e3e"
      : "#38a169"};

  @media (min-width: 768px) {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.25rem;

  @media (min-width: 768px) {
    gap: 0.5rem;
  }
`;

const AssignButton = styled.button`
  background-color: #ebf8ff;
  color: #3182ce;
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: #bee3f8;
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

const EditButton = styled.button`
  background-color: #f0fff4;
  color: #38a169;
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: #c6f6d5;
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

const DeleteButton = styled.button`
  background-color: #fff5f5;
  color: #e53e3e;
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: #fed7d7;
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

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
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #2d3748;
  }

  @media (min-width: 768px) {
    padding: 1.5rem;

    h3 {
      font-size: 1.25rem;
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #a0aec0;
  padding: 0.25rem;

  &:hover {
    color: #718096;
  }

  @media (min-width: 768px) {
    font-size: 1.5rem;
    padding: 0.5rem;
  }
`;

const Form = styled.form`
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4a5568;
  }

  @media (min-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
  }

  @media (min-width: 768px) {
    padding: 0.75rem;
    font-size: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 1rem;
  }
`;

const PrimaryButton = styled.button`
  padding: 0.5rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover {
    background-color: #3182ce;
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    flex: 1;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.5rem;
  background-color: white;
  color: #4299e1;
  border: 1px solid #4299e1;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover {
    background-color: #ebf8ff;
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    flex: 1;
  }
`;

export default BillsPage;

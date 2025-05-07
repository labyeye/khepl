import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { FaUserPlus, FaUserEdit, FaTrash, FaUsers } from "react-icons/fa";
import Layout from "../components/Layout";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get('https://laxmi-lube.onrender.com/api/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      await axios.delete(`https://laxmi-lube.onrender.com/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMessage("User deleted successfully");
      setTimeout(() => setMessage(""), 3000);
      setUsers(users.filter((user) => user._id !== userId));
    } catch (error) {
      setError("Error deleting user");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editMode) {
        await axios.put(`https://laxmi-lube.onrender.com/api/users/${currentUserId}`, newUser, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setMessage("User updated successfully");
      } else {
        await axios.post("https://laxmi-lube.onrender.com/api/users", newUser, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setMessage("User added successfully");
      }

      // Refresh user list
      const response = await axios.get('https://laxmi-lube.onrender.com/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setUsers(response.data);
      
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || "Error processing user");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setError("");
      }, 3000);
    }
  };

  const handleEdit = (user) => {
    setNewUser({
      name: user.name,
      email: user.email,
      password: "", // Password is intentionally left blank for security
      role: user.role
    });
    setEditMode(true);
    setCurrentUserId(user._id);
  };

  const resetForm = () => {
    setNewUser({ name: "", email: "", password: "", role: "staff" });
    setEditMode(false);
    setCurrentUserId(null);
  };

  return (
    <Layout>
      <Container>
        <Header>
          <Title>
            <FaUsers size={24} />
            <h1>User Management</h1>
          </Title>
        </Header>

        {/* Messages */}
        {error && <Message type="error">{error}</Message>}
        {message && <Message type="success">{message}</Message>}

        {/* User Form */}
        <FormContainer>
          <FormHeader>
            <FaUserPlus />
            <h2>{editMode ? "Edit User" : "Add New User"}</h2>
          </FormHeader>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Name</Label>
              <Input
                type="text"
                placeholder="Enter full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder={editMode ? "Leave blank to keep current" : "Enter password"}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required={!editMode}
              />
            </FormGroup>

            <FormGroup>
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Select>
            </FormGroup>

            <ButtonGroup>
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? "Processing..." : editMode ? "Update User" : "Add User"}
              </PrimaryButton>
              {editMode && (
                <SecondaryButton type="button" onClick={resetForm}>
                  Cancel
                </SecondaryButton>
              )}
            </ButtonGroup>
          </Form>
        </FormContainer>

        {/* User List */}
        <TableContainer>
          <TableHeader>
            <h2>User List</h2>
            <TotalUsers>{users.length} users found</TotalUsers>
          </TableHeader>
          
          {loading ? (
            <Loading>Loading users...</Loading>
          ) : users.length === 0 ? (
            <NoUsers>No users found</NoUsers>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <RoleBadge role={user.role}>
                        {user.role}
                      </RoleBadge>
                    </td>
                    <td>
                      <ActionButtons>
                        <EditButton onClick={() => handleEdit(user)}>
                          <FaUserEdit />
                        </EditButton>
                        <DeleteButton onClick={() => handleDelete(user._id)}>
                          <FaTrash />
                        </DeleteButton>
                      </ActionButtons>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableContainer>
      </Container>
    </Layout>
  );
};

export default Users;
const Container = styled.div`
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
  gap: 0.75rem;

  h1 {
    font-size: 1.5rem;
    color: #2d3748;
    margin: 0;
  }

  svg {
    color: #4a5568;
  }

  @media (min-width: 768px) {
    gap: 1rem;
    
    h1 {
      font-size: 1.8rem;
    }
  }
`;

const Message = styled.div`
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: ${props => props.type === 'error' ? '#fff5f5' : '#f0fff4'};
  color: ${props => props.type === 'error' ? '#e53e3e' : '#38a169'};
  border-left: 4px solid ${props => props.type === 'error' ? '#e53e3e' : '#38a169'};

  @media (min-width: 768px) {
    padding: 1rem;
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const FormContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;

  h2 {
    font-size: 1.1rem;
    color: #2d3748;
    margin: 0;
  }

  svg {
    color: #4a5568;
  }

  @media (min-width: 768px) {
    gap: 0.75rem;
    margin-bottom: 1.5rem;

    h2 {
      font-size: 1.25rem;
    }
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #4a5568;
`;

const Input = styled.input`
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

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
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
  gap: 0.75rem;
  align-items: stretch;
  grid-column: 1 / -1;
  margin-top: 0.5rem;

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }
`;

const PrimaryButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background-color: #3182ce;
  }

  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: white;
  color: #4299e1;
  border: 1px solid #4299e1;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #ebf8ff;
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  overflow-x: auto;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const TableHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
`;

const TotalUsers = styled.span`
  font-size: 0.875rem;
  color: #4a5568;
`;

const Table = styled.table`
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

const RoleBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background-color: ${props => props.role === 'admin' ? '#ebf8ff' : '#f0fff4'};
  color: ${props => props.role === 'admin' ? '#3182ce' : '#38a169'};

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

const EditButton = styled.button`
  background-color: #edf2f7;
  color: #4299e1;
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: #e2e8f0;
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

const Loading = styled.div`
  padding: 2rem;
  text-align: center;
  color: #718096;
`;

const NoUsers = styled.div`
  padding: 2rem;
  text-align: center;
  color: #718096;
  font-style: italic;
`;
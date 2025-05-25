// ProductList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import { FaSearch, FaEdit, FaTrash } from "react-icons/fa";

const ProductList = () => {
  const [companyFilter, setCompanyFilter] = useState("");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "https://kalahanu-outstanding.onrender.com/api/products",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProducts(response.data);
      } catch (err) {
        setError("Failed to fetch products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);
  // Add this function to the component
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://kalahanu-outstanding.onrender.com/api/products/export",
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob", // Important for file downloads
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "products_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to export products. Please try again.");
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      (product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!companyFilter || product.company === companyFilter)
  );

  return (
    <Layout>
      <PageHeader>Product List</PageHeader>
      <ActionsContainer>
        <SearchContainer>
          <FaSearch />
          <SearchInput
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        <ExportButton onClick={handleExport}>Export to CSV</ExportButton>
      </ActionsContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingMessage>Loading products...</LoadingMessage>
      ) : filteredProducts.length === 0 ? (
        <NoProductsMessage>No products found.</NoProductsMessage>
      ) : (
        <ProductTable>
          <thead>
            <TableHeaderRow>
              <TableHeader>Company</TableHeader>
              <TableHeader>Code</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Price</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHeaderRow>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <TableRow key={product._id}>
                <TableCell>{product.company}</TableCell>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <ActionButton>
                    <FaEdit />
                  </ActionButton>
                  <ActionButton>
                    <FaTrash />
                  </ActionButton>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </ProductTable>
      )}
    </Layout>
  );
};

// Styled components
const PageHeader = styled.h1`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #333;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  margin-left: 0.5rem;
  width: 100%;
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #fdecea;
  border-radius: 4px;
`;

const LoadingMessage = styled.div`
  color: #1976d2;
  margin-bottom: 1rem;
`;

const NoProductsMessage = styled.div`
  color: #757575;
  margin-bottom: 1rem;
`;

const ProductTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const TableHeaderRow = styled.tr`
  background-color: #f5f5f5;
`;

const TableHeader = styled.th`
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #f9f9f9;
  }

  &:hover {
    background-color: #f1f1f1;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #ddd;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #1976d2;
  margin-right: 0.5rem;
  padding: 0.25rem;

  &:hover {
    color: #0d47a1;
  }
`;
const ActionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
`;

const ExportButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #38a169;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  margin-left: 1rem;

  &:hover {
    background-color: #2f855a;
  }
`;
export default ProductList;

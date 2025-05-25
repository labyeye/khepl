// OrderList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import { FaSearch, FaFileExcel } from "react-icons/fa";
import { format } from "date-fns";

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    retailer: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const [ordersRes, retailersRes] = await Promise.all([
          axios.get("https://kalahanu-outstanding.onrender.com/api/orders", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://kalahanu-outstanding.onrender.com/api/retailers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setOrders(ordersRes.data);
        setFilteredOrders(ordersRes.data);
        setRetailers(retailersRes.data);
      } catch (err) {
        setError("Failed to fetch orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = [...orders];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.retailerName.toLowerCase().includes(term) ||
          order.createdByName.toLowerCase().includes(term) ||
          order.items.some(
            (item) =>
              item.name.toLowerCase().includes(term) ||
              item.code.toLowerCase().includes(term)
          )
      );
    }

    // Apply other filters
    if (filters.retailer) {
      result = result.filter(
        (order) => order.retailer._id === filters.retailer
      );
    }

    if (filters.status) {
      result = result.filter((order) => order.status === filters.status);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter((order) => new Date(order.createdAt) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((order) => new Date(order.createdAt) <= end);
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, filters]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://kalahanu-outstanding.onrender.com/api/orders/export/excel",
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          params: {
            status: filters.status,
            retailerId: filters.retailer,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `orders_${format(new Date(), "yyyyMMdd")}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to export orders. Please try again.");
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.patch(
        `https://kalahanu-outstanding.onrender.com/api/orders/${orderId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      setOrders(
        orders.map((order) =>
          order._id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      setError("Failed to update order status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Order Management</PageHeader>

      <ControlsContainer>
        <SearchContainer>
          <FaSearch />
          <SearchInput
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        <ExportButton onClick={handleExport}>
          <FaFileExcel /> Export to Excel
        </ExportButton>
      </ControlsContainer>

      <FiltersContainer>
        <FilterGroup>
          <Label>Retailer</Label>
          <Select
            value={filters.retailer}
            onChange={(e) =>
              setFilters({ ...filters, retailer: e.target.value })
            }
          >
            <option value="">All Retailers</option>
            {retailers.map((retailer) => (
              <option key={retailer._id} value={retailer._id}>
                {retailer.name}
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>Status</Label>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>From Date</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />
        </FilterGroup>

        <FilterGroup>
          <Label>To Date</Label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
          />
        </FilterGroup>
      </FiltersContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingMessage>Loading orders...</LoadingMessage>
      ) : filteredOrders.length === 0 ? (
        <EmptyMessage>No orders found</EmptyMessage>
      ) : (
        <OrdersTable>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Retailer</th>
              <th>Items</th>
              <th>Total Value</th>
              <th>Total Litres</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order._id}>
                <td>{order._id.slice(-6)}</td>
                <td>
                  <div>{order.retailerName}</div>
                  <small>{order.retailer?.address1}</small>
                </td>
                <td>
                  <ItemsList>
                    {order.items.map((item, index) => (
                      <Item key={index}>
                        <div>
                          <strong>{item.code}</strong> - {item.name}
                        </div>
                        <div>
                          Qty: {item.quantity}, Price: ₹{item.price}, Scheme: ₹
                          {item.scheme}, Other: ₹{item.otherScheme}
                        </div>
                        <div>
                          Net: ₹{item.netPrice.toFixed(2)}, Litres:{" "}
                          {item.totalLitres.toFixed(2)}, Total: ₹
                          {item.totalSale.toFixed(2)}
                        </div>
                        {item.remarks && <div>Remarks: {item.remarks}</div>}
                      </Item>
                    ))}
                  </ItemsList>
                </td>
                <td>₹{order.totalOrderValue.toFixed(2)}</td>
                <td>{order.totalLitres.toFixed(2)}</td>
                <td>{order.createdByName}</td>
                <td>{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}</td>
                <td>
                  <StatusBadge status={order.status}>
                    {order.status}
                  </StatusBadge>
                </td>
                <td>
                  {order.status === "Pending" && (
                    <ActionButtons>
                      <StatusButton
                        onClick={() =>
                          handleStatusChange(order._id, "Completed")
                        }
                        color="#1cc88a"
                      >
                        Complete
                      </StatusButton>
                      <StatusButton
                        onClick={() =>
                          handleStatusChange(order._id, "Cancelled")
                        }
                        color="#e74a3b"
                      >
                        Cancel
                      </StatusButton>
                    </ActionButtons>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </OrdersTable>
      )}
    </Layout>
  );
};

// Styled components
const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
`;

const ControlsContainer = styled.div`
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
  width: 300px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  margin-left: 0.5rem;
  width: 100%;
  outline: none;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #1cc88a;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
`;

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fc;
  border-radius: 0.375rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: #718096;
  margin-bottom: 0.25rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
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

const OrdersTable = styled.table`
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

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Item = styled.div`
  padding: 0.5rem;
  background-color: #f8fafc;
  border-radius: 0.25rem;
  font-size: 0.75rem;

  > div {
    margin-bottom: 0.25rem;
  }

  > div:last-child {
    margin-bottom: 0;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Completed"
      ? "#c6f6d5"
      : props.status === "Cancelled"
      ? "#fed7d7"
      : "#feebc8"};
  color: ${(props) =>
    props.status === "Completed"
      ? "#22543d"
      : props.status === "Cancelled"
      ? "#9b2c2c"
      : "#9c4221"};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StatusButton = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: ${(props) => props.color || "#4299e1"};
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
`;

export default OrderList;

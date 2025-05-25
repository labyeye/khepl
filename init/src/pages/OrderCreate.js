import React, { useState, useEffect } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUserCircle,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaMinus,
  FaTrash,
} from "react-icons/fa";

const OrderCreate = () => {
  const [retailerSearch, setRetailerSearch] = useState("");
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);
  const [dayFilter, setDayFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const navigate = useNavigate();
  const [userAssignedRetailers, setUserAssignedRetailers] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [staffInfo, setStaffInfo] = useState({
    name: "Loading...",
    role: "Collections",
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const toggleSubmenu = (menu) => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(menu);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [retailersRes, productsRes, userRes] = await Promise.all([
          axios.get("https://kalahanu-outstanding.onrender.com/api/retailers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://kalahanu-outstanding.onrender.com/api/products", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://kalahanu-outstanding.onrender.com/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const companies = [...new Set(productsRes.data.map((p) => p.company))];
        setCompanies(companies);
        setRetailers(retailersRes.data);
        setProducts(productsRes.data);

        setStaffInfo({
          name: userRes.data.name,
          role: userRes.data.role,
        });
        if (
          userRes.data.assignedRetailers &&
          userRes.data.assignedRetailers.length > 0
        ) {
          const assignedRetailers = retailersRes.data.filter((retailer) =>
            userRes.data.assignedRetailers.includes(retailer._id)
          );
          setUserAssignedRetailers(assignedRetailers);
        } else {
          setUserAssignedRetailers(retailersRes.data);
        }
      } catch (err) {
        setError("Failed to fetch data. Please try again.");
      }
    };

    fetchData();
  }, []);

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        productId: "",
        quantity: 1,
        otherScheme: 0,
        remarks: "",
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] =
      field === "quantity" || field === "otherScheme" ? Number(value) : value;

    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].productDetails = {
          code: product.code,
          name: product.name,
          price: product.price,
          weight: product.weight,
          scheme: product.scheme,
          stock: product.stock,
        };
      } else {
        newItems[index].productDetails = null;
      }
    }

    setOrderItems(newItems);
  };

  const calculateItemValues = (item) => {
    if (!item.productDetails || !item.quantity || isNaN(item.quantity)) {
      return {
        netPrice: 0,
        totalLitres: 0,
        totalSale: 0,
        totalScheme: 0,
        totalPrice: 0,
      };
    }

    const totalScheme =
      (item.productDetails.scheme || 0) + (item.otherScheme || 0);
    const netPrice = Math.max(
      0,
      item.quantity * item.productDetails.price - item.quantity * totalScheme
    );
    const totalLitres = item.quantity * (item.productDetails.weight || 0);
    const totalSale = netPrice;
    const totalPrice = totalSale / item.quantity;

    return {
      netPrice: netPrice || 0,
      totalLitres: totalLitres || 0,
      totalSale: totalSale || 0,
      totalScheme: totalScheme || 0,
      totalPrice: totalPrice || 0,
    };
  };

  const filteredRetailers = userAssignedRetailers.filter(
    (retailer) => !dayFilter || retailer.dayAssigned === dayFilter
  );
  const filteredProducts = products.filter(
    (product) =>
      (!companyFilter || product.company === companyFilter) &&
      (!productSearch ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.code.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!selectedRetailer) {
      setError("Please select a retailer");
      return;
    }

    if (orderItems.length === 0) {
      setError("Please add at least one product to the order");
      return;
    }

    for (const item of orderItems) {
      if (!item.productId) {
        setError("Please select a product for all items");
        return;
      }

      if (!item.quantity || item.quantity <= 0) {
        setError("Please enter a valid quantity for all items");
        return;
      }

      if (item.productDetails && item.quantity > item.productDetails.stock) {
        setError(
          `Insufficient stock for ${item.productDetails.name}. Available: ${item.productDetails.stock}`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://kalahanu-outstanding.onrender.com/api/orders",
        {
          retailerId: selectedRetailer,
          items: orderItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            otherScheme: Number(item.otherScheme || 0),
            remarks: item.remarks || "",
            price: item.productDetails.price,
            scheme: item.productDetails.scheme,
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage("Order created successfully!");
      setSelectedRetailer("");
      setOrderItems([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Sidebar collapsed={sidebarCollapsed}>
        <SidebarHeader>
          <Logo>BillTrack</Logo>
        </SidebarHeader>
        <UserProfile>
          <UserAvatar>
            <FaUserCircle size={sidebarCollapsed ? 24 : 32} />
          </UserAvatar>
          {!sidebarCollapsed && (
            <UserInfo>
              <UserName>{staffInfo.name}</UserName>
              <UserRole>DSR</UserRole>
            </UserInfo>
          )}
        </UserProfile>
        <NavMenu>
          <NavItem onClick={() => navigate("/staff")}>
            <NavIcon>
              <FaHome />
            </NavIcon>
            {!sidebarCollapsed && (
              <>
                <NavText>Dashboard</NavText>
              </>
            )}
          </NavItem>
          <NavItem active onClick={() => navigate("/staff/order-create")}>
            <NavIcon>
              <FaMoneyBillWave />
            </NavIcon>
            {!sidebarCollapsed && <NavText>Order Create</NavText>}
            <NavCheckmark>☑</NavCheckmark>
          </NavItem>

          <NavItemWithSubmenu>
            <NavItemMain onClick={() => toggleSubmenu("collections")}>
              <NavIcon>
                <FaMoneyCheckAlt />
              </NavIcon>
              {!sidebarCollapsed && (
                <>
                  <NavText>Collections</NavText>
                  <NavArrow>
                    {activeSubmenu === "collections" ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    )}
                  </NavArrow>
                </>
              )}
            </NavItemMain>

            {!sidebarCollapsed && activeSubmenu === "collections" && (
              <Submenu>
                <Link
                  to="/staff/bill-assigned-today"
                  style={{ textDecoration: "none" }}
                >
                  <SubmenuItem>
                    <NavText>Assigned Today</NavText>
                  </SubmenuItem>
                </Link>
                <Link
                  to="/staff/collections-history"
                  style={{ textDecoration: "none" }}
                >
                  <SubmenuItem>
                    <NavText>History</NavText>
                  </SubmenuItem>
                </Link>
              </Submenu>
            )}
          </NavItemWithSubmenu>
        </NavMenu>
        <LogoutButton onClick={handleLogout}>
          <NavIcon>
            <FaSignOutAlt />
          </NavIcon>
          {!sidebarCollapsed && <NavText>Logout</NavText>}
        </LogoutButton>
      </Sidebar>

      <MainContent>
        <ContentContainer>
          <PageHeader>Create New Order</PageHeader>

          <FiltersContainer>
            <FilterGroup>
              <FilterLabel>Filter by Day</FilterLabel>
              <FilterSelect
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
              >
                <option value="">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </FilterSelect>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Select Retailer</FilterLabel>
              <SearchInput
                type="text"
                placeholder="Search retailers..."
                value={
                  selectedRetailer
                    ? `${
                        retailers.find((r) => r._id === selectedRetailer)
                          ?.name || ""
                      } - ${
                        retailers.find((r) => r._id === selectedRetailer)
                          ?.address1 || ""
                      }`
                    : retailerSearch
                }
                onChange={(e) => {
                  if (!selectedRetailer) {
                    setRetailerSearch(e.target.value);
                  }
                }}
                onFocus={() => {
                  if (selectedRetailer) {
                    setSelectedRetailer("");
                    setRetailerSearch("");
                  }
                }}
              />
              {!selectedRetailer && retailerSearch && (
                <ProductResultsList>
                  {filteredRetailers
                    .filter(
                      (retailer) =>
                        retailer.name
                          .toLowerCase()
                          .includes(retailerSearch.toLowerCase()) ||
                        retailer.address1
                          .toLowerCase()
                          .includes(retailerSearch.toLowerCase())
                    )
                    .map((retailer) => (
                      <ProductResultItem
                        key={retailer._id}
                        onClick={() => {
                          setSelectedRetailer(retailer._id);
                          setRetailerSearch("");
                        }}
                      >
                        {retailer.name} - {retailer.address1}
                      </ProductResultItem>
                    ))}
                  {filteredRetailers.length === 0 && (
                    <NoResults>No retailers found</NoResults>
                  )}
                </ProductResultsList>
              )}
            </FilterGroup>
          </FiltersContainer>

          <FormContainer onSubmit={handleSubmit}>
            <ItemsHeader>
              <h3>Order Items</h3>
              <FilterGroup>
                <FilterLabel>Filter by Company</FilterLabel>
                <FilterSelect
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </FilterSelect>
              </FilterGroup>
              <AddButton type="button" onClick={handleAddItem}>
                <FaPlus /> Add Item
              </AddButton>
            </ItemsHeader>

            {orderItems.length === 0 ? (
              <EmptyItems>No items added yet</EmptyItems>
            ) : (
              <ItemsList>
                {orderItems.map((item, index) => {
                  const calculatedValues = calculateItemValues(item);
                  return (
                    <ItemCard key={index}>
                      <ItemHeader>
                        <span>Item #{index + 1}</span>
                        <RemoveButton
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <FaTrash />
                        </RemoveButton>
                      </ItemHeader>

                      <ItemGrid>
                        <FormGroup>
                          <Label>Product</Label>
                          <SearchInput
                            type="text"
                            placeholder="Search products..."
                            value={
                              item.productId
                                ? `${item.productDetails?.code} - ${item.productDetails?.name}`
                                : productSearch
                            }
                            onChange={(e) => {
                              if (!item.productId) {
                                setProductSearch(e.target.value);
                              }
                            }}
                            onFocus={() => {
                              if (item.productId) {
                                handleItemChange(index, "productId", "");
                                setProductSearch("");
                              }
                            }}
                          />
                          {!item.productId && productSearch && (
                            <ProductResultsList>
                              {filteredProducts.map((product) => (
                                <ProductResultItem
                                  key={product._id}
                                  onClick={() => {
                                    handleItemChange(
                                      index,
                                      "productId",
                                      product._id
                                    );
                                    setProductSearch("");
                                  }}
                                >
                                  {product.code} - {product.name} (₹
                                  {product.price}, {product.weight}kg/ltr)
                                </ProductResultItem>
                              ))}
                              {filteredProducts.length === 0 && (
                                <NoResults>No products found</NoResults>
                              )}
                            </ProductResultsList>
                          )}
                        </FormGroup>

                        {item.productDetails && (
                          <>
                            <StockGroup>
                              <SFormGroup>
                                <Label>Stock</Label>
                                <StockInput
                                  type="text"
                                  value={item.productDetails.stock}
                                  readOnly
                                />
                              </SFormGroup>
                              <QFormGroup>
                                <Label>Quantity</Label>
                                <NumberInputContainer>
                                  <NumberInputButton
                                    type="button"
                                    onClick={() => {
                                      const currentValue = item.quantity || 1;
                                      if (currentValue > 1) {
                                        handleItemChange(
                                          index,
                                          "quantity",
                                          currentValue - 1
                                        );
                                      }
                                    }}
                                  >
                                    <FaMinus />
                                  </NumberInputButton>
                                  <QuantityInput
                                    type="number"
                                    min="1"
                                    max={item.productDetails.stock}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <NumberInputButton
                                    type="button"
                                    onClick={() => {
                                      const currentValue = item.quantity || 1;
                                      if (
                                        currentValue < item.productDetails.stock
                                      ) {
                                        handleItemChange(
                                          index,
                                          "quantity",
                                          currentValue + 1
                                        );
                                      }
                                    }}
                                  >
                                    <FaPlus />
                                  </NumberInputButton>
                                </NumberInputContainer>
                              </QFormGroup>
                            </StockGroup>

                            <StockGroup>
                              <SFormGroup>
                                <Label>Scheme(₹)</Label>
                                <StockInput
                                  type="number"
                                  step="0.01"
                                  value={item.productDetails.scheme}
                                  readOnly
                                />
                              </SFormGroup>

                              <QFormGroup>
                                <Label>Other Scheme (₹)</Label>
                                <NumberInputContainer>
                                  <NumberInputButton
                                    type="button"
                                    onClick={() => {
                                      const currentValue =
                                        item.otherScheme || 0;
                                      handleItemChange(
                                        index,
                                        "otherScheme",
                                        currentValue - 1
                                      );
                                    }}
                                  >
                                    <FaMinus />
                                  </NumberInputButton>
                                  <SchemeInput
                                    type="number"
                                    step="0.01"
                                    value={item.otherScheme}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "otherScheme",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <NumberInputButton
                                    type="button"
                                    onClick={() => {
                                      const currentValue =
                                        item.otherScheme || 0;
                                      handleItemChange(
                                        index,
                                        "otherScheme",
                                        currentValue + 1
                                      );
                                    }}
                                  >
                                    <FaPlus />
                                  </NumberInputButton>
                                </NumberInputContainer>
                              </QFormGroup>
                            </StockGroup>

                            <SaleGroup>
                              <FormGroup>
                                <Label>Tl Scheme</Label>
                                <NInput
                                  type="text"
                                  value={calculatedValues.totalScheme.toFixed(
                                    2
                                  )}
                                  readOnly
                                />
                              </FormGroup>

                              <FormGroup>
                                <Label>Tl Litres</Label>
                                <NInput
                                  type="text"
                                  value={calculatedValues.totalLitres.toFixed(
                                    2
                                  )}
                                  readOnly
                                />
                              </FormGroup>

                              <FormGroup>
                                <Label>Tl Sale</Label>
                                <NInput
                                  type="text"
                                  value={calculatedValues.totalSale.toFixed(2)}
                                  readOnly
                                />
                              </FormGroup>
                            </SaleGroup>
                            <PriceGroup>
                              <FormGroup>
                                <Label>Net Price (₹)</Label>
                                <NInput
                                  type="text"
                                  value={calculatedValues.netPrice.toFixed(2)}
                                  readOnly
                                />
                              </FormGroup>

                              <FormGroup>
                                <Label>NP Per Pc(₹)</Label>
                                <NInput
                                  type="text"
                                  value={calculatedValues.totalPrice.toFixed(2)}
                                  readOnly
                                />
                              </FormGroup>
                            </PriceGroup>

                            <FormGroup fullWidth>
                              <Label>Remarks</Label>
                              <RInput
                                type="text"
                                value={item.remarks}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "remarks",
                                    e.target.value
                                  )
                                }
                              />
                            </FormGroup>
                          </>
                        )}
                      </ItemGrid>
                    </ItemCard>
                  );
                })}
              </ItemsList>
            )}

            <ButtonContainer>
              <SubmitButton type="submit" disabled={loading}>
                {loading ? "Processing..." : "Place Order"}
              </SubmitButton>
            </ButtonContainer>
          </FormContainer>

          {message && <SuccessMessage>{message}</SuccessMessage>}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </ContentContainer>
      </MainContent>
    </DashboardLayout>
  );
};
const DashboardLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8f9fc;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;
const ProductResultsList = styled.div`
  position: absolute;
  z-index: 10;
  width: 64%;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProductResultItem = styled.div`
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f4f8;
  }
`;

const NoResults = styled.div`
  padding: 0.5rem 0.75rem;
  color: #718096;
  font-style: italic;
`;
const Sidebar = styled.div`
  width: 100%;
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  z-index: 10;
  height: auto;
  overflow: hidden;
  max-height: ${(props) => (props.collapsed ? "70px" : "100vh")};

  @media (min-width: 768px) {
    width: ${(props) => (props.collapsed ? "80px" : "250px")};
    max-height: 100vh;
    height: 100vh;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: calc(100vh - 70px);

  @media (min-width: 768px) {
    height: 100vh;
  }
`;

const ContentContainer = styled.div`
  padding: 1rem;
  width: 90%;
  margin: 0 auto;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const FilterGroup = styled.div`
  width: 90%;

  @media (min-width: 768px) {
    flex: 1;
    min-width: 200px;
  }
`;

const ItemsHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #2e3a59;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;
const StockGroup = styled.div`
  display: flex;
  flex-direction: row;
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;
const PriceGroup = styled.div`
  display: flex;
  flex-direction: row;
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;
const SaleGroup = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;

  @media (min-width: 768px) {
    justify-content: flex-end;
  }
`;
const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid #f0f0f0;
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #4e73df;
  white-space: nowrap;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const UserAvatar = styled.div`
  color: #4e73df;
  margin-right: ${(props) => (props.collapsed ? "0" : "15px")};
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: #343a40;
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
`;

const NavMenu = styled.div`
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${(props) => (props.active ? "#4e73df" : "#6c757d")};
  background-color: ${(props) =>
    props.active ? "rgba(78, 115, 223, 0.1)" : "transparent"};
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background-color: rgba(78, 115, 223, 0.1);
    color: #4e73df;
  }
`;

const NavItemWithSubmenu = styled.div`
  display: flex;
  flex-direction: column;
`;

const NavItemMain = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background-color: rgba(78, 115, 223, 0.1);
    color: #4e73df;
  }
`;

const NavIcon = styled.div`
  font-size: 1rem;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NavText = styled.div`
  flex: 1;
`;

const NavArrow = styled.div`
  font-size: 0.8rem;
`;

const NavCheckmark = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${(props) => (props.active ? "#4e73df" : "#6c757d")};
`;

const Submenu = styled.div`
  padding-left: 40px;
`;

const LogoutButton = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s;
  border-top: 1px solid #f0f0f0;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    color: #e74a3b;
    background-color: rgba(231, 74, 59, 0.1);
  }
`;

const PageHeader = styled.h1`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: #2e3a59;
  font-weight: 600;
`;

const FilterLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
  font-size: 0.875rem;
`;

const FilterSelect = styled.select`
  width: 90%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #fff;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }
`;

const FormContainer = styled.form`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #3a5bc7;
  }
`;

const EmptyItems = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #718096;
  border: 1px dashed #cbd5e0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ItemCard = styled.div`
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;

  span {
    font-weight: 600;
    color: #2e3a59;
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #e53e3e;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  transition: color 0.3s;

  &:hover {
    color: #c53030;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  ${(props) => props.fullWidth && "grid-column: 1 / -1;"}
`;

const SFormGroup = styled.div`
  margin-bottom: 1rem;
  width: 35%;
`;

const QFormGroup = styled.div`
  margin-bottom: 1rem;
  width: 60%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
  font-size: 0.875rem;
`;

const Input = styled.input`
  width: 90%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #fff;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }

  &[readonly] {
    background-color: #f8f9fc;
    color: #6c757d;
  }
`;

const StockInput = styled(Input)`
  text-align: center;
  width: 40%;
  background-color: #fff8e1;
`;
const NInput = styled(Input)`
  text-align: center;
  width: 45%;
  background-color: #fff8e1;
`;
const QuantityInput = styled(Input)`
  width: 40%;
  text-align: center;
  background-color: #fff8e1;
`;
const SearchInput = styled(Input)`
  text-align: center;
  background-color: #fff8e1;
`;

const RInput = styled.input`
  width: 90%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #fff8e1;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }

  &[readonly] {
    background-color: #f8f9fc;
    color: #6c757d;
  }
`;
const SchemeInput = styled(Input)`
  text-align: center;
  background-color: #fff8e1;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #fff;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }
`;

const NumberInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NumberInputButton = styled.button`
  background-color: #e2e8f0;
  border: 1px solid #cbd5e0;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.3s;

  &:hover {
    background-color: #cbd5e0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  min-width: 150px;

  &:hover {
    background-color: #3a5bc7;
  }

  &:disabled {
    background-color: #b0b7d4;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background-color: #d4edda;
  color: #155724;
  border-radius: 0.375rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  border: 1px solid #c3e6cb;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 0.375rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  border: 1px solid #f5c6cb;
`;

const SubmenuItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 20px 8px 40px;
  color: #6c757d;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;

  &:hover {
    color: #4e73df;
  }

  ${NavCheckmark} {
    margin-left: auto;
  }
`;

export default OrderCreate;

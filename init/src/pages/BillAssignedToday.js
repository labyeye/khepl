import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";
import {
  FaMoneyBillWave,
  FaHome,
  FaMoneyCheckAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaChevronDown,
  FaChevronRight,
  FaSync,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const BillAssignedToday = () => {
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    upiTransactionId: "",
    bankName: "",
    chequeNumber: "",
    bankTransactionId: "",
    receiptNumber: "",
  });
  const [staffInfo, setStaffInfo] = useState({
    name: "Loading...",
    role: "Collections",
  });
  const [bills, setBills] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allAssignedCustomers, setAllAssignedCustomers] = useState([]);
  const BANK_LIST = [
    "ALLAHABAD BANK",
    "ANDHRA BANK",
    "AXIS BANK LTD",
    "BANDHAN BANK",
    "BANK OF BARODA",
    "BANK OF INDIA",
    "CANARA BANK",
    "CENTRAL BANK OF INDIA",
    "CORPORATION BANK",
    "DENA BANK",
    "FEDERAL BANK",
    "HDFC BANK LTD",
    "ICICI BANK",
    "IDBI BANK",
    "INDIAN OVERSEAS BANK",
    "INDUSIND BANK",
    "INDIAN BANK",
    "ORIENTAL BANK OF COMMERCE",
    "PUNJAB NATIONAL BANK",
    "STATE BANK OF INDIA",
    "STANDARD CHARTERED BANK",
    "SYNDICATE BANK",
    "UCO BANK",
    "UNION BANK OF INDIA",
    "UNITED BANK OF INDIA",
    "UTKARSH SMALL FINANCE BANK",
    "UTTAR BIHAR GRAMIN BANK",
    "VIJAYA BANK",
    "BANK OF MAHARASHTRA",
    "KOTAK MAHINDRA BANK",
    "UJJIVAN SMALL FINANCE BANK",
  ];

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(`https://laxmi-lube.onrender.com/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStaffInfo({
        name: response.data.name || "Staff Member",
        role: response.data.role || "Collections",
      });
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, []);
  const navigate = useNavigate();
  const fetchAllAssignedCustomers = async () => {
    try {
      const response = await axios.get(
        "https://laxmi-lube.onrender.com/api/bills/assigned-customers",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setAllAssignedCustomers(response.data);
    } catch (error) {
      console.error("Error fetching assigned customers:", error);
    }
  };
  const handleDaySelect = (day) => {
    setSelectedDay(day === "All" ? null : day);
    setSelectedCustomer(null);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerBills(bills.filter((bill) => bill.retailer === customer));
  };
  useEffect(() => {
    if (bills.length > 0) {
      const uniqueCustomers = [...new Set(bills.map((bill) => bill.retailer))];
      setCustomers(uniqueCustomers);
    }
  }, [bills]);

  const fetchBillsAssignedToday = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "https://laxmi-lube.onrender.com/api/bills/bills-assigned-today",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: {
            collectionDay: selectedDay || null,
          },
        }
      );

      const billsWithDates = response.data.map((bill) => ({
        ...bill,
        billDate: new Date(bill.billDate),
        assignedDate: bill.assignedDate ? new Date(bill.assignedDate) : null,
      }));

      setBills(billsWithDates);

      // Extract unique customers from the bills
      const uniqueCustomers = [
        ...new Set(billsWithDates.map((bill) => bill.retailer)),
      ];
      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error("Error fetching bills assigned today:", error);
      setError("Failed to fetch bills assigned today. Please try again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);
  useEffect(() => {
    fetchBillsAssignedToday();
    fetchAllAssignedCustomers();
  }, [selectedDay]);

  // In BillAssignedToday.js, update the handleCollectionSubmit function:
  const handleCollectionSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const paidAmount = parseFloat(paymentAmount);
      if (isNaN(paidAmount)) {
        setSubmitError("Please enter a valid amount");
        return;
      }

      const roundedAmount = Math.round(paidAmount * 100) / 100;
      const dueAmount = parseFloat(selectedBill.dueAmount);

      if (roundedAmount <= 0 || roundedAmount > dueAmount) {
        setSubmitError(
          `Amount must be between ₹0.01 and ₹${dueAmount.toFixed(2)}`
        );
        return;
      }

      // Prepare payload for collection
      const collectionPayload = {
        bill: selectedBill._id,
        amountCollected: roundedAmount,
        paymentMode,
        remarks: paymentRemarks,
        paymentDetails:
          paymentMode === "cash"
            ? {
                receiptNumber: paymentDetails.receiptNumber || "Money Received",
              }
            : paymentDetails,
      };

      // First create the collection record
      await axios.post(
        "https://laxmi-lube.onrender.com/api/collections",
        collectionPayload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      // Then update the bill status
      const newDueAmount = dueAmount - paidAmount;
      await axios.put(
        `https://laxmi-lube.onrender.com/api/bills/${selectedBill._id}`,
        {
          dueAmount: newDueAmount,
          status: newDueAmount <= 0 ? "Paid" : "Partially Paid",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      // Refresh data
      await fetchBillsAssignedToday();
      setShowCollectionModal(false);
      // Reset form
      setSelectedBill(null);
      setPaymentAmount("");
      setPaymentMode("cash");
      setPaymentRemarks("");
      setPaymentDetails({
        upiId: "",
        upiTransactionId: "",
        bankName: "",
        chequeNumber: "",
        bankTransactionId: "",
        receiptNumber: "",
      });
    } catch (err) {
      console.error("Collection error:", err);
      setSubmitError(
        err.response?.data?.message || "Failed to record collection"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalDueAmount = bills.reduce(
    (sum, bill) => sum + (bill.dueAmount > 0 ? bill.dueAmount : 0),
    0
  );
  const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;

  const handleRetry = () => {
    setRetrying(true);
    fetchBillsAssignedToday();
  };

  const toggleSubmenu = (menu) => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(menu);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleOpenCollectionModal = () => {
    setSelectedBill(null);
    setSelectedCustomer(null);
    setPaymentAmount("");
    setPaymentMode("cash");
    setPaymentRemarks("");
    setSubmitError("");
    setShowCollectionModal(true);
  };

  if (loading && !retrying) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading bills assigned today...</p>
      </LoadingContainer>
    );
  }

  return (
    <DashboardLayout>
      <Sidebar collapsed={sidebarCollapsed.toString()}>
        <SidebarHeader>
          <Logo>BillTrack</Logo>
          <ToggleButton onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronDown />}
          </ToggleButton>
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
                <NavCheckmark>☐</NavCheckmark>
              </>
            )}
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
                <SubmenuItem
                  onClick={() => navigate("/staff/bill-assigned-today")}
                >
                  <NavText>Assigned Today</NavText>
                  <NavCheckmark>☑</NavCheckmark>
                </SubmenuItem>
                <Link
                  to="/staff/collections-history"
                  style={{ textDecoration: "none" }}
                >
                  <SubmenuItem>
                    <NavText>History</NavText>
                    <NavCheckmark>☐</NavCheckmark>
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
        <TopBar>
          <PageTitle>Bills Assigned Today</PageTitle>
          <HeaderActions>
            <NewCollectionButton onClick={handleOpenCollectionModal}>
              New Collection
            </NewCollectionButton>
            <RefreshButton onClick={handleRetry} disabled={retrying}>
              <FaSync className={retrying ? "spinning" : ""} />
              {retrying ? "Refreshing..." : "Refresh Data"}
            </RefreshButton>
          </HeaderActions>
        </TopBar>

        <ContentArea>
          {error ? (
            <ErrorAlert>
              <ErrorIcon>
                <FaExclamationTriangle />
              </ErrorIcon>
              <ErrorMessage>{error}</ErrorMessage>
              <RetryButton onClick={handleRetry} disabled={retrying}>
                {retrying ? "Retrying..." : "Retry Now"}
              </RetryButton>
            </ErrorAlert>
          ) : (
            <>
              <SummaryCard>
                <SummaryItem>
                  <SummaryLabel>Total Bills</SummaryLabel>
                  <SummaryValue>{totalBills}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Total Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(totalAmount)}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Total Due Amount</SummaryLabel>
                  <SummaryValue>
                    {formatCurrency(totalDueAmount.toFixed(2))}
                  </SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Average Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(averageAmount)}</SummaryValue>
                </SummaryItem>
              </SummaryCard>

              <DayFilterContainer>
                <DayButton
                  active={!selectedDay}
                  onClick={() => handleDaySelect("All")}
                >
                  All
                </DayButton>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <DayButton
                    key={day}
                    active={selectedDay === day}
                    onClick={() => handleDaySelect(day)}
                  >
                    {day.substring(0, 10)}
                  </DayButton>
                ))}
              </DayFilterContainer>

              <CustomerSelector>
                <Label>Select Customer:</Label>
                <Select
                  value={selectedCustomer || ""}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </Select>
              </CustomerSelector>

              {bills.length > 0 ? (
                <BillsList>
                  {(selectedCustomer ? customerBills : bills).map((bill) => (
                    <BillCard key={bill._id} paid={bill.dueAmount <= 0}>
                      <BillRetailer>{bill.retailer}</BillRetailer>
                      <BillHeader>
                        <BillNumber>Bill #{bill.billNumber}</BillNumber>
                        <BillStatus status={bill.status}>
                          {bill.dueAmount <= 0 ? "Paid" : bill.status}
                        </BillStatus>
                      </BillHeader>
                      <BillDetails>
                        <DetailItem>
                          <DetailLabel>Amount:</DetailLabel>
                          <DetailValue>
                            {formatCurrency(bill.amount)}
                          </DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Due Amount:</DetailLabel>
                          <DetailValue>
                            {bill.dueAmount <= 0 ? (
                              <PaidText>Cleared</PaidText>
                            ) : (
                              formatCurrency(bill.dueAmount.toFixed(2))
                            )}
                          </DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Bill Date:</DetailLabel>
                          <DetailValue>{formatDate(bill.billDate)}</DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Assigned Date:</DetailLabel>
                          <DetailValue>
                            {formatDate(bill.assignedDate || bill.billDate)}
                          </DetailValue>
                        </DetailItem>
                      </BillDetails>
                      <BillIcon>
                        <FaMoneyBillWave />
                      </BillIcon>
                      {bill.dueAmount <= 0 && <PaidBadge>PAID</PaidBadge>}
                    </BillCard>
                  ))}
                </BillsList>
              ) : (
                <EmptyState>
                  <FaMoneyBillWave size={48} />
                  <EmptyMessage>No bills assigned to you today</EmptyMessage>
                  <RefreshButton onClick={handleRetry} disabled={retrying}>
                    <FaSync className={retrying ? "spinning" : ""} />
                    {retrying ? "Refreshing..." : "Check Again"}
                  </RefreshButton>
                </EmptyState>
              )}
            </>
          )}
        </ContentArea>

        {/* Updated Collection Modal */}
        {showCollectionModal && (
          <ModalOverlay>
            <Modal>
              <ModalHeader>
                <ModalTitle>Record New Collection</ModalTitle>
                <CloseButton
                  onClick={() => {
                    setShowCollectionModal(false);
                    setSelectedCustomer(null);
                    setSelectedBill(null);
                  }}
                >
                  &times;
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                {!selectedCustomer ? (
                  // Step 1: Select Customer
                  <div>
                    <ModalSubtitle>Select Customer</ModalSubtitle>
                    <CustomerBillsContainer>
                      {allAssignedCustomers.map((customer) => (
                        <BillOption
                          key={customer}
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div>{customer}</div>
                        </BillOption>
                      ))}
                    </CustomerBillsContainer>
                  </div>
                ) : !selectedBill ? (
                  // Step 2: Select Bill
                  <div>
                    <ModalSubtitle>
                      Select Bill for {selectedCustomer}
                    </ModalSubtitle>
                    <ButtonGroup>
                      <BackButton onClick={() => setSelectedCustomer(null)}>
                        Back to Customer Selection
                      </BackButton>
                    </ButtonGroup>
                    <CustomerBillsContainer>
                      {bills
                        .filter(
                          (bill) =>
                            bill.retailer === selectedCustomer &&
                            bill.dueAmount > 0
                        )
                        .map((bill) => (
                          <BillOption
                            key={bill._id}
                            onClick={() => setSelectedBill(bill)}
                          >
                            <div>Bill #{bill.billNumber}</div>
                            <div>Amount: {formatCurrency(bill.amount)}</div>
                            <div>Due: {formatCurrency(bill.dueAmount)}</div>
                            <div>Bill Date: {formatDate(bill.billDate)}</div>
                            {bill.outstandingDays > 0 && (
                              <OverdueBadge>
                                Overdue: {bill.outstandingDays} days
                              </OverdueBadge>
                            )}
                          </BillOption>
                        ))}
                    </CustomerBillsContainer>
                  </div>
                ) : (
                  // Step 3: Payment Details
                  <>
                    <SelectedBillInfo>
                      <div>
                        <strong>Bill #:</strong> {selectedBill.billNumber}
                      </div>
                      <div>
                        <strong>Retailer:</strong> {selectedBill.retailer}
                      </div>
                      <div>
                        <strong>Due Amount:</strong>{" "}
                        {formatCurrency(selectedBill.dueAmount.toFixed(2))}
                      </div>
                    </SelectedBillInfo>

                    <FormGroup>
                      <Label>Amount Paid</Label>
                      <AmountInputContainer>
                        <Input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                              setPaymentAmount(value);
                            }
                          }}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          max={selectedBill?.dueAmount}
                        />
                        <MaxButton
                          type="button"
                          onClick={() =>
                            setPaymentAmount(selectedBill?.dueAmount.toFixed(2))
                          }
                        >
                          All Dues
                        </MaxButton>
                      </AmountInputContainer>
                    </FormGroup>

                    <FormGroup>
                      <Label>Payment Mode</Label>
                      <Select
                        value={paymentMode}
                        onChange={(e) => {
                          setPaymentMode(e.target.value);
                          setPaymentDetails({
                            upiId: "",
                            upiTransactionId: "",
                            bankName: "",
                            chequeNumber: "",
                            bankTransactionId: "",
                          });
                        }}
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                      </Select>
                    </FormGroup>
                    {paymentMode === "cash" && (
                      <FormGroup>
                        <Label>Receipt Number</Label>
                        <Input
                          type="text"
                          value={paymentDetails.receiptNumber}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              receiptNumber: e.target.value,
                            })
                          }
                          placeholder="Enter receipt number"
                        />
                      </FormGroup>
                    )}
                    {/* Payment mode specific fields */}
                    {paymentMode === "upi" && (
                      <>
                        <FormGroup>
                          <Label>UPI ID</Label>
                          <Input
                            type="text"
                            value={paymentDetails.upiId}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                upiId: e.target.value,
                              })
                            }
                            placeholder="Enter UPI ID"
                          />
                        </FormGroup>
                        <FormGroup>
                          <Label>Transaction ID</Label>
                          <Input
                            type="text"
                            value={paymentDetails.upiTransactionId}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                upiTransactionId: e.target.value,
                              })
                            }
                            placeholder="Enter UPI Transaction ID"
                          />
                        </FormGroup>
                      </>
                    )}

                    {(paymentMode === "cheque" ||
                      paymentMode === "bank_transfer") && (
                      <FormGroup>
                        <Label>Bank Name</Label>
                        <Select
                          value={paymentDetails.bankName}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              bankName: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Bank</option>
                          {BANK_LIST.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </Select>
                      </FormGroup>
                    )}
                    {paymentMode === "cheque" && (
                      <FormGroup>
                        <Label>Cheque Number</Label>
                        <Input
                          type="text"
                          value={paymentDetails.chequeNumber}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              chequeNumber: e.target.value,
                            })
                          }
                          placeholder="Enter Cheque Number"
                        />
                      </FormGroup>
                    )}

                    {paymentMode === "bank_transfer" && (
                      <FormGroup>
                        <Label>Transaction ID</Label>
                        <Input
                          type="text"
                          value={paymentDetails.bankTransactionId}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              bankTransactionId: e.target.value,
                            })
                          }
                          placeholder="Enter Bank Transaction ID"
                        />
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>Remarks (Optional)</Label>
                      <Input
                        as="textarea"
                        value={paymentRemarks}
                        onChange={(e) => setPaymentRemarks(e.target.value)}
                        placeholder="Add any additional notes..."
                        rows={3}
                      />
                    </FormGroup>

                    {submitError && <ErrorText>{submitError}</ErrorText>}

                    <ButtonGroup>
                      <BackButton
                        onClick={() => {
                          setSelectedBill(null);
                          setPaymentAmount("");
                          setSubmitError("");
                        }}
                      >
                        Back to Bill Selection
                      </BackButton>
                      <SubmitButton
                        onClick={handleCollectionSubmit}
                        disabled={isSubmitting || !paymentAmount}
                      >
                        {isSubmitting ? "Processing..." : "Submit Collection"}
                      </SubmitButton>
                    </ButtonGroup>
                  </>
                )}
              </ModalBody>
            </Modal>
          </ModalOverlay>
        )}
      </MainContent>
    </DashboardLayout>
  );
};
// Responsive Styled Components for BillAssignedToday
const DashboardLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8f9fc;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.div`
  width: 100%;
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;

  @media (min-width: 768px) {
    width: ${(props) => (props.collapsed === "true" ? "80px" : "250px")};
    height: 100vh;
    position: sticky;
    top: 0;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: calc(100vh - 70px);

  @media (min-width: 768px) {
    min-height: 100vh;
  }
`;

const TopBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    padding: 0 20px;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: #2e3a59;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;
const PaidBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #1cc88a;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
`;

const PaidText = styled.span`
  color: #1cc88a;
  font-weight: bold;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (min-width: 768px) {
    gap: 15px;
    flex-wrap: nowrap;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const SummaryCard = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    padding: 20px;
    margin-bottom: 30px;
  }
`;

const DayFilterContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const CustomerSelector = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (min-width: 576px) {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
`;

const BillsList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
`;

const BillCard = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  position: relative;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const Modal = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 95%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  margin: 20px auto;

  @media (min-width: 576px) {
    width: 90%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;

  @media (min-width: 576px) {
    flex-direction: row;
    gap: 10px;
    margin-top: 30px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const CustomerBillsContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const AmountInputContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-direction: column;

  @media (min-width: 576px) {
    flex-direction: row;
    align-items: center;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);

  @media (min-width: 768px) {
    padding: 60px 20px;
  }
`;

// Update existing components with responsive styles
const NewCollectionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #1cc88a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;

  &:hover {
    background-color: #17a673;
  }

  @media (min-width: 576px) {
    width: auto;
    padding: 8px 16px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;

  &:hover {
    background-color: #3a5bc7;
  }

  &:disabled {
    background-color: #b0b7d4;
    cursor: not-allowed;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }

  @media (min-width: 576px) {
    width: auto;
    padding: 8px 16px;
  }
`;

const DayButton = styled.button`
  padding: 6px 10px;
  border: 1px solid ${(props) => (props.active ? "#4e73df" : "#ddd")};
  border-radius: 20px;
  background-color: ${(props) => (props.active ? "#4e73df" : "white")};
  color: ${(props) => (props.active ? "white" : "#6c757d")};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: ${(props) => (props.active ? "#3a5bc7" : "#f8f9fc")};
    border-color: ${(props) => (props.active ? "#3a5bc7" : "#4e73df")};
  }

  @media (min-width: 576px) {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }

  @media (min-width: 576px) {
    width: auto;
    min-width: 200px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #3a5bc7;
  }

  &:disabled {
    background-color: #b0b7d4;
    cursor: not-allowed;
  }

  @media (min-width: 576px) {
    width: auto;
    flex: 1;
  }
`;

const BackButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #f8f9fc;
  color: #6c757d;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #e9ecef;
  }

  @media (min-width: 576px) {
    width: auto;
    flex: 1;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f8f9fc;
  padding: 20px;
  text-align: center;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid rgba(78, 115, 223, 0.1);
  border-radius: 50%;
  border-top-color: #4e73df;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    width: 50px;
    height: 50px;
  }
`;
// Styled Components (consistent with StaffDashboard)

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid #f0f0f0;
`;

const MaxButton = styled.button`
  padding: 0 12px;
  background-color: #f8f9fc;
  color: #4e73df;
  border: 1px solid #4e73df;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: #4e73df;
    color: white;
  }

  &:active {
    transform: scale(0.98);
  }
`;
const OverdueBadge = styled.span`
  background-color: #e74a3b;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: auto;
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #4e73df;
  white-space: nowrap;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 1rem;
  padding: 5px;
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

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #2e3a59;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #2e3a59;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalSubtitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1rem;
  color: #4e73df;
`;

const BillOption = styled.div`
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f8f9fc;
    border-color: #4e73df;
  }

  & > div {
    margin-bottom: 5px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: #e74a3b;
    font-weight: 500;
  }
`;

const SelectedBillInfo = styled.div`
  background-color: #f8f9fc;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;

  & > div {
    margin-bottom: 8px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: #e74a3b;
    font-weight: 500;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
`;

const ErrorText = styled.div`
  color: #e74a3b;
  font-size: 0.9rem;
  margin-bottom: 20px;
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

const ErrorAlert = styled.div`
  background-color: #fff5f5;
  border: 1px solid #ffd6d6;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 30px;
`;

const ErrorIcon = styled.div`
  color: #e74a3b;
  font-size: 2rem;
  margin-bottom: 15px;
`;

const ErrorMessage = styled.div`
  font-size: 1rem;
  color: #e74a3b;
  margin-bottom: 20px;
`;

const RetryButton = styled.button`
  background-color: #e74a3b;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #d62c1a;
  }

  &:disabled {
    background-color: #ee9b95;
    cursor: not-allowed;
  }
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #4e73df;
`;

const BillHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const BillNumber = styled.div`
  font-weight: 600;
  color: #2e3a59;
  font-size: 0.9rem;
`;

const BillStatus = styled.div`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Paid"
      ? "#1cc88a20"
      : props.status === "Pending"
      ? "#f6c23e20"
      : "#e74a3b20"};
  color: ${(props) =>
    props.status === "Paid"
      ? "#1cc88a"
      : props.status === "Pending"
      ? "#f6c23e"
      : "#e74a3b"};
`;

const BillRetailer = styled.div`
  font-size: 1.2rem;
  color: rgb(16, 16, 236);
  margin-bottom: 15px;
`;

const BillDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
`;

const DetailLabel = styled.div`
  font-size: 0.85rem;
  color: #6c757d;
`;

const DetailValue = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #2e3a59;
`;

const BillIcon = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  color: rgba(78, 115, 223, 0.1);
  font-size: 3rem;
  z-index: 0;
`;

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: #6c757d;
  margin: 20px 0;
`;

export default BillAssignedToday;

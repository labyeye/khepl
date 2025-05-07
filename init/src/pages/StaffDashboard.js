import React, { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import {
  FaMoneyBillWave,
  FaClipboardList,
  FaTasks,
  FaExclamationTriangle,
  FaSync,
  FaHome,
  FaMoneyCheckAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaCalendarDay,
  FaHistory,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "https://laxmi-lube.onrender.com/api";

const StaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    staffName: "",
    totalBillAmount: 0,
    totalCollectedToday: 0,
    totalBillsWithDue: 0,
    totalCompletedBills: 0,
    overdueBillsCount: 0,
    collectionsToday: [],
    collectionsHistory: []
  });

  const [staffInfo, setStaffInfo] = useState({
    name: "Loading...",
    role: "Collections",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const navigate = useNavigate();

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(`${API_BASE_URL}/users/me`, {
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

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");
  
      const response = await axios.get(`${API_BASE_URL}/staff/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      setDashboardData({
        staffName: response.data.staffName || "",
        totalBillAmount: response.data.totalBillAmount || 0,
        totalCollectedToday: response.data.totalCollectedToday || 0,
        totalBillsWithDue: response.data.totalBillsWithDue || 0,
        totalCompletedBills: response.data.totalCompletedBills || 0,
        overdueBillsCount: response.data.overdueBillsCount || 0,
        collectionsToday: response.data.collectionsToday || [],
        collectionsHistory: response.data.recentCollections || []
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch dashboard data"
      );
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
    fetchDashboardData();
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [fetchDashboardData, fetchUserInfo]);

  const handleRetry = () => {
    setRetrying(true);
    fetchDashboardData();
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); // Remove the authentication token
    navigate("/login"); // Redirect to the login page
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

  if (loading)
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading dashboard data...</p>
      </LoadingContainer>
    );

  return (
    <DashboardLayout>
      <Sidebar collapsed={sidebarCollapsed}>
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
          <NavItem active>
            <NavIcon>
              <FaHome />
            </NavIcon>
            {!sidebarCollapsed && (
              <>
                <NavText>Dashboard</NavText>
                <NavCheckmark>☑</NavCheckmark>
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
        <TopBar>
          <PageTitle>Dashboard</PageTitle>
          <HeaderActions>
            <RefreshButton onClick={handleRetry} disabled={retrying}>
              <FaSync className={retrying ? "spinning" : ""} />
              {retrying ? "Refreshing..." : "Refresh Data"}
            </RefreshButton>
          </HeaderActions>
        </TopBar>

        <ContentArea>
          {error ? (
            <ErrorAlert>
              <ErrorIcon />
              <ErrorMessage>{error}</ErrorMessage>
              <RetryButton onClick={handleRetry} disabled={retrying}>
                {retrying ? "Retrying..." : "Retry Now"}
              </RetryButton>
            </ErrorAlert>
          ) : (
            <>
              <StatsContainer>
                <StatCard>
                  <StatIcon color="#4e73df">
                    <FaMoneyBillWave />
                  </StatIcon>
                  <StatInfo>
                    <StatTitle>Total Bill Amount</StatTitle>
                    <StatValue>
                      ₹{(dashboardData.totalBillAmount || 0).toLocaleString()}
                    </StatValue>
                  </StatInfo>
                </StatCard>

                <StatCard>
                  <StatIcon color="#1cc88a">
                    <FaClipboardList />
                  </StatIcon>
                  <StatInfo>
                    <StatTitle>Collected Today</StatTitle>
                    <StatValue>
                      ₹
                      {(
                        dashboardData.totalCollectedToday || 0
                      ).toLocaleString()}
                    </StatValue>
                  </StatInfo>
                </StatCard>

                <StatCard>
                  <StatIcon color="#f6c23e">
                    <FaTasks />
                  </StatIcon>
                  <StatInfo>
                    <StatTitle>Bills With Due</StatTitle>
                    <StatValue>{dashboardData.totalBillsWithDue}</StatValue>
                  </StatInfo>
                </StatCard>

                <StatCard>
                  <StatIcon color="#36b9cc">
                    <FaCheckCircle />
                  </StatIcon>
                  <StatInfo>
                    <StatTitle>Completed Bills</StatTitle>
                    <StatValue>{dashboardData.totalCompletedBills}</StatValue>
                  </StatInfo>
                </StatCard>
              </StatsContainer>
              <DashboardContent>
                <MainSection>
                  <SectionHeader>
                    <SectionTitle>Collections Assigned Today</SectionTitle>
                    <ViewAllLink>View All</ViewAllLink>
                  </SectionHeader>
                  {dashboardData.collectionsToday.length > 0 ? (
                    <CollectionsList>
                      {dashboardData.collectionsToday.map(
                        (collection, index) => (
                          <CollectionItem key={index}>
                            <CollectionIcon>
                              <FaCalendarDay />
                            </CollectionIcon>
                            <CollectionDetails>
                              <CollectionText>
                                <strong>Bill #{collection.billNumber}</strong> -{" "}
                                {collection.retailer}
                              </CollectionText>
                              <CollectionMeta>
                                <span>
                                  Amount: ₹{collection.amount.toLocaleString()}
                                </span>
                                <span>
                                  Due: {formatDate(collection.dueDate)}
                                </span>
                              </CollectionMeta>
                            </CollectionDetails>
                            <CollectionStatus status={collection.status}>
                              {collection.status}
                            </CollectionStatus>
                          </CollectionItem>
                        )
                      )}
                    </CollectionsList>
                  ) : (
                    <EmptyState>
                      <FaMoneyCheckAlt size={48} />
                      <p>No collections assigned for today</p>
                    </EmptyState>
                  )}
                </MainSection>

                <SideSection>
                  <SectionHeader>
                    <SectionTitle>Recent Collections History</SectionTitle>
                    <ViewAllLink>View All</ViewAllLink>
                  </SectionHeader>
                  {dashboardData.collectionsHistory.length > 0 ? (
                    <HistoryList>
                      {dashboardData.collectionsHistory
                        .slice(0, 5)
                        .map((history, index) => (
                          <HistoryItem key={index}>
                            <HistoryIcon>
                              <FaHistory />
                            </HistoryIcon>
                            <HistoryDetails>
                              <HistoryText>
                                Collected ₹{history.amount.toLocaleString()}{" "}
                                from {history.retailer}
                              </HistoryText>
                              <HistoryMeta>
                                <span>Bill #{history.billNumber}</span>
                                <span>
                                  {formatDate(history.collectionDate)}
                                </span>
                              </HistoryMeta>
                            </HistoryDetails>
                          </HistoryItem>
                        ))}
                    </HistoryList>
                  ) : (
                    <EmptyState>
                      <FaHistory size={48} />
                      <p>No collection history available</p>
                    </EmptyState>
                  )}
                </SideSection>
              </DashboardContent>
            </>
          )}
        </ContentArea>
      </MainContent>
    </DashboardLayout>
  );
};
const CollectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CollectionItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: #f8f9fc;
  border-radius: 6px;
  transition: all 0.3s;
  gap: 8px;

  &:hover {
    background-color: #e9ecef;
  }

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }
`;

const HistoryItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: #f8f9fc;
  border-radius: 6px;
  transition: all 0.3s;
  gap: 8px;

  &:hover {
    background-color: #e9ecef;
  }

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }
`;

const CollectionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4e73df20;
  color: #4e73df;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  flex-shrink: 0;
`;

const CollectionDetails = styled.div`
  flex: 1;
`;

const CollectionText = styled.div`
  font-size: 0.9rem;
  color: #2e3a59;
  margin-bottom: 4px;
`;

const CollectionStatus = styled.div`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Completed"
      ? "#1cc88a20"
      : props.status === "Pending"
      ? "#f6c23e20"
      : "#e74a3b20"};
  color: ${(props) =>
    props.status === "Completed"
      ? "#1cc88a"
      : props.status === "Pending"
      ? "#f6c23e"
      : "#e74a3b"};
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const NavCheckmark = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${(props) => (props.active ? "#4e73df" : "#6c757d")};
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

const HistoryIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #36b9cc20;
  color: #36b9cc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  flex-shrink: 0;
`;

const HistoryDetails = styled.div`
  flex: 1;
`;

const HistoryText = styled.div`
  font-size: 0.9rem;
  color: #2e3a59;
  margin-bottom: 4px;
`;

const CollectionMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.75rem;
  color: #6c757d;

  @media (min-width: 480px) {
    flex-direction: row;
    gap: 15px;
  }
`;

const HistoryMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.75rem;
  color: #6c757d;

  @media (min-width: 480px) {
    flex-direction: row;
    gap: 15px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #6c757d;

  svg {
    margin-bottom: 15px;
    color: #d1d3e2;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

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
  z-index: 1;

  @media (min-width: 768px) {
    width: ${(props) => (props.collapsed ? "80px" : "250px")};
    height: 100vh;
    position: sticky;
    top: 0;
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

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;

  @media (min-width: 768px) {
    overflow-y: auto;
    max-height: 100vh;
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #2e3a59;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 15px;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

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
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 30px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
`;

const StatCard = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  display: flex;
  align-items: center;
`;

const StatIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.color ? `${props.color}20` : "#4e73df20"};
  color: ${(props) => props.color || "#4e73df"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-right: 15px;
`;

const StatInfo = styled.div`
  flex: 1;
`;

const StatTitle = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 5px;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #2e3a59;
`;

const DashboardContent = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 992px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const MainSection = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const SideSection = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2e3a59;
  margin: 0;
`;

const ViewAllLink = styled.div`
  font-size: 0.8rem;
  color: #4e73df;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
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

const ErrorIcon = styled(FaExclamationTriangle)`
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f8f9fc;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(78, 115, 223, 0.1);
  border-radius: 50%;
  border-top-color: #4e73df;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

export default StaffDashboard;

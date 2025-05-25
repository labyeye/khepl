import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  FaFileInvoiceDollar,
  FaUserTie,
  FaListAlt,
  FaMoneyBillWave,
  FaChevronRight,
} from "react-icons/fa";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("week");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          "https://kalahanu-outstanding.onrender.com/api/admin/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to load dashboard data"
          );
        }

        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);

        if (error.response) {
          if (error.response.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          setError(
            error.response.data.message || "Failed to load dashboard data"
          );
        } else if (error.request) {
          setError("Network error - please check your connection");
        } else {
          setError(error.message || "Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // Prepare chart data based on time range
  const getChartData = () => {
    if (!dashboardData?.collectionTrends) {
      return {
        labels: [],
        datasets: [],
      };
    }

    let labels = [];
    let data = [];

    switch (timeRange) {
      case "day":
        labels = dashboardData.collectionTrends.daily.labels;
        data = dashboardData.collectionTrends.daily.data;
        break;
      case "week":
        labels = dashboardData.collectionTrends.weekly.labels;
        data = dashboardData.collectionTrends.weekly.data;
        break;
      case "month":
      default:
        labels = dashboardData.collectionTrends.monthly.labels;
        data = dashboardData.collectionTrends.monthly.data;
        break;
    }

    return {
      labels,
      datasets: [
        {
          label: "Collection Amount (₹)",
          data,
          backgroundColor: "#4e73df",
          borderRadius: 4,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `Collection Trend (${
          timeRange === "day"
            ? "Daily"
            : timeRange === "week"
            ? "Weekly"
            : "Monthly"
        })`,
      },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value) => "₹" + value.toLocaleString(),
        color: "#2e3a59",
        font: {
          weight: "bold",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return "₹" + value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <Layout>
      <MainContent>
        <Header>
          <h1>Dashboard Overview</h1>
          <UserProfile>
            <img
              src="https://ui-avatars.com/api/?name=Admin&background=667eea&color=fff"
              alt="Admin"
            />
            <span>Admin</span>
          </UserProfile>
        </Header>

        {loading ? (
          <LoadingIndicator>
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </LoadingIndicator>
        ) : error ? (
          <ErrorMessage>
            <FaFileInvoiceDollar size={20} />
            <p>{error}</p>
          </ErrorMessage>
        ) : (
          <>
            <MetricsGrid>
              <MetricCard color="#4e73df">
                <div className="icon-container">
                  <FaFileInvoiceDollar size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Bill Amount</h3>
                  <p>₹{dashboardData?.totalBillAmount?.toFixed(2) || "0.00"}</p>
                </div>
              </MetricCard>

              <MetricCard color="#1cc88a">
                <div className="icon-container">
                  <FaMoneyBillWave size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Paid Today</h3>
                  <p>₹{dashboardData?.totalPaidAmount?.toFixed(2) || "0.00"}</p>
                </div>
              </MetricCard>

              <MetricCard color="#f6c23e">
                <div className="icon-container">
                  <FaListAlt size={20} />
                </div>
                <div className="metric-content">
                  <h3>Remaining Today</h3>
                  <p>
                    ₹{dashboardData?.totalRemainingAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </MetricCard>

              <MetricCard color="#36b9cc">
                <div className="icon-container">
                  <FaUserTie size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Staff</h3>
                  <p>{dashboardData?.totalStaff?.toLocaleString() || "0"}</p>
                </div>
              </MetricCard>
            </MetricsGrid>

            {/* Collection Trend Graph Section */}
            <ContentSection>
              <SectionHeader>
                <h2>Collection Trend</h2>
                <TimeRangeSelector>
                  <TimeRangeButton
                    active={timeRange === "day"}
                    onClick={() => setTimeRange("day")}
                  >
                    Day
                  </TimeRangeButton>
                  <TimeRangeButton
                    active={timeRange === "week"}
                    onClick={() => setTimeRange("week")}
                  >
                    Week
                  </TimeRangeButton>
                  <TimeRangeButton
                    active={timeRange === "month"}
                    onClick={() => setTimeRange("month")}
                  >
                    Month
                  </TimeRangeButton>
                </TimeRangeSelector>
              </SectionHeader>
              <ChartContainer>
                <Bar data={getChartData()} options={chartOptions} />
              </ChartContainer>
            </ContentSection>
            <ContentSection>
              <SectionHeader>
                <h2>DSR Performance</h2>
              </SectionHeader>
              <DSRPerformanceGrid>
                <DSRPerformanceCard>
                  <h3>Top Collectors (This Month)</h3>
                  <DSRList>
                    {dashboardData?.dsrCollections?.map((dsr, index) => (
                      <DSRItem key={dsr._id}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{dsr.dsrName}</span>
                        <span className="amount">
                          ₹{dsr.totalCollection?.toLocaleString()}
                        </span>
                      </DSRItem>
                    ))}
                  </DSRList>
                </DSRPerformanceCard>

                <DSRPerformanceCard>
                  <h3>Outstanding DSRs (All Time)</h3>
                  <DSRList>
                    {dashboardData?.outstandingDSRs?.map((dsr, index) => (
                      <DSRItem key={dsr._id}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{dsr.dsrName}</span>
                        <span className="amount">
                          ₹{dsr.totalCollection?.toLocaleString()}
                        </span>
                      </DSRItem>
                    ))}
                  </DSRList>
                </DSRPerformanceCard>
              </DSRPerformanceGrid>
            </ContentSection>

            <ContentSection>
              <SectionHeader>
                <h2>Recent Collections</h2>
                <ViewAllLink to="/admin/bill-collection-history">
                  View All <FaChevronRight size={12} />
                </ViewAllLink>
              </SectionHeader>

              <TableContainer>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Amount</th>
                      <th>Collected By</th>
                      <th>Payment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.recentCollections?.map((collection) => (
                      <tr key={collection._id}>
                        <td data-label="Bill No.">
                          {collection.bill?.billNumber || "N/A"}
                        </td>
                        <td data-label="Amount">
                          ₹{collection.amountCollected.toLocaleString()}
                        </td>
                        <td data-label="Collected By">
                          {collection.collectedBy.name}
                        </td>
                        <td data-label="Payment">
                          <PaymentBadge mode={collection.paymentMode}>
                            {collection.paymentMode}
                          </PaymentBadge>
                        </td>
                        <td data-label="Date">
                          {new Date(collection.collectedOn).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableContainer>
            </ContentSection>
          </>
        )}
      </MainContent>
    </Layout>
  );
};

const MainContent = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-x: hidden;
  background-color: #f8f9fc;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (min-width: 1200px) {
    padding: 2rem;
  }
`;
const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-top: 1rem;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TimeRangeButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${(props) => (props.active ? "#4e73df" : "#f8f9fa")};
  color: ${(props) => (props.active ? "#fff" : "#6e707e")};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${(props) => (props.active ? "#3a5ab6" : "#e9ecef")};
  }
`;
const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    color: #2e3a59;
    font-size: 1.5rem;
    margin: 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
`;
const DSRPerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const DSRPerformanceCard = styled.div`
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  h3 {
    color: #2e3a59;
    font-size: 1rem;
    margin: 0 0 1rem 0;
    font-weight: 600;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 0.75rem;
  }
`;

const DSRList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DSRItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;

  .rank {
    background-color: #4e73df;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .name {
    flex: 1;
    color: #2e3a59;
    font-weight: 500;
  }

  .amount {
    color: #1cc88a;
    font-weight: 600;
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fff;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  img {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
  }

  span {
    color: #2e3a59;
    font-weight: 500;
    font-size: 0.9rem;

    @media (min-width: 768px) {
      font-size: 1rem;
    }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
`;

const MetricCard = styled.div`
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  border-left: 4px solid ${(props) => props.color};
  transition: all 0.3s ease;
  min-height: 90px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }

  .icon-container {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: ${(props) => `${props.color}15`};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      color: ${(props) => props.color};
    }
  }

  .metric-content {
    h3 {
      color: #6e707e;
      font-size: 0.85rem;
      margin: 0 0 0.25rem 0;
      font-weight: 600;

      @media (min-width: 768px) {
        font-size: 0.95rem;
      }
    }

    p {
      color: #2e3a59;
      font-size: 1.25rem;
      margin: 0;
      font-weight: 700;

      @media (min-width: 768px) {
        font-size: 1.5rem;
      }
    }
  }
`;

const ContentSection = styled.section`
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    color: #2e3a59;
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.4rem;
    }
  }
`;

const ViewAllLink = styled(Link)`
  color: #4e73df;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s ease;

  &:hover {
    color: #2a56c6;
    text-decoration: none;
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(2px);
  }

  @media (min-width: 768px) {
    font-size: 0.95rem;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 600px;

  @media (min-width: 768px) {
    font-size: 0.9rem;
    min-width: 100%;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }

  th {
    color: #6e707e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    white-space: nowrap;
    background-color: #f9fafc;

    @media (min-width: 768px) {
      font-size: 0.8rem;
      padding: 1rem;
    }
  }

  td {
    color: #2e3a59;
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover {
    background-color: #f8f9fa;
  }

  @media (max-width: 767px) {
    min-width: 100%;

    thead {
      display: none;
    }

    tr {
      display: block;
      margin-bottom: 1rem;
      border: 1px solid #eee;
      border-radius: 0.5rem;
      padding: 0.5rem;
      position: relative;
    }

    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      text-align: right;
      border-bottom: 1px solid #f0f0f0;
      white-space: normal;

      &:last-child {
        border-bottom: none;
      }

      &::before {
        content: attr(data-label);
        float: left;
        font-weight: 600;
        color: #6e707e;
        margin-right: 1rem;
        font-size: 0.8rem;
      }
    }
  }
`;

const PaymentBadge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.mode === "Cash"
      ? "#e3faf0"
      : props.mode === "Card"
      ? "#fff8e6"
      : "#ebf5ff"};
  color: ${(props) =>
    props.mode === "Cash"
      ? "#20c997"
      : props.mode === "Card"
      ? "#ffc107"
      : "#4e73df"};
  text-transform: capitalize;
`;

const LoadingIndicator = styled.div`
  padding: 2rem;
  text-align: center;
  color: #6e707e;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(78, 115, 223, 0.1);
    border-radius: 50%;
    border-top-color: #4e73df;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const ErrorMessage = styled.div`
  padding: 1.5rem;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 0.5rem;
  margin: 1rem 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #dc3545;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

export default AdminDashboard;

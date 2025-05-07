import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { saveAs } from "file-saver";
import {
  FaFileExcel,
  FaSearch,
  FaCalendarAlt,
  FaHistory,
} from "react-icons/fa";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import Layout from "../components/Layout";
import { format } from "date-fns";

const API_BASE_URL = "https://laxmi-lube.onrender.com/api/admin/reports";

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // New state for history view
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) return;

      let url = `${API_BASE_URL}`;
      let params = {};

      if (!showHistory) {
        url = `${API_BASE_URL}/today-collections`;
      } else if (dateRange[0].startDate && dateRange[0].endDate) {
        url = `${API_BASE_URL}`;
        params = {
          startDate: format(dateRange[0].startDate, "yyyy-MM-dd"),
          endDate: format(dateRange[0].endDate, "yyyy-MM-dd"),
        };
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(error.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchReports();
  }, [showHistory]);

  const toggleHistoryView = () => {
    setShowHistory(!showHistory);
    setShowDatePicker(false);
  };

  const handleDateFilter = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}?startDate=${format(
          dateRange[0].startDate,
          "yyyy-MM-dd"
        )}&endDate=${format(dateRange[0].endDate, "yyyy-MM-dd")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReports(response.data);
      setShowDatePicker(false);
    } catch (error) {
      console.error("Error filtering reports:", error);
      setError(error.response?.data?.message || "Failed to filter reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTodayCollections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/export/today-collections/excel`, // Changed this line
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const filename = `today_collections_${format(
        new Date(),
        "yyyyMMdd"
      )}.xlsx`;
      saveAs(blob, filename);
    } catch (error) {
      console.error("Error downloading today's collections:", error);
      setError("Failed to download today's collections");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      report.billNumber?.toLowerCase().includes(searchTermLower) ||
      report.retailer?.toLowerCase().includes(searchTermLower) ||
      report.assignedToName?.toLowerCase().includes(searchTermLower) ||
      report.status?.toLowerCase().includes(searchTermLower)
    );
  });
  return (
    <Layout>
      <MainContent>
        <Header>
          <h1>
            {showHistory ? "Historical Collections" : "Today's Collections"}
          </h1>
          <ActionsContainer>
            <HistoryButton onClick={toggleHistoryView}>
              <FaHistory /> {showHistory ? "View Today" : "View History"}
            </HistoryButton>
            <ExportButton onClick={handleDownloadTodayCollections}>
              <FaFileExcel /> Export {showHistory ? "Selected" : "Today's"}{" "}
              Collections
            </ExportButton>
          </ActionsContainer>
        </Header>

        {showHistory && (
          <ControlsContainer>
            <SearchContainer>
              <FaSearch />
              <SearchInput
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>

            <DateFilterContainer>
              <DateFilterButton
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FaCalendarAlt /> Filter by Date
              </DateFilterButton>

              {showDatePicker && (
                <DatePickerContainer>
                  <DateRangePicker
                    onChange={(item) => setDateRange([item.selection])}
                    showSelectionPreview={true}
                    moveRangeOnFirstSelection={false}
                    months={2}
                    ranges={dateRange}
                    direction="horizontal"
                  />
                  <ApplyDateFilter onClick={handleDateFilter}>
                    Apply Filter
                  </ApplyDateFilter>
                </DatePickerContainer>
              )}
            </DateFilterContainer>
          </ControlsContainer>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? (
          <LoadingIndicator>Loading reports...</LoadingIndicator>
        ) : (
          <ReportTable>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Bill Number</th>
                <th>Bill Date</th>
                <th>Collection Amount</th>
                <th>Due Amount</th>
                <th>Payment Mode</th>
                <th>Collection Date</th>
                <th>Collected By</th>
                <th>Payment Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.flatMap((report) =>
                  report.collections.length > 0
                    ? report.collections.map((collection) => (
                        <tr key={`${report._id}-${collection._id}`}>
                          <td>{report.retailer}</td>
                          <td>{report.billNumber}</td>
                          <td>
                            {format(new Date(report.billDate), "dd/MM/yyyy")}
                          </td>
                          <td>
                            ₹
                            {collection.amountCollected?.toLocaleString() ||
                              "0"}
                          </td>
                          <td>₹{report.dueAmount?.toLocaleString() || "0"}</td>
                          <td>{collection.paymentMode}</td>
                          <td>
                            {format(
                              new Date(collection.paymentDate),
                              "dd/MM/yyyy"
                            )}
                          </td>
                          <td>{collection.collectedByName || "System"}</td>
                          <td>
                            <PaymentDetails>
                              {collection.paymentMode === "cash" ? (
                                <div>
                                  <strong>Receipt:</strong>{" "}
                                  {collection.paymentDetails?.receiptNumber ||
                                    "Money Received"}
                                </div>
                              ) : collection.paymentMode === "upi" ? (
                                <div>
                                  <strong>Transaction ID:</strong>{" "}
                                  {collection.paymentDetails?.transactionId ||
                                    collection.paymentDetails
                                      ?.upiTransactionId ||
                                    "N/A"}
                                </div>
                              ) : collection.paymentMode === "cheque" ? (
                                <>
                                  <div>
                                    <strong>Cheque No:</strong>{" "}
                                    {collection.paymentDetails?.chequeNumber ||
                                      "N/A"}
                                  </div>
                                  <div>
                                    <strong>Bank:</strong>{" "}
                                    {collection.paymentDetails?.bankName ||
                                      "N/A"}
                                  </div>
                                </>
                              ) : collection.paymentDetails ? (
                                Object.entries(collection.paymentDetails).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <strong>{key}:</strong> {value || "N/A"}
                                    </div>
                                  )
                                )
                              ) : (
                                <div>No payment details</div>
                              )}
                            </PaymentDetails>
                          </td>
                        </tr>
                      ))
                    : [
                        <tr key={report._id}>
                          <td>{report.retailer}</td>
                          <td>{report.billNumber}</td>
                          <td>
                            {format(new Date(report.billDate), "dd/MM/yyyy")}
                          </td>
                          <td>₹0</td>
                          <td>₹{report.dueAmount?.toLocaleString() || "0"}</td>
                          <td>N/A</td>
                          <td>N/A</td>
                          <td>N/A</td>
                          <td>No collections</td>
                        </tr>,
                      ]
                )
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </ReportTable>
        )}
      </MainContent>
    </Layout>
  );
};

// Styled components (responsive version)
const MainContent = styled.div`
  flex: 1;
  padding: 15px;
  overflow-x: auto;

  @media (min-width: 768px) {
    padding: 20px;
  }

  @media (min-width: 1200px) {
    padding: 30px;
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
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

const ActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;

  @media (min-width: 576px) {
    flex-direction: row;
    gap: 15px;
    width: auto;
  }
`;

const HistoryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  font-size: 0.9rem;

  &:hover {
    background-color: #5a6268;
  }

  @media (min-width: 576px) {
    margin-right: 15px;
    justify-content: flex-start;
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  font-size: 0.9rem;

  &:hover {
    background-color: #3a5bc7;
  }

  @media (min-width: 576px) {
    justify-content: flex-start;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #f8f9fc;
  border-radius: 4px;
  padding: 8px 12px;
  border: 1px solid #d1d3e2;
  width: 100%;

  @media (min-width: 576px) {
    width: 300px;
  }

  svg {
    color: #b7b9cc;
    margin-right: 8px;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  color: #6e707e;
  font-size: 0.9rem;

  &::placeholder {
    color: #b7b9cc;
  }
`;

const DateFilterContainer = styled.div`
  position: relative;
  width: 100%;

  @media (min-width: 576px) {
    width: auto;
  }
`;

const DateFilterButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 15px;
  background-color: #f8f9fc;
  color: #6e707e;
  border: 1px solid #d1d3e2;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;
  font-size: 0.9rem;

  &:hover {
    background-color: #eaecf4;
  }

  @media (min-width: 576px) {
    width: auto;
    justify-content: flex-start;
  }
`;

const DatePickerContainer = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  background: white;
  border: 1px solid #d1d3e2;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 5px;
  width: 100%;

  @media (min-width: 576px) {
    width: auto;
  }
`;

const ApplyDateFilter = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 0 0 4px 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  font-size: 0.9rem;

  &:hover {
    background-color: #3a5bc7;
  }
`;

const ReportTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 0.8rem;

  @media (min-width: 768px) {
    font-size: 0.9rem;
  }

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid #eee;

    @media (min-width: 768px) {
      padding: 12px 15px;
    }
  }

  th {
    color: #6e707e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: #f8f9fc;
    position: sticky;
    top: 0;
    font-size: 0.7rem;

    @media (min-width: 768px) {
      font-size: 0.8rem;
    }
  }

  td {
    color: #2e3a59;
    vertical-align: top;
  }

  tr:hover {
    background-color: #f9f9f9;
  }
`;

const PaymentDetails = styled.div`
  margin-top: 5px;
  padding: 6px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 0.7rem;
  border-left: 3px solid #4e73df;

  @media (min-width: 768px) {
    padding: 8px;
    font-size: 0.8rem;
  }

  div {
    margin-bottom: 5px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    @media (min-width: 576px) {
      flex-direction: row;
      gap: 8px;
    }

    strong {
      min-width: 80px;
      display: inline-block;
      color: #6e707e;

      @media (min-width: 768px) {
        min-width: 120px;
      }
    }
  }

  &:empty {
    display: none;
  }
`;

const LoadingIndicator = styled.div`
  padding: 20px;
  text-align: center;
  color: #6e707e;
  font-size: 0.9rem;

  @media (min-width: 768px) {
    padding: 40px;
    font-size: 1rem;
  }
`;

const ErrorMessage = styled.div`
  padding: 15px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin: 15px 0;
  text-align: center;
  font-size: 0.9rem;

  @media (min-width: 768px) {
    padding: 20px;
    margin: 20px 0;
  }
`;

export default ReportPage;

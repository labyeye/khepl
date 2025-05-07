import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BillsHistory = () => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await axios.get('https://laxmi-lube.onrender.com/api/staff/bills-history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setBills(response.data);
      } catch (error) {
        console.error('Error fetching bills history:', error);
      }
    };

    fetchBills();
  }, []);

  return (
    <div>
      <h1>Bills History</h1>
      <ul>
        {bills.map((bill) => (
          <li key={bill._id}>
            Bill ID: {bill.billNumber}, Amount: ₹{bill.amount}, Status: {bill.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BillsHistory;

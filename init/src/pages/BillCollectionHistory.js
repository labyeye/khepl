import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Layout from '../components/Layout';

const BillCollectionHistory = () => {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await axios.get('https://laxmi-lube.onrender.com/api/collections');
        setCollections(response.data);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };
    
    fetchCollections();
  }, []);

  return (
    <Layout>
        <h1>Bill Collection History</h1>
      <Table>
        <thead>
          <tr>
            <th>Bill Number</th>
            <th>Amount Collected</th>
            <th>Collected By</th>
            <th>Payment Mode</th>
            <th>Collection Date</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection) => (
            <tr key={collection._id}>
              <td>{collection.bill.billNumber}</td>
              <td>{collection.amountCollected}</td>
              <td>{collection.collectedBy.name}</td>
              <td>{collection.paymentMode}</td>
              <td>{new Date(collection.collectedOn).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Layout>
  );
};

export default BillCollectionHistory;



const Table = styled.table`
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 10px;
    text-align: left;
    border: 1px solid #ddd;
  }

  th {
    background-color: #f4f4f4;
  }
`;

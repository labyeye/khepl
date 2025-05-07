import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import BillCollectionHistory from './pages/BillCollectionHistory';
import BillsAdd from './pages/BillAdd';
import Users from './pages/Users';
import Logout from './pages/Logout';
import BillAssignedToday from './pages/BillAssignedToday';
import BillsPage from './pages/BillsPage';
import CollectionsHistory from './pages/CollectionHistoryPage';
import ReportPage from './pages/ReportPage';

const App = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // Log to verify the token and user
  console.log("Current User:", user);  // Debugging log
  console.log("Current Token:", token);  // Debugging log

  // Check if token exists and if it has expired
  const isTokenExpired = token && Date.now() > JSON.parse(atob(token.split('.')[1])).exp * 1000;

  if (isTokenExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" />;
  }

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Redirect after login based on user role */}
        <Route path="/" element={
          user ? <Navigate to={`/${user.role}`} /> : <Navigate to="/login" />
        } />

        {/* Admin Dashboard Route */}
        <Route path="/admin" element={
          user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />
        } />

        {/* Staff Dashboard Route */}
        <Route path="/staff" element={
          user?.role === 'staff' ? <StaffDashboard /> : <Navigate to="/login" />
        } />

        {/* Bill Collection History Route */}
        <Route path="/admin/bill-collection-history" element={
          user?.role === 'admin' ? <BillCollectionHistory /> : <Navigate to="/login" />
        } />

        {/* Bills Add Route */}
        <Route path="/admin/bills-add" element={
          user?.role === 'admin' ? <BillsAdd /> : <Navigate to="/login" />
        } />

        {/* Users Management Route */}
        <Route path="/admin/users" element={
          user?.role === 'admin' ? <Users /> : <Navigate to="/login" />
        } />

        {/* Bill Assigned Today (For Staff) */}
        <Route path="/staff/bill-assigned-today" element={
          user?.role === 'staff' ? <BillAssignedToday /> : <Navigate to="/login" />
        } />
         <Route path="/admin/reports" element={
          user?.role === 'admin' ? <ReportPage /> : <Navigate to="/login" />
        } />

        {/* Admin Bills Page */}
        <Route path="/admin/bills" element={
          user?.role === 'admin' ? <BillsPage /> : <Navigate to="/login" />
        } />
        <Route path="/staff/collections-history" element={<CollectionsHistory />} />

        {/* Logout Route */}
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </Router>
  );
};

export default App;

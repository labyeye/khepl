const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const billRoutes = require('./routes/billRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes'); 
const staffRoutes = require('./routes/staffRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const retailerRoutes = require('./routes/retailerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin', adminDashboardRoutes); 
app.use('/api/staff', staffRoutes); 
app.use('/api/admin/reports', reportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
const PORT = 2500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Set the timezone for the entire application
process.env.TZ = 'Asia/Kolkata';
console.log('Application timezone set to:', process.env.TZ);

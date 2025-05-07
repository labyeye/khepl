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
const PORT = 2500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

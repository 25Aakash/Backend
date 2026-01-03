// MongoDB connection setup for ShopkeeperMarketplace backend
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopkeeper_marketplace';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

module.exports = mongoose;

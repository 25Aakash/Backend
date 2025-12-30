// Basic Express server for ShopkeeperMarketplace
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// GST routes
app.use('/api/gst', require('./routes/gst'));

// Products routes
app.use('/api/products', require('./routes/products'));

// Shops routes
app.use('/api/shops', require('./routes/shops'));

// Cart routes
app.use('/api/cart', require('./routes/cart'));

// Orders routes
app.use('/api/orders', require('./routes/orders'));

// Categories routes
app.use('/api/categories', require('./routes/categories'));

// Health check route
app.get('/api', (req, res) => {
  res.json({ message: 'ShopkeeperMarketplace backend is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

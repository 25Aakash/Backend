const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret'; // Change this in production

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Add user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user is a shopkeeper
const isShopkeeper = (req, res, next) => {
  if (req.user.userType !== 'shopkeeper') {
    return res.status(403).json({ error: 'Access denied. Shopkeeper only.' });
  }
  next();
};

// Middleware to check if user is a customer
const isCustomer = (req, res, next) => {
  if (req.user.userType !== 'customer') {
    return res.status(403).json({ error: 'Access denied. Customer only.' });
  }
  next();
};

module.exports = { verifyToken, isShopkeeper, isCustomer, JWT_SECRET };

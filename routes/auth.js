const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Shopkeeper = require('../models/Shopkeeper');
const Customer = require('../models/Customer');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register route
router.post('/register', async (req, res) => {
  const { userType, name, email, password, phone, address, gst_number, business_name } = req.body;
  
  if (!userType || !name || !email || !password || !phone) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  try {
    if (userType === 'shopkeeper') {
      // Check if shopkeeper already exists
      const existing = await Shopkeeper.findOne({ 
        $or: [{ email }, { gst_number }] 
      });
      
      if (existing) {
        return res.status(409).json({ error: 'Shopkeeper with this email or GST number already exists' });
      }

      // Generate shop code
      const shop_code = `SHOP${Date.now().toString(36).toUpperCase()}`;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create shopkeeper
      const shopkeeper = new Shopkeeper({
        name,
        email,
        password: hashedPassword,
        gst_number,
        shop_code,
        business_name,
        address: address || '',
        phone
      });
      
      await shopkeeper.save();
      
      res.json({ 
        message: 'Shopkeeper registered successfully', 
        shopCode: shop_code 
      });
      
    } else if (userType === 'customer') {
      // Check if customer already exists
      const existing = await Customer.findOne({ email });
      
      if (existing) {
        return res.status(409).json({ error: 'Customer with this email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create customer
      const customer = new Customer({
        name,
        email,
        password: hashedPassword,
        phone,
        address: address || ''
      });
      
      await customer.save();
      
      res.json({ message: 'Customer registered successfully' });
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password, userType, shopCode } = req.body;
  
  if (!email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (userType === 'customer' && !shopCode) {
    return res.status(400).json({ error: 'Shop code is required for customer login' });
  }
  
  try {
    let user;
    
    if (userType === 'shopkeeper') {
      user = await Shopkeeper.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
    } else if (userType === 'customer') {
      // Verify shop code first
      const shopkeeper = await Shopkeeper.findOne({ shop_code: shopCode });
      
      if (!shopkeeper) {
        return res.status(404).json({ error: 'Invalid shop code' });
      }
      
      user = await Customer.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Link customer to shopkeeper
      if (!user.shopkeeper_id || user.shopkeeper_id.toString() !== shopkeeper._id.toString()) {
        user.shopkeeper_id = shopkeeper._id;
        await user.save();
      }
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        userType,
        shopkeeper_id: user.shopkeeper_id || user._id
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ token, user: { ...userResponse, userType } });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { id, userType } = req.user;
    
    let user;
    
    if (userType === 'shopkeeper') {
      user = await Shopkeeper.findById(id).select('-password');
    } else if (userType === 'customer') {
      user = await Customer.findById(id).select('-password');
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: { ...user.toObject(), userType } });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

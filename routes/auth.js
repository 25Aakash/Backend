const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret'; // Change this in production

// Register route (separate tables)
router.post('/register', async (req, res) => {
  const { userType, name, email, password, phone, address, gst_number, business_name, shopCode } = req.body;
  if (!userType || !name || !email || !password || !phone) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  try {
    let table, uniqueField, uniqueValue, insertFields, insertValues, checkQuery;
    if (userType === 'shopkeeper') {
      // Generate shop code if not provided
      const generatedShopCode = shopCode || `SHOP${Date.now().toString(36).toUpperCase()}`;
      table = 'shopkeepers';
      uniqueField = 'email';
      uniqueValue = email;
      checkQuery = 'SELECT id FROM shopkeepers WHERE email = ? OR gst_number = ? OR shop_code = ?';
      insertFields = 'name, email, password, gst_number, shop_code, business_name, address, phone';
      insertValues = [name, email, await bcrypt.hash(password, 10), gst_number, generatedShopCode, business_name, address, phone];
    } else if (userType === 'customer') {
      if (!shopCode) {
        return res.status(400).json({ error: 'Shop code is required for customer registration' });
      }
      // Verify shop code exists
      const [shopRows] = await db.query('SELECT id FROM shopkeepers WHERE shop_code = ?', [shopCode]);
      if (shopRows.length === 0) {
        return res.status(404).json({ error: 'Invalid shop code' });
      }
      table = 'customers';
      uniqueField = 'email';
      uniqueValue = email;
      checkQuery = 'SELECT id FROM customers WHERE email = ?';
      insertFields = 'name, email, password, shopkeeper_id, phone, address';
      insertValues = [name, email, await bcrypt.hash(password, 10), shopRows[0].id, phone, address];
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    // Check if user exists
    const [rows] = await db.query(checkQuery, userType === 'shopkeeper' ? [email, gst_number, generatedShopCode || ''] : [email]);
    if (rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    // Insert user
    await db.query(`INSERT INTO ${table} (${insertFields}) VALUES (${insertFields.split(',').map(() => '?').join(',')})`, insertValues);
    
    // Return shop code for shopkeepers
    if (userType === 'shopkeeper') {
      res.json({ message: 'User registered successfully', shopCode: insertValues[4] });
    } else {
      res.json({ message: 'User registered successfully' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route (separate tables)
router.post('/login', async (req, res) => {
  const { email, password, userType, shopCode } = req.body;
  if (!email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (userType === 'customer' && !shopCode) {
    return res.status(400).json({ error: 'Shop code is required for customer login' });
  }
  
  try {
    let table, selectFields;
    if (userType === 'shopkeeper') {
      table = 'shopkeepers';
      selectFields = 'id, name, email, password, gst_number, shop_code, business_name, address, phone';
    } else if (userType === 'customer') {
      // First verify shop code
      const [shopRows] = await db.query('SELECT id, business_name FROM shopkeepers WHERE shop_code = ?', [shopCode]);
      if (shopRows.length === 0) {
        return res.status(404).json({ error: 'Invalid shop code' });
      }
      const shopkeeper_id = shopRows[0].id;
      table = 'customers';
      selectFields = 'id, name, email, password, shopkeeper_id, phone, address';
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    const [rows] = await db.query(`SELECT ${selectFields} FROM ${table} WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    
    // For customers, verify they belong to the shop
    if (userType === 'customer') {
      const [shopRows] = await db.query('SELECT id FROM shopkeepers WHERE shop_code = ?', [shopCode]);
      if (user.shopkeeper_id !== shopRows[0].id) {
        return res.status(403).json({ error: 'You are not registered with this shop' });
      }
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email, userType, shopkeeper_id: user.shopkeeper_id || user.id }, JWT_SECRET, { expiresIn: '7d' });
    // Remove password from user object
    delete user.password;
    res.json({ token, user: { ...user, userType } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
  }
});

// Get profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { id, userType } = req.user;
    
    let table, selectFields;
    if (userType === 'shopkeeper') {
      table = 'shopkeepers';
      selectFields = 'id, name, email, gst_number, business_name, address, phone, created_at';
    } else if (userType === 'customer') {
      table = 'customers';
      selectFields = 'id, name, email, phone, address, created_at';
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    const [rows] = await db.query(`SELECT ${selectFields} FROM ${table} WHERE id = ?`, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: { ...rows[0], userType } });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

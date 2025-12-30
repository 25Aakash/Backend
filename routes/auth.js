const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret'; // Change this in production

// Register route (separate tables)
router.post('/register', async (req, res) => {
  const { userType, name, email, password, phone, address, gst_number, business_name } = req.body;
  if (!userType || !name || !email || !password || !phone) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  try {
    let table, uniqueField, uniqueValue, insertFields, insertValues, checkQuery;
    if (userType === 'shopkeeper') {
      table = 'shopkeepers';
      uniqueField = 'email';
      uniqueValue = email;
      checkQuery = 'SELECT id FROM shopkeepers WHERE email = ? OR gst_number = ?';
      insertFields = 'name, email, password, gst_number, business_name, address, phone';
      insertValues = [name, email, await bcrypt.hash(password, 10), gst_number, business_name, address, phone];
    } else if (userType === 'customer') {
      table = 'customers';
      uniqueField = 'email';
      uniqueValue = email;
      checkQuery = 'SELECT id FROM customers WHERE email = ?';
      insertFields = 'name, email, password, phone, address';
      insertValues = [name, email, await bcrypt.hash(password, 10), phone, address];
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    // Check if user exists
    const [rows] = await db.query(checkQuery, userType === 'shopkeeper' ? [email, gst_number] : [email]);
    if (rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    // Insert user
    await db.query(`INSERT INTO ${table} (${insertFields}) VALUES (${insertFields.split(',').map(() => '?').join(',')})`, insertValues);
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route (separate tables)
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  if (!email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    let table, selectFields;
    if (userType === 'shopkeeper') {
      table = 'shopkeepers';
      selectFields = 'id, name, email, password, gst_number, business_name, address, phone';
    } else if (userType === 'customer') {
      table = 'customers';
      selectFields = 'id, name, email, password, phone, address';
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    const [rows] = await db.query(`SELECT ${selectFields} FROM ${table} WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email, userType }, JWT_SECRET, { expiresIn: '7d' });
    // Remove password from user object
    delete user.password;
    res.json({ token, user: { ...user, userType } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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

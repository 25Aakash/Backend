const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all shops
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, business_name, email, gst_number, address, phone, created_at
      FROM shopkeepers
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shop by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, business_name, email, gst_number, address, phone, created_at
      FROM shopkeepers
      WHERE id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    // Get product count for this shop
    const [productCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE shopkeeper_id = ?', [req.params.id]);
    
    res.json({
      ...rows[0],
      productCount: productCount[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search shops
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const [rows] = await db.query(`
      SELECT id, name, business_name, email, gst_number, address, phone, created_at
      FROM shopkeepers
      WHERE business_name LIKE ? OR name LIKE ? OR address LIKE ?
      ORDER BY created_at DESC
    `, [searchQuery, searchQuery, searchQuery]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

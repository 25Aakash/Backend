const express = require('express');
const db = require('../db');
const { verifyToken, isShopkeeper } = require('../middleware/auth');
const router = express.Router();

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, s.business_name, s.name as shopkeeper_name, 
             sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN shopkeepers s ON p.shopkeeper_id = s.id
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, s.business_name, s.name as shopkeeper_name, s.address as shop_address,
             sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN shopkeepers s ON p.shopkeeper_id = s.id
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by shopkeeper (public)
router.get('/shop/:shopkeeper_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      WHERE p.shopkeeper_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.shopkeeper_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by category (public)
router.get('/category/:category_id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, s.business_name, s.name as shopkeeper_name,
             sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN shopkeepers s ON p.shopkeeper_id = s.id
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      WHERE c.id = ?
      ORDER BY p.created_at DESC
    `, [req.params.category_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search products (public)
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const [rows] = await db.query(`
      SELECT p.*, s.business_name, s.name as shopkeeper_name,
             sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN shopkeepers s ON p.shopkeeper_id = s.id
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      WHERE p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?
      ORDER BY p.created_at DESC
    `, [searchQuery, searchQuery, searchQuery]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my products (shopkeeper only)
router.get('/my/products', verifyToken, isShopkeeper, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, sub.name as subcategory_name, c.name as category_name
      FROM products p
      JOIN subcategories sub ON p.subcategory_id = sub.id
      JOIN categories c ON sub.category_id = c.id
      WHERE p.shopkeeper_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (shopkeeper only)
router.post('/', verifyToken, isShopkeeper, async (req, res) => {
  const { name, description, price, stock, subcategory_id, image_url } = req.body;
  
  if (!name || !price || !subcategory_id) {
    return res.status(400).json({ error: 'Name, price, and subcategory are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO products (shopkeeper_id, name, description, price, stock, subcategory_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, description, price, stock || 0, subcategory_id, image_url]
    );
    
    res.status(201).json({ 
      message: 'Product created successfully', 
      productId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (shopkeeper only)
router.put('/:id', verifyToken, isShopkeeper, async (req, res) => {
  const { name, description, price, stock, subcategory_id, image_url } = req.body;
  
  try {
    // Check if product belongs to this shopkeeper
    const [existing] = await db.query('SELECT id FROM products WHERE id = ? AND shopkeeper_id = ?', [req.params.id, req.user.id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    await db.query(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, subcategory_id = ?, image_url = ? WHERE id = ?',
      [name, description, price, stock, subcategory_id, image_url, req.params.id]
    );
    
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (shopkeeper only)
router.delete('/:id', verifyToken, isShopkeeper, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ? AND shopkeeper_id = ?', [req.params.id, req.user.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

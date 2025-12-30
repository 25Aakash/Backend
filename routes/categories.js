const express = require('express');
const db = require('../db');
const { verifyToken, isShopkeeper } = require('../middleware/auth');
const router = express.Router();

// Get all categories with subcategories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    
    const result = [];
    
    for (const category of categories) {
      const [subcategories] = await db.query(
        'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name',
        [category.id]
      );
      
      result.push({
        ...category,
        subcategories
      });
    }
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single category with subcategories
router.get('/:id', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const [subcategories] = await db.query(
      'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name',
      [req.params.id]
    );
    
    res.json({
      ...categories[0],
      subcategories
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new category (shopkeeper only)
router.post('/', verifyToken, isShopkeeper, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Check if category already exists
    const [existing] = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    
    const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    
    res.status(201).json({ 
      id: result.insertId, 
      name,
      message: 'Category created successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new subcategory (shopkeeper only)
router.post('/:categoryId/subcategories', verifyToken, isShopkeeper, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subcategory name is required' });
    }
    
    // Check if category exists
    const [category] = await db.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (category.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if subcategory already exists in this category
    const [existing] = await db.query(
      'SELECT id FROM subcategories WHERE category_id = ? AND LOWER(name) = LOWER(?)',
      [categoryId, name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Subcategory already exists in this category' });
    }
    
    const [result] = await db.query(
      'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
      [categoryId, name]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      category_id: parseInt(categoryId),
      name,
      message: 'Subcategory created successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

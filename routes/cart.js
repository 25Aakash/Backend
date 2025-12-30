const express = require('express');
const db = require('../db');
const { verifyToken, isCustomer } = require('../middleware/auth');
const router = express.Router();

// Get cart items for customer
router.get('/', verifyToken, isCustomer, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.quantity, c.created_at,
             p.id as product_id, p.name, p.description, p.price, p.stock, p.image_url,
             s.id as shopkeeper_id, s.business_name, s.name as shopkeeper_name
      FROM cart c
      JOIN products p ON c.product_id = p.id
      JOIN shopkeepers s ON p.shopkeeper_id = s.id
      WHERE c.customer_id = ?
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to cart
router.post('/', verifyToken, isCustomer, async (req, res) => {
  const { product_id, quantity } = req.body;
  
  if (!product_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Valid product_id and quantity required' });
  }

  try {
    // Check if product exists and has stock
    const [product] = await db.query('SELECT stock FROM products WHERE id = ?', [product_id]);
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product[0].stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const [existing] = await db.query('SELECT id, quantity FROM cart WHERE customer_id = ? AND product_id = ?', [req.user.id, product_id]);
    
    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + quantity;
      if (product[0].stock < newQuantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      
      await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [newQuantity, existing[0].id]);
      res.json({ message: 'Cart updated successfully' });
    } else {
      // Add new item
      await db.query('INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
      res.status(201).json({ message: 'Item added to cart' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update cart item quantity
router.put('/:id', verifyToken, isCustomer, async (req, res) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Valid quantity required' });
  }

  try {
    // Check if cart item belongs to customer
    const [cartItem] = await db.query('SELECT product_id FROM cart WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]);
    
    if (cartItem.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    const [product] = await db.query('SELECT stock FROM products WHERE id = ?', [cartItem[0].product_id]);
    
    if (product[0].stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, req.params.id]);
    res.json({ message: 'Cart updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from cart
router.delete('/:id', verifyToken, isCustomer, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM cart WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear entire cart
router.delete('/', verifyToken, isCustomer, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE customer_id = ?', [req.user.id]);
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

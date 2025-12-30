const express = require('express');
const db = require('../db');
const { verifyToken, isCustomer, isShopkeeper } = require('../middleware/auth');
const router = express.Router();

// Create order from cart (customer only)
router.post('/', verifyToken, isCustomer, async (req, res) => {
  const { shopkeeper_id, delivery_address, phone } = req.body;
  
  if (!shopkeeper_id || !delivery_address || !phone) {
    return res.status(400).json({ error: 'Shopkeeper ID, delivery address, and phone are required' });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get cart items for this customer and shopkeeper
    const [cartItems] = await connection.query(`
      SELECT c.id as cart_id, c.product_id, c.quantity, p.price, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = ? AND p.shopkeeper_id = ?
    `, [req.user.id, shopkeeper_id]);

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No items in cart for this shop' });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ error: `Insufficient stock for product ID ${item.product_id}` });
      }
    }

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, shopkeeper_id, total_amount, delivery_address, phone) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, shopkeeper_id, total, delivery_address, phone]
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock
    for (const item of cartItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );

      await connection.query('DELETE FROM cart WHERE id = ?', [item.cart_id]);
    }

    await connection.commit();
    
    res.status(201).json({ 
      message: 'Order placed successfully', 
      orderId,
      total
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get customer orders (customer only)
router.get('/my-orders', verifyToken, isCustomer, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, s.business_name, s.name as shopkeeper_name, s.phone as shop_phone
      FROM orders o
      JOIN shopkeepers s ON o.shopkeeper_id = s.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shopkeeper orders (shopkeeper only)
router.get('/shop-orders', verifyToken, isShopkeeper, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.shopkeeper_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order details with items
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // Get order
    const [orders] = await db.query(`
      SELECT o.*, 
             s.business_name, s.name as shopkeeper_name, s.phone as shop_phone, s.address as shop_address,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM orders o
      JOIN shopkeepers s ON o.shopkeeper_id = s.id
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Verify access
    if (req.user.userType === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.userType === 'shopkeeper' && order.shopkeeper_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get order items
    const [items] = await db.query(`
      SELECT oi.*, p.name, p.description, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status (shopkeeper only)
router.put('/:id/status', verifyToken, isShopkeeper, async (req, res) => {
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status required' });
  }

  try {
    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ? AND shopkeeper_id = ?',
      [status, req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel order (customer only, only if pending)
router.put('/:id/cancel', verifyToken, isCustomer, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get order
    const [orders] = await connection.query(
      'SELECT id, status FROM orders WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orders[0].status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    // Get order items to restore stock
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    // Restore stock
    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Update order status
    await connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', req.params.id]
    );

    await connection.commit();
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;

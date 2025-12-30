const express = require('express');
const { verifyGSTNumber } = require('../services/gstService');
const router = express.Router();

// POST /api/gst/verify
router.post('/verify', async (req, res) => {
  const { gstNumber } = req.body;
  if (!gstNumber) {
    return res.status(400).json({ error: 'GST number is required' });
  }
  try {
    const details = await verifyGSTNumber(gstNumber);
    if (details.isValid) {
      res.json(details);
    } else {
      res.status(404).json({ error: details.error || 'Invalid GST number' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify GST number' });
  }
});

module.exports = router;

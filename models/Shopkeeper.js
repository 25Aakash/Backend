const mongoose = require('mongoose');

const shopkeeperSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  gst_number: {
    type: String,
    required: true,
    unique: true
  },
  shop_code: {
    type: String,
    required: true,
    unique: true
  },
  business_name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Shopkeeper', shopkeeperSchema);

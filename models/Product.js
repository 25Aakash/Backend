const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shopkeeper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shopkeeper',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    default: 'General'
  },
  image_url: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);

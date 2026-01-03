const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  shopkeeper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shopkeeper',
    required: true
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);

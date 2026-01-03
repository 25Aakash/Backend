const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
  shopkeeper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shopkeeper',
    default: null
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);

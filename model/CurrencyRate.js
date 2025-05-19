const mongoose = require('mongoose');

const CurrencyRateSchema = new mongoose.Schema({
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true,
    unique: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  base: {
    type: String,
    default: 'USD',
  },
  rates: {
    type: Map,
    of: Number,
    required: true,
  },
  isEntered: {
    type: Boolean,
    default: false,
  }
});

const CurrencyRate = mongoose.model('CurrencyRate', CurrencyRateSchema);
module.exports = CurrencyRate;

const fetch = require('node-fetch');
const CurrencyRate = require('../model/CurrencyRate');

const saveDailyRates = async () => {
  const today = new Date().toISOString().split('T')[0];

  // Check if today's rate already exists and is marked as entered
  const existingEntry = await CurrencyRate.findOne({ date: today });

  if (existingEntry && existingEntry.isEntered) {
    console.log('Currency data already entered for today.');
    return;
  }

  try {
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${today}/v1/currencies/usd.json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.usd) {
      await CurrencyRate.findOneAndUpdate(
        { date: today },
        {
          date: today,
          base: 'USD',
          rates: data.usd,
          timestamp: new Date(),
          isEntered: true
        },
        { upsert: true, new: true }
      );
      console.log('Currency rates saved for:', today);
    } else {
      console.error('Currency data not found in API response.');
    }
  } catch (error) {
    console.error('Failed to fetch/save currency data:', error.message);
  }
};

module.exports = { saveDailyRates };

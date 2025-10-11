// Allowed currencies for deposits and withdrawals
const ALLOWED_CURRENCIES = {
  // USDT BEP-20 (Binance Smart Chain) - Primary currency
  usdtbsc: {
    code: 'usdtbsc',
    name: 'USDT BEP-20',
    network: 'Binance Smart Chain (BSC)',
    symbol: 'USDT',
    decimals: 6,
    minAmount: 1, // Minimum $1 USD
    enabled: true
  }
};

// Get list of allowed currency codes
const getAllowedCurrencyCodes = () => {
  return Object.keys(ALLOWED_CURRENCIES).filter(
    code => ALLOWED_CURRENCIES[code].enabled
  );
};

// Check if a currency is allowed
const isCurrencyAllowed = (currency) => {
  const normalizedCurrency = currency.toLowerCase().trim();
  return getAllowedCurrencyCodes().includes(normalizedCurrency);
};

// Get currency details
const getCurrencyDetails = (currency) => {
  const normalizedCurrency = currency.toLowerCase().trim();
  return ALLOWED_CURRENCIES[normalizedCurrency] || null;
};

// Get all allowed currencies
const getAllowedCurrencies = () => {
  return Object.values(ALLOWED_CURRENCIES).filter(curr => curr.enabled);
};

module.exports = {
  ALLOWED_CURRENCIES,
  getAllowedCurrencyCodes,
  isCurrencyAllowed,
  getCurrencyDetails,
  getAllowedCurrencies
};

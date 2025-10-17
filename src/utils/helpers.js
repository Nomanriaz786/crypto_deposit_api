const crypto = require('crypto');

// Generate unique order ID
const generateOrderId = (userId) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString('hex');
  return `${userId}_${timestamp}_${randomString}`;
};

// Generate short payout extra ID (for NOWPayments withdrawals)
const generatePayoutExtraId = () => {
  const timestamp = Date.now();
  const randomPart = crypto.randomBytes(2).toString('hex');
  return `p${timestamp.toString().slice(-6)}${randomPart}`;
};

// Format response for consistent API responses
const formatResponse = (success, data, message = null, pagination = null) => {
  const response = {
    success,
    ...(message && { message }),
    ...(data && { data }),
    ...(pagination && { pagination }),
    timestamp: new Date().toISOString()
  };

  return response;
};

// Format success response
const successResponse = (data, message = null, pagination = null) => {
  return formatResponse(true, data, message, pagination);
};

// Format error response
const errorResponse = (message, details = null) => {
  return formatResponse(false, null, message, null, details);
};

// Validate cryptocurrency currency format
const isValidCryptoCurrency = (currency) => {
  if (!currency || typeof currency !== 'string') {
    return false;
  }
  
  // Basic validation for common crypto currencies
  const validCurrencies = [
    'btc', 'eth', 'ltc', 'bch', 'xrp', 'xlm', 'ada', 'dot', 'link', 'bnb',
    'usdttrc20', 'usdterc20', 'usdcavalanche', 'usdcerc20', 'usdtbep20',
    'doge', 'shib', 'matic', 'avax', 'sol', 'uni', 'atom', 'near', 'ftm'
  ];
  
  return validCurrencies.includes(currency.toLowerCase());
};

// Validate amount
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M for safety
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
};

// Generate payment reference
const generatePaymentReference = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Format currency amount
const formatCurrencyAmount = (amount, decimals = 8) => {
  return parseFloat(amount).toFixed(decimals);
};

// Check if payment status is final
const isFinalPaymentStatus = (status) => {
  return ['finished', 'failed', 'expired', 'refunded'].includes(status);
};

// Generate webhook signature (for future implementation)
const generateWebhookSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

// Verify webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// Delay function for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delayTime = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delayTime}ms...`);
      await delay(delayTime);
    }
  }
};

module.exports = {
  generateOrderId,
  generatePayoutExtraId,
  formatResponse,
  successResponse,
  errorResponse,
  isValidCryptoCurrency,
  isValidAmount,
  sanitizeInput,
  generatePaymentReference,
  formatCurrencyAmount,
  isFinalPaymentStatus,
  generateWebhookSignature,
  verifyWebhookSignature,
  delay,
  retryWithBackoff
};
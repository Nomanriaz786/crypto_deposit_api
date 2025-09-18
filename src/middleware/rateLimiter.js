const rateLimit = require('express-rate-limit');
const config = require('../config');

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for payment creation
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 payment creation requests per windowMs
  message: {
    success: false,
    error: 'Too many payment creation attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiting (more permissive for NOWPayments)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more webhook requests
  message: {
    success: false,
    error: 'Webhook rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  paymentLimiter,
  webhookLimiter
};
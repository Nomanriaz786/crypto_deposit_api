const corsMiddleware = require('./cors');
const errorHandler = require('./errorHandler');
const { validationRules, validate } = require('./validation');
const { generalLimiter, paymentLimiter, webhookLimiter, withdrawalLimiter } = require('./rateLimiter');
const { requestLogger, securityHeaders, healthCheck } = require('./common');

module.exports = {
  corsMiddleware,
  errorHandler,
  validationRules,
  validate,
  generalLimiter,
  paymentLimiter,
  webhookLimiter,
  withdrawalLimiter,
  requestLogger,
  securityHeaders,
  healthCheck
};
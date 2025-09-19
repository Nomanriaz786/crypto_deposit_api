const corsMiddleware = require('./cors');
const errorHandler = require('./errorHandler');
const { validationRules, validate } = require('./validation');
const { generalLimiter, paymentLimiter, webhookLimiter } = require('./rateLimiter');
const { requestLogger, securityHeaders, healthCheck } = require('./common');
const ensureDBConnection = require('./databaseMiddleware');

module.exports = {
  corsMiddleware,
  errorHandler,
  validationRules,
  validate,
  generalLimiter,
  paymentLimiter,
  webhookLimiter,
  requestLogger,
  securityHeaders,
  healthCheck,
  ensureDBConnection
};
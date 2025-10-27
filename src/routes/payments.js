const express = require('express');
const { paymentController } = require('../controllers');
const { validationRules, validate, paymentLimiter } = require('../middleware');

const router = express.Router();

/**
 * @route   POST /api/payments/create
 * @desc    Create a new crypto payment
 * @access  Public
 */
router.post('/create',
  paymentLimiter,
  validationRules.createDeposit,
  validate,
  paymentController.createDeposit
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get payment status by payment ID
 * @access  Public
 */
router.get('/:paymentId',
  validationRules.getPaymentStatus,
  validate,
  paymentController.getPaymentStatus
);

/**
 * @route   GET /api/payments/status/:paymentId
 * @desc    Get payment status by payment ID (alias for backward compatibility)
 * @access  Public
 */
router.get('/status/:paymentId',
  validationRules.getPaymentStatus,
  validate,
  paymentController.getPaymentStatus
);

/**
 * @route   GET /api/payments/:paymentId/refresh
 * @desc    Refresh payment status from NOWPayments API
 * @access  Public
 */
router.get('/:paymentId/refresh',
  validationRules.getPaymentStatus,
  validate,
  paymentController.refreshPaymentStatus
);

module.exports = router;
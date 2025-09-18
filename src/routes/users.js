const express = require('express');
const { paymentController } = require('../controllers');
const { validationRules, validate } = require('../middleware');

const router = express.Router();

/**
 * @route   GET /api/users/:userId/payments
 * @desc    Get all payments for a specific user
 * @access  Public
 */
router.get('/:userId/payments',
  validationRules.getUserPayments,
  validate,
  paymentController.getUserPayments
);

/**
 * @route   GET /api/users/:userId/payments/stats
 * @desc    Get payment statistics for a specific user
 * @access  Public
 */
router.get('/:userId/payments/stats',
  validationRules.getUserPayments,
  validate,
  paymentController.getUserPaymentStats
);

module.exports = router;
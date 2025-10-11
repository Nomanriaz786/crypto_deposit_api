const express = require('express');
const { paymentController, withdrawalController } = require('../controllers');
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

/**
 * @route   GET /api/users/:userId/withdrawals
 * @desc    Get all withdrawals for a specific user
 * @access  Public
 */
router.get('/:userId/withdrawals',
  validationRules.getUserWithdrawals,
  validate,
  withdrawalController.getUserWithdrawals
);

/**
 * @route   GET /api/users/:userId/withdrawals/stats
 * @desc    Get withdrawal statistics for a specific user
 * @access  Public
 */
router.get('/:userId/withdrawals/stats',
  validationRules.getUserWithdrawals,
  validate,
  withdrawalController.getUserWithdrawalStats
);

module.exports = router;
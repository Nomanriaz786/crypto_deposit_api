const express = require('express');
const { withdrawalController } = require('../controllers');
const { validationRules, validate, withdrawalLimiter } = require('../middleware');

const router = express.Router();

/**
 * @route   POST /api/withdrawals/create
 * @desc    Create a new crypto withdrawal
 * @access  Public
 */
router.post('/create',
  withdrawalLimiter,
  validationRules.createWithdrawal,
  validate,
  withdrawalController.createWithdrawal
);

/**
 * @route   GET /api/withdrawals/:withdrawalId
 * @desc    Get withdrawal status by withdrawal ID
 * @access  Public
 */
router.get('/:withdrawalId',
  validationRules.getWithdrawalStatus,
  validate,
  withdrawalController.getWithdrawalStatus
);

/**
 * @route   GET /api/withdrawals/:withdrawalId/refresh
 * @desc    Refresh withdrawal status from NOWPayments API
 * @access  Public
 */
router.get('/:withdrawalId/refresh',
  validationRules.getWithdrawalStatus,
  validate,
  withdrawalController.refreshWithdrawalStatus
);

module.exports = router;
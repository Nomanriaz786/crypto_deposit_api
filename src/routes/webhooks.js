const express = require('express');
const { webhookController } = require('../controllers');
const { webhookLimiter } = require('../middleware');

const router = express.Router();

/**
 * @route   POST /api/webhooks/ipn
 * @desc    Handle NOWPayments IPN (Instant Payment Notification) webhook for both payments and withdrawals
 * @access  Public (NOWPayments webhook)
 */
router.post('/ipn',
  webhookLimiter,
  webhookController.handleIPN.bind(webhookController)
);

/**
 * @route   POST /api/webhooks/withdrawal/ipn
 * @desc    Handle NOWPayments withdrawal IPN webhook (same handler as /ipn)
 * @access  Public (NOWPayments webhook)
 */
router.post('/withdrawal/ipn',
  webhookLimiter,
  webhookController.handleIPN.bind(webhookController)
);

module.exports = router;
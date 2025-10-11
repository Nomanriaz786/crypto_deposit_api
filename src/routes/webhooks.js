const express = require('express');
const { webhookController } = require('../controllers');
const { webhookLimiter } = require('../middleware');

const router = express.Router();

/**
 * @route   POST /api/webhook/ipn
 * @desc    Handle NOWPayments IPN (Instant Payment Notification) webhook for both payments and withdrawals
 * @access  Public (NOWPayments webhook)
 */
router.post('/ipn',
  webhookLimiter,
  webhookController.handleIPN
);

module.exports = router;
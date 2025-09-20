const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { body } = require('express-validator');
const { validate } = require('../middleware');

// Test webhook simulation
router.post('/webhook/simulate',
  [
    body('payment_id').notEmpty().withMessage('Payment ID is required'),
    body('payment_status').isIn(['waiting', 'confirming', 'confirmed', 'sending', 'finished', 'failed', 'expired', 'partially_paid'])
      .withMessage('Invalid payment status'),
    body('actually_paid').optional().isNumeric().withMessage('Actually paid must be a number'),
    body('outcome_amount').optional().isNumeric().withMessage('Outcome amount must be a number')
  ],
  validate,
  testController.simulateWebhook
);

// Test payment lifecycle simulation
router.post('/payment/simulate-flow',
  [
    body('payment_id').notEmpty().withMessage('Payment ID is required'),
    body('delay_seconds').optional().isInt({ min: 1, max: 30 }).withMessage('Delay must be between 1-30 seconds')
  ],
  validate,
  testController.simulatePaymentFlow
);

// Get sandbox information
router.get('/sandbox-info', testController.getSandboxInfo);

module.exports = router;
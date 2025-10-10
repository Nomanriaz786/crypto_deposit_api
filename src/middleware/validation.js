const { body, param, query, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  createDeposit: [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('payCurrency')
      .notEmpty()
      .withMessage('Pay currency is required')
      .isLength({ min: 2, max: 20 })
      .withMessage('Pay currency must be between 2-20 characters'),
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('User ID must be between 1-100 characters'),
    body('category')
      .optional()
      .isIn(['packages', 'matrix', 'lottery'])
      .withMessage('Category must be one of: packages, matrix, lottery'),
    body('orderDescription')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Order description must not exceed 500 characters')
  ],
  
  getPaymentStatus: [
    param('paymentId')
      .notEmpty()
      .withMessage('Payment ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Invalid payment ID format'),
    query('category')
      .optional()
      .isIn(['packages', 'matrix', 'lottery'])
      .withMessage('Category must be one of: packages, matrix, lottery')
  ],
  
  getUserPayments: [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Invalid user ID format'),
    query('category')
      .optional()
      .isIn(['packages', 'matrix', 'lottery'])
      .withMessage('Category must be one of: packages, matrix, lottery'),
    query('status')
      .optional()
      .isIn(['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'refunded', 'expired'])
      .withMessage('Invalid payment status'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validationRules,
  validate
};
const { body, param, query, validationResult } = require('express-validator');

// Allowed currencies - only USDT BEP-20
const ALLOWED_CURRENCIES = ['usdtbsc'];

// Allowed categories and package names that map to categories
const ALLOWED_CATEGORIES = ['packages', 'matrix', 'lottery'];
const PACKAGE_NAMES = ['Starter', 'Basic', 'Standard', 'Pro', 'Elite', 'Premium', 'Ultimate', 'starter', 'basic', 'standard', 'pro', 'elite', 'premium', 'ultimate'];
const ALLOWED_CATEGORY_VALUES = [...ALLOWED_CATEGORIES, ...PACKAGE_NAMES];

// Validation rules
const validationRules = {
  createDeposit: [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0.01'),
    body('payCurrency')
      .notEmpty()
      .withMessage('Pay currency is required')
      .isIn(ALLOWED_CURRENCIES)
      .withMessage('Only USDT BEP-20 (usdtbsc) is accepted for deposits'),
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('User ID must be between 1-100 characters'),
    body('category')
      .optional()
      .isIn(ALLOWED_CATEGORY_VALUES)
      .withMessage(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')} or a valid package name: ${PACKAGE_NAMES.slice(0, 7).join(', ')}`),
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
  ],

  createWithdrawal: [
    body('amount')
      .isFloat({ min: 0.000001 })
      .withMessage('Amount must be a positive number greater than 0.000001'),
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isIn(ALLOWED_CURRENCIES)
      .withMessage('Only USDT BEP-20 (usdtbsc) is accepted for withdrawals'),
    body('withdrawalAddress')
      .notEmpty()
      .withMessage('Withdrawal address is required')
      .isLength({ min: 10, max: 200 })
      .withMessage('Withdrawal address must be between 10-200 characters'),
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
  
  getWithdrawalStatus: [
    param('withdrawalId')
      .notEmpty()
      .withMessage('Withdrawal ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Invalid withdrawal ID format'),
    query('category')
      .optional()
      .isIn(['packages', 'matrix', 'lottery'])
      .withMessage('Category must be one of: packages, matrix, lottery')
  ],
  
  getUserWithdrawals: [
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
      .isIn(['pending', 'processing', 'sending', 'completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid withdrawal status'),
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
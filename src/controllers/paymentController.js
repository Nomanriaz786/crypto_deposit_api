const { createNowPaymentsService, createPaymentFirestoreService } = require('../services');
const { successResponse, errorResponse, generateOrderId } = require('../utils');
const config = require('../config');
const { isCurrencyAllowed, getCurrencyDetails } = require('../config/currencies');

class PaymentController {
  async createDeposit(req, res, next) {
    try {
      const { amount, payCurrency, userId, orderDescription, metadata, category } = req.body;

      // Auto-detect category based on package names if not provided, or map package names to packages category
      let detectedCategory = category;
      let originalCategoryName = category;
      if (!detectedCategory) {
        detectedCategory = config.detectCategoryFromPackageNames(req.body) || 'packages';
      } else {
        // If category is provided, check if it's a package name and map to packages
        const packageCheck = config.detectCategoryFromPackageNames({ category: detectedCategory });
        if (packageCheck === 'packages') {
          originalCategoryName = detectedCategory; // Keep original name for description
          detectedCategory = 'packages';
        }
        // If not a package name, keep the original category (matrix, lottery, etc.)
      }

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(detectedCategory)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json(errorResponse('Invalid amount. Must be a positive number.'));
      }

      // Validate payCurrency
      if (!payCurrency || typeof payCurrency !== 'string' || payCurrency.trim() === '') {
        return res.status(400).json(errorResponse('Invalid pay currency. Must be a non-empty string.'));
      }

      // Check if currency is allowed
      if (!isCurrencyAllowed(payCurrency)) {
        const currencyDetails = getCurrencyDetails(payCurrency);
        return res.status(400).json(errorResponse(
          `Currency '${payCurrency}' is not supported. Only USDT BEP-20 (usdtbsc) is accepted for deposits.`,
          400,
          {
            provided_currency: payCurrency,
            allowed_currencies: ['usdtbsc'],
            currency_name: 'USDT BEP-20 (Binance Smart Chain)'
          }
        ));
      }

      const orderId = generateOrderId(userId);

      // Create category-specific services
      const nowPaymentsService = createNowPaymentsService(detectedCategory);
      const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(detectedCategory));

      // Create payment with NOWPayments
      const nowPaymentData = await nowPaymentsService.createPayment({
        amount: parsedAmount,
        payCurrency: payCurrency.trim(),
        userId,
        orderId,
        orderDescription: orderDescription || `Payment for user ${userId} - ${originalCategoryName || detectedCategory} package`,
      });

      // Save payment to Firestore
      const payment = await paymentFirestoreService.createPayment({
        payment_id: nowPaymentData.data.payment_id,
        userId,
        amount: parsedAmount,
        payCurrency: payCurrency.trim(),
        pay_address: nowPaymentData.data.pay_address,
        pay_amount: nowPaymentData.data.pay_amount || nowPaymentData.data.amount,
        payment_status: nowPaymentData.data.payment_status,
        order_id: orderId,
        orderDescription: orderDescription || `Payment for user ${userId} - ${originalCategoryName || detectedCategory} package`,
        network: nowPaymentData.data.network,
        metadata: {
          ...metadata,
          category: detectedCategory
        }
      });

      res.status(201).json(successResponse({
        payment_id: payment.payment_id,
        pay_address: payment.pay_address,
        pay_amount: payment.pay_amount,
        pay_currency: payCurrency.toLowerCase(),
        price_amount: amount,
        price_currency: 'usd',
        payment_status: payment.status,
        order_id: payment.order_id,
        category: detectedCategory,
        created_at: payment.created_at
      }, 'Payment created successfully'));

    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(category));
      const payment = await paymentFirestoreService.getPaymentById(paymentId);

      res.json(successResponse({
        payment_id: payment.payment_id,
        user_id: payment.user_id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        pay_address: payment.pay_address,
        pay_amount: payment.pay_amount,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        order_id: payment.order_id,
        category: category
      }));

    } catch (error) {
      next(error);
    }
  }

  async getUserPayments(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, limit = 10, offset = 0, category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(category));
      const result = await paymentFirestoreService.getUserPayments(userId, {
        status,
        limit,
        offset
      });

      res.json(successResponse(
        result.payments,
        'User payments retrieved successfully',
        result.pagination
      ));

    } catch (error) {
      next(error);
    }
  }

  async getUserPaymentStats(req, res, next) {
    try {
      const { userId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(category));
      const stats = await paymentFirestoreService.getUserPaymentStats(userId);

      res.json(successResponse({
        user_id: userId,
        category: category,
        ...stats
      }, 'Payment statistics retrieved successfully'));

    } catch (error) {
      next(error);
    }
  }

  async refreshPaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(category));
      const nowPaymentsService = createNowPaymentsService(category);

      // Get current payment from Firestore
      const payment = await paymentFirestoreService.getPaymentById(paymentId);

      // If payment is already finished, return current status
      if (['finished', 'failed', 'expired', 'refunded'].includes(payment.status)) {
        return res.json(successResponse({
          payment_id: payment.payment_id,
          status: payment.status,
          message: 'Payment status is already final'
        }));
      }

      // Fetch latest status from NOWPayments
      const nowPaymentStatus = await nowPaymentsService.getPaymentStatus(paymentId);

      // Update payment if status has changed
      if (nowPaymentStatus.payment_status !== payment.status) {
        const updatedPayment = await paymentFirestoreService.updatePaymentStatus(paymentId, {
          status: nowPaymentStatus.payment_status,
          pay_amount: nowPaymentStatus.pay_amount || payment.pay_amount,
          actually_paid: nowPaymentStatus.actually_paid
        });

        res.json(successResponse({
          payment_id: updatedPayment.payment_id,
          status: updatedPayment.status,
          updated: true
        }, 'Payment status updated'));
      } else {
        res.json(successResponse({
          payment_id: payment.payment_id,
          status: payment.status,
          updated: false
        }, 'Payment status is up to date'));
      }

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
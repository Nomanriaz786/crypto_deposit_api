const { createNowPaymentsService, createWithdrawalFirestoreService } = require('../services');
const { successResponse, errorResponse, generateOrderId } = require('../utils');
const config = require('../config');
const { isCurrencyAllowed, getCurrencyDetails } = require('../config/currencies');

class WithdrawalController {
  async createWithdrawal(req, res, next) {
    try {
      const { amount, currency, withdrawalAddress, userId, orderDescription, metadata, category = 'packages' } = req.body;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      // Validate required fields
      if (!withdrawalAddress || !currency || !userId) {
        return res.status(400).json(errorResponse('withdrawalAddress, currency, and userId are required'));
      }

      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json(errorResponse('Invalid amount. Must be a positive number.'));
      }

      // Validate currency
      if (!currency || typeof currency !== 'string' || currency.trim() === '') {
        return res.status(400).json(errorResponse('Invalid currency. Must be a non-empty string.'));
      }

      // Check if currency is allowed
      if (!isCurrencyAllowed(currency)) {
        return res.status(400).json(errorResponse(
          `Currency '${currency}' is not supported. Only USDT BEP-20 (usdtbsc) is accepted for withdrawals.`,
          400,
          {
            provided_currency: currency,
            allowed_currencies: ['usdtbsc'],
            currency_name: 'USDT BEP-20 (Binance Smart Chain)'
          }
        ));
      }

      // Generate unique withdrawal ID
      const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderId = generateOrderId(userId);

      // Create category-specific services
      const nowPaymentsService = createNowPaymentsService(category);
      const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));

      // Validate withdrawal address (if supported by NOWPayments)
      try {
        const addressValidation = await nowPaymentsService.validateWithdrawalAddress(currency.trim(), withdrawalAddress);
        if (!addressValidation.valid) {
          return res.status(400).json(errorResponse('Invalid withdrawal address for the specified currency'));
        }
      } catch (validationError) {
        console.warn('Address validation not available, proceeding without validation:', validationError.message);
      }

      // Create withdrawal with NOWPayments
      const nowWithdrawalData = await nowPaymentsService.createWithdrawal({
        address: withdrawalAddress,
        currency: currency.trim(),
        amount: parsedAmount,
        extra_id: orderId, // Use order ID as extra ID for tracking
        contact_email: metadata?.email // Optional contact email
      });

      // Save withdrawal to Firestore
      const withdrawal = await withdrawalFirestoreService.createWithdrawal({
        withdrawal_id: withdrawalId,
        userId,
        amount: parsedAmount,
        currency: currency.trim(),
        withdrawalAddress,
        status: nowWithdrawalData.data.status || 'pending',
        orderId,
        orderDescription: orderDescription || `Withdrawal for user ${userId} - Category: ${category}`,
        fee: nowWithdrawalData.data.fee || 0,
        estimatedArrival: nowWithdrawalData.data.estimated_arrival,
        txHash: nowWithdrawalData.data.tx_hash,
        metadata: {
          ...metadata,
          category,
          nowpayments_id: nowWithdrawalData.data.id
        }
      });

      res.status(201).json(successResponse({
        withdrawal_id: withdrawal.withdrawal_id,
        status: withdrawal.status,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        withdrawal_address: withdrawal.withdrawal_address,
        order_id: withdrawal.order_id,
        estimated_arrival: withdrawal.estimated_arrival,
        category: category,
        created_at: withdrawal.created_at
      }, 'Withdrawal created successfully'));

    } catch (error) {
      next(error);
    }
  }

  async getWithdrawalStatus(req, res, next) {
    try {
      const { withdrawalId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));
      const withdrawal = await withdrawalFirestoreService.getWithdrawalById(withdrawalId);

      res.json(successResponse({
        withdrawal_id: withdrawal.withdrawal_id,
        user_id: withdrawal.user_id,
        status: withdrawal.status,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        withdrawal_address: withdrawal.withdrawal_address,
        tx_hash: withdrawal.tx_hash,
        fee: withdrawal.fee,
        estimated_arrival: withdrawal.estimated_arrival,
        created_at: withdrawal.created_at,
        updated_at: withdrawal.updated_at,
        order_id: withdrawal.order_id,
        category: category
      }));

    } catch (error) {
      next(error);
    }
  }

  async getUserWithdrawals(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, limit = 10, offset = 0, category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));
      const result = await withdrawalFirestoreService.getUserWithdrawals(userId, {
        status,
        limit,
        offset
      });

      res.json(successResponse(
        result.withdrawals,
        'User withdrawals retrieved successfully',
        result.pagination
      ));

    } catch (error) {
      next(error);
    }
  }

  async getUserWithdrawalStats(req, res, next) {
    try {
      const { userId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));
      const stats = await withdrawalFirestoreService.getUserWithdrawalStats(userId);

      res.json(successResponse({
        user_id: userId,
        category: category,
        ...stats
      }, 'Withdrawal statistics retrieved successfully'));

    } catch (error) {
      next(error);
    }
  }

  async refreshWithdrawalStatus(req, res, next) {
    try {
      const { withdrawalId } = req.params;
      const { category = 'packages' } = req.query;

      // Validate category
      const validCategories = ['packages', 'matrix', 'lottery'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(errorResponse('Invalid category. Must be one of: packages, matrix, lottery'));
      }

      const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));
      const nowPaymentsService = createNowPaymentsService(category);

      // Get current withdrawal from Firestore
      const withdrawal = await withdrawalFirestoreService.getWithdrawalById(withdrawalId);

      // If withdrawal is already completed/failed, return current status
      if (['completed', 'failed', 'cancelled'].includes(withdrawal.status)) {
        return res.json(successResponse({
          withdrawal_id: withdrawal.withdrawal_id,
          status: withdrawal.status,
          message: 'Withdrawal status is already final'
        }));
      }

      // Fetch latest status from NOWPayments using the NOWPayments withdrawal ID
      const nowpaymentsId = withdrawal.metadata?.nowpayments_id;
      if (!nowpaymentsId) {
        return res.status(400).json(errorResponse('Cannot refresh status: NOWPayments ID not found'));
      }

      const nowWithdrawalStatus = await nowPaymentsService.getWithdrawalStatus(nowpaymentsId);

      // Update withdrawal if status has changed
      if (nowWithdrawalStatus.status !== withdrawal.status) {
        const updateData = {
          status: nowWithdrawalStatus.status,
          tx_hash: nowWithdrawalStatus.tx_hash || withdrawal.tx_hash,
          fee: nowWithdrawalStatus.fee || withdrawal.fee,
          updated_at: new Date()
        };

        const updatedWithdrawal = await withdrawalFirestoreService.updateWithdrawalStatus(withdrawalId, updateData);

        res.json(successResponse({
          withdrawal_id: updatedWithdrawal.withdrawal_id,
          status: updatedWithdrawal.status,
          updated: true
        }, 'Withdrawal status updated'));
      } else {
        res.json(successResponse({
          withdrawal_id: withdrawal.withdrawal_id,
          status: withdrawal.status,
          updated: false
        }, 'Withdrawal status is up to date'));
      }

    } catch (error) {
      next(error);
    }
  }

  // Helper method to check user balance (implement based on your balance system)
  async checkUserBalance(userId, category, amount, currency) {
    // This is a placeholder - implement based on your balance tracking system
    // You might have a separate balances collection or calculate from payment/withdrawal history

    try {
      // Example implementation:
      // const balance = await this.calculateUserBalance(userId, category, currency);
      // return {
      //   sufficient: balance >= amount,
      //   available: balance
      // };

      // For now, assume sufficient balance
      return {
        sufficient: true,
        available: amount * 2 // Mock available balance
      };
    } catch (error) {
      console.error('Error checking user balance:', error);
      return {
        sufficient: false,
        available: 0,
        error: error.message
      };
    }
  }
}

module.exports = new WithdrawalController();
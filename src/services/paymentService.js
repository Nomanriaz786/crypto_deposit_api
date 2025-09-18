const { Payment } = require('../models');
const { ApiError } = require('../utils/errors');
const { generateOrderId } = require('../utils/helpers');

class PaymentService {
  async createPayment(paymentData) {
    try {
      const orderId = generateOrderId(paymentData.userId);
      
      const payment = new Payment({
        payment_id: paymentData.payment_id,
        user_id: paymentData.userId,
        amount: parseFloat(paymentData.amount),
        currency: paymentData.payCurrency.toLowerCase(),
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        status: paymentData.payment_status || 'waiting',
        order_id: orderId,
        order_description: paymentData.order_description,
        network: paymentData.network,
        metadata: paymentData.metadata || {}
      });

      await payment.save();
      return payment;
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError('Payment already exists', 409);
      }
      throw new ApiError('Failed to create payment record', 500, error.message);
    }
  }

  async getPaymentById(paymentId) {
    try {
      const payment = await Payment.findOne({ payment_id: paymentId });
      
      if (!payment) {
        throw new ApiError('Payment not found', 404);
      }
      
      return payment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to retrieve payment', 500, error.message);
    }
  }

  async updatePaymentStatus(paymentId, updateData) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { payment_id: paymentId },
        {
          ...updateData,
          updated_at: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!payment) {
        throw new ApiError('Payment not found', 404);
      }

      return payment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update payment status', 500, error.message);
    }
  }

  async getUserPayments(userId, options = {}) {
    try {
      const {
        status,
        limit = 10,
        offset = 0,
        sortBy = '-created_at'
      } = options;

      const payments = await Payment.findByUserId(userId, {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy
      });

      const total = await Payment.countDocuments({
        user_id: userId,
        ...(status && { status })
      });

      return {
        payments,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      };
    } catch (error) {
      throw new ApiError('Failed to retrieve user payments', 500, error.message);
    }
  }

  async getUserPaymentStats(userId) {
    try {
      return await Payment.getStatsByUserId(userId);
    } catch (error) {
      throw new ApiError('Failed to retrieve payment statistics', 500, error.message);
    }
  }

  async incrementWebhookAttempts(paymentId) {
    try {
      return await Payment.findOneAndUpdate(
        { payment_id: paymentId },
        {
          $inc: { webhook_attempts: 1 },
          last_webhook_at: new Date()
        },
        { new: true }
      );
    } catch (error) {
      console.error('Failed to increment webhook attempts:', error);
    }
  }

  async getExpiredPayments(hoursOld = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

      return await Payment.find({
        status: 'waiting',
        created_at: { $lt: cutoffDate }
      });
    } catch (error) {
      throw new ApiError('Failed to retrieve expired payments', 500, error.message);
    }
  }

  async markPaymentExpired(paymentId) {
    try {
      return await this.updatePaymentStatus(paymentId, {
        status: 'expired'
      });
    } catch (error) {
      console.error('Failed to mark payment as expired:', error);
    }
  }
}

module.exports = new PaymentService();
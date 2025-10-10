const firestoreService = require('./firestoreService');
const { ApiError } = require('../utils/errors');
const { generateOrderId } = require('../utils/helpers');

class PaymentFirestoreService {
  constructor(collectionName = 'payments') {
    this.collectionName = collectionName;
  }

  async createPayment(paymentData) {
    try {
      const paymentDoc = {
        payment_id: paymentData.payment_id,
        user_id: paymentData.userId,
        amount: parseFloat(paymentData.amount),
        currency: paymentData.payCurrency.toLowerCase(),
        pay_address: paymentData.pay_address,
        pay_amount: paymentData.pay_amount,
        status: paymentData.payment_status || 'waiting',
        order_id: paymentData.order_id || generateOrderId(paymentData.userId),
        order_description: paymentData.order_description,
        network: paymentData.network,
        metadata: paymentData.metadata || {},
        webhook_attempts: 0
      };

      // Use payment_id as document ID for easy retrieval
      const result = await firestoreService.setDocument(
        this.collectionName, 
        paymentData.payment_id, 
        paymentDoc
      );

      return result;
    } catch (error) {
      console.error('Error saving payment to Firestore:', error);
      if (error.code === 6) { // ALREADY_EXISTS
        throw new ApiError('Payment already exists', 409);
      }
      throw new ApiError('Failed to create payment record', 500, error.message);
    }
  }

  async getPaymentById(paymentId) {
    try {
      const payment = await firestoreService.getDocument(this.collectionName, paymentId);
      
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
      const updatedPayment = await firestoreService.updateDocument(
        this.collectionName,
        paymentId,
        updateData
      );

      if (!updatedPayment) {
        throw new ApiError('Payment not found', 404);
      }

      return updatedPayment;
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
        offset = 0
      } = options;

      // For now, use simple query without ordering to avoid index requirements
      // This will work immediately without requiring database indexes
      const queries = [
        { field: 'user_id', operator: '==', value: userId }
      ];

      if (status) {
        queries.push({ field: 'status', operator: '==', value: status });
      }

      // Get payments without ordering first (to avoid index requirement)
      let payments = await firestoreService.queryDocuments(
        this.collectionName,
        queries,
        null, // No ordering for now
        null  // No limit for now, we'll handle pagination manually
      );

      // Sort manually by created_at (descending)
      payments.sort((a, b) => {
        const aTime = a.created_at?.toDate?.() || new Date(a.created_at || 0);
        const bTime = b.created_at?.toDate?.() || new Date(b.created_at || 0);
        return bTime - aTime;
      });

      // Manual pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedPayments = payments.slice(startIndex, endIndex);

      const total = payments.length;

      return {
        payments: paginatedPayments,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < total
        }
      };
    } catch (error) {
      console.error('Error in getUserPayments:', error);
      throw new ApiError('Failed to retrieve user payments', 500, error.message);
    }
  }

  async getUserPaymentStats(userId) {
    try {
      // Get all payments for user
      const allPayments = await firestoreService.queryDocuments(
        this.collectionName,
        [{ field: 'user_id', operator: '==', value: userId }]
      );

      // Calculate stats
      const totalPayments = allPayments.length;
      const completedPayments = allPayments.filter(p => p.status === 'finished').length;
      
      // Group by status
      const statusBreakdown = {};
      allPayments.forEach(payment => {
        const status = payment.status;
        if (!statusBreakdown[status]) {
          statusBreakdown[status] = {
            count: 0,
            total_amount: 0
          };
        }
        statusBreakdown[status].count++;
        statusBreakdown[status].total_amount += payment.amount;
      });

      return {
        total_payments: totalPayments,
        completed_payments: completedPayments,
        completion_rate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) : 0,
        status_breakdown: statusBreakdown
      };
    } catch (error) {
      throw new ApiError('Failed to retrieve payment statistics', 500, error.message);
    }
  }

  async incrementWebhookAttempts(paymentId) {
    try {
      const payment = await this.getPaymentById(paymentId);
      const newAttempts = (payment.webhook_attempts || 0) + 1;

      return await this.updatePaymentStatus(paymentId, {
        webhook_attempts: newAttempts,
        last_webhook_at: new Date()
      });
    } catch (error) {
      console.error('Failed to increment webhook attempts:', error);
      throw error;
    }
  }

  async getExpiredPayments(hoursOld = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

      const expiredPayments = await firestoreService.queryDocuments(
        this.collectionName,
        [
          { field: 'status', operator: '==', value: 'waiting' },
          { field: 'created_at', operator: '<', value: cutoffDate }
        ]
      );

      return expiredPayments;
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
      throw error;
    }
  }
}

module.exports = PaymentFirestoreService;
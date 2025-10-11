const firestoreService = require('./firestoreService');
const { ApiError } = require('../utils/errors');
const { generateOrderId } = require('../utils/helpers');

class WithdrawalFirestoreService {
  constructor(collectionName = 'withdrawals') {
    this.collectionName = collectionName;
  }

  async createWithdrawal(withdrawalData) {
    try {
      const withdrawalDoc = {
        withdrawal_id: withdrawalData.withdrawal_id,
        user_id: withdrawalData.userId,
        amount: parseFloat(withdrawalData.amount),
        currency: withdrawalData.currency.toLowerCase(),
        withdrawal_address: withdrawalData.withdrawalAddress,
        network: withdrawalData.network || withdrawalData.currency.toLowerCase(),
        status: withdrawalData.status || 'pending',
        order_id: withdrawalData.orderId || generateOrderId(withdrawalData.userId),
        order_description: withdrawalData.orderDescription || `Withdrawal for user ${withdrawalData.userId}`,
        fee: withdrawalData.fee || 0,
        estimated_arrival: withdrawalData.estimatedArrival,
        tx_hash: withdrawalData.txHash,
        metadata: withdrawalData.metadata || {},
        webhook_attempts: 0
      };

      // Use withdrawal_id as document ID for easy retrieval
      const result = await firestoreService.setDocument(
        this.collectionName,
        withdrawalData.withdrawal_id,
        withdrawalDoc
      );

      return result;
    } catch (error) {
      console.error('Error saving withdrawal to Firestore:', error);
      if (error.code === 6) { // ALREADY_EXISTS
        throw new ApiError('Withdrawal already exists', 409);
      }
      throw new ApiError('Failed to create withdrawal record', 500, error.message);
    }
  }

  async getWithdrawalById(withdrawalId) {
    try {
      const withdrawal = await firestoreService.getDocument(this.collectionName, withdrawalId);

      if (!withdrawal) {
        throw new ApiError('Withdrawal not found', 404);
      }

      return withdrawal;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to retrieve withdrawal', 500, error.message);
    }
  }

  async updateWithdrawalStatus(withdrawalId, updateData) {
    try {
      const updatedWithdrawal = await firestoreService.updateDocument(
        this.collectionName,
        withdrawalId,
        updateData
      );

      if (!updatedWithdrawal) {
        throw new ApiError('Withdrawal not found', 404);
      }

      return updatedWithdrawal;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update withdrawal status', 500, error.message);
    }
  }

  async getUserWithdrawals(userId, options = {}) {
    try {
      const {
        status,
        limit = 10,
        offset = 0
      } = options;

      // For now, use simple query without ordering to avoid index requirements
      const queries = [
        { field: 'user_id', operator: '==', value: userId }
      ];

      if (status) {
        queries.push({ field: 'status', operator: '==', value: status });
      }

      // Get withdrawals without ordering first (to avoid index requirement)
      let withdrawals = await firestoreService.queryDocuments(
        this.collectionName,
        queries,
        null, // No ordering for now
        null  // No limit for now, we'll handle pagination manually
      );

      // Sort manually by created_at (descending)
      withdrawals.sort((a, b) => {
        const aTime = a.created_at?.toDate?.() || new Date(a.created_at || 0);
        const bTime = b.created_at?.toDate?.() || new Date(b.created_at || 0);
        return bTime - aTime;
      });

      // Manual pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedWithdrawals = withdrawals.slice(startIndex, endIndex);

      const total = withdrawals.length;

      return {
        withdrawals: paginatedWithdrawals,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < total
        }
      };
    } catch (error) {
      console.error('Error in getUserWithdrawals:', error);
      throw new ApiError('Failed to retrieve user withdrawals', 500, error.message);
    }
  }

  async getUserWithdrawalStats(userId) {
    try {
      // Get all withdrawals for user
      const allWithdrawals = await firestoreService.queryDocuments(
        this.collectionName,
        [{ field: 'user_id', operator: '==', value: userId }]
      );

      // Calculate stats
      const totalWithdrawals = allWithdrawals.length;
      const completedWithdrawals = allWithdrawals.filter(w => w.status === 'completed').length;

      // Group by status
      const statusBreakdown = {};
      allWithdrawals.forEach(withdrawal => {
        const status = withdrawal.status;
        if (!statusBreakdown[status]) {
          statusBreakdown[status] = {
            count: 0,
            total_amount: 0
          };
        }
        statusBreakdown[status].count++;
        statusBreakdown[status].total_amount += withdrawal.amount;
      });

      return {
        total_withdrawals: totalWithdrawals,
        completed_withdrawals: completedWithdrawals,
        completion_rate: totalWithdrawals > 0 ? ((completedWithdrawals / totalWithdrawals) * 100).toFixed(2) : 0,
        status_breakdown: statusBreakdown
      };
    } catch (error) {
      throw new ApiError('Failed to retrieve withdrawal statistics', 500, error.message);
    }
  }

  async incrementWebhookAttempts(withdrawalId) {
    try {
      const withdrawal = await this.getWithdrawalById(withdrawalId);
      const newAttempts = (withdrawal.webhook_attempts || 0) + 1;

      return await this.updateWithdrawalStatus(withdrawalId, {
        webhook_attempts: newAttempts,
        last_webhook_at: new Date()
      });
    } catch (error) {
      console.error('Failed to increment webhook attempts:', error);
      throw error;
    }
  }

  async getPendingWithdrawals(hoursOld = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

      const pendingWithdrawals = await firestoreService.queryDocuments(
        this.collectionName,
        [
          { field: 'status', operator: '==', value: 'pending' },
          { field: 'created_at', operator: '<', value: cutoffDate }
        ]
      );

      return pendingWithdrawals;
    } catch (error) {
      throw new ApiError('Failed to retrieve pending withdrawals', 500, error.message);
    }
  }

  async markWithdrawalExpired(withdrawalId) {
    try {
      return await this.updateWithdrawalStatus(withdrawalId, {
        status: 'expired'
      });
    } catch (error) {
      console.error('Failed to mark withdrawal as expired:', error);
      throw error;
    }
  }
}

module.exports = WithdrawalFirestoreService;
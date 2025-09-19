const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  payment_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  pay_address: {
    type: String,
    required: true
  },
  pay_amount: {
    type: Number,
    required: false
  },
  actually_paid: {
    type: Number,
    required: false
  },
  outcome_amount: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: [
      'waiting',
      'confirming', 
      'confirmed',
      'sending',
      'partially_paid',
      'finished',
      'failed',
      'refunded',
      'expired'
    ],
    default: 'waiting',
    index: true
  },
  order_id: {
    type: String,
    required: false,
    index: true
  },
  order_description: {
    type: String,
    required: false
  },
  network: {
    type: String,
    required: false
  },
  fee: {
    type: Number,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  webhook_attempts: {
    type: Number,
    default: 0
  },
  last_webhook_at: {
    type: Date,
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for performance
paymentSchema.index({ user_id: 1, status: 1 });
paymentSchema.index({ created_at: -1 });
paymentSchema.index({ status: 1, created_at: -1 });

// Instance methods
paymentSchema.methods.isCompleted = function() {
  return this.status === 'finished';
};

paymentSchema.methods.isFailed = function() {
  return ['failed', 'expired', 'refunded'].includes(this.status);
};

paymentSchema.methods.isPending = function() {
  return ['waiting', 'confirming', 'confirmed', 'sending'].includes(this.status);
};

// Static methods
paymentSchema.statics.findByUserId = function(userId, options = {}) {
  const { status, limit = 10, offset = 0, sortBy = '-created_at' } = options;
  
  let query = { user_id: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(parseInt(offset));
};

paymentSchema.statics.getStatsByUserId = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user_id: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const totalPayments = await this.countDocuments({ user_id: userId });
  const completedPayments = await this.countDocuments({ 
    user_id: userId, 
    status: 'finished' 
  });

  return {
    total_payments: totalPayments,
    completed_payments: completedPayments,
    completion_rate: totalPayments > 0 ? (completedPayments / totalPayments * 100).toFixed(2) : 0,
    status_breakdown: stats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        total_amount: item.totalAmount
      };
      return acc;
    }, {})
  };
};

const Payment = mongoose.model('Payment', paymentSchema, 'deposits');

module.exports = Payment;
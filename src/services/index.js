const NOWPaymentsService = require('./nowPaymentsService');
const PaymentFirestoreService = require('./paymentFirestoreService');
const firestoreService = require('./firestoreService');
const WithdrawalFirestoreService = require('./withdrawalFirestoreService');

// Factory function to create category-specific NOWPayments service
const createNowPaymentsService = (category) => {
  return new NOWPaymentsService(category);
};

// Factory function to create scenario-specific PaymentFirestore service
const createPaymentFirestoreService = (collectionName) => {
  return new PaymentFirestoreService(collectionName);
};

// Factory function to create scenario-specific WithdrawalFirestore service
const createWithdrawalFirestoreService = (collectionName) => {
  return new WithdrawalFirestoreService(collectionName);
};

// Legacy singleton for backward compatibility
const nowPaymentsService = new NOWPaymentsService(); // No scenario = legacy mode
const paymentFirestoreService = new PaymentFirestoreService(); // No collection = 'payments'
const withdrawalFirestoreService = new WithdrawalFirestoreService(); // Legacy singleton

module.exports = {
  nowPaymentsService,
  createNowPaymentsService,
  paymentFirestoreService,
  createPaymentFirestoreService,
  withdrawalFirestoreService,
  createWithdrawalFirestoreService,
  firestoreService
};
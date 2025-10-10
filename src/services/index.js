const NOWPaymentsService = require('./nowPaymentsService');
const PaymentFirestoreService = require('./paymentFirestoreService');
const firestoreService = require('./firestoreService');

// Factory function to create category-specific NOWPayments service
const createNowPaymentsService = (category) => {
  return new NOWPaymentsService(category);
};

// Factory function to create scenario-specific PaymentFirestore service
const createPaymentFirestoreService = (collectionName) => {
  return new PaymentFirestoreService(collectionName);
};

// Legacy singleton for backward compatibility
const nowPaymentsService = new NOWPaymentsService(); // No scenario = legacy mode
const paymentFirestoreService = new PaymentFirestoreService(); // No collection = 'payments'

module.exports = {
  nowPaymentsService,
  createNowPaymentsService,
  paymentFirestoreService,
  createPaymentFirestoreService,
  firestoreService
};
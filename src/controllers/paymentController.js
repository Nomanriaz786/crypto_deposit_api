const { nowPaymentsService, paymentService } = require('../services');
const { successResponse, errorResponse, generateOrderId } = require('../utils');

class PaymentController {
  async createDeposit(req, res, next) {
    try {
      const { amount, payCurrency, userId, orderDescription, metadata } = req.body;

      // Create payment with NOWPayments
      const nowPaymentData = await nowPaymentsService.createPayment({
        amount,
        payCurrency,
        userId,
        orderId: generateOrderId(userId),
        orderDescription,
        metadata
      });

      // Save payment to database
      const payment = await paymentService.createPayment({
        payment_id: nowPaymentData.data.payment_id,
        userId,
        amount,
        payCurrency,
        pay_address: nowPaymentData.data.pay_address,
        pay_amount: nowPaymentData.data.pay_amount || nowPaymentData.data.amount,
        payment_status: nowPaymentData.data.payment_status,
        order_description: orderDescription,
        network: nowPaymentData.data.network,
        metadata
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
        created_at: payment.created_at
      }, 'Payment created successfully'));

    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;

      const payment = await paymentService.getPaymentById(paymentId);

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
        order_id: payment.order_id
      }));

    } catch (error) {
      next(error);
    }
  }

  async getUserPayments(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, limit = 10, offset = 0 } = req.query;

      const result = await paymentService.getUserPayments(userId, {
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

      const stats = await paymentService.getUserPaymentStats(userId);

      res.json(successResponse({
        user_id: userId,
        ...stats
      }, 'Payment statistics retrieved successfully'));

    } catch (error) {
      next(error);
    }
  }

  async refreshPaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;

      // Get current payment from database
      const payment = await paymentService.getPaymentById(paymentId);

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
        const updatedPayment = await paymentService.updatePaymentStatus(paymentId, {
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
const { paymentFirestoreService } = require('../services');
const { successResponse, errorResponse } = require('../utils');
const config = require('../config');

class TestController {
  // Only available in sandbox mode
  async simulateWebhook(req, res, next) {
    try {
      // Only allow this in sandbox mode
      if (!config.nowPayments.isSandbox) {
        return res.status(403).json(errorResponse('Test endpoints only available in sandbox mode', 403));
      }

      const { payment_id, payment_status, actually_paid, outcome_amount } = req.body;

      if (!payment_id || !payment_status) {
        return res.status(400).json(errorResponse('payment_id and payment_status are required', 400));
      }

      // Find payment in Firestore
      const payment = await paymentFirestoreService.getPaymentById(payment_id);

      if (!payment) {
        return res.status(404).json(errorResponse('Payment not found', 404));
      }

      console.log(`🧪 SANDBOX TEST: Simulating webhook for payment ${payment_id}: ${payment.status} -> ${payment_status}`);

      // Create simulated webhook data
      const simulatedWebhookData = {
        payment_id: payment_id,
        payment_status: payment_status,
        pay_amount: payment.pay_amount,
        actually_paid: actually_paid || payment.pay_amount,
        outcome_amount: outcome_amount || payment.amount,
        outcome_currency: payment.currency,
        fee: "0.001",
        type: "payment",
        ...req.body // Allow override of any fields
      };

      // Update payment with simulated webhook data
      const updateData = {
        status: payment_status,
        updated_at: new Date(),
        last_webhook_at: new Date()
      };

      // Add all webhook fields if present
      if (simulatedWebhookData.actually_paid) updateData.actually_paid = parseFloat(simulatedWebhookData.actually_paid);
      if (simulatedWebhookData.outcome_amount) updateData.outcome_amount = parseFloat(simulatedWebhookData.outcome_amount);
      if (simulatedWebhookData.fee) updateData.fee = parseFloat(simulatedWebhookData.fee);

      // Track payment confirmation details
      if (payment_status === 'confirmed' || payment_status === 'finished') {
        if (simulatedWebhookData.actually_paid) {
          updateData.confirmed_amount = parseFloat(simulatedWebhookData.actually_paid);
        }
        updateData.confirmed_at = new Date();
      }

      // Track payment completion details
      if (payment_status === 'finished') {
        updateData.completed_at = new Date();
        updateData.final_amount = parseFloat(simulatedWebhookData.outcome_amount || simulatedWebhookData.actually_paid || updateData.pay_amount);
      }

      // Update payment status
      const updatedPayment = await paymentFirestoreService.updatePaymentStatus(
        payment_id,
        updateData
      );

      // Log the simulation
      console.log(`🧪 SANDBOX TEST: Payment ${payment_id} status updated to ${payment_status}`);
      console.log(`🧪 SANDBOX TEST: Simulated webhook data:`, JSON.stringify(simulatedWebhookData, null, 2));

      res.json(successResponse(
        {
          payment_id: payment_id,
          old_status: payment.status,
          new_status: payment_status,
          simulated_webhook_data: simulatedWebhookData,
          updated_payment: updatedPayment
        },
        'Payment status simulated successfully'
      ));

    } catch (error) {
      console.error('Payment simulation error:', error);
      res.status(500).json(errorResponse('Payment simulation failed', 500));
    }
  }

  // Simulate the complete payment lifecycle
  async simulatePaymentFlow(req, res, next) {
    try {
      if (!config.nowPayments.isSandbox) {
        return res.status(403).json(errorResponse('Test endpoints only available in sandbox mode', 403));
      }

      const { payment_id, delay_seconds = 2 } = req.body;

      if (!payment_id) {
        return res.status(400).json(errorResponse('payment_id is required', 400));
      }

      const payment = await paymentFirestoreService.getPaymentById(payment_id);
      if (!payment) {
        return res.status(404).json(errorResponse('Payment not found', 404));
      }

      console.log(`🧪 SANDBOX TEST: Starting payment lifecycle simulation for ${payment_id}`);

      // Start the simulation flow
      res.json(successResponse(
        { 
          payment_id, 
          message: 'Payment lifecycle simulation started',
          estimated_duration: `${delay_seconds * 4} seconds`
        },
        'Simulation started'
      ));

      // Simulate the payment lifecycle asynchronously
      this.runPaymentLifecycleSimulation(payment_id, delay_seconds * 1000);

    } catch (error) {
      console.error('Payment flow simulation error:', error);
      res.status(500).json(errorResponse('Payment flow simulation failed', 500));
    }
  }

  async runPaymentLifecycleSimulation(payment_id, delay_ms) {
    const statuses = ['confirming', 'confirmed', 'sending', 'finished'];
    
    for (const status of statuses) {
      await new Promise(resolve => setTimeout(resolve, delay_ms));
      
      try {
        const updateData = {
          status: status,
          updated_at: new Date(),
          last_webhook_at: new Date()
        };

        if (status === 'confirmed') {
          updateData.confirmed_at = new Date();
        } else if (status === 'finished') {
          updateData.completed_at = new Date();
        }

        await paymentFirestoreService.updatePaymentStatus(payment_id, updateData);
        console.log(`🧪 SANDBOX LIFECYCLE: Payment ${payment_id} -> ${status}`);
      } catch (error) {
        console.error(`Error updating payment ${payment_id} to ${status}:`, error);
      }
    }
    
    console.log(`🧪 SANDBOX LIFECYCLE: Payment ${payment_id} simulation completed`);
  }

  // Get sandbox testing information
  async getSandboxInfo(req, res, next) {
    try {
      const sandboxInfo = {
        sandbox_mode: config.nowPayments.isSandbox,
        api_endpoint: config.nowPayments.baseUrl,
        features: {
          webhook_simulation: true,
          payment_lifecycle_simulation: true,
          relaxed_signature_verification: true
        },
        available_endpoints: {
          simulate_webhook: 'POST /api/test/webhook/simulate',
          simulate_payment_flow: 'POST /api/test/payment/simulate-flow',
          sandbox_info: 'GET /api/test/sandbox-info'
        },
        test_currencies: ['btc', 'eth', 'ltc', 'doge', 'trx', 'bnb'],
        test_scenarios: [
          'successful_payment',
          'partial_payment', 
          'failed_payment',
          'expired_payment'
        ]
      };

      res.json(successResponse(sandboxInfo, 'Sandbox information retrieved'));
    } catch (error) {
      res.status(500).json(errorResponse('Failed to get sandbox info', 500));
    }
  }
}

module.exports = new TestController();
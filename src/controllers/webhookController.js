const crypto = require('crypto');
const { paymentService } = require('../services');
const { successResponse } = require('../utils');

class WebhookController {
  async handleIPN(req, res, next) {
    try {
      const webhookData = req.body;
      const receivedSignature = req.headers['x-nowpayments-sig'];
      
      console.log('IPN Webhook received:', JSON.stringify(webhookData, null, 2));

      // Verify IPN signature for security
      if (!this.verifyIPNSignature(req.body, receivedSignature)) {
        console.error('Invalid IPN signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Validate webhook data
      if (!webhookData.payment_id) {
        console.error('Missing payment_id in webhook data');
        return res.status(400).json({ error: 'Missing payment_id' });
      }

      // Increment webhook attempts counter
      await paymentService.incrementWebhookAttempts(webhookData.payment_id);

      // Find payment in database
      const payment = await paymentService.getPaymentById(webhookData.payment_id);

      if (!payment) {
        console.error(`Payment not found: ${webhookData.payment_id}`);
        return res.status(404).json({ error: 'Payment not found' });
      }

      console.log(
        `Processing IPN for payment ${webhookData.payment_id}: ${payment.status} -> ${webhookData.payment_status}`
      );

      // Update payment with webhook data
      const updateData = {
        status: webhookData.payment_status
      };

      // Add optional fields if present
      if (webhookData.pay_amount) updateData.pay_amount = webhookData.pay_amount;
      if (webhookData.actually_paid) updateData.actually_paid = webhookData.actually_paid;
      if (webhookData.outcome_amount) updateData.outcome_amount = webhookData.outcome_amount;
      if (webhookData.fee) updateData.fee = webhookData.fee;

      // Update payment status
      const updatedPayment = await paymentService.updatePaymentStatus(
        webhookData.payment_id,
        updateData
      );

      // Log status change
      this.logPaymentStatusChange(updatedPayment, webhookData.payment_status);

      // Handle different payment statuses
      await this.handlePaymentStatus(updatedPayment, webhookData);

      // Always respond with 200 to acknowledge receipt
      res.status(200).json(successResponse(
        { payment_id: webhookData.payment_id },
        'IPN processed successfully'
      ));

    } catch (error) {
      console.error('IPN processing error:', error);
      
      // Always respond with 200 to avoid NOWPayments retrying
      // But log the error for debugging
      res.status(200).json(successResponse(
        { error: error.message },
        'IPN received but processing failed'
      ));
    }
  }

  verifyIPNSignature(payload, receivedSignature) {
    try {
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      
      if (!ipnSecret) {
        console.warn('IPN secret not configured, skipping signature verification');
        return true; // Allow in development, but warn
      }

      if (!receivedSignature) {
        console.error('No signature provided in IPN request');
        return false;
      }

      // Create expected signature
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha512', ipnSecret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        console.error('IPN signature verification failed');
        console.error('Expected:', expectedSignature);
        console.error('Received:', receivedSignature);
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying IPN signature:', error);
      return false;
    }
  }

  logPaymentStatusChange(payment, newStatus) {
    const statusMessages = {
      waiting: 'Waiting for payment',
      confirming: 'Payment detected, confirming on blockchain',
      confirmed: 'Payment confirmed on blockchain',
      sending: 'Payment being processed',
      partially_paid: 'Payment partially received',
      finished: '✅ Payment completed successfully!',
      failed: '❌ Payment failed',
      refunded: 'Payment was refunded',
      expired: '⏱️ Payment expired'
    };

    const message = statusMessages[newStatus] || `Unknown status: ${newStatus}`;
    console.log(`Payment ${payment.payment_id}: ${message}`);
  }

  async handlePaymentStatus(payment, webhookData) {
    try {
      switch (payment.status) {
        case 'finished':
          await this.handleCompletedPayment(payment, webhookData);
          break;
        case 'failed':
        case 'expired':
          await this.handleFailedPayment(payment, webhookData);
          break;
        case 'partially_paid':
          await this.handlePartialPayment(payment, webhookData);
          break;
        default:
          // For other statuses (waiting, confirming, confirmed, sending), just log
          console.log(`Payment ${payment.payment_id} is in progress with status: ${payment.status}`);
      }
    } catch (error) {
      console.error(`Error handling payment status for ${payment.payment_id}:`, error);
    }
  }

  async handleCompletedPayment(payment, webhookData) {
    console.log(`🎉 Payment ${payment.payment_id} completed successfully!`);
    console.log(`Amount: ${payment.amount} ${payment.currency.toUpperCase()}`);
    console.log(`User: ${payment.user_id}`);
    
    // Here you can add logic to:
    // - Credit user account
    // - Send confirmation email
    // - Trigger business logic
    // - Update other systems
    // - Send push notifications
    
    // Example: You might want to emit an event or call another service
    // await this.creditUserAccount(payment.user_id, payment.amount);
    // await this.sendPaymentConfirmation(payment.user_id, payment);
  }

  async handleFailedPayment(payment, webhookData) {
    console.log(`❌ Payment ${payment.payment_id} failed or expired`);
    console.log(`Reason: ${payment.status}`);
    console.log(`User: ${payment.user_id}`);
    
    // Here you can add logic to:
    // - Notify user of failure
    // - Log for manual review
    // - Trigger retry mechanisms
    // - Clean up pending orders
    
    // Example:
    // await this.notifyPaymentFailure(payment.user_id, payment);
  }

  async handlePartialPayment(payment, webhookData) {
    console.log(`⚠️ Partial payment received for ${payment.payment_id}`);
    console.log(`Expected: ${payment.pay_amount}, Received: ${webhookData.actually_paid || 'unknown'}`);
    
    // Here you can add logic to:
    // - Request additional payment
    // - Accept partial payment
    // - Refund if policy allows
    
    // Example:
    // await this.handlePartialPaymentPolicy(payment, webhookData);
  }
}

module.exports = new WebhookController();
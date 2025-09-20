const crypto = require('crypto');
const { paymentFirestoreService } = require('../services');
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
      await paymentFirestoreService.incrementWebhookAttempts(webhookData.payment_id);

      // Find payment in Firestore
      const payment = await paymentFirestoreService.getPaymentById(webhookData.payment_id);

      if (!payment) {
        console.error(`Payment not found: ${webhookData.payment_id}`);
        return res.status(404).json({ error: 'Payment not found' });
      }

      console.log(
        `Processing IPN for payment ${webhookData.payment_id}: ${payment.status} -> ${webhookData.payment_status}`
      );

      // Update payment with complete webhook data
      const updateData = {
        status: webhookData.payment_status,
        updated_at: new Date(),
        last_webhook_at: new Date()
      };

      // Add all NOWPayments webhook fields if present
      if (webhookData.pay_amount) updateData.pay_amount = parseFloat(webhookData.pay_amount);
      if (webhookData.actually_paid) updateData.actually_paid = parseFloat(webhookData.actually_paid);
      if (webhookData.outcome_amount) updateData.outcome_amount = parseFloat(webhookData.outcome_amount);
      if (webhookData.fee) updateData.fee = parseFloat(webhookData.fee);
      if (webhookData.pay_currency) updateData.pay_currency = webhookData.pay_currency.toLowerCase();
      if (webhookData.outcome_currency) updateData.outcome_currency = webhookData.outcome_currency.toLowerCase();
      if (webhookData.payment_extra_id) updateData.payment_extra_id = webhookData.payment_extra_id;
      if (webhookData.burning_percent) updateData.burning_percent = parseFloat(webhookData.burning_percent);
      if (webhookData.type) updateData.type = webhookData.type;

      // Track payment confirmation details
      if (webhookData.payment_status === 'confirmed' || webhookData.payment_status === 'finished') {
        if (webhookData.actually_paid) {
          updateData.confirmed_amount = parseFloat(webhookData.actually_paid);
        }
        updateData.confirmed_at = new Date();
      }

      // Track payment completion details
      if (webhookData.payment_status === 'finished') {
        updateData.completed_at = new Date();
        updateData.final_amount = parseFloat(webhookData.outcome_amount || webhookData.actually_paid || updateData.pay_amount);
      }

      // Track failure details
      if (['failed', 'expired', 'refunded'].includes(webhookData.payment_status)) {
        updateData.failed_at = new Date();
        if (webhookData.payment_status === 'expired') {
          updateData.expired_at = new Date();
        }
      }

      // Update payment status
      const updatedPayment = await paymentFirestoreService.updatePaymentStatus(
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
      waiting: '⏳ Waiting for payment - User needs to send crypto',
      confirming: '🔄 Payment detected - Confirming on blockchain', 
      confirmed: '✅ Payment confirmed - Processing transaction',
      sending: '📤 Payment being processed - Sending to destination',
      partially_paid: '⚠️ Payment partially received - Additional amount needed',
      finished: '🎉 Payment completed successfully!',
      failed: '❌ Payment failed - Transaction could not be processed',
      refunded: '💸 Payment was refunded - Amount returned to sender',
      expired: '⏱️ Payment expired - Time limit exceeded'
    };

    const message = statusMessages[newStatus] || `❓ Unknown status: ${newStatus}`;
    const timestamp = new Date().toISOString();
    
    console.log(`\n=== PAYMENT STATUS UPDATE ===`);
    console.log(`Payment ID: ${payment.payment_id}`);
    console.log(`User ID: ${payment.user_id}`);
    console.log(`Order ID: ${payment.order_id || 'N/A'}`);
    console.log(`Status: ${message}`);
    console.log(`Amount: ${payment.amount} ${payment.currency.toUpperCase()}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`============================\n`);

    // Also store status change in payment metadata for audit trail
    const statusHistory = payment.status_history || [];
    statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      webhook_received: true
    });

    // This could be saved back to the payment record if needed
    return statusHistory;
  }

  async handlePaymentStatus(payment, webhookData) {
    try {
      switch (payment.status) {
        case 'waiting':
          console.log(`⏳ Payment ${payment.payment_id} is waiting for user to send crypto`);
          break;
          
        case 'confirming':
          console.log(`🔄 Payment ${payment.payment_id} detected on blockchain, waiting for confirmations`);
          await this.handleConfirmingPayment(payment, webhookData);
          break;
          
        case 'confirmed':
          console.log(`✅ Payment ${payment.payment_id} confirmed on blockchain`);
          await this.handleConfirmedPayment(payment, webhookData);
          break;
          
        case 'sending':
          console.log(`📤 Payment ${payment.payment_id} is being processed and sent to destination`);
          await this.handleSendingPayment(payment, webhookData);
          break;
          
        case 'finished':
          await this.handleCompletedPayment(payment, webhookData);
          break;
          
        case 'failed':
        case 'expired':
        case 'refunded':
          await this.handleFailedPayment(payment, webhookData);
          break;
          
        case 'partially_paid':
          await this.handlePartialPayment(payment, webhookData);
          break;
          
        default:
          console.log(`❓ Payment ${payment.payment_id} has unknown status: ${payment.status}`);
          console.log(`Webhook data:`, JSON.stringify(webhookData, null, 2));
      }
    } catch (error) {
      console.error(`Error handling payment status for ${payment.payment_id}:`, error);
    }
  }

  async handleConfirmingPayment(payment, webhookData) {
    console.log(`🔄 Payment ${payment.payment_id} is being confirmed on blockchain`);
    console.log(`Amount detected: ${webhookData.actually_paid || 'N/A'} ${payment.pay_currency || payment.currency}`);
    
    // You can add logic here for:
    // - Updating user interface with "confirming" status
    // - Sending confirmation detection notification
    // - Starting confirmation countdown display
  }

  async handleConfirmedPayment(payment, webhookData) {
    console.log(`✅ Payment ${payment.payment_id} confirmed on blockchain`);
    console.log(`Confirmed amount: ${webhookData.actually_paid || 'N/A'} ${payment.pay_currency || payment.currency}`);
    
    // You can add logic here for:
    // - Updating user interface with "confirmed" status
    // - Preparing for final processing
    // - Notifying user that payment is confirmed and being processed
  }

  async handleSendingPayment(payment, webhookData) {
    console.log(`📤 Payment ${payment.payment_id} is being sent to final destination`);
    
    // You can add logic here for:
    // - Updating user interface with "processing" status
    // - Notifying user that payment is being finalized
    // - Preparing completion workflows
  }

  async handleCompletedPayment(payment, webhookData) {
    console.log(`🎉 Payment ${payment.payment_id} completed successfully!`);
    console.log(`Expected Amount: ${payment.amount} ${payment.currency.toUpperCase()}`);
    console.log(`Actually Paid: ${webhookData.actually_paid || 'N/A'} ${payment.pay_currency || payment.currency}`);
    console.log(`Outcome Amount: ${webhookData.outcome_amount || 'N/A'} ${webhookData.outcome_currency || payment.currency}`);
    console.log(`Fee: ${webhookData.fee || 'N/A'}`);
    console.log(`User: ${payment.user_id}`);
    console.log(`Order ID: ${payment.order_id}`);
    
    // Store detailed completion information
    const completionDetails = {
      payment_id: payment.payment_id,
      user_id: payment.user_id,
      order_id: payment.order_id,
      original_amount: payment.amount,
      original_currency: payment.currency,
      paid_amount: webhookData.actually_paid,
      paid_currency: payment.pay_currency || payment.currency,
      outcome_amount: webhookData.outcome_amount,
      outcome_currency: webhookData.outcome_currency,
      fee_amount: webhookData.fee,
      completion_time: new Date(),
      webhook_data: webhookData
    };

    // Log completion details for audit trail
    console.log('Payment Completion Details:', JSON.stringify(completionDetails, null, 2));
    
    // Here you can add business logic:
    // - Credit user account with the exact amount received
    // - Send confirmation email with transaction details  
    // - Update user balance/credits
    // - Trigger fulfillment of services
    // - Send push notifications
    // - Update analytics/reporting
    // - Process any pending orders
    
    try {
      // Example business logic implementations:
      
      // 1. Credit user account (implement based on your business logic)
      // await this.creditUserAccount(payment.user_id, completionDetails);
      
      // 2. Send payment confirmation (implement email/notification service)
      // await this.sendPaymentConfirmation(payment.user_id, completionDetails);
      
      // 3. Update user statistics or achievements
      // await this.updateUserStats(payment.user_id, completionDetails);
      
      // 4. Process any business-specific logic
      // await this.processPendingOrders(payment.user_id, payment.order_id);
      
      console.log(`✅ Payment ${payment.payment_id} processing completed successfully`);
      
    } catch (businessLogicError) {
      console.error(`❌ Error processing business logic for payment ${payment.payment_id}:`, businessLogicError);
      // Payment is still marked as completed in NOWPayments, but business logic failed
      // You might want to create a manual review queue here
    }
  }

  async handleFailedPayment(payment, webhookData) {
    console.log(`❌ Payment ${payment.payment_id} failed or expired`);
    console.log(`Status: ${payment.status}`);
    console.log(`User: ${payment.user_id}`);
    console.log(`Order ID: ${payment.order_id}`);
    console.log(`Amount: ${payment.amount} ${payment.currency.toUpperCase()}`);
    
    if (webhookData.actually_paid && parseFloat(webhookData.actually_paid) > 0) {
      console.log(`⚠️ Partial payment detected: ${webhookData.actually_paid} paid`);
    }
    
    // Store detailed failure information
    const failureDetails = {
      payment_id: payment.payment_id,
      user_id: payment.user_id,
      order_id: payment.order_id,
      failure_reason: payment.status,
      original_amount: payment.amount,
      original_currency: payment.currency,
      partial_payment: webhookData.actually_paid || 0,
      failure_time: new Date(),
      webhook_data: webhookData
    };

    // Log failure details for analysis
    console.log('Payment Failure Details:', JSON.stringify(failureDetails, null, 2));
    
    try {
      // Handle different failure scenarios
      switch (payment.status) {
        case 'expired':
          console.log(`⏱️ Payment expired - user took too long to pay`);
          // await this.handleExpiredPayment(failureDetails);
          break;
          
        case 'failed':
          console.log(`💥 Payment processing failed`);
          // await this.handleFailedPaymentProcessing(failureDetails);
          break;
          
        case 'refunded':
          console.log(`💸 Payment was refunded`);
          // await this.handleRefundedPayment(failureDetails);
          break;
      }
      
      // Common failure handling:
      // - Notify user of failure
      // - Log for manual review if partial payment exists
      // - Cancel pending orders
      // - Update user interface
      // - Send failure notification
      
      // await this.notifyPaymentFailure(payment.user_id, failureDetails);
      // await this.cancelPendingOrders(payment.user_id, payment.order_id);
      
      console.log(`📝 Payment ${payment.payment_id} failure processed`);
      
    } catch (error) {
      console.error(`Error handling failed payment ${payment.payment_id}:`, error);
    }
  }

  async handlePartialPayment(payment, webhookData) {
    const expectedAmount = parseFloat(payment.pay_amount || payment.amount);
    const paidAmount = parseFloat(webhookData.actually_paid || 0);
    const shortfall = expectedAmount - paidAmount;
    const percentagePaid = ((paidAmount / expectedAmount) * 100).toFixed(2);
    
    console.log(`⚠️ Partial payment received for ${payment.payment_id}`);
    console.log(`Expected: ${expectedAmount} ${payment.pay_currency || payment.currency}`);
    console.log(`Received: ${paidAmount} ${payment.pay_currency || payment.currency}`);
    console.log(`Shortfall: ${shortfall.toFixed(8)} ${payment.pay_currency || payment.currency}`);
    console.log(`Percentage Paid: ${percentagePaid}%`);
    console.log(`User: ${payment.user_id}`);
    
    // Store detailed partial payment information
    const partialPaymentDetails = {
      payment_id: payment.payment_id,
      user_id: payment.user_id,
      order_id: payment.order_id,
      expected_amount: expectedAmount,
      paid_amount: paidAmount,
      shortfall_amount: shortfall,
      percentage_paid: parseFloat(percentagePaid),
      currency: payment.pay_currency || payment.currency,
      partial_payment_time: new Date(),
      webhook_data: webhookData
    };

    // Log partial payment details
    console.log('Partial Payment Details:', JSON.stringify(partialPaymentDetails, null, 2));
    
    try {
      // Handle partial payment based on business rules
      if (parseFloat(percentagePaid) >= 95) {
        // Close enough - might want to accept this payment
        console.log(`✅ Payment ${payment.payment_id} is ${percentagePaid}% complete - considering acceptance`);
        // await this.considerPartialPaymentAcceptance(partialPaymentDetails);
      } else if (parseFloat(percentagePaid) >= 50) {
        // Significant partial payment - might want to contact user
        console.log(`📞 Payment ${payment.payment_id} is ${percentagePaid}% complete - user contact recommended`);
        // await this.requestAdditionalPayment(partialPaymentDetails);
      } else {
        // Small partial payment - might want to refund
        console.log(`💸 Payment ${payment.payment_id} is only ${percentagePaid}% complete - refund consideration`);
        // await this.considerRefund(partialPaymentDetails);
      }
      
      // Common partial payment handling:
      // - Notify user about partial payment status
      // - Provide options for completing payment
      // - Set up monitoring for additional payments
      // - Update order status to "partially paid"
      
      // await this.notifyPartialPayment(payment.user_id, partialPaymentDetails);
      // await this.updateOrderStatus(payment.order_id, 'partially_paid', partialPaymentDetails);
      
      console.log(`📝 Partial payment ${payment.payment_id} processed`);
      
    } catch (error) {
      console.error(`Error handling partial payment ${payment.payment_id}:`, error);
    }
  }
}

module.exports = new WebhookController();
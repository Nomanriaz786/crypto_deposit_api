const crypto = require('crypto');
const { createNowPaymentsService, createPaymentFirestoreService, createWithdrawalFirestoreService, firestoreService } = require('../services');
const { successResponse } = require('../utils');
const config = require('../config');

class WebhookController {
  async handleIPN(req, res, next) {
    try {
      const webhookData = req.body;
      const receivedSignature = req.headers['x-nowpayments-sig'];
      
      console.log('IPN Webhook received:', JSON.stringify(webhookData, null, 2));

      // Determine if this is a payment or withdrawal webhook
      if (webhookData.payment_id) {
        // This is a payment webhook
        return await this.handlePaymentIPN(webhookData, receivedSignature, res);
      } else if (webhookData.withdrawal_id) {
        // This is a withdrawal webhook
        return await this.handleWithdrawalIPN(webhookData, receivedSignature, res);
      } else {
        console.error('Unknown webhook type - missing payment_id or withdrawal_id');
        return res.status(400).json({ error: 'Unknown webhook type' });
      }

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

  async handlePaymentIPN(webhookData, receivedSignature, res) {
    // Validate webhook data
    if (!webhookData.payment_id) {
      console.error('Missing payment_id in webhook data');
      return res.status(400).json({ error: 'Missing payment_id' });
    }

    // Convert payment_id to string (NOWPayments sends as number)
    const paymentId = String(webhookData.payment_id);
    webhookData.payment_id = paymentId; // Update for consistency

    // Determine category by checking all collections (with retry for Firestore eventual consistency)
    let category = await this.determineCategory(paymentId);
    
    // If not found immediately, wait and retry (Firestore replication delay)
    if (!category) {
      console.warn(`Payment ${paymentId} not found, retrying in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      category = await this.determineCategory(paymentId);
    }
    
    // Still not found after retry
    if (!category) {
      console.error(`⚠️ Payment not found in any collection: ${paymentId}`);
      console.error(`Webhook data:`, JSON.stringify(webhookData, null, 2));
      
      // CRITICAL: Return 200 to prevent NOWPayments retry loop
      // Log the webhook for manual processing later
      return res.status(200).json(successResponse(
        { 
          payment_id: paymentId, 
          warning: 'Payment not found yet - will be processed when payment creation completes' 
        },
        'Webhook received but payment not found yet'
      ));
    }

    console.log(`Payment ${paymentId} belongs to category: ${category}`);

    // Create category-specific services
    const nowPaymentsService = createNowPaymentsService(category);
    const paymentFirestoreService = createPaymentFirestoreService(config.getCollectionForCategory(category));

    // Verify IPN signature using scenario-specific service
    if (!nowPaymentsService.verifyIPNSignature(webhookData, receivedSignature)) {
      console.error('Invalid IPN signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Increment webhook attempts counter
    await paymentFirestoreService.incrementWebhookAttempts(webhookData.payment_id);

    // Find payment in the appropriate collection
    const payment = await paymentFirestoreService.getPaymentById(webhookData.payment_id);

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
      { payment_id: webhookData.payment_id, category: category },
      'Payment IPN processed successfully'
    ));
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

  async determineCategory(paymentId) {
    // Ensure paymentId is a string (NOWPayments may send as number)
    const paymentIdStr = String(paymentId);
    const categories = ['packages', 'matrix', 'lottery'];
    
    for (const category of categories) {
      try {
        const collectionName = config.getCollectionForCategory(category);
        
        // Try to get the document from this collection
        const payment = await firestoreService.getDocument(collectionName, paymentIdStr);
        if (payment) {
          return category;
        }
      } catch (error) {
        // Continue to next category if not found
        console.error(`Error getting document from ${collectionName}:`, error.message);
        continue;
      }
    }
    
    return null; // Payment not found in any collection
  }

  async handleWithdrawalIPN(webhookData, receivedSignature, res) {
    // Validate webhook data
    if (!webhookData.withdrawal_id) {
      console.error('Missing withdrawal_id in webhook data');
      return res.status(400).json({ error: 'Missing withdrawal_id' });
    }

    // CRITICAL FIX: Convert withdrawal_id to string (NOWPayments may send as number)
    const withdrawalId = String(webhookData.withdrawal_id);
    webhookData.withdrawal_id = withdrawalId;

    // Determine category by checking all withdrawal collections
    const category = await this.determineWithdrawalCategory(withdrawalId);
    if (!category) {
      console.error(`Withdrawal not found in any collection: ${withdrawalId}`);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    console.log(`Withdrawal ${withdrawalId} belongs to category: ${category}`);

    // Create category-specific services
    const nowPaymentsService = createNowPaymentsService(category);
    const withdrawalFirestoreService = createWithdrawalFirestoreService(config.getWithdrawalCollectionForCategory(category));

    // Verify IPN signature using category-specific service
    if (!nowPaymentsService.verifyIPNSignature(webhookData, receivedSignature)) {
      console.error('Invalid withdrawal IPN signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Increment webhook attempts counter
    await withdrawalFirestoreService.incrementWebhookAttempts(webhookData.withdrawal_id);

    // Find withdrawal in the appropriate collection
    const withdrawal = await withdrawalFirestoreService.getWithdrawalById(webhookData.withdrawal_id);

    console.log(
      `Processing withdrawal IPN for ${webhookData.withdrawal_id}: ${withdrawal.status} -> ${webhookData.status}`
    );

    // Update withdrawal with webhook data
    const updateData = {
      status: webhookData.status,
      updated_at: new Date(),
      last_webhook_at: new Date()
    };

    // Add status-specific fields
    if (webhookData.tx_hash) updateData.tx_hash = webhookData.tx_hash;
    if (webhookData.fee) updateData.fee = webhookData.fee;
    if (webhookData.estimated_arrival) updateData.estimated_arrival = webhookData.estimated_arrival;

    // Track status changes
    if (webhookData.status === 'sending') {
      updateData.sending_at = new Date();
      console.log(`🚀 Withdrawal ${webhookData.withdrawal_id} started sending`);
    }

    if (webhookData.status === 'completed') {
      updateData.completed_at = new Date();
      console.log(`✅ Withdrawal ${webhookData.withdrawal_id} completed successfully`);

      // TODO: Debit user balance after successful withdrawal
      // await this.debitUserBalance(withdrawal.user_id, withdrawal.amount, withdrawal.currency, category);
    }

    if (webhookData.status === 'failed') {
      updateData.failed_at = new Date();
      console.log(`❌ Withdrawal ${webhookData.withdrawal_id} failed`);

      // TODO: Unlock user balance on failed withdrawal
      // await this.unlockUserBalance(withdrawal.user_id, withdrawal.amount, withdrawal.currency, category);
    }

    // Update withdrawal status
    const updatedWithdrawal = await withdrawalFirestoreService.updateWithdrawalStatus(
      webhookData.withdrawal_id,
      updateData
    );

    // Send success response to NOWPayments
    res.status(200).json(successResponse(
      { withdrawal_id: webhookData.withdrawal_id, category: category },
      'Withdrawal IPN processed successfully'
    ));
  }

  async determineWithdrawalCategory(withdrawalId) {
    // Ensure withdrawalId is a string (NOWPayments may send as number)
    const withdrawalIdStr = String(withdrawalId);
    const categories = ['packages', 'matrix', 'lottery'];

    for (const category of categories) {
      try {
        const collectionName = config.getWithdrawalCollectionForCategory(category);

        // Try to get the document from this collection
        const withdrawal = await firestoreService.getDocument(collectionName, withdrawalIdStr);
        if (withdrawal) {
          return category;
        }
      } catch (error) {
        // Continue to next category if not found
        console.error(`Error getting withdrawal from ${collectionName}:`, error.message);
        continue;
      }
    }

    return null; // Withdrawal not found in any collection
  }
}

module.exports = new WebhookController();
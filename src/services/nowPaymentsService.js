const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const { ApiError } = require('../utils/errors');

class NOWPaymentsService {
  constructor(category = null) {
    // If category is provided, use category-specific config
    if (category) {
      const categoryConfig = config.getCategoryConfig(category);
      this.apiKey = categoryConfig.apiKey;
      this.ipnSecret = categoryConfig.ipnSecret;
      this.baseUrl = categoryConfig.baseUrl;
      this.isSandbox = categoryConfig.isSandbox;
      this.category = category;
    } else {
      // Legacy mode for backward compatibility
      this.apiKey = config.nowPayments.apiKey;
      this.baseUrl = config.nowPayments.baseUrl;
      this.ipnSecret = config.nowPayments.ipnSecret;
      this.isSandbox = config.nowPayments.isSandbox;
      this.category = 'legacy';
    }
    
    // Log which environment we're using
    console.log(`🔧 NOWPayments initialized for category: ${this.category} in ${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode`);
    console.log(`📡 Using API endpoint: ${this.baseUrl}`);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('NOWPayments Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('NOWPayments Response Error:', error.response?.data || error.message);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new ApiError('Invalid request parameters', 400, data);
        case 401:
          return new ApiError('Invalid API key or unauthorized access', 401, data);
        case 403:
          return new ApiError('Forbidden - insufficient permissions', 403, data);
        case 404:
          return new ApiError('Resource not found', 404, data);
        case 429:
          return new ApiError('Rate limit exceeded', 429, data);
        case 500:
          return new ApiError('NOWPayments server error', 500, data);
        default:
          return new ApiError(`NOWPayments API error: ${status}`, status, data);
      }
    } else if (error.request) {
      return new ApiError('Network error - unable to reach NOWPayments API', 503);
    } else {
      return new ApiError('Request setup error', 500);
    }
  }

  async getApiStatus() {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrencies() {
    try {
      const response = await this.client.get('/currencies');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getAvailableCurrencies() {
    try {
      const response = await this.client.get('/currencies?fixed_rate=true');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      const payload = {
        price_amount: parseFloat(paymentData.amount),
        price_currency: paymentData.priceCurrency || 'usd',
        pay_currency: paymentData.payCurrency.toLowerCase(),
        order_id: paymentData.orderId,
        order_description: paymentData.orderDescription || `Payment for user ${paymentData.userId}`,
      };

      // Add IPN callback URL only if not in sandbox mode or if it's a public URL
      if (!this.isSandbox || (config.baseUrl && !config.baseUrl.includes('localhost'))) {
        payload.ipn_callback_url = `${config.baseUrl.replace(/\/$/, '')}/api/webhook/ipn`;
      }

      console.log('NOWPayments create payment payload:', JSON.stringify(payload, null, 2));

      const response = await this.client.post('/payment', payload);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('NOWPayments create payment error:', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/payment/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getMinimumPaymentAmount(currency_from, currency_to = 'usd') {
    try {
      const response = await this.client.get('/min-amount', {
        params: {
          currency_from: currency_from.toLowerCase(),
          currency_to: currency_to.toLowerCase()
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async estimatePrice(amount, currency_from, currency_to = 'usd') {
    try {
      const response = await this.client.get('/estimate', {
        params: {
          amount: parseFloat(amount),
          currency_from: currency_from.toLowerCase(),
          currency_to: currency_to.toLowerCase()
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async validateCurrency(currency) {
    try {
      const currencies = await this.getCurrencies();
      return currencies.currencies.includes(currency.toLowerCase());
    } catch (error) {
      console.error('Currency validation error:', error);
      return false;
    }
  }

  async createWithdrawal(withdrawalData) {
    try {
      const payload = {
        address: withdrawalData.address,
        currency: withdrawalData.currency.toLowerCase(),
        amount: parseFloat(withdrawalData.amount),
        ipn_callback_url: withdrawalData.ipnCallbackUrl || `${config.baseUrl.replace(/\/$/, '')}/api/webhook/withdrawal/ipn`
      };

      // Add optional fields if provided
      if (withdrawalData.extra_id) payload.extra_id = withdrawalData.extra_id;
      if (withdrawalData.contact_email) payload.contact_email = withdrawalData.contact_email;

      console.log('NOWPayments create withdrawal payload:', JSON.stringify(payload, null, 2));

      const response = await this.client.post('/payout', payload);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('NOWPayments create withdrawal error:', error);
      throw error;
    }
  }

  async getWithdrawalStatus(withdrawalId) {
    try {
      const response = await this.client.get(`/payout/${withdrawalId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getWithdrawalHistory(options = {}) {
    try {
      const params = {};
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      if (options.date_from) params.date_from = options.date_from;
      if (options.date_to) params.date_to = options.date_to;

      const response = await this.client.get('/payouts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getBalance() {
    try {
      const response = await this.client.get('/balance');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async validateWithdrawalAddress(currency, address) {
    try {
      const response = await this.client.post('/validate/address', {
        currency: currency.toLowerCase(),
        address: address
      });
      return response.data;
    } catch (error) {
      console.error('Address validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  verifyIPNSignature(payload, receivedSignature, category = null) {
    try {
      // Use category-specific IPN secret if category provided, otherwise use instance IPN secret
      const ipnSecret = category ? config.getCategoryConfig(category).ipnSecret : this.ipnSecret;
      const isSandbox = category ? config.getCategoryConfig(category).isSandbox : this.isSandbox;
      
      // In sandbox mode, IPN secret might not be available or functional
      if (isSandbox) {
        if (!ipnSecret || ipnSecret.trim() === '') {
          console.warn(`🏖️ SANDBOX MODE (${category || this.category}): No IPN secret configured, skipping signature verification`);
          return true; // Allow webhook in sandbox without verification
        } else {
          console.log(`🏖️ SANDBOX MODE (${category || this.category}): Attempting IPN signature verification...`);
        }
      }
      
      if (!ipnSecret) {
        console.warn(`IPN secret not configured for category ${category || this.category}, skipping signature verification`);
        return true; // Allow in development, but warn
      }

      if (!receivedSignature) {
        if (isSandbox) {
          console.warn(`🏖️ SANDBOX MODE (${category || this.category}): No signature provided, but allowing due to sandbox limitations`);
          return true;
        } else {
          console.error('No signature provided in IPN request');
          return false;
        }
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
        
        if (isSandbox) {
          console.warn(`🏖️ SANDBOX MODE (${category || this.category}): Signature mismatch, but allowing due to sandbox limitations`);
          return true; // Be lenient in sandbox
        }
      } else if (isSandbox) {
        console.log(`🏖️ SANDBOX MODE (${category || this.category}): IPN signature verified successfully`);
      }

      return isSandbox ? true : isValid; // Always allow in sandbox
    } catch (error) {
      console.error('Error verifying IPN signature:', error);
      
      // Be more lenient in sandbox mode
      const isSandboxCheck = category ? config.getCategoryConfig(category).isSandbox : this.isSandbox;
      if (isSandboxCheck) {
        console.warn(`🏖️ SANDBOX MODE (${category || this.category}): Error during signature verification, but allowing due to sandbox limitations`);
        return true;
      }
      
      return false;
    }
  }
}

module.exports = NOWPaymentsService;
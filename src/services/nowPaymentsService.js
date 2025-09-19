const axios = require('axios');
const config = require('../config');
const { ApiError } = require('../utils/errors');

class NOWPaymentsService {
  constructor() {
    this.apiKey = config.nowPayments.apiKey;
    this.baseUrl = config.nowPayments.baseUrl;
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
        console.log(`NOWPayments API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
        console.log(`NOWPayments API Response: ${response.status} ${response.config.url}`);
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
        ipn_callback_url: `${config.baseUrl.replace(/\/$/, '')}/api/webhook/ipn`,
        order_id: paymentData.orderId,
        order_description: paymentData.orderDescription || `Payment for user ${paymentData.userId}`,
        ...paymentData.metadata && { metadata: paymentData.metadata }
      };

      console.log('Creating NOWPayments payment with payload:', JSON.stringify(payload, null, 2));

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

  // Utility method to check if payment is successful
  isPaymentSuccessful(status) {
    return status === 'finished';
  }

  // Utility method to check if payment is pending
  isPaymentPending(status) {
    return ['waiting', 'confirming', 'confirmed', 'sending'].includes(status);
  }

  // Utility method to check if payment has failed
  isPaymentFailed(status) {
    return ['failed', 'expired', 'refunded'].includes(status);
  }
}

module.exports = new NOWPaymentsService();
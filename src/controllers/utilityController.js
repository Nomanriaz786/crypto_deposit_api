const { nowPaymentsService } = require('../services');
const { successResponse } = require('../utils');
const config = require('../config');

class UtilityController {
  async healthCheck(req, res) {
    try {
      res.json(successResponse({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
      }, 'Service is healthy'));
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getServiceStatus(req, res, next) {
    try {
      // Check NOWPayments API status
      const nowPaymentsStatus = await nowPaymentsService.getApiStatus();
      
      res.json(successResponse({
        api_status: 'OK',
        nowpayments_status: nowPaymentsStatus.message || 'OK',
        database_status: 'Connected',
        timestamp: new Date().toISOString()
      }, 'All services are operational'));

    } catch (error) {
      console.error('Service status check error:', error);
      
      res.status(503).json({
        success: false,
        error: 'One or more services are unavailable',
        details: {
          api_status: 'OK',
          nowpayments_status: error.message || 'Error',
          database_status: 'Unknown'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async getSupportedCurrencies(req, res, next) {
    try {
      const currencies = await nowPaymentsService.getCurrencies();
      
      res.json(successResponse(
        currencies,
        'Supported currencies retrieved successfully'
      ));

    } catch (error) {
      next(error);
    }
  }

  async getAvailableCurrencies(req, res, next) {
    try {
      const currencies = await nowPaymentsService.getAvailableCurrencies();
      
      res.json(successResponse(
        currencies,
        'Available currencies retrieved successfully'
      ));

    } catch (error) {
      next(error);
    }
  }

  async getMinimumAmount(req, res, next) {
    try {
      const { currency_from, currency_to = 'usd' } = req.query;

      if (!currency_from) {
        return res.status(400).json({
          success: false,
          error: 'currency_from parameter is required'
        });
      }

      const minAmount = await nowPaymentsService.getMinimumPaymentAmount(
        currency_from,
        currency_to
      );
      
      res.json(successResponse(
        minAmount,
        'Minimum amount retrieved successfully'
      ));

    } catch (error) {
      next(error);
    }
  }

  async estimatePrice(req, res, next) {
    try {
      const { amount, currency_from, currency_to = 'usd' } = req.query;

      if (!amount || !currency_from) {
        return res.status(400).json({
          success: false,
          error: 'amount and currency_from parameters are required'
        });
      }

      const estimate = await nowPaymentsService.estimatePrice(
        amount,
        currency_from,
        currency_to
      );
      
      res.json(successResponse(
        estimate,
        'Price estimate retrieved successfully'
      ));

    } catch (error) {
      next(error);
    }
  }

  async getApiInfo(req, res) {
    res.json(successResponse({
      name: 'Crypto Deposit API',
      version: '1.0.0',
      description: 'NOWPayments integration for cryptocurrency deposits',
      endpoints: {
        payments: [
          'POST /api/payments/create',
          'GET /api/payments/:paymentId',
          'GET /api/payments/:paymentId/refresh',
          'GET /api/users/:userId/payments',
          'GET /api/users/:userId/payments/stats'
        ],
        webhooks: [
          'POST /api/webhook/ipn'
        ],
        utilities: [
          'GET /api/health',
          'GET /api/status',
          'GET /api/currencies',
          'GET /api/currencies/available',
          'GET /api/minimum-amount',
          'GET /api/estimate'
        ]
      },
      documentation: 'https://your-domain.com/docs'
    }, 'API information'));
  }
}

module.exports = new UtilityController();
const express = require('express');
const { utilityController } = require('../controllers');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', utilityController.healthCheck);

/**
 * @route   GET /api/status
 * @desc    Service status check including NOWPayments API
 * @access  Public
 */
router.get('/status', utilityController.getServiceStatus);

/**
 * @route   GET /api/currencies
 * @desc    Get supported cryptocurrencies
 * @access  Public
 */
router.get('/currencies', utilityController.getSupportedCurrencies);

/**
 * @route   GET /api/currencies/available
 * @desc    Get available cryptocurrencies with fixed rates
 * @access  Public
 */
router.get('/currencies/available', utilityController.getAvailableCurrencies);

/**
 * @route   GET /api/minimum-amount
 * @desc    Get minimum payment amount for a currency pair
 * @query   currency_from, currency_to (optional, defaults to 'usd')
 * @access  Public
 */
router.get('/minimum-amount', utilityController.getMinimumAmount);

/**
 * @route   GET /api/estimate
 * @desc    Estimate price for a currency conversion
 * @query   amount, currency_from, currency_to (optional, defaults to 'usd')
 * @access  Public
 */
router.get('/estimate', utilityController.estimatePrice);

/**
 * @route   GET /api
 * @desc    API information and documentation
 * @access  Public
 */
router.get('/', utilityController.getApiInfo);

module.exports = router;
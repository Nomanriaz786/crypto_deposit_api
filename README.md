# Professional Crypto Deposit API with NOWPayments

A **production-ready**, modular Node.js API for handling cryptocurrency deposits using NOWPayments integration, built with professional architecture and optimized for Vercel deployment.

## 🏗️ Architecture Overview

This API follows **enterprise-level** patterns with clear separation of concerns:

```
CryptoApi/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers & business logic
│   ├── middleware/      # Express middleware (auth, validation, etc.)
│   ├── models/         # Database models & schemas  
│   ├── routes/         # API route definitions
│   ├── services/       # External API integrations & core services
│   ├── utils/          # Helper functions & utilities
│   └── app.js          # Main application entry point
├── package.json        # Dependencies and scripts
├── vercel.json         # Deployment configuration
└── .env               # Environment variables
```

## 🚀 Features

- ✅ **Modular Architecture** - Scalable and maintainable codebase
- ✅ **NOWPayments Integration** - Support for 200+ cryptocurrencies
- ✅ **Advanced Middleware** - Rate limiting, validation, security headers
- ✅ **Error Handling** - Comprehensive error management with proper HTTP codes
- ✅ **Webhook Support** - Real-time payment status updates via IPN
- ✅ **Request Validation** - Input sanitization and validation
- ✅ **MongoDB Integration** - Optimized database queries with indexing
- ✅ **Vercel Ready** - Serverless deployment optimization
- ✅ **Security First** - CORS, rate limiting, security headers
- ✅ **Logging & Monitoring** - Request logging and health checks
- ✅ **API Documentation** - Built-in endpoint documentation

## 📋 Prerequisites

1. **NOWPayments Account** - [Sign up at NOWPayments.io](https://nowpayments.io)
2. **MongoDB Database** - [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended)
3. **Node.js** - Version 18 or higher
4. **Vercel Account** - For deployment

## 🛠️ NOWPayments Setup

1. Create account on [NOWPayments.io](https://nowpayments.io)
2. Complete KYC verification  
3. Navigate to **Dashboard → API Keys**
4. Generate and securely store:
   - **Private API Key (x-api-key)** ⚠️ Keep this secret!

## 📦 Installation & Setup

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd CryptoApi

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your credentials
nano .env

# Install nodemon for development (optional)
npm install -g nodemon

# Start development server
npm run dev
```

### Environment Configuration (.env)

```env
# Required - NOWPayments Configuration
NOWPAYMENTS_API_KEY=your_private_api_key_here

# Required - Database Configuration  
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/payments

# Required - Application Configuration
BASE_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production

# Optional - Advanced Configuration
CORS_ORIGIN=*
PORT=5000
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Or use the npm script for production
npm run deploy

# Set environment variables in Vercel Dashboard:
# NOWPAYMENTS_API_KEY
# MONGODB_URI  
# BASE_URL
```

## 🌐 API Documentation

### Base URLs
- **Local**: `http://localhost:5000`
- **Production**: `https://your-domain.vercel.app`

### Core Endpoints

#### 1. Create Crypto Deposit
```http
POST /api/payments/create
Content-Type: application/json

{
  "amount": 100.50,
  "payCurrency": "usdttrc20", 
  "userId": "user_12345",
  "orderDescription": "Premium subscription"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "5543043316",
    "pay_address": "TXYZabcdef123456789",
    "pay_amount": 100.89,
    "pay_currency": "usdttrc20",
    "price_amount": 100.50,
    "price_currency": "usd", 
    "payment_status": "waiting",
    "order_id": "user_12345_1726576200000_a1b2c3d4"
  },
  "message": "Payment created successfully",
  "timestamp": "2025-09-17T10:30:00.000Z"
}
```

#### 2. Check Payment Status
```http
GET /api/payments/{payment_id}
```

#### 3. Refresh Payment Status (Force sync with NOWPayments)
```http  
GET /api/payments/{payment_id}/refresh
```

#### 4. Get User Payment History
```http
GET /api/users/{user_id}/payments?status=finished&limit=10&offset=0
```

#### 5. Get User Payment Statistics
```http
GET /api/users/{user_id}/payments/stats
```

#### 6. System Health Check
```http
GET /api/health
```

#### 7. Service Status (includes NOWPayments connectivity)
```http
GET /api/status  
```

#### 8. Supported Cryptocurrencies
```http
GET /api/currencies
```

#### 9. Price Estimation
```http
GET /api/estimate?amount=100&currency_from=usd&currency_to=btc
```

### Webhook Endpoint (NOWPayments IPN)
```http
POST /api/webhook/ipn
```
*This endpoint is automatically called by NOWPayments - configure it in your NOWPayments dashboard*

## 💳 Supported Cryptocurrencies

**Major Cryptocurrencies:**
- Bitcoin (`btc`)
- Ethereum (`eth`) 
- Litecoin (`ltc`)
- Bitcoin Cash (`bch`)

**Stablecoins:**
- USDT TRC-20 (`usdttrc20`) 
- USDT ERC-20 (`usdterc20`)
- USDT BEP-20 (`usdtbep20`)
- USDC ERC-20 (`usdcerc20`)

**Altcoins:**  
- Dogecoin (`doge`)
- Shiba Inu (`shib`)
- Polygon (`matic`)
- Solana (`sol`)
- And 200+ more...

[View complete list](https://documenter.getpostman.com/view/7907941/S1a32n38)

## 🔄 Complete Payment Flow

1. **Frontend** → Calls `POST /api/payments/create`
2. **API** → Creates payment with NOWPayments → Returns crypto address  
3. **User** → Sends crypto to the provided address
4. **NOWPayments** → Detects payment → Calls `POST /api/webhook/ipn`
5. **API** → Updates database → Triggers business logic
6. **Frontend** → Polls `GET /api/payments/{id}` or receives real-time updates

## 📱 Frontend Integration Examples

### JavaScript/Fetch
```javascript
// Create payment
const createPayment = async (amount, currency, userId) => {
  const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, payCurrency: currency, userId })
  });
  
  return await response.json();
};

// Check status with polling
const pollPaymentStatus = (paymentId, onStatusUpdate) => {
  const interval = setInterval(async () => {
    const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`);
    const data = await response.json();
    
    onStatusUpdate(data.data.status);
    
    if (['finished', 'failed', 'expired'].includes(data.data.status)) {
      clearInterval(interval);
    }
  }, 10000); // Check every 10 seconds
};
```

### Flutter/Dart
```dart
class CryptoPaymentService {
  static const String baseUrl = 'https://your-api.vercel.app';
  
  Future<PaymentResponse> createPayment({
    required double amount,
    required String currency,
    required String userId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/payments/create'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'amount': amount,
        'payCurrency': currency,
        'userId': userId,
      }),
    );
    
    return PaymentResponse.fromJson(jsonDecode(response.body));
  }
}
```

## 📊 Payment Status Flow

```
waiting → confirming → confirmed → sending → finished ✅
   ↓         ↓           ↓         ↓
failed ❌  failed ❌   failed ❌  failed ❌
expired ⏱️
```

**Status Definitions:**
- `waiting` - Awaiting user payment
- `confirming` - Payment detected, awaiting blockchain confirmations
- `confirmed` - Payment confirmed on blockchain  
- `sending` - Payment being processed by NOWPayments
- `finished` ✅ - Payment successfully completed
- `failed` ❌ - Payment failed
- `expired` ⏱️ - Payment window expired
- `partially_paid` - Incomplete payment received

## 🔧 Advanced Configuration

### Rate Limiting
```javascript
// Default limits (per IP)
{
  general: '100 requests per 15 minutes',
  payments: '10 payment creations per 5 minutes', 
  webhooks: '100 requests per minute'
}
```

### Database Indexing
Optimized MongoDB indexes for performance:
- `payment_id` (unique)
- `user_id + status` (compound)
- `created_at` (descending)
- `status + created_at` (compound)

### Security Features
- CORS configuration
- Request rate limiting
- Input validation & sanitization
- Security headers (XSS, CSRF protection)
- Environment variable validation

## 🐛 Debugging & Logging

### Enable Debug Mode
```env
NODE_ENV=development
```

### Common Issues & Solutions

**1. 401 Unauthorized**
```bash
# Check your NOWPayments API key
curl -H "x-api-key: YOUR_KEY" https://api.nowpayments.io/v1/status
```

**2. Webhook Not Receiving**  
- Verify `BASE_URL` in environment variables
- Check NOWPayments dashboard webhook settings
- Test with ngrok for local development

**3. Database Connection Issues**
```bash
# Test MongoDB connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/payments"
```

**4. Payment Status Not Updating**
```javascript
// Force refresh payment status
GET /api/payments/{payment_id}/refresh
```

## 🚀 Performance Optimizations

- **Connection Pooling**: MongoDB connection reuse
- **Efficient Queries**: Indexed database operations  
- **Response Caching**: Static currency data caching
- **Request Validation**: Early input validation
- **Error Boundaries**: Graceful error handling

## 📈 Monitoring & Analytics

### Health Monitoring
```bash
# Check API health
curl https://your-api.vercel.app/api/health

# Check service status  
curl https://your-api.vercel.app/api/status
```

### Payment Analytics
```bash
# User payment statistics
GET /api/users/{user_id}/payments/stats
```

## 🔐 Security Best Practices

- ✅ Never expose API keys in frontend code
- ✅ Use HTTPS in production (Vercel auto-provides)
- ✅ Implement webhook signature verification
- ✅ Validate all user inputs
- ✅ Use environment variables for sensitive data
- ✅ Enable rate limiting
- ✅ Monitor for suspicious activities

## 📞 Support & Resources

- **NOWPayments Documentation**: [API Docs](https://documenter.getpostman.com/view/7907941/S1a32n38)
- **Vercel Documentation**: [Deployment Guide](https://vercel.com/docs) 
- **MongoDB Atlas**: [Setup Guide](https://docs.atlas.mongodb.com/)
- **Node.js Best Practices**: [Guide](https://github.com/goldbergyoni/nodebestpractices)

## 🔄 Migration from v1.0

If upgrading from the previous version:
1. Update `package.json` dependencies
2. Move environment variables to new format
3. Update API endpoints (new structure)
4. Test webhook integration

## 📄 License

MIT License - Free for personal and commercial use.

---

**🎉 Your professional crypto deposit API is ready for production!**

Built with ❤️ using modern Node.js patterns and industry best practices.
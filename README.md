# Professional Crypto Deposit API with NOWPayments & Firestore

A **production-ready**, modular Node.js API for handling cryptocurrency deposits using NOWPayments integration and Google Firestore database, built with professional architecture and optimized for Vercel serverless deployment.

## 🏗️ Architecture Overview

This API follows **enterprise-level** patterns with clear separation of concerns:

```
CryptoApi/
├── src/
│   ├── config/          # Configuration management
│   ├── controllers/     # Request handlers & business logic
│   ├── middleware/      # Express middleware (auth, validation, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # External API integrations & core services
│   │   ├── firestoreService.js      # Firestore database operations
│   │   ├── paymentFirestoreService.js # Payment-specific Firestore operations
│   │   └── nowPaymentsService.js    # NOWPayments API integration
│   ├── utils/          # Helper functions & utilities
│   └── app.js          # Main application entry point
├── package.json        # Dependencies and scripts
├── vercel.json         # Deployment configuration
└── .env               # Environment variables
```

## 🚀 Features

- ✅ **Modular Architecture** - Scalable and maintainable codebase
- ✅ **NOWPayments Integration** - Support for 200+ cryptocurrencies
- ✅ **Firestore Database** - Serverless-first NoSQL database from Google
- ✅ **Advanced Middleware** - Rate limiting, validation, security headers
- ✅ **Error Handling** - Comprehensive error management with proper HTTP codes
- ✅ **Webhook Support** - Real-time payment status updates via IPN
- ✅ **Request Validation** - Input sanitization and validation
- ✅ **Vercel Optimized** - Perfect for serverless deployment
- ✅ **Security First** - CORS, rate limiting, security headers, IPN signature verification
- ✅ **Logging & Monitoring** - Request logging and health checks
- ✅ **Real-time Updates** - Firestore's real-time capabilities
- ✅ **Auto-scaling** - Firestore scales automatically with usage

## 📋 Prerequisites

1. **NOWPayments Account** - [Sign up at NOWPayments.io](https://nowpayments.io)
2. **Firebase Project** - [Create at Firebase Console](https://console.firebase.google.com/)
3. **Node.js** - Version 18 or higher
4. **Vercel Account** - For deployment

## 🛠️ Setup Instructions

### 1. NOWPayments Setup

1. Create account on [NOWPayments.io](https://nowpayments.io)
2. Complete KYC verification  
3. Navigate to **Dashboard → API Keys**
4. Generate and securely store your **API Key**
5. Go to **Settings → IPN**
6. Set webhook URL: `https://your-domain.vercel.app/api/webhook/ipn`
7. Copy your **IPN Secret Key**

### 2. Firebase/Firestore Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Firestore Database**:
   - Click "Create database"
   - Choose "Start in production mode"
   - Select your region
4. Get service account credentials:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Extract: `project_id`, `private_key`, and `client_email`

### 3. Environment Variables

Create `.env` file in project root:

```bash
# Firebase/Firestore Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Firebase-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com

# NOWPayments Configuration
NOWPAYMENTS_API_KEY=XSBDSK7-3X14GKX-MV3FQ6C-24D1056
NOWPAYMENTS_IPN_SECRET=your-ipn-secret-key

# Server Configuration
PORT=5000
NODE_ENV=development

# Base URL for IPN callbacks (set this to your Vercel domain in production)
BASE_URL=https://your-vercel-domain.vercel.app
```

### 4. Installation & Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd CryptoApi

# Install dependencies
npm install

# Start development server
npm start
```

## 📡 API Endpoints

### Payment Management
- `POST /api/payments/create` - Create new crypto payment
- `GET /api/payments/:paymentId` - Get payment status by ID
- `GET /api/payments/:paymentId/refresh` - Refresh payment status from NOWPayments

### User Management  
- `GET /api/users/:userId/payments` - Get all payments for a user
- `GET /api/users/:userId/payments/stats` - Get payment statistics for a user

### Currency & Utility
- `GET /api/currencies` - Get all available cryptocurrencies  
- `GET /api/currencies/usdt` - Get only USDT currencies (USDT ERC20 & BSC)
- `GET /api/estimate` - Get payment amount estimate
- `GET /api/minimum-amount/:currency` - Get minimum payment amount

### Webhooks
- `POST /api/webhook/ipn` - NOWPayments IPN webhook handler

### System
- `GET /api/health` - Health check endpoint
- `GET /api` - API information and documentation

## 🔥 Firestore Database Structure

Your Firestore database will have the following structure:

```
Firestore Database
└── payments (collection)
    ├── payment_123456789 (document)
    │   ├── payment_id: "123456789"
    │   ├── user_id: "user_abc123"
    │   ├── amount: 100
    │   ├── currency: "usdterc20"
    │   ├── status: "finished"
    │   ├── pay_address: "0x..."
    │   ├── pay_amount: 50.123456
    │   ├── order_id: "ORDER_20250920_001"
    │   ├── created_at: timestamp
    │   ├── updated_at: timestamp
    │   └── metadata: {...}
    └── payment_987654321 (document)
        └── ...
```

## 💳 Payment Flow

1. **User Request**: Frontend sends payment creation request
2. **API Processing**: 
   - Validates request data
   - Calls NOWPayments API to create payment
   - Stores payment info in Firestore
   - Returns payment details to user
3. **User Payment**: User sends crypto to provided address
4. **Status Updates**: NOWPayments sends webhook to your API
5. **Database Update**: API updates payment status in Firestore
6. **Business Logic**: Triggers completion logic (user credit, notifications, etc.)

## 🎯 Payment Creation Example

```bash
curl -X POST https://crypto-api-pi.vercel.app/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
      "amount": 10.00,
      "payCurrency": "btc", 
      "userId": "user123",
      "category": "matrix"
   }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "4831344768",
    "pay_address": "0x68F7171047Ba353d4bfC5AE64015B6092618dEBB",
    "pay_amount": 50.123456,
    "pay_currency": "usdterc20",
    "price_amount": 100,
    "price_currency": "usd",
    "payment_status": "waiting",
    "order_id": "ORDER_20250920_001",
    "created_at": "2025-09-20T10:30:00Z"
  },
  "message": "Payment created successfully"
}
```

## 🚀 Vercel Deployment

1. **Connect Repository**:
   ```bash
   vercel link
   ```

2. **Set Environment Variables**:
   ```bash
   vercel env add FIREBASE_PROJECT_ID
   vercel env add FIREBASE_PRIVATE_KEY  
   vercel env add FIREBASE_CLIENT_EMAIL
   vercel env add NOWPAYMENTS_API_KEY
   vercel env add NOWPAYMENTS_IPN_SECRET
   vercel env add BASE_URL
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes all incoming data
- **CORS Protection**: Configurable cross-origin requests
- **Security Headers**: HTTP security headers  
- **IPN Signature Verification**: Validates webhook authenticity
- **Firestore Security Rules**: Database-level security

## 🎛️ Environment Configuration

### Development
- Uses `NODE_ENV=development`
- Detailed logging enabled
- CORS allows localhost

### Production  
- Uses `NODE_ENV=production`
- Optimized for Vercel serverless
- Strict security settings
- Error details hidden

## 🔧 Advanced Configuration

### Firestore Indexes
For better query performance, create indexes in Firebase Console:
- Composite index: `user_id` + `created_at` (descending)
- Composite index: `status` + `created_at` (descending)

### Rate Limiting
Customize in `src/middleware/rateLimiter.js`:
- General API: 100 requests/15 minutes
- Payment creation: 10 requests/15 minutes  
- Webhooks: 1000 requests/15 minutes

## 📊 Monitoring & Analytics

- **Health Check**: `GET /api/health`
- **Request Logging**: All API calls logged in development
- **Error Tracking**: Comprehensive error logging
- **Payment Analytics**: Built-in payment statistics

## 🆘 Troubleshooting

### Common Issues

**1. Firestore Permission Denied**
```bash
# Check your Firebase service account key
# Ensure FIREBASE_PROJECT_ID is correct
```

**2. IPN Webhook Failures**
```bash
# Verify webhook URL in NOWPayments dashboard
# Check NOWPAYMENTS_IPN_SECRET matches
```

**3. Payment Not Found**
```bash
# Ensure payment was saved to Firestore
# Check Firestore console for documents
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Support

- **NOWPayments**: [Documentation](https://documenter.getpostman.com/view/7907941/S1a32n38)
- **Firebase**: [Firestore Documentation](https://firebase.google.com/docs/firestore)
- **Vercel**: [Deployment Guide](https://vercel.com/docs)
## Complete Testing Workflow

### Prerequisites: Verify Hosted API

Before running any tests, verify the hosted API is accessible:

```bash
# Test API health endpoint
curl https://crypto-api-pi.vercel.app/api/test/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2025-10-17T12:00:00.000Z"
}
```

**Note:** All testing commands in this document use the hosted API endpoints. Clients should test directly against the production deployment at `https://crypto-api-pi.vercel.app`.

### Environment Setup

Make sure you have the following environment variables set in your `.env` file:

```env
# Firebase/Firestore
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# NOWPayments API Keys (one set per category)
PACKAGES_API_KEY=your-packages-api-key
PACKAGES_EMAIL=your-packages-email
PACKAGES_PASSWORD=your-packages-password
PACKAGES_IPN_SECRET=your-packages-ipn-secret

MATRIX_API_KEY=your-matrix-api-key
MATRIX_EMAIL=your-matrix-email
MATRIX_PASSWORD=your-matrix-password
MATRIX_IPN_SECRET=your-matrix-ipn-secret

LOTTERY_API_KEY=your-lottery-api-key
LOTTERY_EMAIL=your-lottery-email
LOTTERY_PASSWORD=your-lottery-password
LOTTERY_IPN_SECRET=your-lottery-ipn-secret

PASSIVE_INCOME_API_KEY=your-passive-income-api-key
PASSIVE_INCOME_EMAIL=your-passive-income-email
PASSIVE_INCOME_PASSWORD=your-passive-income-password
PASSIVE_INCOME_IPN_SECRET=your-passive-income-ipn-secret
```

### Step 1: Create a Test Payment

**⚠️ IMPORTANT: You must create a real payment first to get a valid payment_id for testing!**

The example payment_ids in this documentation (12345678, 87654321, etc.) are just placeholders. You need to create actual payments and use the real payment_ids returned by the API.

#### Create Packages Payment
```http
POST https://crypto-api-pi.vercel.app/api/payments/create
Content-Type: application/json

{
  "amount": "10",
  "payCurrency": "btc",
  "userId": "test-user-123",
  "category": "packages"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "5081583233",  // ← Use THIS payment_id in tests!
    "pay_address": "34KXeYonj6A7Qzy9h7fMWvHda4GBog2Yxt",
    "pay_amount": 0.00008364,
    "status": "waiting",
    "order_id": "ORDER-123",
    "amount": 10,
    "currency": "usd",
    "category": "packages"
  }
}
```

#### Create Matrix Payment
```http
POST https://crypto-api-pi.vercel.app/api/payments/create
Content-Type: application/json

{
  "amount": "25",
  "payCurrency": "eth",
  "userId": "test-user-456",
  "category": "matrix"
}
```

#### Create Lottery Payment
```http
POST https://crypto-api-pi.vercel.app/api/payments/create
Content-Type: application/json

{
  "amount": "5",
  "payCurrency": "usdt",
  "userId": "test-user-789",
  "category": "lottery"
}
```

#### Create Passive Income Payment
```http
POST https://crypto-api-pi.vercel.app/api/payments/create
Content-Type: application/json

{
  "amount": "50",
  "payCurrency": "usdtbsc",
  "userId": "test-user-999",
  "category": "passive_income"
}
```

### Step 2: Verify Payment in Database

#### Check Packages Payment
```http
GET https://crypto-api-pi.vercel.app/api/payments/12345678?category=packages
```

#### Check Matrix Payment
```http
GET https://crypto-api-pi.vercel.app/api/payments/87654321?category=matrix
```

#### Check Lottery Payment
```http
GET https://crypto-api-pi.vercel.app/api/payments/11223344?category=lottery
```

#### Check Passive Income Payment
```http
GET https://crypto-api-pi.vercel.app/api/payments/44556677?category=passive_income
```

### Step 3: Test Different Payment Scenarios

**⚠️ IMPORTANT: Replace the payment_id in the examples below with the real payment_id you got from Step 1!**

#### Successful Payment Test (Packages)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "5081583233",  // ← Replace with your real payment_id!
  "payment_status": "finished",
  "actually_paid": "0.00008364",
  "outcome_amount": "10.00",
  "fee": "0.0001"
}
```

**Console Output:**
```
SANDBOX TEST: Simulating webhook for payment 5081583233: waiting -> finished
Payment 5081583233 completed successfully!
Expected Amount: 10 USD
Actually Paid: 0.00008364 btc
Outcome Amount: 10.00 usd
Category: packages
```

#### Successful Payment Test (Matrix)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_MATRIX_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "finished",
  "actually_paid": "0.01",
  "outcome_amount": "25.00",
  "fee": "0.001"
}
```

#### Successful Payment Test (Lottery)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_LOTTERY_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "finished",
  "actually_paid": "5",
  "outcome_amount": "5.00",
  "fee": "0.1"
}
```

#### Successful Payment Test (Passive Income)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_PASSIVE_INCOME_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "finished",
  "actually_paid": "50",
  "outcome_amount": "50.00",
  "fee": "1.0"
}
```

#### Failed Payment Test (Matrix)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_MATRIX_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "failed"
}
```

#### Failed Payment Test (Passive Income)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_PASSIVE_INCOME_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "failed"
}
```

#### Expired Payment Test (Packages)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_PACKAGES_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "expired"
}
```

### Step 4: Test Complete Payment Lifecycle

#### Packages Category Lifecycle
```http
POST https://crypto-api-pi.vercel.app/api/test/payment/simulate-flow
Content-Type: application/json

{
  "payment_id": "YOUR_PACKAGES_PAYMENT_ID",  // ← Replace with real payment_id!
  "delay_seconds": 2
}
```

#### Matrix Category Lifecycle
```http
POST https://crypto-api-pi.vercel.app/api/test/payment/simulate-flow
Content-Type: application/json

{
  "payment_id": "YOUR_MATRIX_PAYMENT_ID",  // ← Replace with real payment_id!
  "delay_seconds": 3
}
```

#### Lottery Category Lifecycle
```http
POST https://crypto-api-pi.vercel.app/api/test/payment/simulate-flow
Content-Type: application/json

{
  "payment_id": "YOUR_LOTTERY_PAYMENT_ID",  // ← Replace with real payment_id!
  "delay_seconds": 1
}
```

#### Passive Income Category Lifecycle
```http
POST https://crypto-api-pi.vercel.app/api/test/payment/simulate-flow
Content-Type: application/json

{
  "payment_id": "YOUR_PASSIVE_INCOME_PAYMENT_ID",  // ← Replace with real payment_id!
  "delay_seconds": 4
}
```

### Step 5: Verify Final Payment Status

#### Check Packages Payment Status
```http
GET https://crypto-api-pi.vercel.app/api/payments/YOUR_PACKAGES_PAYMENT_ID?category=packages
```

#### Check Matrix Payment Status
```http
GET https://crypto-api-pi.vercel.app/api/payments/YOUR_MATRIX_PAYMENT_ID?category=matrix
```

#### Check Lottery Payment Status
```http
GET https://crypto-api-pi.vercel.app/api/payments/YOUR_LOTTERY_PAYMENT_ID?category=lottery
```

#### Check Passive Income Payment Status
```http
GET https://crypto-api-pi.vercel.app/api/payments/YOUR_PASSIVE_INCOME_PAYMENT_ID?category=passive_income
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "12345678",
    "status": "finished", 
    "completed_at": "2025-10-10T15:30:00.000Z",
    "confirmed_at": "2025-10-10T15:29:50.000Z",
    "final_amount": 10.00,
    "webhook_attempts": 4,
    "category": "packages"
  }
}
```

### Step 6: Test Withdrawal APIs

**⚠️ IMPORTANT: Withdrawals require sufficient balance and valid addresses!**

#### Create Packages Withdrawal
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.001",
  "currency": "btc",
  "withdrawalAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "userId": "test-user-123",
  "category": "packages",
  "orderDescription": "Package withdrawal test"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "withdrawal_id": "wd_1734567890123_abc123def",
    "status": "pending",
    "amount": 0.001,
    "currency": "btc",
    "withdrawal_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "order_id": "ORDER-123",
    "estimated_arrival": "2025-10-10T18:00:00.000Z",
    "category": "packages"
  },
  "message": "Withdrawal created successfully"
}
```

#### Create Matrix Withdrawal
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.01",
  "currency": "eth",
  "withdrawalAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "userId": "test-user-456",
  "category": "matrix",
  "orderDescription": "Matrix investment withdrawal"
}
```

#### Create Lottery Withdrawal
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.01",
  "currency": "usdtbsc",
  "withdrawalAddress": "0xc4087e5f6e89b8b11d48d7dfc17efddd359c1f41",
  "userId": "test-user-789",
  "category": "lottery",
  "orderDescription": "Lottery winnings withdrawal"
}
```

#### Create Passive Income Withdrawal
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "1.0",
  "currency": "usdtbsc",
  "withdrawalAddress": "0x8ba1f109551bD432803012645261768374161",
  "userId": "test-user-999",
  "category": "passive_income",
  "orderDescription": "Passive income withdrawal"
}
```

### Step 7: Verify Withdrawal Status

#### Check Packages Withdrawal Status
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/wd_1734567890123_abc123def?category=packages
```

#### Check Matrix Withdrawal Status
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/YOUR_WITHDRAWAL_ID?category=matrix
```

#### Check Lottery Withdrawal Status
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/YOUR_WITHDRAWAL_ID?category=lottery
```

#### Check Passive Income Withdrawal Status
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/YOUR_WITHDRAWAL_ID?category=passive_income
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "withdrawal_id": "wd_1734567890123_abc123def",
    "user_id": "test-user-123",
    "status": "pending",
    "amount": 0.001,
    "currency": "btc",
    "withdrawal_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "tx_hash": null,
    "fee": 0.00001,
    "estimated_arrival": "2025-10-10T18:00:00.000Z",
    "created_at": "2025-10-10T16:30:00.000Z",
    "updated_at": "2025-10-10T16:30:00.000Z",
    "order_id": "ORDER-123",
    "category": "packages"
  }
}
```

### Step 8: Test User Withdrawal History

#### Get User Withdrawal History (Packages)
```http
GET https://crypto-api-pi.vercel.app/api/users/test-user-123/withdrawals?category=packages&limit=10&offset=0
```

#### Get User Withdrawal Statistics (Matrix)
```http
GET https://crypto-api-pi.vercel.app/api/users/test-user-456/withdrawals/stats?category=matrix
```

#### Get User Withdrawal History (Lottery)
```http
GET https://crypto-api-pi.vercel.app/api/users/test-user-789/withdrawals?category=lottery&limit=10&offset=0
```

#### Get User Withdrawal Statistics (Passive Income)
```http
GET https://crypto-api-pi.vercel.app/api/users/test-user-999/withdrawals/stats?category=passive_income
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "test-user-456",
    "category": "matrix",
    "total_withdrawals": 1,
    "completed_withdrawals": 0,
    "completion_rate": "0.00",
    "status_breakdown": {
      "pending": {
        "count": 1,
        "total_amount": 0.01
      }
    }
  },
  "message": "Withdrawal statistics retrieved successfully"
}
```

### Step 9: Test Withdrawal Status Refresh

#### Refresh Withdrawal Status
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/wd_1734567890123_abc123def/refresh?category=packages
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "withdrawal_id": "wd_1734567890123_abc123def",
    "status": "completed",
    "updated": true
  },
  "message": "Withdrawal status updated"
}
```

### Step 10: Test Balance Checking

#### Check NOWPayments Account Balance (Packages)
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/balance?category=packages&currency=btc
```

#### Check NOWPayments Account Balance (Matrix)
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/balance?category=matrix&currency=eth
```

#### Check NOWPayments Account Balance (Lottery)
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/balance?category=lottery&currency=usdtbsc
```

#### Check NOWPayments Account Balance (Passive Income)
```http
GET https://crypto-api-pi.vercel.app/api/withdrawals/balance?category=passive_income&currency=usdtbsc
```

**Expected Response (when balance is 0):**
```json
{
  "success": true,
  "data": {
    "category": "lottery",
    "currency": "usdtbsc",
    "balance": 0,
    "available_for_withdrawal": 0
  },
  "message": "Balance retrieved successfully"
}
```

**Expected Response (when balance exists):**
```json
{
  "success": true,
  "data": {
    "category": "packages",
    "currency": "btc",
    "balance": 0.005,
    "available_for_withdrawal": 0.005
  },
  "message": "Balance retrieved successfully"
}
```

### Step 11: Test Withdrawal Error Scenarios

#### Invalid Currency
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.001",
  "currency": "invalid",
  "withdrawalAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "userId": "test-user-123",
  "category": "packages"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Invalid currency. Must be a non-empty string.",
  "timestamp": "2025-10-10T16:35:00.000Z"
}
```

#### Insufficient Balance (NOWPayments Account)
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "1000",
  "currency": "usdtbsc",
  "withdrawalAddress": "0xc4087e5f6e89b8b11d48d7dfc17efddd359c1f41",
  "userId": "test-user-789",
  "category": "lottery"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Insufficient balance in NOWPayments lottery account. Requested: 1000 USDTBSC, Available: 0 USDTBSC",
  "timestamp": "2025-10-17T12:00:00.000Z"
}
```

#### Invalid Withdrawal Address
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.001",
  "currency": "btc",
  "withdrawalAddress": "invalid-address",
  "userId": "test-user-123",
  "category": "packages"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Invalid withdrawal address for the specified currency",
  "timestamp": "2025-10-10T16:35:00.000Z"
}
```

#### Invalid Category
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.01",
  "currency": "usdtbsc",
  "withdrawalAddress": "0xc4087e5f6e89b8b11d48d7dfc17efddd359c1f41",
  "userId": "test-user-123",
  "category": "invalid_category"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Invalid category. Must be one of: packages, matrix, lottery, passive_income",
  "timestamp": "2025-10-10T16:35:00.000Z"
}
```

#### Missing Required Fields
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "0.01",
  "currency": "usdtbsc",
  "userId": "test-user-123",
  "category": "lottery"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "withdrawalAddress is required",
  "timestamp": "2025-10-10T16:35:00.000Z"
}
```

## Client Integration Guide

### Production Deployment

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Update Environment Variables in Vercel:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add all environment variables listed in the Environment Setup section

3. **Configure NOWPayments Webhooks:**
   - For each category, set the webhook URL to: `https://your-vercel-domain.vercel.app/api/webhook/ipn`
   - Use the corresponding IPN secret for each category

### Client Integration Examples

#### JavaScript/Node.js Client

```javascript
// Payment Creation
const createPayment = async (amount, currency, userId, category) => {
  const response = await fetch('https://your-domain.vercel.app/api/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount.toString(),
      payCurrency: currency,
      userId,
      category
    })
  });
  
  const result = await response.json();
  return result;
};

// Withdrawal Creation
const createWithdrawal = async (amount, currency, address, userId, category, description) => {
  const response = await fetch('https://your-domain.vercel.app/api/withdrawals/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount.toString(),
      currency,
      withdrawalAddress: address,
      userId,
      category,
      orderDescription: description
    })
  });
  
  const result = await response.json();
  return result;
};

// Check Balance
const checkBalance = async (category, currency) => {
  const response = await fetch(`https://your-domain.vercel.app/api/withdrawals/balance?category=${category}&currency=${currency}`);
  const result = await response.json();
  return result;
};

// Usage Examples
const payment = await createPayment(10, 'btc', 'user123', 'packages');
const withdrawal = await createWithdrawal(0.01, 'usdtbsc', '0x...', 'user123', 'lottery', 'Test withdrawal');
const balance = await checkBalance('lottery', 'usdtbsc');
```

#### cURL Examples for Client Integration

```bash
# Create Payment
curl -X POST https://your-domain.vercel.app/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10",
    "payCurrency": "btc",
    "userId": "user123",
    "category": "packages"
  }'

# Create Withdrawal
curl -X POST https://your-domain.vercel.app/api/withdrawals/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.01",
    "currency": "usdtbsc",
    "withdrawalAddress": "0xc4087e5f6e89b8b11d48d7dfc17efddd359c1f41",
    "userId": "user123",
    "category": "lottery",
    "orderDescription": "Lottery withdrawal"
  }'

# Check Balance
curl "https://your-domain.vercel.app/api/withdrawals/balance?category=lottery&currency=usdtbsc"

# Check Payment Status
curl "https://your-domain.vercel.app/api/payments/5081583233?category=packages"

# Check Withdrawal Status
curl "https://your-domain.vercel.app/api/withdrawals/wd_1734567890123_abc123def?category=packages"
```

### Error Handling

Always check the `success` field in responses:

```javascript
const handleApiResponse = (response) => {
  if (response.success) {
    // Success - handle data
    console.log('Success:', response.data);
  } else {
    // Error - handle error message
    console.error('Error:', response.message);
    // Show user-friendly error message
    alert(response.message);
  }
};
```

### Webhook Integration

Set up webhook endpoints in your client application to receive payment notifications:

```javascript
// Webhook endpoint to receive payment updates
app.post('/webhook/payment-update', (req, res) => {
  const { payment_id, payment_status, category } = req.body;
  
  // Update your database with payment status
  updatePaymentStatus(payment_id, payment_status, category);
  
  res.json({ received: true });
});
```

### Testing Checklist

- [ ] Server starts without errors
- [ ] All environment variables are set
- [ ] Payment creation works for all categories
- [ ] Webhook simulation works
- [ ] Balance checking works
- [ ] Withdrawal creation works (when balance exists)
- [ ] Error handling works correctly
- [ ] Production deployment successful
- [ ] NOWPayments webhooks configured
- [ ] Client integration tested
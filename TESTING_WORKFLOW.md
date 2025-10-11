## Complete Testing Workflow

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

#### Partial Payment Test (Lottery)

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "YOUR_LOTTERY_PAYMENT_ID",  // ← Replace with real payment_id from Step 1!
  "payment_status": "partially_paid",
  "actually_paid": "2.5",
  "outcome_amount": "2.50"
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
  "amount": "10",
  "currency": "usdt",
  "withdrawalAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  "userId": "test-user-789",
  "category": "lottery",
  "orderDescription": "Lottery winnings withdrawal"
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

### Step 10: Test Withdrawal Error Scenarios

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

#### Insufficient Balance (when balance checking is implemented)
```http
POST https://crypto-api-pi.vercel.app/api/withdrawals/create
Content-Type: application/json

{
  "amount": "1000",
  "currency": "btc",
  "withdrawalAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "userId": "test-user-123",
  "category": "packages"
}
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Insufficient balance. Available: 0.005 BTC",
  "timestamp": "2025-10-10T16:35:00.000Z"
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
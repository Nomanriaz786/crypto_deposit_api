## Complete Testing Workflow

### Troubleshooting Common Issues

#### ❌ "Payment simulation failed" Error
**Problem:** You're trying to simulate a webhook for a payment that doesn't exist in the database.

**Solution:** 
1. First create a real payment using `POST /api/payments/create`
2. Copy the `payment_id` from the response
3. Use that real `payment_id` in your simulation requests
4. **Never use the example payment_ids from this documentation directly!**

**Example Error Response:**
```json
{
  "success": false,
  "message": "Payment simulation failed",
  "timestamp": "2025-10-10T16:34:46.017Z"
}
```

**Correct Flow:**
```bash
# 1. Create payment first
POST /api/payments/create
# Response contains: "payment_id": "5081583233"

# 2. Use the real payment_id in simulation
POST /api/test/webhook/simulate
{
  "payment_id": "5081583233",  // ← Real payment_id from step 1
  "payment_status": "finished"
}
```

### Order Description Behavior

**✅ Yes, order descriptions are provided and enhanced:**

1. **If you provide `orderDescription`**: It's used as-is
2. **If you don't provide `orderDescription`**: System generates: `"Payment for user {userId} - Category: {category}"`
3. **NOWPayments API**: Receives the order description for transaction records
4. **Firestore**: Stores the same order description for reference

**Example:**
- Input: `"orderDescription": "Package purchase payment"`
- Stored: `"Package purchase payment"`
- NOWPayments: `"Package purchase payment"`

**Example (no description provided):**
- Input: (none)
- Stored: `"Payment for user test-user-123 - Category: packages"`
- NOWPayments: `"Payment for user test-user-123 - Category: packages"`

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
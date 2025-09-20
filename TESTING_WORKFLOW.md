## Complete Testing Workflow

### Step 1: Create a Test Payment

```http
POST https://crypto-api-pi.vercel.app/api/payments/create
Content-Type: application/json

{
  "amount": "10",
  "payCurrency": "btc",
  "userId": "test-user-123",
  "orderDescription": "Sandbox test payment"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "12345678",
    "pay_address": "bc1q...",
    "pay_amount": 0.001,
    "status": "waiting",
    "order_id": "ORDER-123",
    "amount": 10,
    "currency": "usd"
  }
}
```

### Step 2: Verify Payment in Database

```http
GET https://crypto-api-pi.vercel.app/api/payments/12345678/status
```

### Step 3: Test Different Payment Scenarios

#### Successful Payment Test

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "12345678",
  "payment_status": "finished",
  "actually_paid": "0.001",
  "outcome_amount": "10.00",
  "fee": "0.0001"
}
```

**Console Output:**
```
SANDBOX TEST: Simulating webhook for payment 12345678: waiting -> finished
Payment 12345678 completed successfully!
Expected Amount: 10 USD
Actually Paid: 0.001 btc
Outcome Amount: 10.00 usd
```

#### Partial Payment Test

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "12345678",
  "payment_status": "partially_paid",
  "actually_paid": "0.0005",
  "outcome_amount": "5.00"
}
```

**Console Output:**
```
Partial payment received for 12345678
Expected: 0.001 btc
Received: 0.0005 btc
Shortfall: 0.0005 btc
Percentage Paid: 50.00%
```

#### Failed Payment Test

```http
POST https://crypto-api-pi.vercel.app/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "12345678",
  "payment_status": "failed"
}
```

**Console Output:**
```
Payment 12345678 failed or expired
Status: failed
Payment processing failed
```

#### Expired Payment Test

```http
POST http://localhost:5000/api/test/webhook/simulate
Content-Type: application/json

{
  "payment_id": "12345678", 
  "payment_status": "expired"
}
```

### Step 4: Test Complete Payment Lifecycle

```http
POST https://crypto-api-pi.vercel.app/api/test/payment/simulate-flow
Content-Type: application/json

{
  "payment_id": "12345678",
  "delay_seconds": 2
}
```

**Console Output:**
```
🧪 SANDBOX LIFECYCLE: Payment 12345678 -> confirming
🔄 Payment 12345678 is being confirmed on blockchain
🧪 SANDBOX LIFECYCLE: Payment 12345678 -> confirmed  
✅ Payment 12345678 confirmed on blockchain
🧪 SANDBOX LIFECYCLE: Payment 12345678 -> sending
📤 Payment 12345678 is being sent to final destination
🧪 SANDBOX LIFECYCLE: Payment 12345678 -> finished
🎉 Payment 12345678 completed successfully!
```

### Step 5: Verify Final Payment Status

```http
GET https://crypto-api-pi.vercel.app/api/payments/12345678/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "12345678",
    "status": "finished", 
    "completed_at": "2025-09-20T10:30:00.000Z",
    "confirmed_at": "2025-09-20T10:29:50.000Z",
    "final_amount": 10.00,
    "webhook_attempts": 4
  }
}
```
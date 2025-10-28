# How to Disable Email Verification for Withdrawals

## Problem
NOWPayments is sending email verification codes when creating withdrawals via API.

## Root Cause
The `is_request_payouts` field in NOWPayments response indicates whether withdrawals require manual approval:
- `is_request_payouts: false` → Automatic processing (what we want)
- `is_request_payouts: true` → Requires email verification

This setting is **controlled by NOWPayments**, not by our API request.

## Solution: Configure NOWPayments Dashboard

### Step 1: Log in to NOWPayments
Visit: https://account.nowpayments.io/sign-in

### Step 2: Navigate to Settings
Go to: **Dashboard** → **Settings** → **Payout Settings** or **Security**

### Step 3: Find the Setting
Look for one of these options:
- "Automatic Payout Approval"
- "Disable 2FA for API Payouts"
- "Email Verification for Withdrawals"
- "Require Manual Approval for Payouts"

### Step 4: Disable Verification
- **ENABLE** automatic approval
- **DISABLE** email verification/2FA
- **UNCHECK** "Require manual approval"

### Step 5: Save and Test
After saving settings, wait a few minutes for changes to propagate, then test withdrawal creation again.

## Alternative: Contact NOWPayments Support

If you cannot find the setting:

**Email:** support@nowpayments.io

**Subject:** Disable email verification for API payouts

**Message:**
```
Hello,

I am using NOWPayments API for automated withdrawals/payouts.
Currently, every withdrawal requires email verification (is_request_payouts: true).

Please configure my account to allow automatic payouts without email verification.

Account Email: [your NOWPayments account email]
API Key: [first 10 characters of your API key]

Thank you!
```

## Verification

After changing the setting, create a test withdrawal and check:
1. ✅ No verification email received
2. ✅ Webhook shows `"is_request_payouts": false`
3. ✅ Withdrawal processes automatically to `SENDING` status

## Current Status
- ✅ Code is correctly configured
- ✅ Signature verification working
- ✅ Firestore save working
- ✅ Webhook processing working
- ⚠️ **ONLY missing: NOWPayments dashboard configuration**

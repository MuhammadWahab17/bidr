# How to View Platform Fees in Stripe Dashboard

## Understanding Your Payment Flow

When a bid is placed:
1. **PaymentIntent is created** with `application_fee_amount: $2.85` (5% of $57)
2. **Payment is authorized** (not captured yet)
3. **When auction completes**, payment is **captured**
4. **Stripe automatically**:
   - Charges customer: **$57.00**
   - Retains platform fee: **$2.85** → Your main Stripe account
   - Transfers to seller: **$54.15** → Connected account

## Where to Find Platform Fees in Stripe Dashboard

### ⚠️ IMPORTANT: Check Your MAIN Stripe Account

The platform fee appears in your **MAIN Stripe account** (the one with your API keys: `sk_live_...` or `sk_test_...`), **NOT** in the connected seller account.

### ✅ Method 1: Payment Details (Easiest - Recommended)

1. Go to **Stripe Dashboard** → **Payments** (in your main account)
2. Find the PaymentIntent for your $57 bid:
   - Search by amount: `$57.00`
   - Or search by PaymentIntent ID from your database
3. Click on the payment to open details
4. Scroll down to see:
   - **Amount**: $57.00
   - **Application fee**: **$2.85** ← This is your platform fee!
   - **Transfer to connected account**: $54.15

**If you don't see "Application fee" field:**
- The payment might not have `application_fee_amount` set
- Check the PaymentIntent metadata for `platform_fee: "2.85"`

### ✅ Method 2: Balance Page (Your Image Location)

1. Go to **Stripe Dashboard** → **Balance** (in your main account)
2. The platform fee ($2.85) should appear in your **Available balance** after payment is captured
3. **Note**: The balance page shows ALL funds in your account, not just platform fees
4. To see ONLY platform fees, use Method 3 or 4 below

**Why you might see $0.00:**
- Payment is still **authorized** (not captured yet) - complete the auction to capture
- Payment was made to a connected account (check the connected account's balance, not yours)
- You're looking at the wrong Stripe account (connected account vs main account)

### ✅ Method 3: Connect Overview (Best for Platform Fees)

1. Go to **Stripe Dashboard** → **Connect** → **Overview**
2. Scroll to **"Application fees collected"** section
3. You should see:
   - Total application fees
   - Breakdown by date
   - The $2.85 from your transaction

### ✅ Method 4: Reports

1. Go to **Stripe Dashboard** → **Reports** → **Payments**
2. Filter by date range
3. Look for **"Application fees"** column
4. Export to CSV if needed

### ✅ Method 5: API Verification

Use the verification endpoint I created:
```
GET /api/payments/verify?paymentIntentId=pi_xxxxx
```

Or check all platform fees:
```
GET /api/platform/fees?includeStripeBalance=true
```

## Important Notes

### ⚠️ Check Payment Status

The platform fee only appears in your balance **after the payment is captured**:
- **Authorized** (not captured): Fee is not yet in your balance
- **Succeeded** (captured): Fee should be visible

### ⚠️ Make Sure You're in the Right Account

- **Platform fee** appears in your **MAIN Stripe account** (the one with your API keys)
- **Seller amount** appears in the **CONNECTED account** (seller's account)
- Don't check the connected account for platform fees!

### ⚠️ Currency Conversion

If your platform account is in USD but connected account is in SGD:
- Platform fee: $2.85 USD (in your main account)
- Seller amount: $54.15 USD → converted to SGD in connected account

## Troubleshooting

### If you don't see the platform fee:

1. **Check payment status**: Is it "succeeded" or still "requires_capture"?
   - Go to Payments → Find the payment → Check status
   - If status is "requires_capture", the auction completion endpoint needs to capture it

2. **Verify PaymentIntent metadata**:
   - In the payment details, check **Metadata** section
   - You should see:
     - `platform_fee: "2.85"`
     - `seller_amount: "54.15"`
     - `application_fee_amount` should be set

3. **Check if payment was captured**:
   - Look at the payment timeline
   - Should see "Payment captured" event

4. **Verify API keys**:
   - Make sure you're using **live keys** (not test keys)
   - Check that `STRIPE_SECRET_KEY` in your environment is `sk_live_...`

## Code Verification

Your code is correctly configured:
- ✅ `application_fee_amount` is set in PaymentIntent
- ✅ `transfer_data.destination` points to connected account
- ✅ Payment is captured on auction completion

The platform fee **should** appear automatically when payment is captured.

## Testing in Sandbox

In **test mode**, platform fees work the same way:
- Use test card: `4242 4242 4242 4242`
- Check your **test mode** Stripe Dashboard
- Platform fees appear in test balance (not real money)

## Next Steps

1. **Verify payment was captured**: Check if auction completion endpoint ran successfully
2. **Check payment timeline**: Look for "captured" event
3. **Wait a few minutes**: Sometimes there's a slight delay
4. **Contact Stripe Support**: If still not visible after 24 hours


import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

/**
 * GET /api/payments/verify?paymentIntentId=pi_xxx
 * 
 * Verifies a PaymentIntent and shows platform fee details.
 * Useful for debugging platform fee visibility in Stripe Dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('paymentIntentId')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId query parameter is required' },
        { status: 400 }
      )
    }

    // Retrieve PaymentIntent
    // NOTE: We do NOT expand `application_fee` because Stripe does not allow that on PaymentIntents.
    // We can still read `application_fee_amount` directly from the PaymentIntent object.
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Calculate platform fee from application_fee_amount
    const applicationFeeAmount = paymentIntent.application_fee_amount || 0
    const platformFee = applicationFeeAmount / 100 // Convert from cents to dollars

    // Get transfer amount (if any)
    const transferData = paymentIntent.transfer_data
    const transferAmount = transferData?.amount 
      ? transferData.amount / 100 
      : paymentIntent.amount / 100 - platformFee

    // Get charge details separately (charges is not a direct property on PaymentIntent type)
    const chargesList = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1,
      expand: ['data.balance_transaction']
    })
    const charge = chargesList.data[0]
    const balanceTransaction = charge?.balance_transaction
    // Type guard: check if balance_transaction is an object (expanded) not a string (ID)
    const balanceTransactionObj = balanceTransaction && typeof balanceTransaction === 'object' && 'id' in balanceTransaction
      ? balanceTransaction
      : null

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Total amount in dollars
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000).toISOString(),
      },
      platformFee: {
        amount: platformFee,
        inCents: applicationFeeAmount,
        visible: applicationFeeAmount > 0,
        note: applicationFeeAmount > 0 
          ? 'Platform fee is set. It will appear in your balance after payment is captured.'
          : '⚠️ WARNING: No application_fee_amount found! Platform fee is not configured.',
      },
      transfer: {
        destination: transferData?.destination || null,
        amount: transferAmount,
        automatic: !!transferData,
      },
      metadata: paymentIntent.metadata,
      charge: charge ? {
        id: charge.id,
        status: charge.status,
        amount: charge.amount / 100,
        captured: charge.captured,
        balance_transaction: balanceTransactionObj ? {
          id: balanceTransactionObj.id,
          net: balanceTransactionObj.net / 100,
          fee: balanceTransactionObj.fee / 100,
          available_on: new Date(balanceTransactionObj.available_on * 1000).toISOString(),
        } : null,
      } : null,
      summary: {
        totalCharged: paymentIntent.amount / 100,
        platformFee: platformFee,
        sellerAmount: transferAmount,
        breakdown: `${paymentIntent.amount / 100} = ${platformFee} (platform) + ${transferAmount} (seller)`,
      },
      instructions: {
        whereToFindFee: [
          '1. Go to Stripe Dashboard → Payments',
          '2. Search for this PaymentIntent ID',
          '3. Open the payment details',
          '4. Look for "Application fee" field',
          '5. Check Balance page after payment is captured',
        ],
        status: paymentIntent.status === 'succeeded' 
          ? '✅ Payment captured - Platform fee should be visible in your balance'
          : paymentIntent.status === 'requires_capture'
          ? '⏳ Payment authorized but not captured yet - Fee will appear after capture'
          : `⚠️ Payment status: ${paymentIntent.status} - Fee may not be visible yet`,
      },
    })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error.message,
        type: error.type,
      },
      { status: 500 }
    )
  }
}


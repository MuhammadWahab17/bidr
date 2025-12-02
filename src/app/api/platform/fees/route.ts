import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

/**
 * GET /api/platform/fees
 * 
 * Fetches platform fees from database and optionally from Stripe balance.
 * This is for the platform owner (not sellers) to see total fees collected.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStripeBalance = searchParams.get('includeStripeBalance') === 'true'

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch all completed payments with platform fees
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('id, amount, platform_fee, seller_amount, status, created_at, payment_method')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalPlatformFees = (payments || []).reduce(
      (sum, p: any) => sum + (parseFloat(p.platform_fee) || 0),
      0
    )

    const totalRevenue = (payments || []).reduce(
      (sum, p: any) => sum + (parseFloat(p.amount) || 0),
      0
    )

    const totalSellerAmounts = (payments || []).reduce(
      (sum, p: any) => sum + (parseFloat(p.seller_amount) || 0),
      0
    )

    // Group by payment method
    const feesByMethod = (payments || []).reduce((acc: any, p: any) => {
      const method = p.payment_method || 'card'
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 }
      }
      acc[method].count += 1
      acc[method].total += parseFloat(p.platform_fee) || 0
      return acc
    }, {})

    // Fetch Stripe balance if requested
    let stripeBalance = null
    if (includeStripeBalance) {
      try {
        const balance = await stripe.balance.retrieve()
        stripeBalance = {
          available: balance.available.map((b: any) => ({
            amount: b.amount / 100, // Convert from cents
            currency: b.currency,
            source_types: b.source_types,
          })),
          pending: balance.pending.map((b: any) => ({
            amount: b.amount / 100,
            currency: b.currency,
            source_types: b.source_types,
          })),
          instant_available: balance.instant_available?.map((b: any) => ({
            amount: b.amount / 100,
            currency: b.currency,
            source_types: b.source_types,
          })) || [],
        }
      } catch (stripeError: any) {
        console.error('Error fetching Stripe balance:', stripeError)
        stripeBalance = { error: stripeError.message }
      }
    }

    // Recent fees (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentFees = (payments || []).filter((p: any) => {
      const paymentDate = new Date(p.created_at)
      return paymentDate >= thirtyDaysAgo
    }).reduce((sum, p: any) => sum + (parseFloat(p.platform_fee) || 0), 0)

    return NextResponse.json({
      summary: {
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSellerAmounts: Math.round(totalSellerAmounts * 100) / 100,
        totalTransactions: (payments || []).length,
        recentFees30Days: Math.round(recentFees * 100) / 100,
      },
      feesByMethod,
      stripeBalance,
      recentPayments: (payments || []).slice(0, 10).map((p: any) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        platformFee: parseFloat(p.platform_fee),
        sellerAmount: parseFloat(p.seller_amount),
        paymentMethod: p.payment_method,
        createdAt: p.created_at,
      })),
      note: includeStripeBalance
        ? 'Stripe balance includes all funds in your Stripe account (platform fees + other income). Platform fees from application_fee_amount are automatically retained by Stripe.'
        : 'Add ?includeStripeBalance=true to see your actual Stripe account balance.',
    })
  } catch (error: any) {
    console.error('Platform fees API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


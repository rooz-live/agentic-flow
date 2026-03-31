#!/usr/bin/env tsx
/**
 * Stripe Financial Services Integration Test CLI
 * 
 * Usage:
 *   npm run stripe:test                    # Run all tests
 *   npx tsx scripts/test_stripe_integration.ts --test payment
 *   npx tsx scripts/test_stripe_integration.ts --test customer
 *   npx tsx scripts/test_stripe_integration.ts --test subscription
 */

import { createStripeFinancialServices } from '../src/integrations/stripe_financial_services';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
}

class StripeIntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Stripe Financial Services Integration Tests\n');

    await this.testEnvironmentVariables();
    await this.testStripeConnection();
    await this.testPaymentIntent();
    await this.testCustomerCreation();
    await this.testSubscriptionFlow();

    this.printResults();
  }

  async testEnvironmentVariables(): Promise<void> {
    const testName = 'Environment Variables';
    console.log(`Running: ${testName}...`);

    const secretKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: 'STRIPE_TEST_SECRET_KEY not set. Export it: export STRIPE_TEST_SECRET_KEY=sk_test_...',
      });
      return;
    }

    if (!secretKey.startsWith('sk_test_')) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: '⚠️  CRITICAL: Not using test key! PCI-DSS violation.',
      });
      return;
    }

    this.results.push({
      test: testName,
      status: 'PASS',
      message: `Test key configured. Webhook secret: ${webhookSecret ? 'SET' : 'NOT SET'}`,
    });
  }

  async testStripeConnection(): Promise<void> {
    const testName = 'Stripe API Connection';
    console.log(`Running: ${testName}...`);

    try {
      const stripe = createStripeFinancialServices();
      const balance = await stripe.getBalance();

      this.results.push({
        test: testName,
        status: 'PASS',
        message: `Connected successfully. Available balance: ${
          balance.available.map(b => `${b.amount / 100} ${b.currency.toUpperCase()}`).join(', ')
        }`,
        data: balance,
      });
    } catch (error: any) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Connection failed: ${error.message}`,
      });
    }
  }

  async testPaymentIntent(): Promise<void> {
    const testName = 'Payment Intent Creation';
    console.log(`Running: ${testName}...`);

    try {
      const stripe = createStripeFinancialServices();
      
      const paymentIntent = await stripe.createPaymentIntent({
        amount: 1000, // $10.00
        currency: 'usd',
        description: 'Test payment from agentic-flow',
        metadata: {
          test: 'true',
          environment: 'sandbox',
          framework: 'agentic-flow',
        },
      });

      this.results.push({
        test: testName,
        status: 'PASS',
        message: `Payment Intent created: ${paymentIntent.id} - Status: ${paymentIntent.status}`,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret?.substring(0, 20) + '...',
        },
      });
    } catch (error: any) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Payment Intent creation failed: ${error.message}`,
      });
    }
  }

  async testCustomerCreation(): Promise<void> {
    const testName = 'Customer Creation';
    console.log(`Running: ${testName}...`);

    try {
      const stripe = createStripeFinancialServices();
      
      const customer = await stripe.createCustomer(
        `test+${Date.now()}@agentic-flow.dev`,
        'Test Customer',
        {
          test: 'true',
          source: 'integration-test',
        }
      );

      this.results.push({
        test: testName,
        status: 'PASS',
        message: `Customer created: ${customer.id} - ${customer.email}`,
        data: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        },
      });
    } catch (error: any) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Customer creation failed: ${error.message}`,
      });
    }
  }

  async testSubscriptionFlow(): Promise<void> {
    const testName = 'Subscription Flow';
    console.log(`Running: ${testName}...`);

    // Skip subscription test if no price ID available
    const priceId = process.env.STRIPE_TEST_PRICE_ID;
    
    if (!priceId) {
      this.results.push({
        test: testName,
        status: 'SKIP',
        message: 'No STRIPE_TEST_PRICE_ID set. Create a test price in Stripe Dashboard.',
      });
      return;
    }

    try {
      const stripe = createStripeFinancialServices();
      
      // Create customer first
      const customer = await stripe.createCustomer(
        `sub-test+${Date.now()}@agentic-flow.dev`,
        'Subscription Test Customer'
      );

      // Create subscription
      const subscription = await stripe.createSubscription({
        customerId: customer.id,
        priceId: priceId,
        quantity: 1,
        trialPeriodDays: 7,
        metadata: {
          test: 'true',
        },
      });

      this.results.push({
        test: testName,
        status: 'PASS',
        message: `Subscription created: ${subscription.id} - Status: ${subscription.status}`,
        data: {
          subscription_id: subscription.id,
          customer_id: customer.id,
          status: subscription.status,
          trial_end: subscription.trial_end,
        },
      });
    } catch (error: any) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Subscription flow failed: ${error.message}`,
      });
    }
  }

  printResults(): void {
    console.log('\n📊 Test Results\n');
    console.log('═'.repeat(80));

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️ ';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.data && process.env.VERBOSE) {
        console.log('   Data:', JSON.stringify(result.data, null, 2));
      }

      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    }

    console.log('═'.repeat(80));
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

    if (failed > 0) {
      console.log('⚠️  Some tests failed. Check the output above for details.\n');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!\n');
      
      // Check pattern metrics
      const fs = require('fs');
      const path = require('path');
      const metricsFile = path.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl');
      
      if (fs.existsSync(metricsFile)) {
        const content = fs.readFileSync(metricsFile, 'utf-8');
        const lines = content.trim().split('\n');
        const stripeMetrics = lines.filter((line: string) => line.includes('stripe-financial-services'));
        
        console.log(`📝 Pattern Metrics: ${stripeMetrics.length} Stripe events logged to .goalie/pattern_metrics.jsonl`);
      }
      
      process.exit(0);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tester = new StripeIntegrationTester();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Stripe Financial Services Integration Test CLI

Usage:
  npm run stripe:test                          # Run all tests
  npx tsx scripts/test_stripe_integration.ts  # Run all tests
  VERBOSE=1 npx tsx scripts/test_stripe_integration.ts  # Verbose output

Environment Variables:
  STRIPE_TEST_SECRET_KEY   - Required: Your Stripe test secret key (sk_test_...)
  STRIPE_WEBHOOK_SECRET    - Optional: Webhook signing secret (whsec_...)
  STRIPE_TEST_PRICE_ID     - Optional: Test price ID for subscription test

Setup:
  1. Get test keys from: https://dashboard.stripe.com/test/apikeys
  2. Export them:
     export STRIPE_TEST_SECRET_KEY='sk_test_...'
  3. Run tests:
     npm run stripe:test

PCI-DSS Compliance:
  ✅ Uses test keys only (never production in development)
  ✅ No raw card data handled in code
  ✅ Webhook signature verification implemented
  ✅ TLS 1.2+ enforced by Stripe SDK
  ✅ Pattern metrics for audit logging
`);
    process.exit(0);
  }

  await tester.runAllTests();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

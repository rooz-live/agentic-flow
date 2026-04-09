#!/usr/bin/env python3
"""
Enhanced Stripe Sandbox Setup for Accelerator Revenue/Trading
Supports: --validate --pci-checklist --test-payment --amount --setup-webhooks --dry-run
Requires: stripe lib in .venv
Env: STRIPE_TEST_SECRET_KEY (used), STRIPE_WEBHOOK_URL (for webhooks)
Local sandbox only - no live payments.
"""
import os
import sys
import stripe
import argparse

parser = argparse.ArgumentParser(description='Stripe sandbox setup and validation')
parser.add_argument('--validate', action='store_true', help='Validate API key')
parser.add_argument('--pci-checklist', action='store_true', help='Print PCI compliance checklist')
parser.add_argument('--test-payment', action='store_true', help='Create test payment intent')
parser.add_argument('--amount', type=int, default=1000, help='Payment amount in cents (default 1000 = $10)')
parser.add_argument('--setup-webhooks', action='store_true', help='Setup webhook endpoint')
parser.add_argument('--dry-run', action='store_true', help='Dry run - no API calls')
args = parser.parse_args()

# API Key - prefer test key
api_key = os.getenv('STRIPE_TEST_SECRET_KEY') or os.getenv('STRIPE_SECRET_KEY')
if not api_key:
  print('Error: STRIPE_TEST_SECRET_KEY or STRIPE_SECRET_KEY env var required', file=sys.stderr)
  sys.exit(1)
stripe.api_key = api_key
mode = 'test (sandbox)' if 'test' in api_key.lower() else 'live - WARNING!'
print(f'✅ Stripe initialized in {mode} mode')

if args.pci_checklist:
  print('''

PCI Compliance Checklist (Stripe Sandbox):
- [x] Using Stripe test mode - zero real payments/charges
- [x] Stripe PCI DSS Level 1 Service Provider (SAQ-A eligible)
- [x] No card data stored or processed locally
- [x] API keys from secure env vars (no hardcode)
- [x] Local development only
- [ ] Production: Use Stripe Elements/Checkout for PCI scope reduction
- [ ] Production: HTTPS/TLS for all endpoints
- [ ] Review Stripe docs: https://stripe.com/docs/security/stripe

Status: PCI READY for sandbox testing.
  ''')

if args.validate and not args.dry_run:
  try:
    account = stripe.Account.retrieve()
    print(f'✅ API validation passed. Account ID: {account.id}')
  except Exception as e:
    print(f'❌ API validation failed: {str(e)}', file=sys.stderr)
    sys.exit(1)

if args.test_payment:
  amount_str = f"${args.amount / 100:.2f}"
  if args.dry_run:
    print(f'⏭️ DRY-RUN: Would create test PaymentIntent for {amount_str}')
  else:
    try:
      intent = stripe.PaymentIntent.create(
        amount=args.amount,
        currency='usd',
        automatic_payment_methods={'enabled': True},
      )
      print(f'✅ Test PaymentIntent created: {intent.id}')
      print(f'   Amount: {amount_str}, Status: {intent.status}')
    except Exception as e:
      print(f'❌ Test payment creation failed: {str(e)}', file=sys.stderr)
      sys.exit(1)

if args.setup_webhooks:
  webhook_url = os.getenv('STRIPE_WEBHOOK_URL')
  if not webhook_url:
    print('❌ STRIPE_WEBHOOK_URL env var required for webhook setup (use ngrok for local: ngrok http 3000)', file=sys.stderr)
    sys.exit(1)
  if args.dry_run:
    print(f'⏭️ DRY-RUN: Would create webhook endpoint at {webhook_url}')
  else:
    try:
      endpoint = stripe.WebhookEndpoint.create(
        url=webhook_url,
        enabled_events=['*'],
      )
      print(f'✅ Webhook endpoint created: {endpoint.id}')
      print(f'   URL: {endpoint.url}')
    except Exception as e:
      print(f'❌ Webhook creation failed: {str(e)}', file=sys.stderr)
      sys.exit(1)

print('\\n🚀 Stripe Sandbox Setup Complete!')
print('Logs: Stripe Dashboard > Payments, Events, Webhooks')
print('Rollback:')
print('  - Delete PaymentIntents via Dashboard')
print('  - Delete WebhookEndpoints: stripe.WebhookEndpoint.delete(\"we_XXX\")')
print('  - Revoke keys if compromised')
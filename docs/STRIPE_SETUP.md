# Stripe Test Keys Configuration Guide

## Prerequisites
You'll need to create a Stripe account and get test API keys from the Stripe Dashboard.

## Steps

### 1. Create Stripe Account (if needed)
1. Go to https://stripe.com
2. Click "Start now" or "Sign in"
3. Complete registration

### 2. Get Test API Keys
1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Ensure you're in **Test Mode** (toggle in top right)
3. Navigate to: **Developers** → **API keys**
4. Copy your test keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 3. Configure Environment

Add to `config/.env.production`:
```bash
# Stripe Test Keys (DO NOT use production keys)
STRIPE_TEST_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_TEST_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
```

Or export directly:
```bash
export STRIPE_TEST_SECRET_KEY="sk_test_YOUR_KEY_HERE"
export STRIPE_TEST_PUBLIC_KEY="pk_test_YOUR_KEY_HERE"
```

### 4. Validate Setup
```bash
python3 scripts/stripe_sandbox_setup.py --validate
```

Expected output:
```json
{
  "validation": {
    "status": "PASS",
    "checks": [
      {"check": "keys_exist", "status": "PASS"},
      {"check": "test_environment", "status": "PASS"},
      {"check": "key_format", "status": "PASS"}
    ]
  }
}
```

### 5. Test Payment (Optional)
```bash
python3 scripts/stripe_sandbox_setup.py --test-payment --amount 1000
```

## Test Cards

Use these in Stripe test mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

**CVV**: Any 3 digits
**Expiry**: Any future date

## Security Reminders
- ✅ Test keys start with `sk_test_` and `pk_test_`
- ❌ **NEVER** commit keys to git
- ❌ **NEVER** use production keys in sandbox
- ✅ Keep keys in `.env` (already gitignored)
- ✅ Rotate keys quarterly per PCI-7

## Next Steps
After configuration:
1. Run PCI checklist: `python3 scripts/stripe_sandbox_setup.py --pci-checklist`
2. Set up webhooks: `python3 scripts/stripe_sandbox_setup.py --setup-webhooks`
3. Implement payment flows in your application

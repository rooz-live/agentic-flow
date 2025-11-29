#!/usr/bin/env python3
"""
Stripe Sandbox Integration
Verifies Stripe API keys and connectivity in test mode.
"""

import os
import sys
import stripe

def check_stripe_config():
    api_key = os.getenv("STRIPE_TEST_KEY")
    if not api_key:
        print("❌ STRIPE_TEST_KEY not set.")
        return False

    stripe.api_key = api_key

    try:
        # Simple call to verify key
        stripe.Balance.retrieve()
        print("✅ Stripe Sandbox: Connected")
        return True
    except Exception as e:
        print(f"❌ Stripe Connection Failed: {e}")
        return False

if __name__ == "__main__":
    if check_stripe_config():
        sys.exit(0)
    else:
        sys.exit(1)

#!/usr/bin/env python3
"""
Payment Gateway Environment Validation Script

Validates that payment gateway configurations are appropriate for the current environment.
CRITICAL: Prevents test keys in production and live keys in non-production.

Usage:
    python validate_payment_gateways.py [--environment ENV]
    
Environment detection priority:
    1. --environment flag
    2. AF_ENV environment variable
    3. Auto-detect from CI/container indicators
"""

import os
import sys
import json
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Environment detection (same logic as pattern_logger.py)
def detect_environment() -> str:
    """Detect current environment from multiple sources."""
    env = os.environ.get("AF_ENV")
    if env:
        return env
    
    ci_indicators = [
        "CI", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS_URL",
        "CIRCLECI", "TRAVIS", "BUILDKITE", "AZURE_PIPELINES"
    ]
    for indicator in ci_indicators:
        if os.environ.get(indicator):
            return "ci"
    
    if os.path.exists("/.dockerenv") or os.environ.get("KUBERNETES_SERVICE_HOST"):
        return "container"
    
    return "local"


# Key pattern validation
STRIPE_KEY_PATTERNS = {
    "test": re.compile(r"^sk_test_[a-zA-Z0-9]+$"),
    "live": re.compile(r"^sk_live_[a-zA-Z0-9]+$"),
    "restricted_test": re.compile(r"^rk_test_[a-zA-Z0-9]+$"),
    "restricted_live": re.compile(r"^rk_live_[a-zA-Z0-9]+$"),
}

PAYPAL_MODES = {"sandbox", "live"}


def validate_stripe_key(key: Optional[str], environment: str) -> Tuple[bool, str]:
    """Validate Stripe key is appropriate for environment."""
    if not key:
        return True, "No Stripe key configured (OK for non-payment environments)"
    
    is_test_key = STRIPE_KEY_PATTERNS["test"].match(key) or STRIPE_KEY_PATTERNS["restricted_test"].match(key)
    is_live_key = STRIPE_KEY_PATTERNS["live"].match(key) or STRIPE_KEY_PATTERNS["restricted_live"].match(key)
    
    if environment == "prod":
        if is_test_key:
            return False, "CRITICAL: Test Stripe key in production environment!"
        if is_live_key:
            return True, "Live Stripe key in production (correct)"
        return False, f"Unknown Stripe key format: {key[:20]}..."
    else:
        # Non-production environments
        if is_live_key:
            return False, f"CRITICAL: Live Stripe key in {environment} environment!"
        if is_test_key:
            return True, f"Test Stripe key in {environment} (correct)"
        return False, f"Unknown Stripe key format: {key[:20]}..."


def validate_paypal_mode(mode: Optional[str], environment: str) -> Tuple[bool, str]:
    """Validate PayPal mode is appropriate for environment."""
    if not mode:
        return True, "No PayPal mode configured"
    
    mode = mode.lower()
    if mode not in PAYPAL_MODES:
        return False, f"Unknown PayPal mode: {mode}"
    
    if environment == "prod":
        if mode == "sandbox":
            return False, "CRITICAL: PayPal sandbox mode in production!"
        return True, "PayPal live mode in production (correct)"
    else:
        if mode == "live":
            return False, f"CRITICAL: PayPal live mode in {environment} environment!"
        return True, f"PayPal sandbox mode in {environment} (correct)"


def check_env_files_for_live_keys() -> List[Dict]:
    """Scan .env files for accidentally committed live keys."""
    issues = []
    env_files = [
        ".env", ".env.local", ".env.dev", ".env.stg", ".env.prod",
        ".env.example", ".env.integration"
    ]
    
    for env_file in env_files:
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                content = f.read()
                # Check for live Stripe keys
                if "sk_live_" in content:
                    issues.append({
                        "file": env_file,
                        "issue": "Contains live Stripe secret key",
                        "severity": "CRITICAL"
                    })
                if "pk_live_" in content:
                    issues.append({
                        "file": env_file,
                        "issue": "Contains live Stripe publishable key",
                        "severity": "HIGH"
                    })
    return issues


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Validate payment gateway configuration")
    parser.add_argument("--environment", "-e", help="Override environment detection")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    environment = args.environment or detect_environment()
    
    results = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "environment": environment,
        "validations": [],
        "file_scan": [],
        "overall_status": "PASS"
    }
    
    # Validate Stripe
    stripe_key = os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("STRIPE_API_KEY")
    valid, message = validate_stripe_key(stripe_key, environment)
    results["validations"].append({
        "gateway": "stripe",
        "check": "secret_key_environment_match",
        "valid": valid,
        "message": message
    })
    if not valid:
        results["overall_status"] = "FAIL"
    
    # Validate PayPal
    paypal_mode = os.environ.get("PAYPAL_MODE")
    valid, message = validate_paypal_mode(paypal_mode, environment)
    results["validations"].append({
        "gateway": "paypal",
        "check": "mode_environment_match",
        "valid": valid,
        "message": message
    })
    if not valid:
        results["overall_status"] = "FAIL"
    
    # Scan env files
    file_issues = check_env_files_for_live_keys()
    results["file_scan"] = file_issues
    if any(i["severity"] == "CRITICAL" for i in file_issues):
        results["overall_status"] = "FAIL"
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"Payment Gateway Validation - Environment: {environment}")
        print("=" * 60)
        for v in results["validations"]:
            status = "✓" if v["valid"] else "✗"
            print(f"  {status} {v['gateway']}: {v['message']}")
        if file_issues:
            print("\nFile Scan Issues:")
            for issue in file_issues:
                print(f"  ⚠ {issue['file']}: {issue['issue']} [{issue['severity']}]")
        print(f"\nOverall Status: {results['overall_status']}")
    
    return 0 if results["overall_status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())


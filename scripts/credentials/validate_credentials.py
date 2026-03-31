#!/usr/bin/env python3
"""
Credential Validation Script
Tests credential loading from all sources and validates API connectivity
"""

import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from load_credentials import CredentialLoader, CredentialSource


# Define required credentials
REQUIRED_CREDENTIALS = [
    "ANTHROPIC_API_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
]

OPTIONAL_CREDENTIALS = [
    "POSTGRES_PASSWORD",
    "GITLAB_TOKEN",
    "PASSBOLT_API_TOKEN",
    "HIVELOCITY_API_KEY",
    "STRIPE_SECRET_KEY",
    "PAYPAL_CLIENT_ID",
    "IBKR_USERNAME",
    "IBKR_PASSWORD",
]


def validate_anthropic(api_key: str) -> Tuple[bool, str]:
    """Validate Anthropic API key"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        # Simple test call
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}]
        )
        return True, "Valid API key"
    except ImportError:
        return None, "anthropic package not installed (pip install anthropic)"
    except Exception as e:
        return False, f"API validation failed: {str(e)}"


def validate_aws(access_key: str, secret_key: str) -> Tuple[bool, str]:
    """Validate AWS credentials"""
    try:
        import boto3
        client = boto3.client(
            'sts',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        identity = client.get_caller_identity()
        return True, f"Valid credentials for {identity['Arn']}"
    except ImportError:
        return None, "boto3 package not installed (pip install boto3)"
    except Exception as e:
        return False, f"AWS validation failed: {str(e)}"


def validate_postgres(password: str) -> Tuple[bool, str]:
    """Validate PostgreSQL password (connection test)"""
    # Simplified - would need host/user info for real test
    return None, "Cannot validate without connection details"


def main():
    """Run credential validation"""
    print("=" * 60)
    print("Credential Validation Report")
    print("=" * 60)
    print()
    
    loader = CredentialLoader(verbose=True)
    
    # Load required credentials
    print("Required Credentials:")
    print("-" * 60)
    required_results = {}
    for key in REQUIRED_CREDENTIALS:
        try:
            cred = loader.load_credential(key, required=True)
            required_results[key] = cred
            print(f"✓ {key:<30} [{cred.source_type}]")
        except ValueError as e:
            required_results[key] = None
            print(f"✗ {key:<30} [NOT FOUND]")
    
    print()
    
    # Load optional credentials
    print("Optional Credentials:")
    print("-" * 60)
    optional_results = {}
    for key in OPTIONAL_CREDENTIALS:
        cred = loader.load_credential(key, required=False)
        optional_results[key] = cred
        if cred:
            print(f"✓ {key:<30} [{cred.source_type}]")
        else:
            print(f"○ {key:<30} [not configured]")
    
    print()
    
    # API validation tests
    print("API Validation Tests:")
    print("-" * 60)
    
    # Test Anthropic
    if anthropic_cred := required_results.get("ANTHROPIC_API_KEY"):
        valid, msg = validate_anthropic(anthropic_cred.value)
        status = "✓" if valid else ("○" if valid is None else "✗")
        print(f"{status} Anthropic API: {msg}")
    
    # Test AWS
    aws_key = required_results.get("AWS_ACCESS_KEY_ID")
    aws_secret = required_results.get("AWS_SECRET_ACCESS_KEY")
    if aws_key and aws_secret:
        valid, msg = validate_aws(aws_key.value, aws_secret.value)
        status = "✓" if valid else ("○" if valid is None else "✗")
        print(f"{status} AWS API: {msg}")
    
    print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print("-" * 60)
    
    required_found = sum(1 for v in required_results.values() if v is not None)
    required_total = len(REQUIRED_CREDENTIALS)
    optional_found = sum(1 for v in optional_results.values() if v is not None)
    optional_total = len(OPTIONAL_CREDENTIALS)
    
    print(f"Required: {required_found}/{required_total} found")
    print(f"Optional: {optional_found}/{optional_total} configured")
    
    if required_found < required_total:
        print()
        print("⚠️  Missing required credentials! Services will not function correctly.")
        sys.exit(1)
    else:
        print()
        print("✓ All required credentials found and loaded successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
#
# load_secrets.sh - Secure Secrets Loader
#
# Loads environment-specific secrets from .env files with validation
# Usage: source scripts/load_secrets.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Determine environment
ENV="${AF_ENVIRONMENT:-development}"

echo -e "${GREEN}[secrets] Loading secrets for environment: $ENV${NC}"

# Load environment-specific secrets
if [ -f "$PROJECT_ROOT/.env.$ENV" ]; then
    set -a
    source "$PROJECT_ROOT/.env.$ENV"
    set +a
    echo -e "${GREEN}[secrets] ✓ Loaded .env.$ENV${NC}"
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
    echo -e "${GREEN}[secrets] ✓ Loaded .env.local${NC}"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    echo -e "${YELLOW}[secrets] ⚠ Loaded .env (default)${NC}"
else
    echo -e "${YELLOW}[secrets] ⚠ WARNING: No .env file found. Using environment variables only.${NC}"
    echo -e "${YELLOW}[secrets] Create .env.local from .env.template to configure secrets.${NC}"
fi

# Validate critical secrets
validate_secret() {
    local name="$1"
    local required="${2:-false}"
    local value="${!name:-}"
    
    if [ -z "$value" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}[secrets] ✗ ERROR: Required secret $name is not set${NC}" >&2
            return 1
        else
            echo -e "${YELLOW}[secrets] ⚠ Optional secret $name is not set${NC}" >&2
            return 0
        fi
    fi
    
    # Check for placeholder values
    if [[ "$value" == *"placeholder"* ]] || [[ "$value" == *"your_"* ]] || [[ "$value" == *"_here"* ]]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}[secrets] ✗ ERROR: $name contains placeholder value: ${value:0:30}...${NC}" >&2
            return 1
        else
            echo -e "${YELLOW}[secrets] ⚠ $name contains placeholder value${NC}" >&2
            return 0
        fi
    fi
    
    # Secret looks valid
    echo -e "${GREEN}[secrets] ✓ $name is set (${#value} characters)${NC}"
    return 0
}

# Export validation function for use in other scripts
export -f validate_secret

# Validate critical secrets based on environment
VALIDATION_FAILED=0

if [ "$ENV" = "production" ]; then
    echo -e "${GREEN}[secrets] Validating production secrets...${NC}"
    
    # Critical production secrets
    validate_secret "ANTHROPIC_API_KEY" "true" || VALIDATION_FAILED=1
    validate_secret "AWS_ACCESS_KEY_ID" "true" || VALIDATION_FAILED=1
    validate_secret "AWS_SECRET_ACCESS_KEY" "true" || VALIDATION_FAILED=1
    validate_secret "STRIPE_SECRET_KEY" "true" || VALIDATION_FAILED=1
    validate_secret "DATABASE_PASSWORD" "true" || VALIDATION_FAILED=1
    
    # Important but not critical
    validate_secret "HIVELOCITY_API_KEY" "false"
    validate_secret "HOSTBILL_API_KEY" "false"
    validate_secret "GITLAB_TOKEN" "false"
    
elif [ "$ENV" = "staging" ]; then
    echo -e "${GREEN}[secrets] Validating staging secrets...${NC}"
    
    # Staging can use test keys
    validate_secret "ANTHROPIC_API_KEY" "false"
    validate_secret "STRIPE_TEST_SECRET_KEY" "false"
    
else
    echo -e "${GREEN}[secrets] Validating development secrets...${NC}"
    
    # Development - very lenient
    validate_secret "ANTHROPIC_API_KEY" "false"
    validate_secret "STRIPE_TEST_SECRET_KEY" "false"
fi

# Report validation results
if [ "$VALIDATION_FAILED" -eq 1 ]; then
    echo -e "${RED}[secrets] ✗ Secret validation FAILED${NC}" >&2
    echo -e "${YELLOW}[secrets] Review .env.$ENV and ensure all required secrets are set${NC}" >&2
    
    if [ "$ENV" = "production" ]; then
        echo -e "${RED}[secrets] BLOCKING: Cannot proceed in production without valid secrets${NC}" >&2
        return 1
    else
        echo -e "${YELLOW}[secrets] WARNING: Some secrets are missing but continuing in $ENV mode${NC}" >&2
    fi
else
    echo -e "${GREEN}[secrets] ✓ All required secrets validated${NC}"
fi

# Security reminder
if [ "$ENV" = "production" ]; then
    echo -e "${YELLOW}[secrets] REMINDER: Rotate production secrets every 90 days${NC}"
    echo -e "${YELLOW}[secrets] See .goalie/SECURITY_API_KEY_ROTATION.md for schedule${NC}"
fi

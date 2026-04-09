#!/bin/bash
# Security Scan Script - Off-Host Syslog Black Box Recorder
# Scans repository for secrets, private keys, and credentials

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Security Scan Script"
echo "=========================================="
echo ""

# Parse command line arguments
SCAN_TYPE="all"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --quick)
            SCAN_TYPE="quick"
            shift
            ;;
        --full)
            SCAN_TYPE="full"
            shift
            ;;
        --help)
            echo "Usage: $0 [--quick|--full]"
            echo "  --quick  Quick scan (secrets only)"
            echo "  --full    Full scan (secrets + code analysis)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Scan type: $SCAN_TYPE"
echo ""

# Test 1: Secret Scanning
echo "=========================================="
echo "Test 1: Secret Scanning"
echo "=========================================="
echo ""

SECRET_PATTERNS=(
    "BEGIN.*PRIVATE KEY"
    "BEGIN.*RSA PRIVATE KEY"
    "BEGIN.*EC PRIVATE KEY"
    "BEGIN.*OPENSSH PRIVATE KEY"
    "BEGIN.*ENCRYPTED PRIVATE KEY"
    "-----BEGIN.*PRIVATE KEY-----"
    "password[\"'].*=[\"']"
    "api_key[\"'].*=[\"']"
    "secret[\"'].*=[\"']"
    "token[\"'].*=[\"']"
    "aws_access_key_id"
    "aws_secret_access_key"
    "AKIAIOSFODNN7EXAMPLE"
)

FOUND_SECRETS=false
for pattern in "${SECRET_PATTERNS[@]}"; do
    echo "Scanning for pattern: $pattern..."
    FOUND=$(grep -ri "$pattern" "$PROJECT_ROOT"/**/*.{tf,yml,yaml,sh,conf} 2>/dev/null | grep -v "example\|sample\|test\|placeholder\|description\|#" || echo "")
    if [ -n "$FOUND" ]; then
        echo -e "${RED}✗ FOUND: $pattern${NC}"
        echo "$FOUND"
        FOUND_SECRETS=true
    else
        echo -e "${GREEN}✓ No matches for: $pattern${NC}"
    fi
done

# Test 2: File Permission Check
echo ""
echo "=========================================="
echo "Test 2: File Permission Check"
echo "=========================================="
echo ""

echo "Checking for files with excessive permissions..."
EXCESSIVE_PERM=$(find "$PROJECT_ROOT" -type f -perm /o+w ! -perm /o=r 2>/dev/null || echo "")
if [ -n "$EXCESSIVE_PERM" ]; then
    echo -e "${YELLOW}⚠ WARNING: Files with excessive permissions found:${NC}"
    echo "$EXCESSIVE_PERM"
else
    echo -e "${GREEN}✓ No files with excessive permissions${NC}"
fi

# Test 3: Hardcoded Credentials Check
echo ""
echo "=========================================="
echo "Test 3: Hardcoded Credentials Check"
echo "=========================================="
echo ""

echo "Checking for hardcoded credentials..."
CREDENTIAL_PATTERNS=(
    "http://.*:[^/]*@"
    "https://.*:[^/]*@"
    "ftp://.*:[^/]*@"
    "mongodb://.*:[^/]*@"
    "postgres://.*:[^/]*@"
    "mysql://.*:[^/]*@"
    "redis://.*:[^/]*@"
)

FOUND_CREDENTIALS=false
for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
    echo "Scanning for pattern: $pattern..."
    FOUND=$(grep -ri "$pattern" "$PROJECT_ROOT"/**/*.{tf,yml,yaml,sh,py,js,ts} 2>/dev/null | grep -v "example\|sample\|test\|placeholder\|description\|#" || echo "")
    if [ -n "$FOUND" ]; then
        echo -e "${RED}✗ FOUND: Hardcoded credentials${NC}"
        echo "$FOUND"
        FOUND_CREDENTIALS=true
    else
        echo -e "${GREEN}✓ No matches for: $pattern${NC}"
    fi
done

# Test 4: AWS Keys Check
echo ""
echo "=========================================="
echo "Test 4: AWS Keys Check"
echo "=========================================="
echo ""

echo "Checking for AWS access keys..."
AWS_KEY_PATTERN="AKIA[0-9A-Z]{16}"
FOUND=$(grep -ri "$AWS_KEY_PATTERN" "$PROJECT_ROOT"/**/*.{tf,yml,yaml,sh,py,js,ts} 2>/dev/null | grep -v "example\|sample\|test\|placeholder\|description\|#" || echo "")
if [ -n "$FOUND" ]; then
    echo -e "${RED}✗ FOUND: AWS access key${NC}"
    echo "$FOUND"
else
    echo -e "${GREEN}✓ No AWS access keys found${NC}"
fi

# Test 5: Sensitive File Extensions
echo ""
echo "=========================================="
echo "Test 5: Sensitive File Extensions"
echo "=========================================="
echo ""

echo "Checking for sensitive file extensions..."
SENSITIVE_EXTENSIONS=(".key" ".pem" ".p12" ".pfx" ".jks" ".keystore")
FOUND_SENSITIVE=false
for ext in "${SENSITIVE_EXTENSIONS[@]}"; do
    FOUND=$(find "$PROJECT_ROOT" -name "*${ext}" 2>/dev/null || echo "")
    if [ -n "$FOUND" ]; then
        echo -e "${YELLOW}⚠ WARNING: Files with extension ${ext} found:${NC}"
        echo "$FOUND"
        FOUND_SENSITIVE=true
    fi
done
if [ "$FOUND_SENSITIVE" = false ]; then
    echo -e "${GREEN}✓ No sensitive file extensions found${NC}"
fi

# Test 6: Git History Check
echo ""
echo "=========================================="
echo "Test 6: Git History Check"
echo "=========================================="
echo ""

if [ -d "$PROJECT_ROOT/.git" ]; then
    echo "Checking git history for secrets..."
    FOUND=$(git -C "$PROJECT_ROOT" log --all --oneline -i --grep="password\|secret\|token\|api_key\|private_key" 2>/dev/null | grep -v "example\|sample\|test\|placeholder\|description\|#" || echo "")
    if [ -n "$FOUND" ]; then
        echo -e "${RED}✗ FOUND: Secrets in git history${NC}"
        echo "$FOUND"
    else
        echo -e "${GREEN}✓ No secrets in git history${NC}"
    fi
else
    echo -e "${YELLOW}⚠ WARNING: Not a git repository${NC}"
fi

# Test 7: Terraform State Check
echo ""
echo "=========================================="
echo "Test 7: Terraform State Check"
echo "=========================================="
echo ""

TF_STATE_FILES=$(find "$PROJECT_ROOT" -name "*.tfstate*" 2>/dev/null || echo "")
if [ -n "$TF_STATE_FILES" ]; then
    echo -e "${YELLOW}⚠ WARNING: Terraform state files found:${NC}"
    echo "$TF_STATE_FILES"
    echo "   Ensure .tfstate files are in .gitignore"
else
    echo -e "${GREEN}✓ No Terraform state files in repository${NC}"
fi

# Test 8: Ansible Vault Check
echo ""
echo "=========================================="
echo "Test 8: Ansible Vault Check"
echo "=========================================="
echo ""

ANSIBLE_VAULT_FILES=$(find "$PROJECT_ROOT" -name "*.yml" -exec grep -l "ansible_vault" {} \; 2>/dev/null || echo "")
if [ -n "$ANSIBLE_VAULT_FILES" ]; then
    echo -e "${GREEN}✓ Ansible vault usage detected${NC}"
    echo "$ANSIBLE_VAULT_FILES"
else
    echo -e "${YELLOW}⚠ WARNING: No Ansible vault usage detected${NC}"
    echo "   Consider using ansible-vault for sensitive data"
fi

# Test 9: Certificate Expiry Check (Full scan only)
if [ "$SCAN_TYPE" = "full" ]; then
    echo ""
    echo "=========================================="
    echo "Test 9: Certificate Expiry Check"
    echo "=========================================="
    echo ""

    echo "Checking certificate expiry dates..."
    CERT_FILES=$(find "$PROJECT_ROOT" -name "*.pem" -o -name "*.crt" 2>/dev/null || echo "")
    if [ -n "$CERT_FILES" ]; then
        for cert in $CERT_FILES; do
            if command -v openssl &> /dev/null; then
                EXPIRY=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)
                EXPIRY_DATE=$(date -d "$EXPIRY" +%s)
                CURRENT_DATE=$(date +%s)
                DAYS_LEFT=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))
                echo "Certificate: $cert"
                echo "Expiry: $EXPIRY"
                echo "Days left: $DAYS_LEFT"
                if [ "$DAYS_LEFT" -lt 30 ]; then
                    echo -e "${RED}✗ Certificate expires in less than 30 days${NC}"
                elif [ "$DAYS_LEFT" -lt 90 ]; then
                    echo -e "${YELLOW}⚠ WARNING: Certificate expires in less than 90 days${NC}"
                else
                    echo -e "${GREEN}✓ Certificate is valid${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ WARNING: openssl not available to check certificates${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠ WARNING: No certificates found${NC}"
    fi
fi

# Test 10: .gitignore Check
echo ""
echo "=========================================="
echo "Test 10: .gitignore Check"
echo "=========================================="
echo ""

if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    echo "Checking .gitignore for sensitive files..."
    REQUIRED_IGNORES=("*.tfstate" "*.tfstate.*" ".terraform" "*.key" "*.pem" "*.p12" "*.jks" "*.keystore")
    MISSING_IGNORES=()
    for ignore in "${REQUIRED_IGNORES[@]}"; do
        if ! grep -q "$ignore" "$PROJECT_ROOT/.gitignore"; then
            MISSING_IGNORES+=("$ignore")
        fi
    done
    if [ ${#MISSING_IGNORES[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠ WARNING: Missing .gitignore entries:${NC}"
        printf '%s\n' "${MISSING_IGNORES[@]}"
    else
        echo -e "${GREEN}✓ All sensitive files are in .gitignore${NC}"
    fi
else
    echo -e "${YELLOW}⚠ WARNING: .gitignore file not found${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Security Scan Summary"
echo "=========================================="
echo ""

if [ "$FOUND_SECRETS" = true ] || [ "$FOUND_CREDENTIALS" = true ]; then
    echo -e "${RED}✗ CRITICAL: Secrets or credentials found in repository${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Remove all secrets and credentials from the repository"
    echo "  2. Use environment variables or secret management tools"
    echo "  3. Rotate any exposed credentials"
    echo "  4. Commit and push the changes"
    exit 1
elif [ "$FOUND_SENSITIVE" = true ]; then
    echo -e "${YELLOW}⚠ WARNING: Sensitive files found${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Verify sensitive files are in .gitignore"
    echo "  2. Consider using a secrets manager"
    exit 1
else
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    echo ""
    echo "No secrets, credentials, or sensitive files found."
    exit 0
fi

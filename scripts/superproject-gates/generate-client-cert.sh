#!/bin/bash
# =============================================================================
# Generate Client Certificate for stx-aio-0
# =============================================================================
# Purpose: Create client certificate for StarlingX server mutual TLS authentication
# Target: stx-aio-0.corp.interface.tag.ooo (23.92.79.2)
# Validity: 1 year (365 days)
# Key Size: 2048-bit RSA
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/generated"

# Client Configuration (pre-configured for stx-aio-0)
CLIENT_HOSTNAME="${CLIENT_HOSTNAME:-stx-aio-0.corp.interface.tag.ooo}"
CLIENT_IP="${CLIENT_IP:-23.92.79.2}"

# Certificate Configuration
CERT_DAYS="${CERT_DAYS:-365}"
KEY_SIZE="${KEY_SIZE:-2048}"
ORG="${CA_ORG:-Infrastructure}"
UNIT="${CA_UNIT:-Observability}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v openssl &>/dev/null; then
        log_error "OpenSSL is required but not installed"
        exit 1
    fi
    
    # Check for CA files
    if [[ ! -f "${OUTPUT_DIR}/ca.key" ]]; then
        log_error "CA private key not found: ${OUTPUT_DIR}/ca.key"
        log_error "Run ./generate-ca.sh first"
        exit 1
    fi
    
    if [[ ! -f "${OUTPUT_DIR}/ca.crt" ]]; then
        log_error "CA certificate not found: ${OUTPUT_DIR}/ca.crt"
        log_error "Run ./generate-ca.sh first"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
    log_info "Client hostname: ${CLIENT_HOSTNAME}"
    log_info "Client IP: ${CLIENT_IP}"
}

# =============================================================================
# Generate Client Key and CSR
# =============================================================================

generate_client_key_and_csr() {
    log_info "Generating client private key (${KEY_SIZE}-bit RSA)..."
    
    # Check if key already exists
    if [[ -f "${OUTPUT_DIR}/client.key" ]]; then
        log_warn "Client key already exists at ${OUTPUT_DIR}/client.key"
        read -p "Overwrite existing client certificate? [y/N]: " -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Keeping existing client certificate"
            exit 0
        fi
    fi
    
    # Generate client private key
    openssl genrsa -out "${OUTPUT_DIR}/client.key" ${KEY_SIZE}
    
    # Set strict permissions on private key
    chmod 600 "${OUTPUT_DIR}/client.key"
    if [[ $EUID -eq 0 ]]; then
        chown root:root "${OUTPUT_DIR}/client.key"
    fi
    
    log_info "Generating client certificate signing request (CSR)..."
    
    # Build SAN extension
    local san_ext="DNS:${CLIENT_HOSTNAME}"
    if [[ -n "${CLIENT_IP}" ]]; then
        san_ext="${san_ext},IP:${CLIENT_IP}"
    fi
    
    # Create client CSR configuration
    cat > "${OUTPUT_DIR}/client.cnf" << EOF
[ req ]
default_bits        = ${KEY_SIZE}
distinguished_name  = req_distinguished_name
req_extensions      = req_ext
string_mask         = utf8only
prompt              = no

[ req_distinguished_name ]
O                   = ${ORG}
OU                  = ${UNIT}
CN                  = ${CLIENT_HOSTNAME}

[ req_ext ]
basicConstraints    = CA:FALSE
nsCertType          = client
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = clientAuth
subjectAltName      = ${san_ext}

[ v3_client ]
basicConstraints    = CA:FALSE
nsCertType          = client
nsComment           = "Off-Host Syslog Client Certificate - stx-aio-0"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = clientAuth
subjectAltName      = ${san_ext}
EOF
    
    # Generate CSR
    openssl req -new \
        -key "${OUTPUT_DIR}/client.key" \
        -out "${OUTPUT_DIR}/client.csr" \
        -config "${OUTPUT_DIR}/client.cnf"
    
    log_info "Client CSR generated"
}

# =============================================================================
# Sign Client Certificate with CA
# =============================================================================

sign_client_certificate() {
    log_info "Signing client certificate with CA (valid for ${CERT_DAYS} days)..."
    
    # Build SAN extension for signing
    local san_ext="DNS:${CLIENT_HOSTNAME}"
    if [[ -n "${CLIENT_IP}" ]]; then
        san_ext="${san_ext},IP:${CLIENT_IP}"
    fi
    
    # Create extension file for signing
    cat > "${OUTPUT_DIR}/client_ext.cnf" << EOF
basicConstraints    = CA:FALSE
nsCertType          = client
nsComment           = "Off-Host Syslog Client Certificate - stx-aio-0"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = clientAuth
subjectAltName      = ${san_ext}
EOF
    
    # Sign the certificate
    openssl x509 -req \
        -in "${OUTPUT_DIR}/client.csr" \
        -CA "${OUTPUT_DIR}/ca.crt" \
        -CAkey "${OUTPUT_DIR}/ca.key" \
        -CAcreateserial \
        -out "${OUTPUT_DIR}/client.crt" \
        -days ${CERT_DAYS} \
        -sha256 \
        -extfile "${OUTPUT_DIR}/client_ext.cnf"
    
    # Set certificate permissions
    chmod 644 "${OUTPUT_DIR}/client.crt"
    
    log_info "Client certificate signed"
}

# =============================================================================
# Verify Client Certificate
# =============================================================================

verify_client_certificate() {
    log_info "Verifying client certificate..."
    
    # Display certificate information
    echo ""
    echo "=============================================="
    echo "Client Certificate Information"
    echo "=============================================="
    openssl x509 -in "${OUTPUT_DIR}/client.crt" -noout -subject -issuer -dates
    echo ""
    echo "Subject Alternative Names:"
    openssl x509 -in "${OUTPUT_DIR}/client.crt" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 || echo "  (none)"
    echo ""
    
    # Verify certificate chain
    if openssl verify -CAfile "${OUTPUT_DIR}/ca.crt" "${OUTPUT_DIR}/client.crt" 2>&1 | grep -q "OK"; then
        log_info "Client certificate verification: PASSED"
    else
        log_error "Client certificate verification: FAILED"
        exit 1
    fi
    
    # Verify key matches certificate
    local cert_modulus key_modulus
    cert_modulus=$(openssl x509 -noout -modulus -in "${OUTPUT_DIR}/client.crt" | openssl md5)
    key_modulus=$(openssl rsa -noout -modulus -in "${OUTPUT_DIR}/client.key" 2>/dev/null | openssl md5)
    
    if [[ "$cert_modulus" == "$key_modulus" ]]; then
        log_info "Key/certificate match verification: PASSED"
    else
        log_error "Key/certificate match verification: FAILED"
        exit 1
    fi
    
    # Verify extended key usage
    if openssl x509 -in "${OUTPUT_DIR}/client.crt" -noout -text | grep -q "TLS Web Client Authentication"; then
        log_info "Extended Key Usage (clientAuth): PASSED"
    else
        log_warn "Extended Key Usage may not include clientAuth"
    fi
}

# =============================================================================
# Output Summary
# =============================================================================

print_summary() {
    echo ""
    echo "=============================================="
    echo "Client Certificate Generation Complete"
    echo "=============================================="
    echo ""
    echo "Files created:"
    echo "  - ${OUTPUT_DIR}/client.key (private key, 0600 permissions)"
    echo "  - ${OUTPUT_DIR}/client.crt (certificate, 0644 permissions)"
    echo "  - ${OUTPUT_DIR}/client.csr (signing request)"
    echo ""
    echo "Certificate details:"
    echo "  - CN: ${CLIENT_HOSTNAME}"
    echo "  - SAN: DNS:${CLIENT_HOSTNAME}, IP:${CLIENT_IP}"
    echo "  - Validity: ${CERT_DAYS} days"
    echo "  - Usage: TLS Client Authentication"
    echo ""
    echo "Deployment (to stx-aio-0 at ${CLIENT_IP}):"
    echo "  # Copy CA certificate"
    echo "  scp ${OUTPUT_DIR}/ca.crt sysadmin@stx-aio-0:/tmp/"
    echo "  ssh sysadmin@stx-aio-0 'sudo cp /tmp/ca.crt /etc/ssl/certs/observability-ca.crt'"
    echo ""
    echo "  # Copy client certificate and key"
    echo "  scp ${OUTPUT_DIR}/client.crt sysadmin@stx-aio-0:/tmp/"
    echo "  scp ${OUTPUT_DIR}/client.key sysadmin@stx-aio-0:/tmp/"
    echo "  ssh sysadmin@stx-aio-0 'sudo cp /tmp/client.crt /etc/ssl/certs/stx-aio-0.crt'"
    echo "  ssh sysadmin@stx-aio-0 'sudo cp /tmp/client.key /etc/ssl/private/stx-aio-0.key'"
    echo "  ssh sysadmin@stx-aio-0 'sudo chmod 600 /etc/ssl/private/stx-aio-0.key'"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy certificates to VPS (server.crt, server.key, ca.crt)"
    echo "  2. Deploy certificates to stx-aio-0 (client.crt, client.key, ca.crt)"
    echo "  3. Configure rsyslog on both systems"
    echo "  4. Run verification scripts"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Off-Host Syslog - Client Certificate Generator"
    echo "=============================================="
    echo "Target: stx-aio-0.corp.interface.tag.ooo (23.92.79.2)"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    generate_client_key_and_csr
    sign_client_certificate
    verify_client_certificate
    print_summary
}

main "$@"

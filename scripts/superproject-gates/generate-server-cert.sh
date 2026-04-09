#!/bin/bash
# =============================================================================
# Generate VPS Server Certificate
# =============================================================================
# Purpose: Create server certificate for VPS syslog sink TLS listener
# Validity: 1 year (365 days)
# Key Size: 2048-bit RSA
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/generated"

# Server Configuration (MUST be set via environment variables)
SERVER_HOSTNAME="${SYSLOG_SINK_HOSTNAME:-syslog-sink.internal}"
SERVER_IP="${SYSLOG_SINK_IP:-}"

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
    
    if [[ ! -f "${OUTPUT_DIR}/ca.cnf" ]]; then
        log_error "CA configuration not found: ${OUTPUT_DIR}/ca.cnf"
        log_error "Run ./generate-ca.sh first"
        exit 1
    fi
    
    # Validate SERVER_IP is set
    if [[ -z "${SERVER_IP}" ]]; then
        log_warn "SYSLOG_SINK_IP not set - certificate will not include IP SAN"
        log_warn "Set SYSLOG_SINK_IP environment variable for IP-based verification"
    fi
    
    log_info "Prerequisites check passed"
    log_info "Server hostname: ${SERVER_HOSTNAME}"
    log_info "Server IP: ${SERVER_IP:-<not set>}"
}

# =============================================================================
# Generate Server Key and CSR
# =============================================================================

generate_server_key_and_csr() {
    log_info "Generating server private key (${KEY_SIZE}-bit RSA)..."
    
    # Check if key already exists
    if [[ -f "${OUTPUT_DIR}/server.key" ]]; then
        log_warn "Server key already exists at ${OUTPUT_DIR}/server.key"
        read -p "Overwrite existing server certificate? [y/N]: " -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Keeping existing server certificate"
            exit 0
        fi
    fi
    
    # Generate server private key
    openssl genrsa -out "${OUTPUT_DIR}/server.key" ${KEY_SIZE}
    
    # Set strict permissions on private key
    chmod 600 "${OUTPUT_DIR}/server.key"
    if [[ $EUID -eq 0 ]]; then
        chown root:root "${OUTPUT_DIR}/server.key"
    fi
    
    log_info "Generating server certificate signing request (CSR)..."
    
    # Build SAN extension
    local san_ext="DNS:${SERVER_HOSTNAME},DNS:localhost"
    if [[ -n "${SERVER_IP}" ]]; then
        san_ext="${san_ext},IP:${SERVER_IP},IP:127.0.0.1"
    else
        san_ext="${san_ext},IP:127.0.0.1"
    fi
    
    # Create server CSR configuration
    cat > "${OUTPUT_DIR}/server.cnf" << EOF
[ req ]
default_bits        = ${KEY_SIZE}
distinguished_name  = req_distinguished_name
req_extensions      = req_ext
string_mask         = utf8only
prompt              = no

[ req_distinguished_name ]
O                   = ${ORG}
OU                  = ${UNIT}
CN                  = ${SERVER_HOSTNAME}

[ req_ext ]
basicConstraints    = CA:FALSE
nsCertType          = server
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = serverAuth
subjectAltName      = ${san_ext}

[ v3_server ]
basicConstraints    = CA:FALSE
nsCertType          = server
nsComment           = "Off-Host Syslog Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = serverAuth
subjectAltName      = ${san_ext}
EOF
    
    # Generate CSR
    openssl req -new \
        -key "${OUTPUT_DIR}/server.key" \
        -out "${OUTPUT_DIR}/server.csr" \
        -config "${OUTPUT_DIR}/server.cnf"
    
    log_info "Server CSR generated"
}

# =============================================================================
# Sign Server Certificate with CA
# =============================================================================

sign_server_certificate() {
    log_info "Signing server certificate with CA (valid for ${CERT_DAYS} days)..."
    
    # Build SAN extension for signing
    local san_ext="DNS:${SERVER_HOSTNAME},DNS:localhost"
    if [[ -n "${SERVER_IP}" ]]; then
        san_ext="${san_ext},IP:${SERVER_IP},IP:127.0.0.1"
    else
        san_ext="${san_ext},IP:127.0.0.1"
    fi
    
    # Create extension file for signing
    cat > "${OUTPUT_DIR}/server_ext.cnf" << EOF
basicConstraints    = CA:FALSE
nsCertType          = server
nsComment           = "Off-Host Syslog Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage            = critical, digitalSignature, keyEncipherment
extendedKeyUsage    = serverAuth
subjectAltName      = ${san_ext}
EOF
    
    # Sign the certificate
    openssl x509 -req \
        -in "${OUTPUT_DIR}/server.csr" \
        -CA "${OUTPUT_DIR}/ca.crt" \
        -CAkey "${OUTPUT_DIR}/ca.key" \
        -CAcreateserial \
        -out "${OUTPUT_DIR}/server.crt" \
        -days ${CERT_DAYS} \
        -sha256 \
        -extfile "${OUTPUT_DIR}/server_ext.cnf"
    
    # Set certificate permissions
    chmod 644 "${OUTPUT_DIR}/server.crt"
    
    log_info "Server certificate signed"
}

# =============================================================================
# Verify Server Certificate
# =============================================================================

verify_server_certificate() {
    log_info "Verifying server certificate..."
    
    # Display certificate information
    echo ""
    echo "=============================================="
    echo "Server Certificate Information"
    echo "=============================================="
    openssl x509 -in "${OUTPUT_DIR}/server.crt" -noout -subject -issuer -dates
    echo ""
    echo "Subject Alternative Names:"
    openssl x509 -in "${OUTPUT_DIR}/server.crt" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 || echo "  (none)"
    echo ""
    
    # Verify certificate chain
    if openssl verify -CAfile "${OUTPUT_DIR}/ca.crt" "${OUTPUT_DIR}/server.crt" 2>&1 | grep -q "OK"; then
        log_info "Server certificate verification: PASSED"
    else
        log_error "Server certificate verification: FAILED"
        exit 1
    fi
    
    # Verify key matches certificate
    local cert_modulus key_modulus
    cert_modulus=$(openssl x509 -noout -modulus -in "${OUTPUT_DIR}/server.crt" | openssl md5)
    key_modulus=$(openssl rsa -noout -modulus -in "${OUTPUT_DIR}/server.key" 2>/dev/null | openssl md5)
    
    if [[ "$cert_modulus" == "$key_modulus" ]]; then
        log_info "Key/certificate match verification: PASSED"
    else
        log_error "Key/certificate match verification: FAILED"
        exit 1
    fi
}

# =============================================================================
# Output Summary
# =============================================================================

print_summary() {
    echo ""
    echo "=============================================="
    echo "Server Certificate Generation Complete"
    echo "=============================================="
    echo ""
    echo "Files created:"
    echo "  - ${OUTPUT_DIR}/server.key (private key, 0600 permissions)"
    echo "  - ${OUTPUT_DIR}/server.crt (certificate, 0644 permissions)"
    echo "  - ${OUTPUT_DIR}/server.csr (signing request)"
    echo ""
    echo "Certificate details:"
    echo "  - CN: ${SERVER_HOSTNAME}"
    if [[ -n "${SERVER_IP}" ]]; then
        echo "  - SAN: DNS:${SERVER_HOSTNAME}, IP:${SERVER_IP}"
    else
        echo "  - SAN: DNS:${SERVER_HOSTNAME}"
    fi
    echo "  - Validity: ${CERT_DAYS} days"
    echo ""
    echo "Deployment (to VPS):"
    echo "  sudo cp ${OUTPUT_DIR}/server.crt /etc/ssl/certs/syslog-sink.crt"
    echo "  sudo cp ${OUTPUT_DIR}/server.key /etc/ssl/private/syslog-sink.key"
    echo "  sudo chmod 600 /etc/ssl/private/syslog-sink.key"
    echo ""
    echo "Next steps:"
    echo "  1. Run ./generate-client-cert.sh to create stx-aio-0 client certificate"
    echo "  2. Deploy certificates to VPS"
    echo "  3. Configure rsyslog with TLS"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Off-Host Syslog - Server Certificate Generator"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    generate_server_key_and_csr
    sign_server_certificate
    verify_server_certificate
    print_summary
}

main "$@"

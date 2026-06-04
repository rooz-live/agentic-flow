#!/bin/bash
# Off-Host Syslog Internal PKI - Client Certificate Generation
# This script creates a client certificate for syslog forwarding hosts
#
# Usage: ./generate-client-cert.sh <hostname> <ip-address>
# Example: ./generate-client-cert.sh stx-aio-0 23.92.79.2
#
# Security Notes:
# - Client private key has 0600 permissions
# - Certificate validity: 365 days (configurable)
# - Used for mutual TLS authentication

set -euo pipefail

# Arguments
HOSTNAME="${1:-stx-aio-0}"
IP_ADDRESS="${2:-23.92.79.2}"

# Configuration
CA_DIR="${CA_DIR:-$(dirname "$0")/ca}"
CERT_VALIDITY_DAYS="${CERT_VALIDITY_DAYS:-365}"
KEY_SIZE="${KEY_SIZE:-2048}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validate CA exists
if [[ ! -f "${CA_DIR}/private/ca.key" ]] || [[ ! -f "${CA_DIR}/certs/ca.crt" ]]; then
    log_error "CA not found at ${CA_DIR}. Run generate-ca.sh first."
    exit 1
fi

# Check if certificate already exists
if [[ -f "${CA_DIR}/certs/${HOSTNAME}-client.crt" ]]; then
    log_warn "Client certificate for ${HOSTNAME} already exists."
    log_info "To regenerate, remove: ${CA_DIR}/certs/${HOSTNAME}-client.crt"
    exit 0
fi

log_info "Generating client certificate for ${HOSTNAME} (${IP_ADDRESS})..."

# Create extension file for client certificate
cat > "${CA_DIR}/csr/${HOSTNAME}-client.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${HOSTNAME}
DNS.2 = ${HOSTNAME}.corp.interface.tag.ooo
IP.1 = ${IP_ADDRESS}
EOF

# Generate client private key
log_info "Generating client private key..."
openssl genrsa -out "${CA_DIR}/private/${HOSTNAME}-client.key" ${KEY_SIZE} 2>/dev/null
chmod 600 "${CA_DIR}/private/${HOSTNAME}-client.key"

# Generate certificate signing request (CSR)
log_info "Generating CSR..."
openssl req -new \
    -key "${CA_DIR}/private/${HOSTNAME}-client.key" \
    -out "${CA_DIR}/csr/${HOSTNAME}-client.csr" \
    -subj "/C=US/ST=California/L=San Francisco/O=Interface.tag.ooo/OU=Infrastructure/CN=${HOSTNAME}"

# Sign with CA
log_info "Signing with CA..."
openssl x509 -req \
    -in "${CA_DIR}/csr/${HOSTNAME}-client.csr" \
    -CA "${CA_DIR}/certs/ca.crt" \
    -CAkey "${CA_DIR}/private/ca.key" \
    -CAcreateserial \
    -out "${CA_DIR}/certs/${HOSTNAME}-client.crt" \
    -days ${CERT_VALIDITY_DAYS} \
    -sha256 \
    -extfile "${CA_DIR}/csr/${HOSTNAME}-client.ext"

chmod 644 "${CA_DIR}/certs/${HOSTNAME}-client.crt"

# Verify certificate
log_info "Verifying client certificate..."
openssl verify -CAfile "${CA_DIR}/certs/ca.crt" "${CA_DIR}/certs/${HOSTNAME}-client.crt"

# Show certificate details
log_info "Certificate details:"
openssl x509 -noout -text -in "${CA_DIR}/certs/${HOSTNAME}-client.crt" | grep -E "(Subject:|Issuer:|Not Before|Not After|DNS:|IP Address:)" | head -10

# Create combined PEM file
cat "${CA_DIR}/certs/${HOSTNAME}-client.crt" "${CA_DIR}/private/${HOSTNAME}-client.key" > "${CA_DIR}/private/${HOSTNAME}-client.pem"
chmod 600 "${CA_DIR}/private/${HOSTNAME}-client.pem"

# Create fingerprint file
openssl x509 -noout -fingerprint -sha256 -in "${CA_DIR}/certs/${HOSTNAME}-client.crt" > "${CA_DIR}/certs/${HOSTNAME}-client.fingerprint"

log_info "Client certificate generation complete!"

cat << EOF

=== Client Certificate Summary ===
Hostname: ${HOSTNAME}
IP Address: ${IP_ADDRESS}
Validity: ${CERT_VALIDITY_DAYS} days
Key Size: ${KEY_SIZE} bits

Files Created:
- Certificate: ${CA_DIR}/certs/${HOSTNAME}-client.crt
- Private Key: ${CA_DIR}/private/${HOSTNAME}-client.key (PROTECT THIS FILE)
- Combined PEM: ${CA_DIR}/private/${HOSTNAME}-client.pem (PROTECT THIS FILE)
- CSR: ${CA_DIR}/csr/${HOSTNAME}-client.csr
- Extensions: ${CA_DIR}/csr/${HOSTNAME}-client.ext
- Fingerprint: $(cat ${CA_DIR}/certs/${HOSTNAME}-client.fingerprint)

rsyslog Configuration Paths (on client):
- TLS_CERT=/etc/rsyslog.d/tls/${HOSTNAME}-client.crt
- TLS_KEY=/etc/rsyslog.d/tls/${HOSTNAME}-client.key
- TLS_CA=/etc/rsyslog.d/tls/ca.crt

EOF

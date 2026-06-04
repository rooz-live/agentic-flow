#!/bin/bash
# Off-Host Syslog Internal PKI - Server Certificate Generation
# This script creates a server certificate for the syslog sink
#
# Usage: ./generate-server-cert.sh <hostname> <ip-address>
# Example: ./generate-server-cert.sh syslog-sink 77.42.28.179
#
# Security Notes:
# - Server private key has 0600 permissions
# - Certificate validity: 365 days (configurable)

set -euo pipefail

# Arguments
HOSTNAME="${1:-syslog-sink}"
IP_ADDRESS="${2:-77.42.28.179}"

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
if [[ -f "${CA_DIR}/certs/${HOSTNAME}.crt" ]]; then
    log_warn "Server certificate for ${HOSTNAME} already exists."
    log_info "To regenerate, remove: ${CA_DIR}/certs/${HOSTNAME}.crt"
    exit 0
fi

log_info "Generating server certificate for ${HOSTNAME} (${IP_ADDRESS})..."

# Create SAN (Subject Alternative Names) extension file
cat > "${CA_DIR}/csr/${HOSTNAME}.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${HOSTNAME}
DNS.2 = ${HOSTNAME}.local
DNS.3 = localhost
IP.1 = ${IP_ADDRESS}
IP.2 = 127.0.0.1
EOF

# Generate server private key
log_info "Generating server private key..."
openssl genrsa -out "${CA_DIR}/private/${HOSTNAME}.key" ${KEY_SIZE} 2>/dev/null
chmod 600 "${CA_DIR}/private/${HOSTNAME}.key"

# Generate certificate signing request (CSR)
log_info "Generating CSR..."
openssl req -new \
    -key "${CA_DIR}/private/${HOSTNAME}.key" \
    -out "${CA_DIR}/csr/${HOSTNAME}.csr" \
    -subj "/C=US/ST=California/L=San Francisco/O=Interface.tag.ooo/OU=Infrastructure/CN=${HOSTNAME}"

# Sign with CA
log_info "Signing with CA..."
openssl x509 -req \
    -in "${CA_DIR}/csr/${HOSTNAME}.csr" \
    -CA "${CA_DIR}/certs/ca.crt" \
    -CAkey "${CA_DIR}/private/ca.key" \
    -CAcreateserial \
    -out "${CA_DIR}/certs/${HOSTNAME}.crt" \
    -days ${CERT_VALIDITY_DAYS} \
    -sha256 \
    -extfile "${CA_DIR}/csr/${HOSTNAME}.ext"

chmod 644 "${CA_DIR}/certs/${HOSTNAME}.crt"

# Verify certificate
log_info "Verifying server certificate..."
openssl verify -CAfile "${CA_DIR}/certs/ca.crt" "${CA_DIR}/certs/${HOSTNAME}.crt"

# Show certificate details
log_info "Certificate details:"
openssl x509 -noout -text -in "${CA_DIR}/certs/${HOSTNAME}.crt" | grep -E "(Subject:|Issuer:|Not Before|Not After|DNS:|IP Address:)" | head -10

# Create combined PEM file (cert + key for some applications)
cat "${CA_DIR}/certs/${HOSTNAME}.crt" "${CA_DIR}/private/${HOSTNAME}.key" > "${CA_DIR}/private/${HOSTNAME}.pem"
chmod 600 "${CA_DIR}/private/${HOSTNAME}.pem"

# Create fingerprint file
openssl x509 -noout -fingerprint -sha256 -in "${CA_DIR}/certs/${HOSTNAME}.crt" > "${CA_DIR}/certs/${HOSTNAME}.fingerprint"

log_info "Server certificate generation complete!"

cat << EOF

=== Server Certificate Summary ===
Hostname: ${HOSTNAME}
IP Address: ${IP_ADDRESS}
Validity: ${CERT_VALIDITY_DAYS} days
Key Size: ${KEY_SIZE} bits

Files Created:
- Certificate: ${CA_DIR}/certs/${HOSTNAME}.crt
- Private Key: ${CA_DIR}/private/${HOSTNAME}.key (PROTECT THIS FILE)
- Combined PEM: ${CA_DIR}/private/${HOSTNAME}.pem (PROTECT THIS FILE)
- CSR: ${CA_DIR}/csr/${HOSTNAME}.csr
- SAN Extensions: ${CA_DIR}/csr/${HOSTNAME}.ext
- Fingerprint: $(cat ${CA_DIR}/certs/${HOSTNAME}.fingerprint)

rsyslog Configuration Paths (on server):
- TLS_CERT=/etc/rsyslog.d/tls/${HOSTNAME}.crt
- TLS_KEY=/etc/rsyslog.d/tls/${HOSTNAME}.key
- TLS_CA=/etc/rsyslog.d/tls/ca.crt

EOF

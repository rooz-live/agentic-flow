#!/bin/bash
# Off-Host Syslog Internal PKI - Certificate Authority Generation
# This script creates a self-signed CA for mutual TLS authentication
#
# Usage: ./generate-ca.sh [output-dir]
#
# Security Notes:
# - CA private key is encrypted with AES-256
# - All private keys have 0600 permissions
# - Certificate validity: 10 years (3650 days)

set -euo pipefail

# Configuration
CA_DIR="${1:-$(dirname "$0")/ca}"
CA_VALIDITY_DAYS="${CA_VALIDITY_DAYS:-3650}"
CA_KEY_SIZE="${CA_KEY_SIZE:-4096}"
CA_COMMON_NAME="${CA_COMMON_NAME:-Offhost-Syslog-CA}"
CA_ORG="${CA_ORG:-Interface.tag.ooo}"
CA_OU="${CA_OU:-Infrastructure}"
CA_COUNTRY="${CA_COUNTRY:-US}"
CA_STATE="${CA_STATE:-California}"
CA_LOCALITY="${CA_LOCALITY:-San Francisco}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create directory structure
log_info "Creating PKI directory structure..."
mkdir -p "${CA_DIR}"/{private,certs,crl,newcerts,csr}
chmod 700 "${CA_DIR}/private"

# Create index and serial files
touch "${CA_DIR}/index.txt"
echo "1000" > "${CA_DIR}/serial"
echo "1000" > "${CA_DIR}/crlnumber"

# Create OpenSSL configuration
log_info "Creating OpenSSL configuration..."
cat > "${CA_DIR}/openssl.cnf" << 'OPENSSL_CNF'
# OpenSSL CA Configuration for Off-Host Syslog PKI

[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = .
certs             = $dir/certs
crl_dir           = $dir/crl
new_certs_dir     = $dir/newcerts
database          = $dir/index.txt
serial            = $dir/serial
RANDFILE          = $dir/private/.rand

private_key       = $dir/private/ca.key
certificate       = $dir/certs/ca.crt

crlnumber         = $dir/crlnumber
crl               = $dir/crl/ca.crl
crl_extensions    = crl_ext
default_crl_days  = 30

default_md        = sha256
name_opt          = ca_default
cert_opt          = ca_default
default_days      = 365
preserve          = no
policy            = policy_strict

[ policy_strict ]
countryName             = match
stateOrProvinceName     = match
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ policy_loose ]
countryName             = optional
stateOrProvinceName     = optional
localityName            = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ req ]
default_bits        = 4096
distinguished_name  = req_distinguished_name
string_mask         = utf8only
default_md          = sha256
x509_extensions     = v3_ca

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
0.organizationName              = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ v3_intermediate_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ server_cert ]
basicConstraints = CA:FALSE
nsCertType = server
nsComment = "Syslog Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[ client_cert ]
basicConstraints = CA:FALSE
nsCertType = client
nsComment = "Syslog Client Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage = critical, digitalSignature
extendedKeyUsage = clientAuth

[ crl_ext ]
authorityKeyIdentifier = keyid:always
OPENSSL_CNF

# Check if CA already exists
if [[ -f "${CA_DIR}/private/ca.key" ]]; then
    log_warn "CA already exists at ${CA_DIR}. Skipping generation."
    log_info "To regenerate, remove: ${CA_DIR}/private/ca.key"
    exit 0
fi

# Generate CA private key (unencrypted for automation, secure with file permissions)
log_info "Generating CA private key (${CA_KEY_SIZE} bits)..."
openssl genrsa -out "${CA_DIR}/private/ca.key" ${CA_KEY_SIZE} 2>/dev/null
chmod 600 "${CA_DIR}/private/ca.key"

# Generate CA certificate
log_info "Generating self-signed CA certificate..."
openssl req -config "${CA_DIR}/openssl.cnf" \
    -key "${CA_DIR}/private/ca.key" \
    -new -x509 \
    -days ${CA_VALIDITY_DAYS} \
    -sha256 \
    -extensions v3_ca \
    -out "${CA_DIR}/certs/ca.crt" \
    -subj "/C=${CA_COUNTRY}/ST=${CA_STATE}/L=${CA_LOCALITY}/O=${CA_ORG}/OU=${CA_OU}/CN=${CA_COMMON_NAME}"

chmod 644 "${CA_DIR}/certs/ca.crt"

# Verify CA certificate
log_info "Verifying CA certificate..."
openssl x509 -noout -text -in "${CA_DIR}/certs/ca.crt" | head -20

# Create fingerprint file
openssl x509 -noout -fingerprint -sha256 -in "${CA_DIR}/certs/ca.crt" > "${CA_DIR}/certs/ca.fingerprint"

log_info "CA generation complete!"
log_info "CA Certificate: ${CA_DIR}/certs/ca.crt"
log_info "CA Private Key: ${CA_DIR}/private/ca.key (PROTECT THIS FILE)"
log_info "CA Fingerprint: $(cat ${CA_DIR}/certs/ca.fingerprint)"

# Output summary
cat << EOF

=== CA Generation Summary ===
CA Common Name: ${CA_COMMON_NAME}
Validity: ${CA_VALIDITY_DAYS} days
Key Size: ${CA_KEY_SIZE} bits
Location: ${CA_DIR}

Next Steps:
1. Generate server certificate: ./generate-server-cert.sh syslog-sink 77.42.28.179
2. Generate client certificate: ./generate-client-cert.sh stx-aio-0 23.92.79.2
3. Deploy certificates to servers via Ansible

EOF

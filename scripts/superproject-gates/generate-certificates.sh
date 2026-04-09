#!/bin/bash
# TLS Certificate Generation Script
# Off-Host Syslog Black Box Recorder

set -e

# Configuration
CA_VALIDITY_DAYS=3650
CERT_VALIDITY_DAYS=365
SYSLOG_CLIENT_HOSTNAME="stx-aio-0.corp.interface.tag.ooo"

# Directories
SSL_DIR="/etc/ssl"
PRIVATE_DIR="$SSL_DIR/private"
CERTS_DIR="$SSL_DIR/certs"

echo "=========================================="
echo "TLS Certificate Generation Script"
echo "=========================================="
echo ""

# Create directories if they don't exist
echo "Creating SSL directories..."
sudo mkdir -p "$PRIVATE_DIR" "$CERTS_DIR"

# Check if CA certificate already exists
if [ -f "$CERTS_DIR/syslog-ca.crt" ]; then
    echo "CA certificate already exists at $CERTS_DIR/syslog-ca.crt"
    echo "Skipping CA generation..."
else
    echo "Generating CA private key..."
    sudo openssl genrsa -out "$PRIVATE_DIR/syslog-ca.key" 4096
    sudo chmod 0600 "$PRIVATE_DIR/syslog-ca.key"

    echo "Generating CA certificate (valid for $CA_VALIDITY_DAYS days)..."
    sudo openssl req -new -x509 -days "$CA_VALIDITY_DAYS" \
        -key "$PRIVATE_DIR/syslog-ca.key" \
        -out "$CERTS_DIR/syslog-ca.crt" \
        -subj "/C=US/ST=State/L=City/O=Syslog Infrastructure/OU=Certificate Authority/CN=Syslog CA"
    sudo chmod 0644 "$CERTS_DIR/syslog-ca.crt"

    echo "✓ CA certificate generated successfully"
fi

# Generate server certificate
echo ""
echo "Generating server private key..."
sudo openssl genrsa -out "$PRIVATE_DIR/syslog-server.key" 4096
sudo chmod 0600 "$PRIVATE_DIR/syslog-server.key"

echo "Generating server CSR..."
sudo openssl req -new -key "$PRIVATE_DIR/syslog-server.key" \
    -out "$CERTS_DIR/syslog-server.csr" \
    -subj "/C=US/ST=State/L=City/O=Syslog Infrastructure/OU=Syslog Server/CN=$(hostname)"

echo "Signing server certificate with CA..."
sudo openssl x509 -req -days "$CERT_VALIDITY_DAYS" \
    -in "$CERTS_DIR/syslog-server.csr" \
    -CA "$CERTS_DIR/syslog-ca.crt" \
    -CAkey "$PRIVATE_DIR/syslog-ca.key" \
    -CAcreateserial \
    -out "$CERTS_DIR/syslog-server.crt"
sudo chmod 0644 "$CERTS_DIR/syslog-server.crt"

# Clean up CSR
sudo rm -f "$CERTS_DIR/syslog-server.csr"

echo "✓ Server certificate generated successfully"

# Generate client certificate
echo ""
echo "Generating client private key..."
sudo openssl genrsa -out "$PRIVATE_DIR/syslog-client.key" 4096
sudo chmod 0600 "$PRIVATE_DIR/syslog-client.key"

echo "Generating client CSR..."
sudo openssl req -new -key "$PRIVATE_DIR/syslog-client.key" \
    -out "$CERTS_DIR/syslog-client.csr" \
    -subj "/C=US/ST=State/L=City/O=Syslog Infrastructure/OU=Syslog Client/CN=$SYSLOG_CLIENT_HOSTNAME"

echo "Signing client certificate with CA..."
sudo openssl x509 -req -days "$CERT_VALIDITY_DAYS" \
    -in "$CERTS_DIR/syslog-client.csr" \
    -CA "$CERTS_DIR/syslog-ca.crt" \
    -CAkey "$PRIVATE_DIR/syslog-ca.key" \
    -CAcreateserial \
    -out "$CERTS_DIR/syslog-client.crt"
sudo chmod 0644 "$CERTS_DIR/syslog-client.crt"

# Clean up CSR
sudo rm -f "$CERTS_DIR/syslog-client.csr"

echo "✓ Client certificate generated successfully"

# Verify certificates
echo ""
echo "=========================================="
echo "Certificate Verification"
echo "=========================================="
echo ""

echo "Verifying CA certificate..."
sudo openssl x509 -in "$CERTS_DIR/syslog-ca.crt" -noout -text | grep -E "Subject:|Not Before|Not After"

echo ""
echo "Verifying server certificate..."
sudo openssl x509 -in "$CERTS_DIR/syslog-server.crt" -noout -text | grep -E "Subject:|Not Before|Not After|Issuer:"

echo ""
echo "Verifying client certificate..."
sudo openssl x509 -in "$CERTS_DIR/syslog-client.crt" -noout -text | grep -E "Subject:|Not Before|Not After|Issuer:"

# Verify server certificate against CA
echo ""
echo "Verifying server certificate against CA..."
if sudo openssl verify -CAfile "$CERTS_DIR/syslog-ca.crt" "$CERTS_DIR/syslog-server.crt"; then
    echo "✓ Server certificate is valid"
else
    echo "✗ Server certificate verification failed"
    exit 1
fi

# Verify client certificate against CA
echo ""
echo "Verifying client certificate against CA..."
if sudo openssl verify -CAfile "$CERTS_DIR/syslog-ca.crt" "$CERTS_DIR/syslog-client.crt"; then
    echo "✓ Client certificate is valid"
else
    echo "✗ Client certificate verification failed"
    exit 1
fi

# Summary
echo ""
echo "=========================================="
echo "Certificate Generation Complete"
echo "=========================================="
echo ""
echo "Generated files:"
echo "  CA Certificate:     $CERTS_DIR/syslog-ca.crt"
echo "  CA Private Key:     $PRIVATE_DIR/syslog-ca.key"
echo "  Server Certificate: $CERTS_DIR/syslog-server.crt"
echo "  Server Private Key: $PRIVATE_DIR/syslog-server.key"
echo "  Client Certificate: $CERTS_DIR/syslog-client.crt"
echo "  Client Private Key: $PRIVATE_DIR/syslog-client.key"
echo ""
echo "Certificate validity:"
echo "  CA:    $CA_VALIDITY_DAYS days"
echo "  Certs: $CERT_VALIDITY_DAYS days"
echo ""
echo "Next steps:"
echo "  1. Copy CA certificate to syslog client: $CERTS_DIR/syslog-ca.crt"
echo "  2. Copy client certificate to syslog client: $CERTS_DIR/syslog-client.crt"
echo "  3. Copy client private key to syslog client: $PRIVATE_DIR/syslog-client.key"
echo "  4. Set strict permissions: chmod 0600 $PRIVATE_DIR/syslog-client.key"
echo ""

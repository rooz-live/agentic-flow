#!/bin/bash
# Generate Client Certificate for stx-aio-0
# This script creates the client certificate signed by the internal CA

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if CA exists
if [ ! -f "ca.crt" ] || [ ! -f "ca.key" ]; then
    echo "Error: CA certificate not found. Run generate-ca.sh first."
    exit 1
fi

echo "=== Generating Client Certificate for stx-aio-0 ==="
echo "Directory: $SCRIPT_DIR"

# Generate client private key (4096 bits)
echo "Generating client private key..."
openssl genrsa -out client.key 4096

# Set strict permissions
chmod 600 client.key
chown root:root client.key 2>/dev/null || true

# Generate client CSR
echo "Generating client certificate signing request..."
openssl req -new -key client.key -out client.csr -config client.conf

# Sign certificate with CA (2 years validity)
echo "Signing client certificate with CA..."
openssl ca -in client.csr -out client.crt -config ca.conf -days 730 -batch

# Set certificate permissions
chmod 644 client.crt

# Clean up CSR
rm -f client.csr

echo ""
echo "=== Client Certificate Generation Complete ==="
echo "Files created:"
echo "  - client.key (private key, 0600 permissions)"
echo "  - client.crt (certificate, 0644 permissions)"
echo ""
echo "Deploy to stx-aio-0 (23.92.79.2):"
echo "  - Copy client.key to /etc/rsyslog.d/tls/client.key"
echo "  - Copy client.crt to /etc/rsyslog.d/tls/client.crt"
echo "  - Copy ca.crt to /etc/rsyslog.d/tls/ca.crt"

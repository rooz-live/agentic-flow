#!/bin/bash
# Generate Internal Certificate Authority for syslog mutual TLS
# This script creates the CA certificate and private key

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Generating Internal CA Certificate ==="
echo "Directory: $SCRIPT_DIR"

# Create necessary directories
mkdir -p certs
touch index.txt
echo 1000 > serial

# Generate CA private key (4096 bits)
echo "Generating CA private key..."
openssl genrsa -out ca.key 4096

# Set strict permissions
chmod 600 ca.key
chown root:root ca.key 2>/dev/null || true

# Generate CA certificate (10 years validity)
echo "Generating CA certificate..."
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -config ca.conf

# Set certificate permissions
chmod 644 ca.crt

echo ""
echo "=== CA Generation Complete ==="
echo "Files created:"
echo "  - ca.key (private key, 0600 permissions)"
echo "  - ca.crt (certificate, 0644 permissions)"
echo ""
echo "Next steps:"
echo "  1. Set SYSLOG_SINK_HOSTNAME and SYSLOG_SINK_IP environment variables"
echo "  2. Run generate-server-cert.sh"
echo "  3. Run generate-client-cert.sh"

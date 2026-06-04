#!/bin/bash
# Generate Server Certificate for Syslog Sink (VPS)
# This script creates the server certificate signed by the internal CA

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for required environment variables
if [ -z "$SYSLOG_SINK_HOSTNAME" ]; then
    echo "Error: SYSLOG_SINK_HOSTNAME environment variable not set"
    echo "Usage: SYSLOG_SINK_HOSTNAME=vps.example.com SYSLOG_SINK_IP=1.2.3.4 $0"
    exit 1
fi

if [ -z "$SYSLOG_SINK_IP" ]; then
    echo "Error: SYSLOG_SINK_IP environment variable not set"
    echo "Usage: SYSLOG_SINK_HOSTNAME=vps.example.com SYSLOG_SINK_IP=1.2.3.4 $0"
    exit 1
fi

# Check if CA exists
if [ ! -f "ca.crt" ] || [ ! -f "ca.key" ]; then
    echo "Error: CA certificate not found. Run generate-ca.sh first."
    exit 1
fi

echo "=== Generating Server Certificate ==="
echo "Hostname: $SYSLOG_SINK_HOSTNAME"
echo "IP: $SYSLOG_SINK_IP"
echo "Directory: $SCRIPT_DIR"

# Export variables for config substitution
export SYSLOG_SINK_HOSTNAME
export SYSLOG_SINK_IP

# Generate server private key (4096 bits)
echo "Generating server private key..."
openssl genrsa -out server.key 4096

# Set strict permissions
chmod 600 server.key
chown root:root server.key 2>/dev/null || true

# Generate server CSR
echo "Generating server certificate signing request..."
openssl req -new -key server.key -out server.csr -config server.conf

# Sign certificate with CA (2 years validity)
echo "Signing server certificate with CA..."
openssl ca -in server.csr -out server.crt -config ca.conf -days 730 -batch

# Set certificate permissions
chmod 644 server.crt

# Clean up CSR
rm -f server.csr

echo ""
echo "=== Server Certificate Generation Complete ==="
echo "Files created:"
echo "  - server.key (private key, 0600 permissions)"
echo "  - server.crt (certificate, 0644 permissions)"
echo ""
echo "Deploy to syslog sink (VPS):"
echo "  - Copy server.key to /etc/rsyslog.d/tls/server.key"
echo "  - Copy server.crt to /etc/rsyslog.d/tls/server.crt"
echo "  - Copy ca.crt to /etc/rsyslog.d/tls/ca.crt"

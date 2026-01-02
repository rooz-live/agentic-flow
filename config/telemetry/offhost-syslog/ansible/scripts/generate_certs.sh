#!/bin/bash
set -e

# Directory to store certs
CERT_DIR="../files/certs"
mkdir -p $CERT_DIR
cd $CERT_DIR

# 1. Create CA
if [ ! -f ca-key.pem ]; then
    echo "Generating CA..."
    openssl genrsa -out ca-key.pem 4096
    openssl req -new -x509 -days 3650 -key ca-key.pem -out ca.pem -subj "/CN=InternalSyslogCA"
fi

# 2. Server Cert (for the sink)
# Default CN is passed as argument or default
SERVER_CN=${1:-"syslog-sink-prod-aws-us-east-1-01.interface.tag.ooo"}

if [ ! -f server-key.pem ]; then
    echo "Generating Server Cert for $SERVER_CN..."
    openssl genrsa -out server-key.pem 2048
    openssl req -new -key server-key.pem -out server.csr -subj "/CN=$SERVER_CN"
    openssl x509 -req -days 365 -in server.csr -CA ca.pem -CAkey ca-key.pem -set_serial 01 -out server-cert.pem
fi

# 3. Client Cert (for stx-aio-0)
CLIENT_CN="stx-aio-0.corp.interface.tag.ooo"
if [ ! -f client-key.pem ]; then
    echo "Generating Client Cert for $CLIENT_CN..."
    openssl genrsa -out client-key.pem 2048
    openssl req -new -key client-key.pem -out client.csr -subj "/CN=$CLIENT_CN"
    openssl x509 -req -days 365 -in client.csr -CA ca.pem -CAkey ca-key.pem -set_serial 02 -out client-cert.pem
fi

echo "Certificates generated in $CERT_DIR"
chmod 600 *-key.pem

#!/usr/bin/env bash
set -e

echo "🦅 [SWARM] Installing Telco SDKs (Plivo/Telnyx) into AI-Native OroPlatform..."

JUMP_HOST="ubuntu@23.92.79.2"
EDGE_NODE="root@192.168.122.237"
PEM_KEY="/Users/shahroozbhopti/pem/stx-aio-0.pem"
PASS="L_kg2rTsbb*9hDVvBC"

ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no $EDGE_NODE '
echo \"-> Injecting Plivo & Telnyx API SDKs into Symfony Container...\"
docker exec root-oro-application-1 bash -c \"
  composer require plivo/plivo-php
  composer require telnyx/telnyx-php
\"
echo \"✅ [SUCCESS] Telecom SDKs installed. OroPlatform is ready for TTS/SMS integration.\"
'"

#!/bin/bash
# High-Velocity cPanel REST Sync Protocol
# Bypasses restricted SSH over KVM using the STX Proxy matrix

echo "🚀 Booting Sovereign Deploy Pipeline (REST API Matrix)..."
node /Users/shahroozbhopti/Documents/code/scripts/deploy_dist_to_cpanel.js

# Ensure DoR/DoD E2E checks run afterward
echo "Running Playwright headless regression validation..."
npm run test:trading


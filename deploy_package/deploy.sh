#!/bin/bash
set -e

echo "🚀 Deploying Agentic Flow to StarlingX"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r /opt/agentic-flow/requirements.txt

# Install Node.js dependencies for trading
if [ -d /opt/agentic-flow/trading ]; then
  echo "📦 Installing Node.js dependencies..."
  cd /opt/agentic-flow/trading
  npm install --production
  npm run build
  cd /opt/agentic-flow
fi

# Create data directories
mkdir -p /opt/agentic-flow/data/logs
mkdir -p /opt/agentic-flow/data/metrics

# Install systemd services
echo "🔧 Installing systemd services..."
cp /opt/agentic-flow/configs/*.service /etc/systemd/system/
systemctl daemon-reload

# Start services
echo "▶️  Starting services..."
systemctl enable affiliate-api
systemctl start affiliate-api
systemctl enable trading-api
systemctl start trading-api

echo "✅ Deployment complete!"
echo ""
echo "Service status:"
systemctl status affiliate-api --no-pager -l | head -10
systemctl status trading-api --no-pager -l | head -10

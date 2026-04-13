#!/bin/bash
# Deploy agentic-flow-core to StarlingX

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          Deploying to StarlingX (stx-aio-0)                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment (portable checkout)
if [[ -f "$PROJECT_ROOT/.env.yolife" ]]; then
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env.yolife"
else
  echo "❌ Missing $PROJECT_ROOT/.env.yolife"
  exit 1
fi

# Validate configuration
if [ -z "$YOLIFE_STX_HOST" ]; then
    echo "❌ Error: YOLIFE_STX_HOST not set"
    exit 1
fi

if [ ! -f "$YOLIFE_STX_KEY" ]; then
    echo "❌ Error: SSH key not found at $YOLIFE_STX_KEY"
    exit 1
fi

STX_USER="${YOLIFE_STX_USER:-ubuntu}"
STX_HOST="$YOLIFE_STX_HOST"
STX_KEY="$YOLIFE_STX_KEY"
STX_PORT="${YOLIFE_STX_PORTS:-2222}"
STX_PORT="${STX_PORT%%,*}"
DEPLOY_PATH="/home/ubuntu/agentic-flow-core"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Host:        $STX_HOST"
echo "   User:        $STX_USER"
echo "   Port:        $STX_PORT"
echo "   Key:         $STX_KEY"
echo "   Deploy Path: $DEPLOY_PATH"
echo ""

# Step 1: Create deployment package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Creating deployment package"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_ROOT"

# Create tarball (exclude node_modules, .git, test files)
tar -czf agentic-flow-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='typescript-errors.log' \
    src/ docs/ scripts/ package.json package-lock.json tsconfig.json .goalie/

echo "✅ Package created: agentic-flow-deploy.tar.gz ($(du -h agentic-flow-deploy.tar.gz | cut -f1))"
echo ""

# Step 2: Upload package to StarlingX
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Uploading to StarlingX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

scp -i "$STX_KEY" -P "$STX_PORT" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    agentic-flow-deploy.tar.gz \
    ${STX_USER}@${STX_HOST}:/tmp/

echo "✅ Package uploaded to /tmp/agentic-flow-deploy.tar.gz"
echo ""

# Step 3: Extract and setup on remote
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Extracting and setting up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -i "$STX_KEY" -p "$STX_PORT" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    ${STX_USER}@${STX_HOST} <<'ENDSSH'
set -e

# Create directory
mkdir -p /home/ubuntu/agentic-flow-core
cd /home/ubuntu/agentic-flow-core

# Extract
echo "   Extracting package..."
tar -xzf /tmp/agentic-flow-deploy.tar.gz

# Install dependencies (if Node.js available)
if command -v node &> /dev/null; then
    echo "   Installing dependencies..."
    npm install --production
    echo "   ✅ Dependencies installed"
else
    echo "   ⚠️  Node.js not found, skipping npm install"
fi

# Verify deployment
echo ""
echo "   📊 Deployment Verification:"
echo "   ├─ Directory: $(pwd)"
echo "   ├─ Files: $(ls -1 | wc -l) items"
echo "   ├─ Size: $(du -sh . | cut -f1)"
echo "   └─ Timestamp: $(date)"

# Check key files
echo ""
echo "   📁 Key Files:"
[ -f "package.json" ] && echo "   ✅ package.json" || echo "   ❌ package.json missing"
[ -d "src" ] && echo "   ✅ src/" || echo "   ❌ src/ missing"
[ -d "docs" ] && echo "   ✅ docs/" || echo "   ❌ docs/ missing"
[ -d ".goalie" ] && echo "   ✅ .goalie/" || echo "   ❌ .goalie/ missing"

# Check MYM score (if tsx available)
if command -v npx &> /dev/null; then
    echo ""
    echo "   🎯 Running MYM Scoring..."
    npx tsx src/governance/mym-scoring.ts 2>/dev/null || echo "   ⚠️  MYM scoring requires tsx installation"
fi

# Cleanup
rm -f /tmp/agentic-flow-deploy.tar.gz

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Deployment Successful!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📍 Location: ${STX_USER}@${STX_HOST}:${DEPLOY_PATH}"
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. SSH into StarlingX: ssh -i $STX_KEY -p $STX_PORT ${STX_USER}@${STX_HOST}"
    echo "   2. Navigate to: cd ${DEPLOY_PATH}"
    echo "   3. Run MYM scoring: npx tsx src/governance/mym-scoring.ts"
    echo "   4. Start services: bash scripts/launch-visualizations.sh"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Deployment Failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Check SSH connectivity and remote permissions"
    exit 1
fi

# Cleanup local tarball
rm -f agentic-flow-deploy.tar.gz
echo "🧹 Cleaned up local deployment package"
echo ""

#!/bin/bash
# Test agentdb in a clean Docker container

set -e

echo "🐳 Testing agentdb in Docker..."
echo ""

# Create a temporary directory for the test
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Pack the current version
echo "📦 Packing agentdb..."
PACKAGE_PATH=$(npm pack /workspaces/agentic-flow/packages/agentdb 2>&1 | tail -1)

echo "✅ Created package: $PACKAGE_PATH"
echo ""

# Create a test script
cat > test.js << 'EOF'
const { execSync } = require('child_process');

console.log('Testing agentdb commands...\n');

// Test 1: Init command
console.log('1️⃣ Testing init command...');
try {
  execSync('npx agentdb init ./test.db', { stdio: 'inherit' });
  console.log('✅ Init command works\n');
} catch (e) {
  console.error('❌ Init command failed');
  process.exit(1);
}

// Test 2: Benchmark command (should run quick benchmark)
console.log('2️⃣ Testing benchmark command...');
try {
  const output = execSync('npx agentdb benchmark --quick', { stdio: 'pipe' }).toString();
  if (output.includes('✅ Benchmark completed successfully')) {
    console.log('✅ Benchmark works\n');
  } else {
    console.error('❌ Benchmark output unexpected');
    console.error(output);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Benchmark command failed');
  console.error(e.stderr.toString());
  process.exit(1);
}

// Test 3: Help command
console.log('3️⃣ Testing help command...');
try {
  execSync('npx agentdb --help', { stdio: 'inherit' });
  console.log('✅ Help command works\n');
} catch (e) {
  console.error('❌ Help command failed');
  process.exit(1);
}

console.log('\n🎉 All tests passed!');
EOF

# Run test in Docker
echo "🐳 Running tests in Docker (node:20-alpine)..."
echo ""

docker run --rm \
  -v "$PWD/$PACKAGE_PATH:/package.tgz:ro" \
  -v "$PWD/test.js:/test.js:ro" \
  node:20-alpine \
  sh -c "
    npm install -g /package.tgz && \
    node /test.js
  "

EXIT_CODE=$?

# Cleanup
cd /
rm -rf "$TEST_DIR"

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Docker test passed!"
  exit 0
else
  echo ""
  echo "❌ Docker test failed!"
  exit 1
fi

#!/usr/bin/env bash
set -e

echo "🛡️  Starting Security Dependency Check..."

# 1. Node.js Dependency Check
echo ""
echo "📦 Checking Node.js dependencies (npm audit)..."
# We use --audit-level=high to only fail on high/critical, but we show all.
# If audit fails, we capture the exit code but don't exit immediately to allow Python check to run.
set +e
npm audit --audit-level=high
NPM_EXIT_CODE=$?
set -e

if [ $NPM_EXIT_CODE -eq 0 ]; then
    echo "✅ Node.js dependencies are clean (or below high severity)."
else
    echo "⚠️  Node.js vulnerabilities found!"
fi

# 2. Python Dependency Check
echo ""
echo "🐍 Checking Python dependencies (safety check)..."
if command -v safety >/dev/null 2>&1; then
    set +e
    safety check
    PYTHON_EXIT_CODE=$?
    set -e

    if [ $PYTHON_EXIT_CODE -eq 0 ]; then
        echo "✅ Python dependencies are clean."
    else
        echo "⚠️  Python vulnerabilities found!"
    fi
else
    echo "⚠️  'safety' command not found. Skipping Python check."
    echo "   Install with: pip install safety"
    PYTHON_EXIT_CODE=0
fi

# 3. Final Summary
echo ""
echo "📊 Security Check Summary"
echo "-------------------------"

if [ $NPM_EXIT_CODE -ne 0 ] || [ $PYTHON_EXIT_CODE -ne 0 ]; then
    echo "❌ Security checks failed. Please review vulnerabilities above."
    exit 1
else
    echo "✅ All security checks passed."
    exit 0
fi

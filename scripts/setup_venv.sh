#!/bin/bash
set -euo pipefail

echo "🐍 Setting up Python virtual environment..."

# Prefer Python 3.13, fallback to python3
if [ -f "/usr/local/opt/python@3.13/bin/python3.13" ]; then
    PYTHON_BIN="/usr/local/opt/python@3.13/bin/python3.13"
elif command -v python3 &> /dev/null; then
    PYTHON_BIN="python3"
else
    echo "❌ Error: Python 3 not found"
    exit 1
fi

echo "Using: $PYTHON_BIN"

# Create venv if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_BIN -m venv venv
else
    echo "✓ Virtual environment exists"
fi

# Activate and upgrade pip
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1

# Install minimal dependencies
echo "Installing dependencies: psutil, stripe..."
pip install psutil stripe > /dev/null 2>&1

echo "✅ Virtual environment ready at: $(pwd)/venv"
echo ""
echo "To activate:"
echo "  source venv/bin/activate"
echo ""
echo "Python path: $(which python)"

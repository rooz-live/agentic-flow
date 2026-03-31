#!/bin/bash
set -e
echo "Checking for outdated packages..."
npm outdated || true
echo "Updating packages..."
npm update
echo "Dependencies updated."

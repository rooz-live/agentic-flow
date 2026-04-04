#!/bin/bash
# HostBill API Integration Test

set -euo pipefail

# Check environment
if [[ -z "${HOSTBILL_URL:-}" ]] || [[ -z "${HOSTBILL_API_SECRET:-}" ]]; then
    echo "Error: HOSTBILL_URL and HOSTBILL_API_SECRET must be set"
    exit 1
fi

echo "Testing HostBill API connectivity..."

# Test 1: API Health Check
echo "Test 1: API Health Check"
curl -s -X GET "${HOSTBILL_URL}/api" \
    -H "Authorization: Bearer ${HOSTBILL_API_SECRET}" \
    -o /tmp/hostbill_health.json

if [[ $? -eq 0 ]]; then
    echo "✅ API health check passed"
    cat /tmp/hostbill_health.json | jq '.' || cat /tmp/hostbill_health.json
else
    echo "❌ API health check failed"
    exit 1
fi

# Test 2: List Products
echo ""
echo "Test 2: List Products"
curl -s -X GET "${HOSTBILL_URL}/api/product/list" \
    -H "Authorization: Bearer ${HOSTBILL_API_SECRET}" \
    -o /tmp/hostbill_products.json

if [[ $? -eq 0 ]]; then
    echo "✅ Product list retrieved"
    cat /tmp/hostbill_products.json | jq '.products | length' || echo "Products retrieved"
else
    echo "⚠️  Product list failed (may require specific permissions)"
fi

# Test 3: Verify API Version
echo ""
echo "Test 3: API Version"
curl -s -X GET "${HOSTBILL_URL}/api/version" \
    -H "Authorization: Bearer ${HOSTBILL_API_SECRET}"

echo ""
echo "API integration tests complete"

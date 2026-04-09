#!/bin/bash
# Test yo.life API Server endpoints
# Validates authentication, circle equity, and episode retrieval

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

echo -e "${BLUE}🧪 Testing yo.life API Server${NC}"
echo "API Base: $API_BASE"
echo ""

# Helper function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected_status="${4:-200}"
  local auth_header="${5:-}"
  
  echo -n "  Testing $name... "
  
  local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
  
  if [ -n "$auth_header" ]; then
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
  fi
  
  if [ "$method" = "POST" ]; then
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
  fi
  
  local response
  response=$(eval "$curl_cmd '$API_BASE$path'")
  
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status)"
    ((PASSED++))
    if [ -n "$body" ]; then
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
  else
    echo -e "${RED}✗${NC} (Expected $expected_status, got $status)"
    ((FAILED++))
    echo "$body"
  fi
  echo ""
}

# Test 1: Health Check
echo -e "${BLUE}1. Health Check${NC}"
test_endpoint "GET /api/health" "GET" "/api/health" "200"

# Test 2: Login (valid credentials)
echo -e "${BLUE}2. Authentication${NC}"
echo -n "  Testing login with valid credentials... "
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yo.life","password":"admin123"}' \
  "$API_BASE/api/auth/login")

if echo "$LOGIN_RESPONSE" | jq -e '.token' >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
  echo "  Token received: ${TOKEN:0:20}..."
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  echo "$LOGIN_RESPONSE"
  ((FAILED++))
fi
echo ""

# Test 3: Login (invalid credentials)
echo -n "  Testing login with invalid credentials... "
INVALID_LOGIN=$(curl -s -w '\n%{http_code}' -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@yo.life","password":"wrong"}' \
  "$API_BASE/api/auth/login")

INVALID_STATUS=$(echo "$INVALID_LOGIN" | tail -n 1)
if [ "$INVALID_STATUS" = "401" ]; then
  echo -e "${GREEN}✓${NC} (Correctly rejected)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} (Expected 401, got $INVALID_STATUS)"
  ((FAILED++))
fi
echo ""

# Test 4: Circle Equity (public access)
echo -e "${BLUE}3. Circle Equity${NC}"
test_endpoint "GET /api/circles/equity (no auth)" "GET" "/api/circles/equity" "200"

# Test 5: Circle Equity (with auth)
if [ -n "${TOKEN:-}" ]; then
  test_endpoint "GET /api/circles/equity (with auth)" "GET" "/api/circles/equity" "200" "$TOKEN"
fi

# Test 6: Circle Episodes (requires auth)
echo -e "${BLUE}4. Circle Episodes${NC}"
test_endpoint "GET /api/circles/orchestrator/episodes (no auth)" "GET" "/api/circles/orchestrator/episodes" "401"

if [ -n "${TOKEN:-}" ]; then
  test_endpoint "GET /api/circles/orchestrator/episodes (with auth)" "GET" "/api/circles/orchestrator/episodes" "200" "$TOKEN"
fi

# Test 7: ROAM Metrics
echo -e "${BLUE}5. ROAM Metrics${NC}"
test_endpoint "GET /api/roam/metrics" "GET" "/api/roam/metrics" "200"

# Test 8: System Status
echo -e "${BLUE}6. System Status${NC}"
test_endpoint "GET /api/system/status" "GET" "/api/system/status" "200"

# Test 9: 404 Not Found
echo -e "${BLUE}7. Error Handling${NC}"
test_endpoint "GET /api/nonexistent (404)" "GET" "/api/nonexistent" "404"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAILED${NC}"
else
  echo -e "  Failed: $FAILED"
fi
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

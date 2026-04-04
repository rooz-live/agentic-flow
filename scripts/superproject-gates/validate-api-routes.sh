#!/bin/bash

# API Routes Validation
# Validates that ceremony automation API routes are properly defined

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Routes Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ROUTES_FILE="dist/api/ceremony-routes.js"
SERVER_FILE="dist/web/server.js"

# Check if files exist
echo "✓ Checking compiled files..."
if [ ! -f "$ROUTES_FILE" ]; then
  echo "❌ $ROUTES_FILE not found"
  echo "   Run: npm run build"
  exit 1
fi

if [ ! -f "$SERVER_FILE" ]; then
  echo "❌ $SERVER_FILE not found"
  echo "   Run: npm run build"
  exit 1
fi
echo "  ✓ Compiled files exist"
echo ""

# Validate ceremony routes endpoints
echo "✓ Validating ceremony routes..."
EXPECTED_ROUTES=(
  "POST /api/ceremonies/execute"
  "GET /api/ceremonies/history/:circle"
  "POST /api/risks/track"
  "GET /api/risks"
  "GET /api/risks/:id"
  "POST /api/obstacles/track"
  "GET /api/obstacles"
)

FOUND=0
for route in "${EXPECTED_ROUTES[@]}"; do
  if grep -q "$route" "$ROUTES_FILE"; then
    echo "  ✓ $route"
    ((FOUND++))
  else
    echo "  ❌ $route - NOT FOUND"
  fi
done

echo ""
echo "  Found $FOUND/${#EXPECTED_ROUTES[@]} expected routes"
echo ""

# Validate server mounts ceremony routes
echo "✓ Validating server integration..."
if grep -q "ceremony-routes" "$SERVER_FILE"; then
  echo "  ✓ Ceremony routes imported"
else
  echo "  ❌ Ceremony routes not imported"
fi

if grep -q "app.use('/api/ceremonies'" "$SERVER_FILE"; then
  echo "  ✓ /api/ceremonies mounted"
else
  echo "  ❌ /api/ceremonies not mounted"
fi

if grep -q "app.use('/api/risks'" "$SERVER_FILE"; then
  echo "  ✓ /api/risks mounted"
else
  echo "  ❌ /api/risks not mounted"
fi

if grep -q "app.use('/api/obstacles'" "$SERVER_FILE"; then
  echo "  ✓ /api/obstacles mounted"
else
  echo "  ❌ /api/obstacles not mounted"
fi

echo ""

# Validate risk dashboard endpoint
echo "✓ Validating risk dashboard..."
if grep -q "/api/risk-dashboard" "$SERVER_FILE"; then
  echo "  ✓ Risk dashboard endpoint present"
else
  echo "  ❌ Risk dashboard endpoint missing"
fi

echo ""

# Check risk database
echo "✓ Validating risk database..."
if [ -f ".db/risk-traceability.db" ]; then
  echo "  ✓ Risk database exists"
  
  # Count tables
  TABLE_COUNT=$(sqlite3 .db/risk-traceability.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
  echo "  ✓ Database has $TABLE_COUNT tables"
  
  # List tables
  echo ""
  echo "  Database Schema:"
  sqlite3 .db/risk-traceability.db <<SQL
.mode column
.headers on
SELECT name as table_name, 
       (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as indexes
FROM sqlite_master m
WHERE type='table'
ORDER BY name;
SQL
else
  echo "  ❌ Risk database not found"
  echo "     Run: bash scripts/init-risk-db.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Validation Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "API is ready for use. To test live endpoints:"
echo "  1. Start server: npm run start:web"
echo "  2. Run integration test: bash tests/ceremony-api.test.sh"

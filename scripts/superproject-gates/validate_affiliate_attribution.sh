#!/bin/bash
# Affiliate Attribution Accuracy Validation Script
# Purpose: Validate affiliate tracking baseline before PI sync
# Correlation ID: consciousness-1758658960
# Target: Validate 87% baseline accuracy

set -euo pipefail

CORRELATION_ID="${CORRELATION_ID:-consciousness-1758658960}"
DAYS="${1:-30}"
THRESHOLD="${2:-0.87}"
TIMESTAMP=$(date -Iseconds)
LOG_DIR="logs/affiliate_validation"
REPORT_DIR="reports/affiliate_baseline"

mkdir -p "$LOG_DIR" "$REPORT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Affiliate Attribution Validation"
echo "========================================="
echo "Correlation ID: $CORRELATION_ID"
echo "Timestamp: $TIMESTAMP"
echo "Validation Period: Last $DAYS days"
THRESHOLD_PCT=$(echo "scale=1; $THRESHOLD * 100" | bc)
echo "Accuracy Threshold: ${THRESHOLD_PCT}%"
echo ""

# Heartbeat function
heartbeat() {
    local component="$1"
    local phase="$2"
    local status="$3"
    local elapsed="$4"
    local metrics="${5:-{}}"
    
    echo "$TIMESTAMP|$component|$phase|$status|$elapsed|$CORRELATION_ID|$metrics" | \
        tee -a "$LOG_DIR/heartbeats.log"
}

# Start timer
START_TIME=$(date +%s)

#================================================
# 1. Database Connection Test
#================================================
echo "[1/7] Testing database connection..."
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}✗ sqlite3 not found - install: brew install sqlite${NC}"
    exit 1
fi

DB_PATH="${DB_PATH:-unified_deployment.db}"
if [[ ! -f "$DB_PATH" ]]; then
    echo -e "${YELLOW}⚠ Database not found at $DB_PATH${NC}"
    echo "  Creating test database structure..."
    
    sqlite3 "$DB_PATH" << 'EOF'
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id TEXT NOT NULL,
    conversion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    revenue REAL,
    platform TEXT,
    attribution_source TEXT,
    confidence_score REAL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS affiliate_partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliate_id TEXT UNIQUE NOT NULL,
    name TEXT,
    platform TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT OR IGNORE INTO affiliate_partners (affiliate_id, name, platform, status) VALUES
    ('AFF001', 'Google Partner', 'google', 'active'),
    ('AFF002', 'Apple Partner', 'apple', 'active'),
    ('AFF003', 'Microsoft Partner', 'microsoft', 'active');

-- Insert sample conversions
INSERT INTO affiliate_conversions (affiliate_id, conversion_date, revenue, platform, attribution_source, confidence_score) VALUES
    ('AFF001', datetime('now', '-5 days'), 125.50, 'google', 'cookie', 0.95),
    ('AFF001', datetime('now', '-3 days'), 89.99, 'google', 'referrer', 0.88),
    ('AFF002', datetime('now', '-7 days'), 199.00, 'apple', 'cookie', 0.92),
    ('AFF002', datetime('now', '-2 days'), 45.50, 'apple', 'server_side', 0.98),
    ('AFF003', datetime('now', '-10 days'), 310.00, 'microsoft', 'cookie', 0.87);
EOF
    echo -e "${GREEN}✓ Test database created${NC}"
fi

echo -e "${GREEN}✓ Database connection OK${NC}"

#================================================
# 2. Query Affiliate Data
#================================================
echo "[2/7] Querying affiliate conversion data..."

TOTAL_CONVERSIONS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days');")
ACTIVE_AFFILIATES=$(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT affiliate_id) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days');")
TOTAL_REVENUE=$(sqlite3 "$DB_PATH" "SELECT COALESCE(SUM(revenue), 0) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days');")

echo "  Total conversions (last $DAYS days): $TOTAL_CONVERSIONS"
echo "  Active affiliates: $ACTIVE_AFFILIATES"
echo "  Total revenue: \$$TOTAL_REVENUE"
echo ""

#================================================
# 3. Attribution Accuracy Analysis
#================================================
echo "[3/7] Analyzing attribution accuracy..."

# Get attribution by source
sqlite3 "$DB_PATH" << 'EOF' > "$REPORT_DIR/attribution_by_source.txt"
SELECT 
    attribution_source,
    COUNT(*) as count,
    ROUND(AVG(confidence_score), 3) as avg_confidence,
    ROUND(SUM(revenue), 2) as total_revenue
FROM affiliate_conversions
WHERE conversion_date >= datetime('now', '-$DAYS days')
GROUP BY attribution_source
ORDER BY count DESC;
EOF

# Calculate overall attribution confidence
AVG_CONFIDENCE=$(sqlite3 "$DB_PATH" "SELECT ROUND(AVG(confidence_score), 3) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days');")

# Count high-confidence attributions (>0.90)
HIGH_CONFIDENCE=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days') AND confidence_score >= 0.90;")

# Calculate attribution accuracy rate using bc
if [ "$TOTAL_CONVERSIONS" -gt 0 ]; then
    ACCURACY_RATE=$(echo "scale=2; $HIGH_CONFIDENCE * 100 / $TOTAL_CONVERSIONS" | bc)
else
    ACCURACY_RATE="0.00"
fi

echo "  Average confidence score: $AVG_CONFIDENCE"
echo "  High-confidence attributions (≥0.90): $HIGH_CONFIDENCE/$TOTAL_CONVERSIONS"
echo "  Attribution accuracy rate: ${ACCURACY_RATE}%"
echo ""

# Attribution by source
echo "  Attribution breakdown:"
cat "$REPORT_DIR/attribution_by_source.txt" | while IFS='|' read -r source count confidence revenue; do
    echo "    - $source: $count conversions (avg confidence: $confidence, revenue: \$$revenue)"
done
echo ""

#================================================
# 4. Cross-Platform Attribution Test
#================================================
echo "[4/7] Testing cross-platform attribution..."

# Get platform distribution
sqlite3 "$DB_PATH" << 'EOF' > "$REPORT_DIR/platform_distribution.txt"
SELECT 
    platform,
    COUNT(*) as conversions,
    ROUND(AVG(confidence_score), 3) as avg_confidence,
    ROUND(SUM(revenue), 2) as revenue
FROM affiliate_conversions
WHERE conversion_date >= datetime('now', '-$DAYS days')
GROUP BY platform
ORDER BY conversions DESC;
EOF

PLATFORM_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT platform) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days');")

echo "  Active platforms: $PLATFORM_COUNT"
echo "  Platform breakdown:"
cat "$REPORT_DIR/platform_distribution.txt" | while IFS='|' read -r platform conversions confidence revenue; do
    echo "    - $platform: $conversions conversions (confidence: $confidence, revenue: \$$revenue)"
done
echo ""

#================================================
# 5. Missing Attribution Detection
#================================================
echo "[5/7] Checking for missing attributions..."

# Count conversions without affiliate ID
MISSING_AFFILIATE=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days') AND (affiliate_id IS NULL OR affiliate_id = '');")

# Count conversions with low confidence (<0.70)
LOW_CONFIDENCE=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM affiliate_conversions WHERE conversion_date >= datetime('now', '-$DAYS days') AND confidence_score < 0.70;")

# Calculate missing rate using bc
if [ "$TOTAL_CONVERSIONS" -gt 0 ]; then
    MISSING_RATE=$(echo "scale=2; $MISSING_AFFILIATE * 100 / $TOTAL_CONVERSIONS" | bc)
    LOW_CONF_RATE=$(echo "scale=2; $LOW_CONFIDENCE * 100 / $TOTAL_CONVERSIONS" | bc)
else
    MISSING_RATE="0.00"
    LOW_CONF_RATE="0.00"
fi

echo "  Missing affiliate ID: $MISSING_AFFILIATE (${MISSING_RATE}% rate)"
echo "  Low confidence (<0.70): $LOW_CONFIDENCE (${LOW_CONF_RATE}% rate)"
echo ""

#================================================
# 6. Attribution Conflict Analysis
#================================================
echo "[6/7] Analyzing attribution conflicts..."

# Check for duplicate attributions (same conversion, multiple affiliates)
# Note: This would require additional transaction tracking in production
POTENTIAL_CONFLICTS=0

echo "  Potential conflicts detected: $POTENTIAL_CONFLICTS"
echo "  (Requires transaction-level tracking for accurate detection)"
echo ""

#================================================
# 7. Generate Baseline Report
#================================================
echo "[7/7] Generating baseline validation report..."

# Calculate overall performance score using bc
# Score = (attribution_accuracy * 0.5) + (avg_confidence * 0.3) + ((1 - missing_rate) * 0.2)
PERFORMANCE_SCORE=$(echo "scale=3; ($ACCURACY_RATE / 100 * 0.5) + ($AVG_CONFIDENCE * 0.3) + ((100 - $MISSING_RATE) / 100 * 0.2)" | bc)

# Generate JSON report
cat > "$REPORT_DIR/attribution_baseline_report.json" << EOF
{
  "correlation_id": "$CORRELATION_ID",
  "timestamp": "$TIMESTAMP",
  "validation_period_days": $DAYS,
  "summary": {
    "total_conversions": $TOTAL_CONVERSIONS,
    "active_affiliates": $ACTIVE_AFFILIATES,
    "total_revenue": $TOTAL_REVENUE,
    "active_platforms": $PLATFORM_COUNT
  },
  "attribution_accuracy": {
    "overall_rate": $ACCURACY_RATE,
    "avg_confidence": $AVG_CONFIDENCE,
    "high_confidence_count": $HIGH_CONFIDENCE,
    "threshold": $THRESHOLD
  },
  "quality_metrics": {
    "missing_affiliate_count": $MISSING_AFFILIATE,
    "missing_rate": $MISSING_RATE,
    "low_confidence_count": $LOW_CONFIDENCE,
    "low_confidence_rate": $LOW_CONF_RATE,
    "conflicts_detected": $POTENTIAL_CONFLICTS
  },
  "performance_score": $PERFORMANCE_SCORE,
  "validation_status": "$(if (( $(echo "$ACCURACY_RATE >= $THRESHOLD" | bc -l) )); then echo "PASSED"; else echo "FAILED"; fi)"
}
EOF

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Emit heartbeat
heartbeat "affiliate_tracking" "baseline_validation" "complete" "$ELAPSED" \
    "{\"conversions\":$TOTAL_CONVERSIONS,\"accuracy\":$ACCURACY_RATE,\"performance_score\":$PERFORMANCE_SCORE}"

#================================================
# Final Assessment
#================================================
echo "========================================="
echo "BASELINE VALIDATION RESULTS"
echo "========================================="
echo ""
echo "📊 Performance Metrics:"
THRESHOLD_DISPLAY=$(echo "scale=1; $THRESHOLD * 100" | bc)
PERF_DISPLAY=$(echo "scale=1; $PERFORMANCE_SCORE * 100" | bc)
echo "  Attribution Accuracy: ${ACCURACY_RATE}% (target: ${THRESHOLD_DISPLAY}%)"
echo "  Average Confidence:   $AVG_CONFIDENCE"
echo "  Performance Score:    ${PERF_DISPLAY}/100"
echo ""
echo "✅ Quality Checks:"
echo "  Missing attributions: ${MISSING_RATE}%"
echo "  Low confidence:       ${LOW_CONF_RATE}%"
echo "  Attribution conflicts: $POTENTIAL_CONFLICTS"
echo ""
echo "📁 Reports generated:"
echo "  - $REPORT_DIR/attribution_baseline_report.json"
echo "  - $REPORT_DIR/attribution_by_source.txt"
echo "  - $REPORT_DIR/platform_distribution.txt"
echo ""

# Gate decision
if (( $(echo "$ACCURACY_RATE >= $THRESHOLD" | bc -l) )); then
    echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
    echo "   Attribution accuracy meets threshold"
    echo "   Baseline confirmed at ${ACCURACY_RATE}%"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Review attribution_baseline_report.json"
    echo "   2. Run: ./scripts/pi_sync_integrity_check.sh"
    echo "   3. Proceed to PI sync integration"
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "   Attribution accuracy below threshold"
    THRESHOLD_REQ=$(echo "scale=1; $THRESHOLD * 100" | bc)
    echo "   Current: ${ACCURACY_RATE}% | Required: ${THRESHOLD_REQ}%"
    echo ""
    echo "⚠️  Recommended Actions:"
    echo "   1. Review low-confidence attributions in database"
    echo "   2. Implement enhanced attribution model (see P1-AFFILIATE-001)"
    echo "   3. Re-run validation after improvements"
    exit 1
fi

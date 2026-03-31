#!/usr/bin/env bash
# Comprehensive Validator Audit Script
# Discovers, tests, and reports on all validation infrastructure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="/tmp/validator-audit-$(date +%Y%m%d-%H%M%S).md"

echo "# Validator Audit Report" > "$REPORT_FILE"
echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. DISCOVERY PHASE
echo "## 1. Validator Discovery" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### File-Level Validators" >> "$REPORT_FILE"
find "$SCRIPT_DIR/validators" -type f \( -name "*.sh" -o -name "*.py" \) 2>/dev/null | while read -r validator; do
    rel_path="${validator#$SCRIPT_DIR/}"
    size=$(stat -f%z "$validator" 2>/dev/null || stat -c%s "$validator" 2>/dev/null || echo "?")
    echo "- \`$rel_path\` ($size bytes)" >> "$REPORT_FILE"
done
echo "" >> "$REPORT_FILE"

echo "### Project-Level Validators" >> "$REPORT_FILE"
find "$SCRIPT_DIR" -maxdepth 1 -type f -name "*validat*" 2>/dev/null | while read -r validator; do
    rel_path="${validator#$SCRIPT_DIR/}"
    size=$(stat -f%z "$validator" 2>/dev/null || stat -c%s "$validator" 2>/dev/null || echo "?")
    echo "- \`$rel_path\` ($size bytes)" >> "$REPORT_FILE"
done
echo "" >> "$REPORT_FILE"

# 2. STATUS CHECKS
echo "## 2. Validator Status Checks" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check validation-core.sh
echo "### Core Library: validation-core.sh" >> "$REPORT_FILE"
if [ -f "$SCRIPT_DIR/validation-core.sh" ]; then
    version=$(grep "CORE_VERSION=" "$SCRIPT_DIR/validation-core.sh" | head -1 | cut -d'"' -f2)
    echo "- **Status:** ✅ FOUND" >> "$REPORT_FILE"
    echo "- **Version:** $version" >> "$REPORT_FILE"
    echo "- **Sourcing test:**" >> "$REPORT_FILE"
    if source "$SCRIPT_DIR/validation-core.sh" 2>/dev/null; then
        echo "  - ✅ Successfully sourced" >> "$REPORT_FILE"
    else
        echo "  - ❌ Failed to source" >> "$REPORT_FILE"
    fi
else
    echo "- **Status:** ❌ NOT FOUND" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check validation-runner.sh
echo "### Orchestrator: validation-runner.sh" >> "$REPORT_FILE"
if [ -f "$SCRIPT_DIR/validators/file/validation-runner.sh" ]; then
    echo "- **Status:** ✅ FOUND" >> "$REPORT_FILE"
    echo "- **Path:** \`validators/file/validation-runner.sh\`" >> "$REPORT_FILE"
else
    echo "- **Status:** ❌ NOT FOUND" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check GROUND_TRUTH.yaml
echo "### Ground Truth Database" >> "$REPORT_FILE"
if [ -f "$SCRIPT_DIR/validators/GROUND_TRUTH.yaml" ]; then
    lines=$(wc -l < "$SCRIPT_DIR/validators/GROUND_TRUTH.yaml")
    echo "- **Status:** ✅ FOUND" >> "$REPORT_FILE"
    echo "- **Lines:** $lines" >> "$REPORT_FILE"
else
    echo "- **Status:** ❌ NOT FOUND" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# 3. DEPENDENCY CHECKS
echo "## 3. Dependency Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for tool in python3 pip3 jq yq shasum; do
    if command -v "$tool" &>/dev/null; then
        version=$("$tool" --version 2>&1 | head -1 || echo "unknown")
        echo "- ✅ \`$tool\`: $version" >> "$REPORT_FILE"
    else
        echo "- ❌ \`$tool\`: NOT FOUND" >> "$REPORT_FILE"
    fi
done
echo "" >> "$REPORT_FILE"

# Check Python dependencies
echo "### Python Dependencies" >> "$REPORT_FILE"
for pkg in python-dateutil pyyaml; do
    if python3 -c "import ${pkg//-/_}" 2>/dev/null; then
        echo "- ✅ \`$pkg\`: installed" >> "$REPORT_FILE"
    else
        echo "- ❌ \`$pkg\`: MISSING" >> "$REPORT_FILE"
    fi
done
echo "" >> "$REPORT_FILE"

# 4. METRICS SUMMARY
echo "## 4. Metrics Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

total_validators=$(find "$SCRIPT_DIR" -type f \( -name "*validat*.sh" -o -name "*validat*.py" \) 2>/dev/null | wc -l | tr -d ' ')
echo "- **Total validators found:** $total_validators" >> "$REPORT_FILE"

core_exists=0
runner_exists=0
ground_truth_exists=0
[ -f "$SCRIPT_DIR/validation-core.sh" ] && core_exists=1
[ -f "$SCRIPT_DIR/validators/file/validation-runner.sh" ] && runner_exists=1
[ -f "$SCRIPT_DIR/validators/GROUND_TRUTH.yaml" ] && ground_truth_exists=1

total_critical=3
found_critical=$((core_exists + runner_exists + ground_truth_exists))

echo "- **Critical components:** $found_critical/$total_critical" >> "$REPORT_FILE"
echo "- **Coverage:** $(awk "BEGIN {printf \"%.1f\", ($found_critical/$total_critical)*100}")%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 5. RECOMMENDATIONS
echo "## 5. Recommendations" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $core_exists -eq 0 ]; then
    echo "- ❌ **BLOCKER:** validation-core.sh not found - core library missing" >> "$REPORT_FILE"
fi

if [ $runner_exists -eq 0 ]; then
    echo "- ⚠️  **WARNING:** validation-runner.sh not found - orchestration layer missing" >> "$REPORT_FILE"
fi

if [ $ground_truth_exists -eq 0 ]; then
    echo "- ⚠️  **WARNING:** GROUND_TRUTH.yaml not found - semantic validation unavailable" >> "$REPORT_FILE"
fi

if ! python3 -c "import yaml" 2>/dev/null; then
    echo "- ❌ **BLOCKER:** PyYAML not installed - run: \`pip3 install pyyaml\`" >> "$REPORT_FILE"
fi

if ! python3 -c "import dateutil" 2>/dev/null; then
    echo "- ❌ **BLOCKER:** python-dateutil not installed - run: \`pip3 install python-dateutil\`" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "**Report saved to:** \`$REPORT_FILE\`" >> "$REPORT_FILE"

# Output report to terminal
cat "$REPORT_FILE"

echo ""
echo "Full report saved to: $REPORT_FILE"

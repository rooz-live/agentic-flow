#!/bin/bash
# Quick publish script for agentic-flow
# Runs all checks, builds, and publishes to npm
# Author: ruv (@ruvnet)

set -e

echo "🚀 Agentic Flow - Quick Publish Script"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

GOALIE_DIR="$ROOT_DIR/.goalie"
DEPLOY_LOG="$GOALIE_DIR/deployment_log.jsonl"

log_quick_publish_event() {
    local phase="$1"

    mkdir -p "$GOALIE_DIR"

    local ts
    ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    local version
    version=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

    local commit
    commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    {
        printf '{"timestamp":"%s","type":"deployment_event","target":"npm","kind":"quick_publish","status":"%s","version":"%s","commit":"%s"}\n' \
            "$ts" "$phase" "$version" "$commit"
    } >> "$DEPLOY_LOG"
}

preflight_quick_publish() {
    local min_verified_percent="${AF_PROD_PUBLISH_MIN_VERIFIED_PERCENT:-90}"
    local cpu_threshold="${AF_EXECUTOR_CPU_THRESHOLD:-80}"
    local min_disk_gb="${AF_EXECUTOR_MIN_DISK_GB:-5}"

    local retro_file="$GOALIE_DIR/retro_coach.json"
    local verified_percent=0
    if [ -f "$retro_file" ] && command -v jq >/dev/null 2>&1; then
        verified_percent=$(jq -r 'if (.insightsSummary // empty) then
          ((.insightsSummary.verifiedCount // 0) * 100 / (if (.insightsSummary.totalActions // 0) == 0 then 1 else .insightsSummary.totalActions end))
        else 0 end' "$retro_file" 2>/dev/null || echo 0)
    fi

    local blocked=0
    local reasons=()

    if [ "$verified_percent" -lt "$min_verified_percent" ]; then
        blocked=1
        reasons+=("verified-rate-below-threshold")
    fi

    local incidents_log="$ROOT_DIR/logs/governor_incidents.jsonl"
    local incidents=0
    if [ -f "$incidents_log" ]; then
        incidents=$(wc -l < "$incidents_log" | tr -d ' ')
        if [ "$incidents" -gt 0 ]; then
            blocked=1
            reasons+=("recent-governor-incidents")
        fi
    fi

    local cpu_pct=0
    local load cores
    load=$(uptime 2>/dev/null | awk -F'load averages?: ' '{print $2}' | awk '{print $1}' 2>/dev/null || echo 0)
    cores=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)
    cpu_pct=$(awk "BEGIN { if ($cores <= 0) print 0; else printf \"%d\", ($load / $cores) * 100 }" 2>/dev/null || echo 0)

    if [ "$cpu_threshold" -gt 0 ] && [ "$cpu_pct" -gt "$cpu_threshold" ]; then
        blocked=1
        reasons+=("cpu-above-threshold")
    fi

    local free_disk_gb=0
    local df_line
    df_line=$(df -k "$ROOT_DIR" | tail -1 || echo "")
    if [ -n "$df_line" ]; then
        local avail_kb
        avail_kb=$(echo "$df_line" | awk '{print $4}' 2>/dev/null || echo 0)
        free_disk_gb=$(awk "BEGIN { printf \"%d\", $avail_kb / (1024*1024) }" 2>/dev/null || echo 0)
    fi

    if [ "$free_disk_gb" -lt "$min_disk_gb" ]; then
        blocked=1
        reasons+=("low-disk-space")
    fi

    if [ "$blocked" -eq 1 ]; then
        echo "Quick publish blocked by preflight checks (reasons: ${reasons[*]})"
        log_quick_publish_event "blocked"
        return 1
    fi

    log_quick_publish_event "preflight_ok"
    return 0
}

cd "$ROOT_DIR"

# Parse arguments
DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--skip-tests] [--skip-build]"
            exit 1
            ;;
    esac
done

if ! preflight_quick_publish; then
    exit 1
fi

log_quick_publish_event "started"

# 1. Verify package
echo -e "${BLUE}▶ Step 1: Verifying package...${NC}"
if [ -f "$SCRIPT_DIR/verify-package.sh" ]; then
    bash "$SCRIPT_DIR/verify-package.sh"
else
    echo -e "${YELLOW}⚠️  verify-package.sh not found, skipping...${NC}"
fi
echo ""

# 2. Run linter
echo -e "${BLUE}▶ Step 2: Running linter...${NC}"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting not configured or failed${NC}"
fi
echo ""

# 3. Run type checking
echo -e "${BLUE}▶ Step 3: Running TypeScript type checking...${NC}"
if npm run typecheck 2>/dev/null; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type checking not configured or failed${NC}"
fi
echo ""

# 4. Build packages
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}▶ Step 4: Building packages...${NC}"
    if [ -f "$SCRIPT_DIR/build-all.sh" ]; then
        bash "$SCRIPT_DIR/build-all.sh"
    else
        npm run build
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping build step${NC}"
    echo ""
fi

# 5. Run tests
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}▶ Step 5: Running tests...${NC}"
    if npm test 2>/dev/null; then
        echo -e "${GREEN}✓ Tests passed${NC}"
        log_quick_publish_event "tests_passed"
    else
        echo -e "${YELLOW}⚠️  Tests not configured or failed${NC}"
        log_quick_publish_event "tests_failed"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}"
    log_quick_publish_event "tests_skipped"
    echo ""
fi

# 6. Show what will be published
echo -e "${BLUE}▶ Step 6: Package contents preview...${NC}"
npm pack --dry-run
echo ""

# 7. Confirm publication
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📦 Dry run mode - not publishing${NC}"
    echo ""
    echo "To actually publish, run without --dry-run:"
    echo "  bash $0"
    log_quick_publish_event "dry_run"
    exit 0
fi

# Get version
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)

echo -e "${YELLOW}❓ Ready to publish version ${VERSION} to npm?${NC}"
read -p "   Continue? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "❌ Publish cancelled"
    log_quick_publish_event "cancelled"
    exit 1
fi

# 8. Publish to npm
echo -e "${BLUE}▶ Step 7: Publishing to npm...${NC}"
if npm publish; then
    log_quick_publish_event "published_success"
else
    echo -e "${RED}8 npm publish failed${NC}"
    log_quick_publish_event "published_failed"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Successfully published agentic-flow@${VERSION}!${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Create GitHub release:"
echo "      git tag v${VERSION}"
echo "      git push origin v${VERSION}"
echo "      gh release create v${VERSION}"
echo ""
echo "   2. Verify on npmjs.com:"
echo "      https://www.npmjs.com/package/agentic-flow"
echo ""
echo "   3. Test installation:"
echo "      npm install -g agentic-flow@${VERSION}"
echo "      agentic-flow --version"

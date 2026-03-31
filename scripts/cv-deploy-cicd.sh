#!/usr/bin/env bash
# cv-deploy-cicd.sh
# Purpose: Build, Measure, and Learn loop for Agentic Resume deployment.
# CI/CD Pipeline: Build → Measure → Learning

set -e

# Configuration
DOCS_DIR="docs/cv"
BUILD_DIR="${DOCS_DIR}/build"
METRICS_FILE=".goalie/cv_deploy_metrics.jsonl"
RESUME_SRC="${DOCS_DIR}/CV_RESUME_UPGRADE_2026.md"

# Output filenames
PDF_OUTPUT="${BUILD_DIR}/CV_2026.pdf"
DOCX_OUTPUT="${BUILD_DIR}/CV_2026.docx"

# Defaults
CPANEL_PORT=${CPANEL_PORT:-2083}
CPANEL_SERVICE=${CPANEL_SERVICE:-cpanel} # 'cpanel' or 'whm'

# URLs to verify (from CV document)
URLS=(
    "https://cv.rooz.live"
    "https://cv.rooz.live/credly"
    "https://cal.rooz.live"
)

# Load environment safely
if [ -f .env ]; then
    set +e
    set -a
    while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        line="${line%%#*}"  # strip inline comments
        eval "$line" 2>/dev/null
    done < .env
    set +a
    set -e
fi

mkdir -p "$BUILD_DIR"
mkdir -p ".goalie"
mkdir -p "$DOCS_DIR"

# Logging function
log_metric() {
    local phase=$1
    local status=$2
    local message=$3
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "{\"timestamp\": \"$timestamp\", \"phase\": \"$phase\", \"status\": \"$status\", \"message\": \"$message\"}" >> "$METRICS_FILE"
}

# Build Phase: Export markdown to PDF and DOCX
cmd_build() {
    echo "=========================================="
    echo "Phase: BUILD"
    echo "=========================================="
    local build_start=$(date +%s)

    # Check source file exists
    if [ ! -f "$RESUME_SRC" ]; then
        echo "❌ Error: Source file not found: $RESUME_SRC"
        log_metric "build" "fail" "source_not_found:$RESUME_SRC"
        return 1
    fi

    echo "📄 Source: $RESUME_SRC"
    echo "📁 Output: $BUILD_DIR"

    # Check for pandoc
    if ! command -v pandoc &> /dev/null; then
        echo "❌ Error: pandoc not found. Install with: brew install pandoc"
        log_metric "build" "fail" "pandoc_missing"
        return 1
    fi

    echo "✅ pandoc found: $(pandoc --version | head -n 1)"

    # Generate DOCX
    echo ""
    echo "🔄 Generating DOCX..."
    if pandoc "$RESUME_SRC" -o "$DOCX_OUTPUT"; then
        echo "✅ DOCX generated: $DOCX_OUTPUT"
        docx_size=$(stat -f%z "$DOCX_OUTPUT" 2>/dev/null || stat -c%s "$DOCX_OUTPUT" 2>/dev/null)
        echo "   Size: $docx_size bytes"
    else
        echo "❌ Failed to generate DOCX"
        log_metric "build" "fail" "docx_generation_failed"
        return 1
    fi

    # Generate PDF
    echo ""
    echo "🔄 Generating PDF..."
    local pdf_engine=""

    if command -v weasyprint &> /dev/null; then
        pdf_engine="weasyprint"
    elif command -v wkhtmltopdf &> /dev/null; then
        pdf_engine="wkhtmltopdf"
    elif command -v pdflatex &> /dev/null; then
        pdf_engine="pdflatex"
    elif command -v rsvg-convert &> /dev/null; then
        pdf_engine="rsvg-convert"
    fi

    if [ -n "$pdf_engine" ]; then
        echo "   Using PDF engine: $pdf_engine"
        if pandoc "$RESUME_SRC" -o "$PDF_OUTPUT" --pdf-engine="$pdf_engine" 2>/dev/null; then
            echo "✅ PDF generated: $PDF_OUTPUT"
            pdf_size=$(stat -f%z "$PDF_OUTPUT" 2>/dev/null || stat -c%s "$PDF_OUTPUT" 2>/dev/null)
            echo "   Size: $pdf_size bytes"
        else
            echo "⚠️  PDF generation failed, but continuing..."
            log_metric "build" "warn" "pdf_generation_failed"
        fi
    else
        echo "⚠️  No PDF engine found (weasyprint/wkhtmltopdf/pdflatex/rsvg-convert)"
        echo "   Install with: brew install weasyprint"
        log_metric "build" "warn" "no_pdf_engine"
    fi

    # List build artifacts
    echo ""
    echo "📦 Build artifacts:"
    ls -lh "$BUILD_DIR"/CV_2026.* 2>/dev/null || echo "   No artifacts found"

    local build_end=$(date +%s)
    local build_duration=$((build_end - build_start))
    echo ""
    echo "⏱️  Build completed in ${build_duration}s"

    log_metric "build" "success" "artifacts_created:${build_duration}s"
    return 0
}

# Measure Phase: URL Health Check
cmd_measure_urls() {
    echo ""
    echo "=========================================="
    echo "Phase: MEASURE - URL Health Check"
    echo "=========================================="

    local total_urls=${#URLS[@]}
    local healthy_urls=0
    local unhealthy_urls=0
    local url_results=()

    echo "Checking $total_urls URLs..."
    echo ""

    for url in "${URLS[@]}"; do
        echo -n "🔍 $url ... "

        # Get HTTP status code
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null)

        if [[ "$http_code" == "200" || "$http_code" == "301" || "$http_code" == "302" ]]; then
            echo "✅ $http_code OK"
            healthy_urls=$((healthy_urls + 1))
            url_results+=("$url:$http_code")
        elif [ -n "$http_code" ]; then
            echo "⚠️  HTTP $http_code"
            unhealthy_urls=$((unhealthy_urls + 1))
            url_results+=("$url:$http_code")
        else
            echo "❌ Connection failed"
            unhealthy_urls=$((unhealthy_urls + 1))
            url_results+=("$url:failed")
        fi
    done

    echo ""
    echo "📊 URL Health Summary:"
    echo "   Total: $total_urls"
    echo "   Healthy: $healthy_urls"
    echo "   Unhealthy: $unhealthy_urls"

    if [ "$healthy_urls" -eq "$total_urls" ]; then
        log_metric "measure" "success" "url_health:${healthy_urls}/${total_urls}_healthy"
        return 0
    else
        log_metric "measure" "warn" "url_health:${healthy_urls}/${total_urls}_healthy"
        return 1
    fi
}

# Measure Phase: cPanel API Validation
cmd_measure_cpanel() {
    echo ""
    echo "=========================================="
    echo "Phase: MEASURE - cPanel API Validation"
    echo "=========================================="

    # Check required environment variables
    if [ -z "$CPANEL_API_TOKEN" ]; then
        echo "❌ Error: CPANEL_API_TOKEN not set"
        echo "   Add to .env: CPANEL_API_TOKEN=your_token"
        log_metric "measure" "fail" "cpanel_api_token_missing"
        return 1
    fi

    if [ -z "$CPANEL_USER" ]; then
        echo "❌ Error: CPANEL_USER not set"
        echo "   Add to .env: CPANEL_USER=your_username"
        log_metric "measure" "fail" "cpanel_user_missing"
        return 1
    fi

    if [ -z "$CPANEL_HOST" ]; then
        echo "❌ Error: CPANEL_HOST not set"
        echo "   Add to .env: CPANEL_HOST=cpanel.rooz.live"
        log_metric "measure" "fail" "cpanel_host_missing"
        return 1
    fi

    echo "🔑 Configuration:"
    echo "   Host: $CPANEL_HOST"
    echo "   Port: $CPANEL_PORT"
    echo "   User: $CPANEL_USER"
    echo "   Service: $CPANEL_SERVICE"
    echo ""

    # Test SSL connection first
    echo "🔌 Testing SSL connection..."
    if curl -k --connect-timeout 5 -s -I "https://${CPANEL_HOST}:${CPANEL_PORT}" &>/dev/null; then
        echo "✅ SSL connection OK"
    else
        echo "❌ SSL connection failed"
        log_metric "measure" "fail" "cpanel_ssl_failed"
        return 1
    fi

    # Test API authentication
    echo ""
    echo "🔐 Testing API authentication..."
    # Use UAPI (user-level) instead of WHM json-api (admin-level)
    local endpoint="execute/Fileman/list_files?dir=%2Fpublic_html&types=file"
    local response=$(curl -k -s -H "Authorization: cpanel $CPANEL_USER:$CPANEL_API_TOKEN" \
        "https://${CPANEL_HOST}:${CPANEL_PORT}/$endpoint" 2>/dev/null)

    # Check for valid JSON response
    if echo "$response" | jq -e '.' >/dev/null 2>&1; then
        echo "✅ API returned valid JSON"

        # Check for UAPI success status
        local api_status=$(echo "$response" | jq -r '.status // .result // empty' 2>/dev/null)
        if [[ "$api_status" == "1" ]] || echo "$response" | jq -e '.data' >/dev/null 2>&1; then
            local file_count=$(echo "$response" | jq -r '.data | length' 2>/dev/null || echo "0")
            echo "✅ API authenticated — $file_count file(s) in public_html"

            # Show files if any
            if [ "$file_count" -gt 0 ] 2>/dev/null; then
                echo ""
                echo "📋 Files in public_html:"
                echo "$response" | jq -r '.data[]? | "   \(.file // .name)"' 2>/dev/null | head -5
            fi

            log_metric "measure" "success" "cpanel_api_valid:${file_count}_files"
            return 0
        else
            echo "⚠️  API response valid but unexpected format"
            echo "   Response: $(echo "$response" | head -c 200)..."
            log_metric "measure" "warn" "cpanel_api_unexpected_format"
            return 1
        fi
    else
        # Check for HTML response (authentication failure)
        if echo "$response" | grep -qi "<html"; then
            echo "❌ Authentication failed (returned HTML login page)"
            echo "   Check CPANEL_USER and CPANEL_API_TOKEN"
            log_metric "measure" "fail" "cpanel_auth_failed"
        elif echo "$response" | grep -qi "access denied"; then
            echo "❌ Access denied"
            echo "   Token may lack permissions"
            log_metric "measure" "fail" "cpanel_access_denied"
        else
            echo "❌ Invalid response from API"
            echo "   Response: $(echo "$response" | head -c 200)..."
            log_metric "measure" "fail" "cpanel_invalid_response"
        fi
        return 1
    fi
}

# Combined Measure Phase
cmd_measure() {
    cmd_measure_urls
    local url_status=$?

    cmd_measure_cpanel
    local cpanel_status=$?

    if [ $url_status -eq 0 ] && [ $cpanel_status -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Learning Phase: Log deployment metrics
cmd_learning() {
    echo ""
    echo "=========================================="
    echo "Phase: LEARNING"
    echo "=========================================="

    if [ ! -f "$METRICS_FILE" ]; then
        echo "📝 No metrics file found. Creating new one..."
        touch "$METRICS_FILE"
    fi

    # Generate learning summary
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local entry_count=$(wc -l < "$METRICS_FILE" 2>/dev/null || echo "0")

    echo "📊 Metrics File: $METRICS_FILE"
    echo "📈 Total Entries: $entry_count"
    echo ""

    if [ "$entry_count" -gt 0 ]; then
        echo "📋 Recent Entries (last 5):"
        echo "----------------------------------------"
        tail -n 5 "$METRICS_FILE" | while IFS= read -r line; do
            echo "$line" | jq -r '[.timestamp, .phase, .status, .message] | @tsv' 2>/dev/null || echo "$line"
        done
        echo "----------------------------------------"
    else
        echo "📝 No entries yet. Run 'build' or 'measure' to generate metrics."
    fi

    # Summary statistics
    echo ""
    echo "📊 Phase Summary:"
    if [ "$entry_count" -gt 0 ]; then
        echo "   Build:   $(grep -c '"phase": "build"' "$METRICS_FILE" 2>/dev/null || echo "0") entries"
        echo "   Measure: $(grep -c '"phase": "measure"' "$METRICS_FILE" 2>/dev/null || echo "0") entries"
        echo "   Deploy:  $(grep -c '"phase": "deploy"' "$METRICS_FILE" 2>/dev/null || echo "0") entries"
    fi

    return 0
}

# Diagnose Phase: Debug configuration
cmd_diagnose() {
    echo ""
    echo "=========================================="
    echo "Phase: DIAGNOSE"
    echo "=========================================="

    echo "🔧 Configuration:"
    echo "   DOCS_DIR: $DOCS_DIR"
    echo "   BUILD_DIR: $BUILD_DIR"
    echo "   METRICS_FILE: $METRICS_FILE"
    echo "   RESUME_SRC: $RESUME_SRC"
    echo ""

    echo "🔑 cPanel Configuration:"
    echo "   CPANEL_HOST: ${CPANEL_HOST:-<not set>}"
    echo "   CPANEL_PORT: ${CPANEL_PORT:-2083}"
    echo "   CPANEL_USER: ${CPANEL_USER:-<not set>}"
    echo "   CPANEL_SERVICE: ${CPANEL_SERVICE:-cpanel}"
    echo "   CPANEL_API_TOKEN: ${CPANEL_API_TOKEN:+<set>}${CPANEL_API_TOKEN:-<not set>}"
    echo ""

    echo "🛠️  Tool Availability:"
    command -v pandoc >/dev/null && echo "   pandoc: ✅ $(pandoc --version | head -n 1)" || echo "   pandoc: ❌ not found"
    command -v curl >/dev/null && echo "   curl: ✅ $(curl --version | head -n 1)" || echo "   curl: ❌ not found"
    command -v jq >/dev/null && echo "   jq: ✅ $(jq --version)" || echo "   jq: ❌ not found"
    command -v wkhtmltopdf >/dev/null && echo "   wkhtmltopdf: ✅" || echo "   wkhtmltopdf: ❌ not found"
    command -v pdflatex >/dev/null && echo "   pdflatex: ✅" || echo "   pdflatex: ❌ not found"
    echo ""

    echo "📁 File Status:"
    [ -f "$RESUME_SRC" ] && echo "   RESUME_SRC: ✅ exists" || echo "   RESUME_SRC: ❌ not found"
    [ -d "$BUILD_DIR" ] && echo "   BUILD_DIR: ✅ exists" || echo "   BUILD_DIR: ❌ not found"
    [ -f "$METRICS_FILE" ] && echo "   METRICS_FILE: ✅ exists ($(wc -l < "$METRICS_FILE") entries)" || echo "   METRICS_FILE: ❌ not found"
    echo ""

    echo "📦 Build Artifacts:"
    if [ -d "$BUILD_DIR" ]; then
        ls -lh "$BUILD_DIR"/CV_2026.* 2>/dev/null || echo "   No artifacts found"
    else
        echo "   Build directory not found"
    fi
}

# Deploy Phase (optional)
cmd_deploy() {
    echo ""
    echo "=========================================="
    echo "Phase: DEPLOY"
    echo "=========================================="

    if [ -z "$CPANEL_API_TOKEN" ] || [ -z "$CPANEL_USER" ]; then
        echo "❌ Error: CPANEL credentials missing."
        echo "   Set CPANEL_API_TOKEN and CPANEL_USER in .env"
        log_metric "deploy" "fail" "credentials_missing"
        return 1
    fi

    local target_dir="public_html"
    echo "📤 Deploying to ${CPANEL_HOST}:${target_dir}..."

    local uploaded=0
    local failed=0

    for file in "${BUILD_DIR}"/CV_2026.*; do
        [ -e "$file" ] || continue
        filename=$(basename "$file")
        echo ""
        echo "📤 Uploading $filename..."

        # cPanel UAPI Fileman::upload_files
        response=$(curl -k -s -X POST \
            -H "Authorization: cpanel $CPANEL_USER:$CPANEL_API_TOKEN" \
            -F "dir=$target_dir" \
            -F "file-1=@$file" \
            "https://${CPANEL_HOST}:2083/execute/Fileman/upload_files" 2>/dev/null)

        if echo "$response" | grep -q "success"; then
            echo "✅ Uploaded $filename"
            uploaded=$((uploaded + 1))
        else
            echo "❌ Failed to upload $filename"
            echo "   Response: $(echo "$response" | head -c 200)..."
            failed=$((failed + 1))
            log_metric "deploy" "fail" "upload_fail:$filename"
        fi
    done

    echo ""
    echo "📊 Deployment Summary:"
    echo "   Uploaded: $uploaded"
    echo "   Failed: $failed"

    if [ $failed -eq 0 ] && [ $uploaded -gt 0 ]; then
        log_metric "deploy" "success" "uploaded_${uploaded}_files"
        return 0
    else
        log_metric "deploy" "fail" "uploaded_${uploaded}_failed_${failed}"
        return 1
    fi
}

# Main Dispatch
case "$1" in
    build)
        cmd_build
        ;;
    measure)
        cmd_measure
        ;;
    measure-urls)
        cmd_measure_urls
        ;;
    measure-cpanel)
        cmd_measure_cpanel
        ;;
    learning)
        cmd_learning
        ;;
    deploy)
        cmd_deploy
        ;;
    diagnose)
        cmd_diagnose
        ;;
    all)
        cmd_build || true
        cmd_measure || true
        cmd_learning
        ;;
    deploy-all)
        cmd_build
        cmd_deploy
        cmd_measure
        cmd_learning
        ;;
    *)
        echo "CV Deployment CI/CD Pipeline"
        echo ""
        echo "Usage: $0 {build|measure|measure-urls|measure-cpanel|learning|deploy|diagnose|all|deploy-all}"
        echo ""
        echo "Commands:"
        echo "  build          - Build phase: Export markdown to PDF and DOCX"
        echo "  measure        - Measure phase: URL health + cPanel API validation"
        echo "  measure-urls   - URL health check only"
        echo "  measure-cpanel - cPanel API validation only"
        echo "  learning       - Learning phase: Show deployment metrics"
        echo "  deploy         - Deploy phase: Upload artifacts to cPanel"
        echo "  diagnose       - Diagnose: Show configuration and tool status"
        echo "  all            - Run build + measure + learning"
        echo "  deploy-all     - Run build + deploy + measure + learning"
        echo ""
        echo "Environment Variables:"
        echo "  CPANEL_HOST     - cPanel host (e.g., cpanel.rooz.live)"
        echo "  CPANEL_USER     - cPanel username"
        echo "  CPANEL_API_TOKEN - cPanel API token"
        echo "  CPANEL_PORT     - cPanel port (default: 2083)"
        echo ""
        exit 1
        ;;
esac

#!/usr/bin/env bash
#
# comprehensive_validation_suite.sh
# Purpose: Comprehensive weighted validation suite for M6 gate
# Correlation ID: consciousness-1758658960
# Gate passes only when overall health ≥ 99.9%
#

set -euo pipefail

# ============================================================================
# CONSTANTS
# ============================================================================

readonly CORRELATION_ID="consciousness-1758658960"
readonly COMPONENT="comprehensive_validation_suite"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Domain list
readonly DOMAINS=(
    "interface.artchat.art"
    "interface.o-gov.com"
    "interface.rooz.live"
    "interface.tag.ooo"
    "interface.tag.vote"
    "interface.cuddleball.art"
    "interface.grlf.earth"
    "interface.mbo.bio"
    "interface.sali.fun"
)

# Test configuration
readonly SAMPLES=20
readonly M6_THRESHOLD=99.9

# Weights (must sum to 1.0)
readonly DNS_W=0.20
readonly HTTPS_W=0.20
readonly HSTS_W=0.15
readonly HEALTH_W=0.15
readonly BLUEGREEN_W=0.20
readonly APPRESP_W=0.10

# ============================================================================
# SAFE ARRAY HELPERS
# ============================================================================

# Safe helpers for arrays under `set -euo pipefail`
array_len() {
    # Usage: array_len array_name
    # Returns the length of the array if it exists, else 0
    local __name="$1"
    if declare -p "$__name" >/dev/null 2>&1; then
        eval "echo \${#${__name}[@]}"
    else
        echo 0
    fi
}

# ============================================================================
# HEARTBEAT UTILITY
# ============================================================================

heartbeat() {
    local phase="$1"
    local status="$2"
    local start_time="$3"
    local metrics="${4:-}"
    
    local elapsed=$((SECONDS - start_time))
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics"
    if [[ -d "$SCRIPT_DIR/logs" ]]; then
        echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics" >> "$SCRIPT_DIR/logs/heartbeats.log"
    fi
}

# ============================================================================
# ERROR TRAP
# ============================================================================

trap 'heartbeat "error_trap" "ERROR" "$SECONDS" "line=$LINENO"' ERR

# ============================================================================
# TEST: DNS RESOLUTION
# ============================================================================

test_dns_resolution() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 1/6: DNS Resolution (Weight: 20%)"
    echo "=========================================="
    
    heartbeat "dns_resolution" "START" "$test_start" ""
    
    local success=0
    local total=${#DOMAINS[@]}
    
    for domain in "${DOMAINS[@]}"; do
        # Try dig first
        if command -v dig &>/dev/null; then
            if dig +short A "$domain" 2>/dev/null | grep -qE '^[0-9.]+$'; then
                echo "✓ DNS: $domain"
                ((success++))
                continue
            fi
        fi
        
        # Fallback to host
        if command -v host &>/dev/null; then
            if host "$domain" 2>/dev/null | grep -q "has address"; then
                echo "✓ DNS: $domain"
                ((success++))
                continue
            fi
        fi
        
        # Fallback to nslookup
        if command -v nslookup &>/dev/null; then
            if nslookup "$domain" 2>/dev/null | grep -qE '^Address: [0-9.]+$'; then
                echo "✓ DNS: $domain"
                ((success++))
                continue
            fi
        fi
        
        echo "✗ DNS: $domain"
    done
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success / $total}")
    echo "DNS Resolution: $success / $total (ratio: $ratio)"
    
    heartbeat "dns_resolution" "OK" "$test_start" "success=$success,total=$total,ratio=$ratio"
    echo "$ratio"
}

# ============================================================================
# TEST: HTTPS CONNECTIVITY
# ============================================================================

test_https_connectivity() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 2/6: HTTPS Connectivity (Weight: 20%)"
    echo "=========================================="
    
    heartbeat "https_connectivity" "START" "$test_start" ""
    
    local success=0
    local total=${#DOMAINS[@]}
    local latencies=()
    
    for domain in "${DOMAINS[@]}"; do
        local response
        local latency
        
        response=$(curl -s -I -m 5 -w "\nTIME_TOTAL:%{time_total}" "https://$domain" 2>/dev/null || echo "")
        
        if echo "$response" | head -1 | grep -qE "HTTP.* (200|201|202|204|301|302|303|307|308)"; then
            latency=$(echo "$response" | grep "TIME_TOTAL:" | cut -d: -f2)
            latencies+=("$latency")
            echo "✓ HTTPS: $domain (${latency}s)"
            ((success++))
        else
            echo "✗ HTTPS: $domain"
        fi
    done
    
    # Calculate p95 latency
    local p95_ms=0
    if [[ ${#latencies[@]} -gt 0 ]]; then
        local sorted_latencies=($(printf '%s\n' "${latencies[@]}" | sort -n))
        local p95_index=$(( ${#sorted_latencies[@]} * 95 / 100 ))
        local p95=$(echo "${sorted_latencies[$p95_index]}" | awk '{printf "%.3f", $1}')
        p95_ms=$(echo "$p95 * 1000" | bc)
    fi
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success / $total}")
    echo "HTTPS Connectivity: $success / $total (ratio: $ratio, p95: ${p95_ms}ms)"
    
    heartbeat "https_connectivity" "OK" "$test_start" "success=$success,total=$total,ratio=$ratio,p95_ms=$p95_ms"
    echo "$ratio"
}

# ============================================================================
# TEST: HSTS HEADERS
# ============================================================================

test_hsts_headers() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 3/6: HSTS Headers (Weight: 15%)"
    echo "=========================================="
    
    heartbeat "hsts_headers" "START" "$test_start" ""
    
    local success=0
    local total=${#DOMAINS[@]}
    
    for domain in "${DOMAINS[@]}"; do
        if curl -s -I -m 5 "https://$domain" 2>/dev/null | grep -qi "Strict-Transport-Security.*max-age"; then
            echo "✓ HSTS: $domain"
            ((success++))
        else
            echo "✗ HSTS: $domain"
        fi
    done
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success / $total}")
    echo "HSTS Headers: $success / $total (ratio: $ratio)"
    
    heartbeat "hsts_headers" "OK" "$test_start" "success=$success,total=$total,ratio=$ratio"
    echo "$ratio"
}

# ============================================================================
# TEST: HEALTH ENDPOINTS
# ============================================================================

test_health_endpoints() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 4/6: Health Endpoints (Weight: 15%)"
    echo "=========================================="
    
    heartbeat "health_endpoints" "START" "$test_start" ""
    
    local success=0
    local total=${#DOMAINS[@]}
    
    for domain in "${DOMAINS[@]}"; do
        local response
        response=$(curl -s -m 5 "https://$domain/healthz" 2>/dev/null || echo "")
        
        if echo "$response" | grep -q "OK"; then
            echo "✓ Health: $domain"
            ((success++))
        else
            echo "✗ Health: $domain"
        fi
    done
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success / $total}")
    echo "Health Endpoints: $success / $total (ratio: $ratio)"
    
    heartbeat "health_endpoints" "OK" "$test_start" "success=$success,total=$total,ratio=$ratio"
    echo "$ratio"
}

# ============================================================================
# TEST: BLUE-GREEN SAMPLING
# ============================================================================

test_bluegreen_sampling() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 5/6: Blue-Green Sampling (Weight: 20%)"
    echo "=========================================="
    echo "Running $SAMPLES samples per domain..."
    
    heartbeat "bluegreen_sampling" "START" "$test_start" ""
    
    local total_samples=0
    local success_samples=0
    declare -A backends
    declare -A content_hashes
    
    for domain in "${DOMAINS[@]}"; do
        local domain_success=0
        
        for ((i=1; i<=SAMPLES; i++)); do
            ((total_samples++))
            
            local response
            response=$(curl -s -m 5 -D - "https://$domain/" 2>/dev/null || echo "")
            
            # Check HTTP status
            if echo "$response" | head -1 | grep -qE "HTTP.* (200|201|202|204|301|302|303|307|308)"; then
                ((domain_success++))
                ((success_samples++))
                
                # Try to detect backend markers
                local backend
                backend=$(echo "$response" | grep -iE "^(X-Backend|X-Deployment|X-Canary|X-Upstream|Via):" | head -1 | cut -d: -f2- | tr -d '[:space:]' || echo "")
                
                if [[ -n "$backend" ]]; then
                    backends["$domain|$backend"]=$((${backends["$domain|$backend"]:-0} + 1))
                else
                    # Fallback: hash response body
                    local body_hash
                    body_hash=$(printf '%s\n' "$response" | awk 'BEGIN{inbody=0} {sub(/\r$/,""); if (inbody) print; else if ($0=="") inbody=1}' | shasum -a 256 | cut -d' ' -f1 | cut -c1-8)
                    content_hashes["$domain|$body_hash"]=$((${content_hashes["$domain|$body_hash"]:-0} + 1))
                fi
            fi
        done
        
        echo "  $domain: $domain_success / $SAMPLES samples succeeded"
    done
    
    # Report backend distribution if detected
    if (( $(array_len backends) > 0 )); then
        echo ""
        echo "Backend distribution detected:"
        for key in "${!backends[@]}"; do
            echo "  $key: ${backends[$key]} requests"
        done
    fi
    
    if (( $(array_len content_hashes) > 0 )); then
        echo ""
        echo "Content variant distribution:"
        for key in "${!content_hashes[@]}"; do
            echo "  $key: ${content_hashes[$key]} requests"
        done
    fi
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success_samples / $total_samples}")
    echo ""
    echo "Blue-Green Sampling: $success_samples / $total_samples (ratio: $ratio)"
    
    heartbeat "bluegreen_sampling" "OK" "$test_start" "success=$success_samples,total=$total_samples,ratio=$ratio,samples_per_domain=$SAMPLES"
    echo "$ratio"
}

# ============================================================================
# TEST: APPLICATION RESPONSE
# ============================================================================

test_application_response() {
    local test_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Test 6/6: Application Response (Weight: 10%)"
    echo "=========================================="
    
    heartbeat "application_response" "START" "$test_start" ""
    
    local success=0
    local total=${#DOMAINS[@]}
    readonly MIN_CONTENT_LENGTH=128
    
    for domain in "${DOMAINS[@]}"; do
        local response
        response=$(curl -s -m 10 "https://$domain/" 2>/dev/null || echo "")
        
        local content_length=${#response}
        local has_status=0
        
        # Check if response has reasonable content length
        if [[ $content_length -ge $MIN_CONTENT_LENGTH ]]; then
            # Check for HTML markers or meaningful content
            if echo "$response" | grep -qE "(<html|<HTML|<!DOCTYPE|<title|<TITLE)"; then
                has_status=1
            fi
        fi
        
        if [[ $has_status -eq 1 ]]; then
            echo "✓ App Response: $domain (${content_length} bytes)"
            ((success++))
        else
            echo "✗ App Response: $domain (${content_length} bytes, no valid content)"
        fi
    done
    
    local ratio=$(awk "BEGIN {printf \"%.4f\", $success / $total}")
    echo "Application Response: $success / $total (ratio: $ratio)"
    
    heartbeat "application_response" "OK" "$test_start" "success=$success,total=$total,ratio=$ratio"
    echo "$ratio"
}

# ============================================================================
# CALCULATE OVERALL SCORE
# ============================================================================

calculate_overall_score() {
    local dns_ratio=$1
    local https_ratio=$2
    local hsts_ratio=$3
    local health_ratio=$4
    local bluegreen_ratio=$5
    local appresp_ratio=$6
    
    # Calculate weighted score
    local score
    score=$(awk "BEGIN {printf \"%.2f\", 100 * ( \
        ($dns_ratio * $DNS_W) + \
        ($https_ratio * $HTTPS_W) + \
        ($hsts_ratio * $HSTS_W) + \
        ($health_ratio * $HEALTH_W) + \
        ($bluegreen_ratio * $BLUEGREEN_W) + \
        ($appresp_ratio * $APPRESP_W) \
    )}")
    
    echo "$score"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local main_start=$SECONDS
    
    echo ""
    echo "=========================================="
    echo "Comprehensive Validation Suite (M6 Gate)"
    echo "Correlation ID: $CORRELATION_ID"
    echo "Threshold: ≥ ${M6_THRESHOLD}%"
    echo "Domains: ${#DOMAINS[@]}"
    echo "=========================================="
    
    # Create logs directory
    mkdir -p "$SCRIPT_DIR/logs"
    
    heartbeat "main" "START" "$main_start" "domains=${#DOMAINS[@]},threshold=$M6_THRESHOLD"
    
    # Run all tests
    local dns_ratio
    dns_ratio=$(test_dns_resolution)
    
    local https_ratio
    https_ratio=$(test_https_connectivity)
    
    local hsts_ratio
    hsts_ratio=$(test_hsts_headers)
    
    local health_ratio
    health_ratio=$(test_health_endpoints)
    
    local bluegreen_ratio
    bluegreen_ratio=$(test_bluegreen_sampling)
    
    local appresp_ratio
    appresp_ratio=$(test_application_response)
    
    # Calculate overall score
    local overall_score
    overall_score=$(calculate_overall_score "$dns_ratio" "$https_ratio" "$hsts_ratio" "$health_ratio" "$bluegreen_ratio" "$appresp_ratio")
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "Validation Summary"
    echo "=========================================="
    echo "DNS Resolution:       $(awk "BEGIN {printf \"%.1f%%\", $dns_ratio * 100}") (weight: ${DNS_W})"
    echo "HTTPS Connectivity:   $(awk "BEGIN {printf \"%.1f%%\", $https_ratio * 100}") (weight: ${HTTPS_W})"
    echo "HSTS Headers:         $(awk "BEGIN {printf \"%.1f%%\", $hsts_ratio * 100}") (weight: ${HSTS_W})"
    echo "Health Endpoints:     $(awk "BEGIN {printf \"%.1f%%\", $health_ratio * 100}") (weight: ${HEALTH_W})"
    echo "Blue-Green Sampling:  $(awk "BEGIN {printf \"%.1f%%\", $bluegreen_ratio * 100}") (weight: ${BLUEGREEN_W})"
    echo "Application Response: $(awk "BEGIN {printf \"%.1f%%\", $appresp_ratio * 100}") (weight: ${APPRESP_W})"
    echo "----------------------------------------"
    echo "Overall Score:        ${overall_score}%"
    echo "Threshold:            ${M6_THRESHOLD}%"
    echo ""
    
    heartbeat "main" "OK" "$main_start" "score=$overall_score,threshold=$M6_THRESHOLD,dns=$dns_ratio,https=$https_ratio,hsts=$hsts_ratio,health=$health_ratio,bluegreen=$bluegreen_ratio,appresp=$appresp_ratio"
    
    # Gate decision
    if (( $(awk "BEGIN {print ($overall_score >= $M6_THRESHOLD)}") )); then
        echo "=========================================="
        echo "✓ M6 GATE PASSED"
        echo "=========================================="
        echo "Overall health ${overall_score}% meets threshold ${M6_THRESHOLD}%"
        echo "Ready to proceed to M7: Production Deployment"
        echo ""
        exit 0
    else
        echo "=========================================="
        echo "✗ M6 GATE FAILED"
        echo "=========================================="
        echo "Overall health ${overall_score}% below threshold ${M6_THRESHOLD}%"
        echo "Review failed tests and remediate before proceeding"
        echo ""
        exit 1
    fi
}

# Run main
main "$@"

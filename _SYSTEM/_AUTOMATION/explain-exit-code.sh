#!/bin/bash
# Exit Code Explainer v2.0
# Usage: bash explain-exit-code.sh [--suggest|--json] <exit_code>

SUGGEST_ONLY=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --suggest)
            SUGGEST_ONLY=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -*)
            echo "Usage: $0 [--suggest|--json] <exit_code>" >&2
            exit 10
            ;;
        *)
            EXIT_CODE="$1"
            shift
            ;;
    esac
done

if [[ -z "${EXIT_CODE:-}" ]]; then
    echo "Usage: $0 [--suggest|--json] <exit_code>" >&2
    exit 10
fi

get_message() {
    case $EXIT_CODE in
        0) echo "✅ SUCCESS: All checks passed" ;;
        1) echo "✅ SUCCESS (with warnings): Task completed but review recommended" ;;
        2) echo "✅ SUCCESS (minor warnings): Non-blocking issues present" ;;

        10) echo "❌ INVALID ARGS: Missing or malformed arguments" ;;
        11) echo "❌ FILE NOT FOUND: Specified file doesn't exist" ;;
        20) echo "❌ PARSE ERROR: Malformed file content" ;;

        50) echo "⚠️ NETWORK UNAVAILABLE: Can't reach external services" ;;
        60) echo "⚠️ TOOL MISSING: Required command not installed" ;;
        61) echo "⚠️ MODULE MISSING: Required library not available" ;;

        100) echo "❌ SCHEMA VALIDATION FAILED: Data doesn't match expected format" ;;
        110) echo "❌ DATE IN PAST: Specified date is before today" ;;
        111) echo "❌ PLACEHOLDER DETECTED: Template variables not replaced" ;;
        120) echo "❌ DUPLICATE DETECTED: Item already exists" ;;

        150) echo "❌ LEGAL CONTEXT FAILED: Legal aggregate validation failed" ;;
        151) echo "❌ PURPOSE VALIDATION FAILED: WSJF/purpose gate rejected item" ;;
        152) echo "❌ HABITABILITY EVIDENCE FAILED: Required evidence is incomplete/missing" ;;
        153) echo "❌ FILING EXECUTION FAILED: Filing/execution process did not complete" ;;
        154) echo "❌ POLICY VIOLATION: Governance or institutional policy breach detected" ;;
        155) echo "❌ COHERENCE FAIL: PRD/ADR/DDD/TDD coherence gate failed" ;;
        156) echo "⚠️ ROAM STALE: Risk tracker freshness threshold exceeded" ;;
        157) echo "❌ WSJF REJECT: Item rejected by WSJF thresholding policy" ;;
        160) echo "❌ WSJF SCORE LOW: Priority score below threshold" ;;
        170) echo "❌ ADR COMPLIANCE: Missing required ADR frontmatter" ;;

        200) echo "🔴 DISK FULL: Insufficient storage space" ;;
        210) echo "🔴 PERMISSION DENIED: Insufficient file/folder permissions" ;;
        211) echo "🔴 TUNNEL PORT IN USE: Port 8080 occupied by another process" ;;
        212) echo "🔴 TUNNEL HTTP FAILED: Local HTTP server start/health failure" ;;
        213) echo "🔴 TUNNEL TAILSCALE FAILED: Tailscale provider unavailable" ;;
        214) echo "🔴 TUNNEL NGROK FAILED: ngrok provider unavailable or unauthenticated" ;;
        215) echo "🔴 TUNNEL CLOUDFLARE FAILED: Cloudflare provider unavailable" ;;
        216) echo "🔴 TUNNEL LOCALTUNNEL FAILED: localtunnel provider unavailable" ;;
        217) echo "🔴 TUNNEL ALL PROVIDERS FAILED: Cascade exhausted all tunnel providers" ;;
        218) echo "🟡 TUNNEL URL EXPIRED: Ephemeral tunnel URL no longer valid" ;;
        219) echo "🔴 TUNNEL ERROR 1033: Origin unreachable from tunnel edge" ;;
        220) echo "🔴 DAEMON CRASHED: Background process not running" ;;
        221) echo "🟡 TUNNEL HEALTH CHECK FAILED: Endpoint health probe failed" ;;

        250) echo "🆘 DATA CORRUPTION: File or database corrupted" ;;
        255) echo "🆘 PANIC: Unhandled critical error" ;;

        *) echo "❓ UNKNOWN EXIT CODE: $EXIT_CODE" ;;
    esac
}

get_suggest() {
    if [[ $EXIT_CODE -ge 0 ]] && [[ $EXIT_CODE -le 9 ]]; then
        echo "Proceed to next step"
    elif [[ $EXIT_CODE -ge 10 ]] && [[ $EXIT_CODE -le 49 ]]; then
        echo "Fix user input or configuration"
    elif [[ $EXIT_CODE -ge 50 ]] && [[ $EXIT_CODE -le 99 ]]; then
        echo "Install missing dependencies"
    elif [[ $EXIT_CODE -ge 100 ]] && [[ $EXIT_CODE -le 149 ]]; then
        echo "Fix data validation issues"
    elif [[ $EXIT_CODE -ge 150 ]] && [[ $EXIT_CODE -le 199 ]]; then
        echo "Review business logic constraints"
    elif [[ $EXIT_CODE -ge 200 ]] && [[ $EXIT_CODE -le 249 ]]; then
        echo "Fix system resource or permission issues"
    elif [[ $EXIT_CODE -ge 250 ]] && [[ $EXIT_CODE -le 255 ]]; then
        echo "CRITICAL - Manual intervention required"
    else
        echo "Unknown zone - check exit code"
    fi
}

get_zone() {
    if [[ $EXIT_CODE -ge 0 ]] && [[ $EXIT_CODE -le 9 ]]; then echo "success"
    elif [[ $EXIT_CODE -ge 10 ]] && [[ $EXIT_CODE -le 49 ]]; then echo "client"
    elif [[ $EXIT_CODE -ge 50 ]] && [[ $EXIT_CODE -le 99 ]]; then echo "dependency"
    elif [[ $EXIT_CODE -ge 100 ]] && [[ $EXIT_CODE -le 149 ]]; then echo "validation"
    elif [[ $EXIT_CODE -ge 150 ]] && [[ $EXIT_CODE -le 199 ]]; then echo "business"
    elif [[ $EXIT_CODE -ge 200 ]] && [[ $EXIT_CODE -le 249 ]]; then echo "infrastructure"
    elif [[ $EXIT_CODE -ge 250 ]] && [[ $EXIT_CODE -le 255 ]]; then echo "critical"
    else echo "unknown"
    fi
}

MSG=$(get_message)
SUGGEST=$(get_suggest)
ZONE=$(get_zone)

if [[ "$SUGGEST_ONLY" == true ]]; then
    echo "$SUGGEST"
    exit 0
fi

if [[ "$JSON_OUTPUT" == true ]]; then
    echo "{\"exit_code\":$EXIT_CODE,\"message\":\"$(echo "$MSG" | sed 's/"/\\"/g')\",\"suggest\":\"$SUGGEST\",\"zone\":\"$ZONE\"}"
    exit 0
fi

echo "$MSG"
echo "👉 Next: $SUGGEST"

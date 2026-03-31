#!/bin/bash
# Exit Code Explainer v1.0
# Usage: bash explain-exit-code.sh 111

EXIT_CODE=$1

case $EXIT_CODE in
 0) echo "✅ SUCCESS: All checks passed" ;;
 1) echo "✅ SUCCESS (with warnings): Task completed but review recommended" ;;
 
 10) echo "❌ INVALID ARGS: Missing or malformed arguments" ;;
 11) echo "❌ FILE NOT FOUND: Specified file doesn't exist" ;;
 12) echo "❌ INVALID FORMAT: Specified file contains incorrect extension structure" ;;
 20) echo "❌ PARSE ERROR: Malformed file content" ;;
 21) echo "❌ MISSING REQUIRED FIELD: Mandatory values are absent" ;;
 
 50) echo "⚠️ NETWORK UNAVAILABLE: Can't reach external services" ;;
 60) echo "⚠️ TOOL MISSING: Required command not installed" ;;
 61) echo "⚠️ MODULE MISSING: Required library not available" ;;
 
 100) echo "❌ SCHEMA VALIDATION FAILED: Data doesn't match expected format" ;;
 110) echo "❌ DATE IN PAST: Specified date is before today" ;;
 111) echo "❌ PLACEHOLDER DETECTED: Template variables not replaced" ;;
 112) echo "❌ PORT CONFLICT: Port 8080 already in use" ;;
 113) echo "❌ HTTP SERVER FAILED: Python server not responding" ;;
 114) echo "❌ TUNNEL FAILED: Tailscale tunnel failed" ;;
 115) echo "❌ TUNNEL FAILED: ngrok tunnel failed" ;;
 116) echo "❌ ALL TUNNELS FAILED: Complete cascade failure - no tunnel providers working" ;;
 117) echo "❌ TUNNEL FAILED: Cloudflare tunnel failed" ;;
 118) echo "❌ TUNNEL FAILED: localtunnel failed" ;;
 119) echo "❌ TUNNEL URL EXPIRED: Ephemeral tunnel URL changed" ;;
 120) echo "❌ DUPLICATE DETECTED: Item already exists" ;;
 130) echo "❌ ADDRESS MISMATCH: Validation vector mapping addresses do not match" ;;
 
 150) echo "❌ LEGAL CITATION MALFORMED: N.C.G.S. § formatting incorrect" ;;
 151) echo "❌ RECIPIENT BLACKLISTED: Pre-defined trace blocking communication" ;;
 160) echo "❌ WSJF SCORE LOW: Priority score below threshold" ;;
 170) echo "❌ ADR COMPLIANCE: Missing required ADR frontmatter" ;;
 
 200) echo "🔴 DISK FULL: Insufficient storage space" ;;
 210) echo "🔴 PERMISSION DENIED: Insufficient file/folder permissions" ;;
 211) echo "❌ PORT CONFLICT: Port 8080 already in use (duplicate code)" ;;
 212) echo "❌ HTTP SERVER FAILED: Python server not responding (duplicate code)" ;;
 213) echo "❌ TUNNEL FAILED: Tailscale tunnel failed (duplicate code)" ;;
 214) echo "❌ TUNNEL FAILED: ngrok tunnel failed (duplicate code)" ;;
 215) echo "❌ TUNNEL FAILED: Cloudflare tunnel failed (duplicate code)" ;;
 216) echo "❌ TUNNEL FAILED: localtunnel failed (duplicate code)" ;;
 217) echo "❌ ALL TUNNELS FAILED: Complete cascade failure (alternative code)" ;;
 220) echo "🔴 DAEMON CRASHED: Background process not running" ;;
 
 250) echo "🆘 DATA CORRUPTION: File or database corrupted" ;;
 255) echo "🆘 PANIC: Unhandled critical error" ;;
 
 *) echo "❓ UNKNOWN EXIT CODE: $EXIT_CODE" ;;
esac

# Suggest next action
if [ $EXIT_CODE -ge 0 ] && [ $EXIT_CODE -le 9 ]; then
 echo "👉 Next: Proceed to next step"
elif [ $EXIT_CODE -ge 10 ] && [ $EXIT_CODE -le 49 ]; then
 echo "👉 Next: Fix user input or configuration"
elif [ $EXIT_CODE -ge 50 ] && [ $EXIT_CODE -le 99 ]; then
 echo "👉 Next: Install missing dependencies"
elif [ $EXIT_CODE -ge 100 ] && [ $EXIT_CODE -le 149 ]; then
 echo "👉 Next: Fix data validation issues"
elif [ $EXIT_CODE -ge 150 ] && [ $EXIT_CODE -le 199 ]; then
 echo "👉 Next: Review business logic constraints"
elif [ $EXIT_CODE -ge 200 ] && [ $EXIT_CODE -le 249 ]; then
 echo "👉 Next: Fix system resource or permission issues"
elif [ $EXIT_CODE -ge 250 ] && [ $EXIT_CODE -le 255 ]; then
 echo "👉 Next: CRITICAL - Manual intervention required"
fi

#!/bin/bash
# _SYSTEM/_AUTOMATION/exit-codes-robust.sh
# Semantic Exit Code Framework (0-255)

if [[ -z "${_ROBUST_EXIT_CODES_LOADED:-}" ]]; then
export _ROBUST_EXIT_CODES_LOADED=1

# Zone 0-9: Success
export EX_OK=0
export EX_SUCCESS=0
export EXIT_SUCCESS=0
export EX_SUCCESS_NOOP=1
export EX_SUCCESS_WARNING=2
export EXIT_SUCCESS_WITH_WARNINGS=1

# Zone 10-50: Argument and Syntax Errors
export EX_USAGE=10
export EX_BAD_ARGS=11
export EX_SYNTAX_ERROR=12
export EXIT_PARSE_ERROR=20
export EX_INVALID_CONFIG=13
# Config/contract failures (AISP guard: wrong roots, missing cases, prod on wrong branch)
export EX_CONFIG=78

# AISP Guard Exit Codes (semantic zones)
export EXIT_INVALID_ARGS=10
export EXIT_FILE_NOT_FOUND=11
export EXIT_INVALID_FORMAT=12
export EXIT_MISSING_REQUIRED_FIELD=21

# Zone 51-99: File System and I/O Errors
export EX_NOINPUT=51
export EX_NOFILE=52
export EX_NOPERM=53
export EX_CANTCREAT=54
export EX_IOERR=55
export EXIT_NETWORK_UNAVAILABLE=50
export EXIT_TOOL_MISSING=60
export EXIT_MODULE_MISSING=61

# Zone 100-149: Environment and Dependency Errors
export EX_DEPS_MISSING=100
export EXIT_SCHEMA_VALIDATION_FAILED=100
export EX_API_UNAVAILABLE=101
export EX_AUTH_FAILURE=102
export EX_DB_UNAVAILABLE=103
export EXIT_DATE_IN_PAST=110
export EXIT_PLACEHOLDER_DETECTED=111
export EXIT_DUPLICATE_DETECTED=120
export EXIT_ADDRESS_MISMATCH=130
export EX_NETWORK_TIMEOUT=104
# Policy: validation must not proceed inside MIN_DAYS_BEFORE_ARBITRATION of ARBITRATION_DATE
export EXIT_ARBITRATION_WINDOW_VIOLATION=109

# Zone 211-221: Tunnel Orchestration Infrastructure Errors
# Keep 110/111 reserved for validation semantics (DATE_IN_PAST / PLACEHOLDER_DETECTED).
export EX_TUNNEL_PORT_IN_USE=211
export EX_TUNNEL_HTTP_FAILED=212
export EX_TUNNEL_TAILSCALE_FAILED=213
export EX_TUNNEL_NGROK_FAILED=214
export EX_TUNNEL_CLOUDFLARE_FAILED=215
export EX_TUNNEL_LOCALTUNNEL_FAILED=216
export EX_TUNNEL_ALL_PROVIDERS_FAILED=217
export EX_TUNNEL_URL_EXPIRED=218
export EX_TUNNEL_ERROR_1033=219
export EX_TUNNEL_HEALTH_CHECK_FAILED=221

# Zone 150-199: Domain and Application Logic Failures
export EX_VALIDATION_FAILED=150
export EX_VALIDATION_WARNING=160
export EXIT_WSJF_SCORE_LOW=160
export EX_HITL_PENDING=170
export EX_NOT_ACTUALLY_SENT=180

# Multi-Ledger Domain Exit Codes (DDD Bounded Contexts)
export EX_LEGAL_CONTEXT_FAILED=150  # law - Legal aggregate root
export EXIT_LEGAL_CITATION_MALFORMED=150  # Legacy alias for validate-emails
export EX_PURPOSE_VALIDATION_FAILED=151  # pur - Purpose/WSJF validation gate
export EXIT_RECIPIENT_BLACKLISTED=151  # Legacy alias
export EXIT_ADR_COMPLIANCE=170  # Legacy alias for ADR frontmatter
export EX_HABITABILITY_EVIDENCE_FAILED=152  # hab - Habitability evidence
export EX_FILING_EXECUTION_FAILED=153  # file - Filing/execution process
export EX_POLICY_VIOLATION=154
export EX_COHERENCE_FAIL=155
export EX_ROAM_STALE=156
export EX_WSJF_REJECT=157

# Zone 200-249: Infrastructure Errors
export EX_DISK_FULL=200
export EX_PERMISSION_DENIED=210
export EX_DAEMON_CRASHED=220
export EX_DATABASE_LOCKED=230
export EX_MEMORY_EXHAUSTED=240

# Zone 250-255: Critical/Fatal
export EX_DATA_CORRUPTION=250
export EX_DATABASE_CORRUPTION=251
export EX_UNHANDLED_EXCEPTION=252
export EX_PANIC=255

fi # End of inclusion guard

#!/bin/bash
# Brutal Honesty Code Assessment Script (Linus Mode)
# Security Hardened: v2.0 (2026-01-02)

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🔥 BRUTAL HONESTY CODE ASSESSMENT (Linus Mode)"
echo "================================================"
echo "Security Hardened v2.0"
echo ""

# Check if file argument provided
if [ -z "$1" ]; then
    echo "Usage: $0 <file-or-directory>"
    exit 1
fi

# ============================================
# SECURITY: Input Validation and Sanitization
# ============================================

TARGET="${1:-}"

# SECURITY: Reject empty or suspicious input
if [[ -z "$TARGET" ]]; then
    echo -e "${RED}ERROR: No target specified.${NC}" >&2
    exit 1
fi

# SECURITY: Block path traversal attempts (../)
if [[ "$TARGET" == *".."* ]]; then
    echo -e "${RED}ERROR: Path traversal detected (..). Use relative paths within the current directory only.${NC}" >&2
    exit 1
fi

# SECURITY: Block absolute paths
if [[ "$TARGET" == /* ]]; then
    echo -e "${RED}ERROR: Absolute paths not allowed. Use relative paths only.${NC}" >&2
    exit 1
fi

# SECURITY: Block null bytes and other dangerous characters
if [[ "$TARGET" == *$'\0'* ]] || [[ "$TARGET" == *$'\n'* ]] || [[ "$TARGET" == *$'\r'* ]]; then
    echo -e "${RED}ERROR: Invalid characters in path.${NC}" >&2
    exit 1
fi

# SECURITY: Validate path contains only allowed characters
if [[ ! "$TARGET" =~ ^[a-zA-Z0-9_./-]+$ ]]; then
    echo -e "${RED}ERROR: Path contains invalid characters. Only alphanumeric, dots, underscores, hyphens, and forward slashes allowed.${NC}" >&2
    exit 1
fi

# SECURITY: Verify target exists
if [[ ! -e "$TARGET" ]]; then
    echo -e "${RED}ERROR: Target does not exist: $TARGET${NC}" >&2
    exit 1
fi

# SECURITY: Resolve to absolute path and verify within allowed directory
WORKING_DIR=$(pwd)
if [[ -d "$TARGET" ]]; then
    RESOLVED=$(cd "$TARGET" 2>/dev/null && pwd)
elif [[ -f "$TARGET" ]]; then
    TARGET_DIR=$(dirname "$TARGET")
    TARGET_FILE=$(basename "$TARGET")
    RESOLVED=$(cd "$TARGET_DIR" 2>/dev/null && pwd)/"$TARGET_FILE"
else
    echo -e "${RED}ERROR: Target is neither a file nor directory.${NC}" >&2
    exit 1
fi

# SECURITY: Ensure resolved path is within working directory
if [[ ! "$RESOLVED" =~ ^"$WORKING_DIR" ]]; then
    echo -e "${RED}ERROR: Path traversal detected. Target must be within $(pwd)${NC}" >&2
    exit 1
fi

# SECURITY: Check for symlink escape attempts
if [[ -L "$TARGET" ]]; then
    LINK_TARGET=$(readlink -f "$TARGET" 2>/dev/null || echo "")
    if [[ ! "$LINK_TARGET" =~ ^"$WORKING_DIR" ]]; then
        echo -e "${RED}ERROR: Symlink points outside allowed directory.${NC}" >&2
        exit 1
    fi
fi

echo -e "${GREEN}✓ Security validation passed${NC}"
echo -e "${CYAN}Target: $RESOLVED${NC}"
echo ""

# ============================================
# Assessment Functions (with security-safe grep)
# ============================================

# Function to assess correctness
assess_correctness() {
    echo "📊 CORRECTNESS CHECK"
    echo "-------------------"

    # SECURITY: Use grep --fixed-strings where possible to prevent regex injection
    if grep -rF "TODO" "$TARGET" 2>/dev/null || \
       grep -rF "FIXME" "$TARGET" 2>/dev/null || \
       grep -rF "BUG" "$TARGET" 2>/dev/null || \
       grep -rF "HACK" "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 FAILING: Found TODO/FIXME/BUG/HACK comments${NC}"
        echo "   → This code admits it's broken. Fix it before review."
        return 0
    fi

    # Check for error-prone patterns
    if grep -rF "null" "$TARGET" 2>/dev/null | grep -v "!== null" | grep -v "!== undefined" > /dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Potential null/undefined issues${NC}"
        echo "   → Are you handling null cases properly?"
    fi

    echo -e "${GREEN}✓ No obvious correctness issues${NC}"
}

# Function to assess performance
assess_performance() {
    echo ""
    echo "⚡ PERFORMANCE CHECK"
    echo "-------------------"

    # Check for nested loops (potential O(n²))
    # SECURITY: Use timeout to prevent runaway grep on large codebases
    nested_loops=$(timeout 30 grep -rE "for.*\{" "$TARGET" 2>/dev/null | wc -l || echo "0")
    if [ "$nested_loops" -gt 5 ]; then
        echo -e "${RED}🔴 FAILING: Found $nested_loops loops${NC}"
        echo "   → Are you creating O(n²) complexity where O(n) exists?"
        echo "   → Use hash maps, sets, or better algorithms."
    fi

    # Check for synchronous I/O in hot paths
    if grep -rF "readFileSync" "$TARGET" 2>/dev/null || \
       grep -rF "writeFileSync" "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 FAILING: Synchronous file I/O detected${NC}"
        echo "   → You're blocking the event loop. Use async operations."
    fi

    echo -e "${GREEN}✓ No obvious performance issues${NC}"
}

# Function to assess error handling
assess_error_handling() {
    echo ""
    echo "🛡️  ERROR HANDLING CHECK"
    echo "----------------------"

    # Check for try/catch usage
    # SECURITY: Use timeout to prevent runaway grep
    try_count=$(timeout 30 grep -rE "try|catch" "$TARGET" 2>/dev/null | wc -l || echo "0")
    if [ "$try_count" -eq 0 ]; then
        echo -e "${RED}🔴 FAILING: No error handling found${NC}"
        echo "   → What happens when this code fails? It crashes."
    else
        echo -e "${GREEN}✓ Found error handling (verify it's sufficient)${NC}"
    fi

    # Check for empty catch blocks
    if grep -A 1 "catch" "$TARGET" 2>/dev/null | grep -q "^\s*}"; then
        echo -e "${RED}🔴 FAILING: Empty catch blocks detected${NC}"
        echo "   → Swallowing errors silently is worse than crashing."
    fi
}

# Function to assess concurrency
assess_concurrency() {
    echo ""
    echo "🔀 CONCURRENCY CHECK"
    echo "-------------------"

    # Check for global state mutations
    if grep -rF "global." "$TARGET" 2>/dev/null || \
       grep -rF "window." "$TARGET" 2>/dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Global state mutations detected${NC}"
        echo "   → Are you handling concurrent access safely?"
    fi

    # Check for race condition patterns
    if grep -rF "setTimeout" "$TARGET" 2>/dev/null || \
       grep -rF "setInterval" "$TARGET" 2>/dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Timing-based code detected${NC}"
        echo "   → Are you creating race conditions?"
    fi

    echo -e "${GREEN}✓ Review concurrency manually${NC}"
}

# Function to assess testability
assess_testability() {
    echo ""
    echo "🧪 TESTABILITY CHECK"
    echo "-------------------"

    # Check if tests exist (search from working directory)
    if [ -d "tests" ] || [ -d "test" ] || [ -d "__tests__" ]; then
        echo -e "${GREEN}✓ Test directory exists${NC}"
    else
        echo -e "${RED}🔴 FAILING: No test directory found${NC}"
        echo "   → Where are the tests? Did you even test this?"
    fi

    # Check for dependency injection (use timeout for safety)
    if timeout 30 grep -rE "new\s+\w+\(" "$TARGET" 2>/dev/null | grep -v "Error\|Date\|Map\|Set\|Array" > /dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Hard-coded dependencies detected${NC}"
        echo "   → Use dependency injection for testability."
    fi
}

# Function to assess maintainability
assess_maintainability() {
    echo ""
    echo "🔧 MAINTAINABILITY CHECK"
    echo "-----------------------"

    # Check function length (should be <50 lines)
    if [ -f "$TARGET" ]; then
        # SECURITY: Use timeout to prevent awk from running too long
        long_functions=$(timeout 30 awk '/^function|^const.*=>/ {start=NR} /^}/ {if(NR-start>50) print "Line",start}' "$TARGET" 2>/dev/null | wc -l || echo "0")
        if [ "$long_functions" -gt 0 ]; then
            echo -e "${YELLOW}🟡 WARNING: Found $long_functions functions >50 lines${NC}"
            echo "   → Break down complex functions."
        fi
    fi

    # Check for magic numbers (use timeout)
    if timeout 30 grep -rE "\s[0-9]{3,}" "$TARGET" 2>/dev/null | grep -v "1000\|2000" > /dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Magic numbers detected${NC}"
        echo "   → Use named constants."
    fi

    echo -e "${GREEN}✓ Review code clarity manually${NC}"
}

# NEW: Function to assess security anti-patterns
assess_security() {
    echo ""
    echo "🔐 SECURITY ANTI-PATTERN CHECK"
    echo "-----------------------------"

    local security_issues=0

    # Check for SQL injection patterns
    if grep -rE '["'"'"']\s*\+\s*\w+|query\s*\(\s*["'"'"'][^"'"'"']*\$\{' "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 CRITICAL: Potential SQL injection vulnerability${NC}"
        echo "   → Use parameterized queries or prepared statements."
        ((security_issues++))
    fi

    # Check for XSS patterns
    if grep -rF "innerHTML" "$TARGET" 2>/dev/null || \
       grep -rF "document.write" "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 CRITICAL: Potential XSS vulnerability${NC}"
        echo "   → Use textContent or sanitize HTML input."
        ((security_issues++))
    fi

    # Check for hardcoded secrets
    if grep -rEi "(password|secret|api[_-]?key|token)\s*[:=]\s*[\"'][^\"']+[\"']" "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 CRITICAL: Hardcoded secrets detected${NC}"
        echo "   → Use environment variables or secret management."
        ((security_issues++))
    fi

    # Check for eval usage
    if grep -rF "eval(" "$TARGET" 2>/dev/null; then
        echo -e "${RED}🔴 HIGH: eval() usage detected${NC}"
        echo "   → eval() is dangerous. Find an alternative."
        ((security_issues++))
    fi

    # Check for exec/spawn without input validation
    if grep -rE "exec\(|spawn\(" "$TARGET" 2>/dev/null; then
        echo -e "${YELLOW}🟡 WARNING: Command execution detected${NC}"
        echo "   → Ensure input is validated before command execution."
    fi

    if [ "$security_issues" -eq 0 ]; then
        echo -e "${GREEN}✓ No obvious security anti-patterns${NC}"
    else
        echo -e "${RED}Found $security_issues security issues requiring immediate attention${NC}"
    fi
}

# Run all assessments
assess_correctness
assess_performance
assess_error_handling
assess_concurrency
assess_testability
assess_maintainability
assess_security  # NEW: Security assessment

# Final verdict
echo ""
echo "================================================"
echo "🎯 FINAL VERDICT"
echo "================================================"
echo ""
echo "Review the findings above. If you see multiple 🔴 FAILING marks,"
echo "this code is NOT ready for review."
echo ""
echo "Expected standards:"
echo "  - All error paths handled"
echo "  - No obvious performance issues"
echo "  - Tests exist and pass"
echo "  - Code is clear and maintainable"
echo "  - No security anti-patterns"
echo ""
echo "If you wouldn't deploy this to production, don't submit it for review."

#!/usr/bin/env bash
#
# no_new_md_guard.sh - Enforce NO NEW .md FILES constraint
#
# Prevents new .md files from being created; allows updates to existing ones.
# Can be used as a pre-commit hook or standalone validator.
#
# Usage:
#   ./scripts/policy/no_new_md_guard.sh --check        # Validate current state
#   ./scripts/policy/no_new_md_guard.sh --install      # Add git pre-commit hook
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
ACTION="${1:-check}"

check_new_md_files() {
    local new_files=0
    local problematic_files=()
    
    # Check git status for new .md files
    if git -C "$REPO_ROOT" status --porcelain 2>/dev/null | grep -q '^?? .*\.md$'; then
        # Extract new .md files
        mapfile -t problematic_files < <(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | grep '^?? .*\.md$' | awk '{print $2}')
        new_files=${#problematic_files[@]}
    fi
    
    if [ $new_files -gt 0 ]; then
        echo -e "${RED}✗ BLOCKED: Found $new_files new .md file(s)${NC}"
        for file in "${problematic_files[@]}"; do
            echo -e "  ${RED}• $file${NC}"
        done
        echo ""
        echo "To fix: Either delete these files or move them outside the repo."
        echo "Policy: Updates to existing .md files are allowed; new ones are blocked."
        return 1
    fi
    
    echo -e "${GREEN}✓ No new .md files detected${NC}"
    return 0
}

install_pre_commit_hook() {
    if [ ! -d "$GIT_HOOKS_DIR" ]; then
        echo -e "${YELLOW}⚠ .git/hooks not found (repo may not have .git)${NC}"
        echo "Skipping pre-commit hook installation"
        return 0
    fi
    
    local hook_file="$GIT_HOOKS_DIR/pre-commit"
    
    # Check if hook already exists
    if [ -f "$hook_file" ] && grep -q "no_new_md_guard" "$hook_file"; then
        echo -e "${GREEN}✓ pre-commit hook already installed${NC}"
        return 0
    fi
    
    # Create or append to pre-commit hook
    if [ ! -f "$hook_file" ]; then
        cat > "$hook_file" <<'HOOK_EOF'
#!/usr/bin/env bash
# Auto-generated pre-commit hook: enforce NO NEW .md FILES

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Run no_new_md_guard
if ! "$SCRIPT_DIR/scripts/policy/no_new_md_guard.sh" --check; then
    exit 1
fi
HOOK_EOF
    else
        # Append to existing hook
        cat >> "$hook_file" <<'HOOK_EOF'

# Added by no_new_md_guard.sh
if ! bash -c 'cd "$(dirname "${BASH_SOURCE[0]}")/../.." && ./scripts/policy/no_new_md_guard.sh --check'; then
    exit 1
fi
HOOK_EOF
    fi
    
    chmod +x "$hook_file"
    echo -e "${GREEN}✓ pre-commit hook installed at $hook_file${NC}"
    return 0
}

case "$ACTION" in
    --check)
        check_new_md_files
        ;;
    --install)
        install_pre_commit_hook
        ;;
    *)
        echo "Usage: $0 [--check|--install]"
        echo ""
        echo "  --check    Validate no new .md files are staged"
        echo "  --install  Add pre-commit hook (non-blocking if .git not present)"
        exit 1
        ;;
esac

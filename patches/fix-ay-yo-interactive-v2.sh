#!/usr/bin/env bash
# Simplified patch to fix ay_yo function for interactive dashboard mode
# This version appends the fix and lets you manually clean up duplicates later

set -euo pipefail

BASHRC="$HOME/.bashrc"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Patching ay_yo function in $BASHRC..."

# Create backup
BACKUP_FILE="$BASHRC.backup-$(date +%Y%m%d-%H%M%S)"
cp "$BASHRC" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Add a marker and the new function
cat >> "$BASHRC" << 'EOF'

# ============================================================
# PATCHED ay_yo function - Interactive Dashboard Fix
# Applied: 2026-01-08
# This fixes "ay yo i" to launch the Python dashboard
# ============================================================

ay_yo() {
    # Check for interactive mode first (ay yo i, ay yo interactive, or bare ay yo)
    if [[ $# -eq 0 || "${1:-}" == "i" || "${1:-}" == "interactive" ]]; then
        if [ -z "${AF_WSJF_PRESET:-}" ]; then
            export AF_WSJF_PRESET="P2"
            echo -e "\033[0;34m[ay yo] WSJF preset: P2 (yolife context)\033[0m" >&2
        else
            echo -e "\033[0;33m[ay yo] WSJF preset: ${AF_WSJF_PRESET} (override active)\033[0m" >&2
        fi
        
        # Launch interactive Python dashboard
        local ay_yo_script="EOF
echo "        local ay_yo_script=\"$PROJECT_ROOT/scripts/ay-yo\"" >> "$BASHRC"
cat >> "$BASHRC" << 'EOF'
        if [ -x "$ay_yo_script" ]; then
            echo -e "\033[0;34m[ay yo] Launching interactive dashboard...\033[0m" >&2
            exec "$ay_yo_script" "${1:-i}"
        else
            echo -e "\033[0;31m[ay yo] Error: ay-yo script not found at $ay_yo_script\033[0m" >&2
            return 1
        fi
    fi
    
    # Help flag
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
        "$AY_AF" yolife "$@"
        return $?
    fi
    
    # Set WSJF preset for yolife commands
    if [ -z "${AF_WSJF_PRESET:-}" ]; then
        export AF_WSJF_PRESET="P2"
        echo -e "\033[0;34m[ay yo] WSJF preset: P2 (yolife context)\033[0m" >&2
    else
        echo -e "\033[0;33m[ay yo] WSJF preset: ${AF_WSJF_PRESET} (override active)\033[0m" >&2
    fi
    
    # Pass to af yolife for specific subcommands (ts-refresh, inventory, ssh-probe, ssm)
    "$AY_AF" yolife "$@"
}

# Export the function
export -f ay_yo 2>/dev/null || true

# ============================================================
# END PATCH
# ============================================================
EOF

echo ""
echo "✅ Patch applied successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Reload your shell:"
echo "      source ~/.bashrc"
echo ""
echo "   2. Test interactive mode:"
echo "      ay yo i"
echo ""
echo "   3. (Optional) Clean up old ay_yo definitions in $BASHRC"
echo "      The new function is at the end, marked with comments"
echo ""
echo "💡 If you encounter issues, restore backup with:"
echo "   cp $BACKUP_FILE ~/.bashrc && source ~/.bashrc"

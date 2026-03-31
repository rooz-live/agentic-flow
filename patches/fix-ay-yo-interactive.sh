#!/usr/bin/env bash
# Patch to fix ay_yo function for interactive dashboard mode
# 
# This fixes the broken routing where "ay yo i" was calling "af yolife i"
# instead of the interactive Python dashboard (scripts/af_dashboard.py)
#
# Usage:
#   1. Backup your .bashrc: cp ~/.bashrc ~/.bashrc.backup
#   2. Apply patch: bash patches/fix-ay-yo-interactive.sh
#   3. Reload shell: source ~/.bashrc
#   4. Test: ay yo i

set -euo pipefail

BASHRC="$HOME/.bashrc"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Patching ay_yo function in $BASHRC..."

# Create backup
cp "$BASHRC" "$BASHRC.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup created: $BASHRC.backup-$(date +%Y%m%d-%H%M%S)"

# The corrected ay_yo function
NEW_FUNCTION='
# ay_yo - Route to interactive dashboard or yolife commands
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
        local ay_yo_script="'"$PROJECT_ROOT"'/scripts/ay-yo"
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
export -f ay_yo 2>/dev/null || true
'

# Remove all existing ay_yo function definitions using Python
echo "🗑️  Removing old ay_yo function definitions..."
python3 << 'PYSCRIPT'
import re

with open("$BASHRC", "r") as f:
    content = f.read()

# Remove ay_yo function definitions (handling multi-line functions)
# Pattern matches from "ay_yo()" to the closing brace at the same indentation level
content = re.sub(r'^ay_yo\(\)[^}]*?^}\s*$', '', content, flags=re.MULTILINE | re.DOTALL)
# Also remove export statements
content = re.sub(r'^export -f ay_yo.*?$', '', content, flags=re.MULTILINE)
# Clean up multiple blank lines
content = re.sub(r'\n{3,}', '\n\n', content)

with open("$BASHRC", "w") as f:
    f.write(content)
PYSCRIPT

# Add the new function at the end
echo "$NEW_FUNCTION" >> "$BASHRC"

echo "✅ Patch applied successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Reload your shell: source ~/.bashrc"
echo "   2. Test interactive mode: ay yo i"
echo "   3. Test yolife commands: ay yo inventory"
echo ""
echo "💡 If you encounter issues, restore backup with:"
echo "   cp ~/.bashrc.backup-* ~/.bashrc && source ~/.bashrc"

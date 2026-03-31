#!/usr/bin/env python3
"""
Patch ay_yo function in ~/.bashrc to restore interactive dashboard mode
"""

import os
import sys
from datetime import datetime
from pathlib import Path

BASHRC = Path.home() / ".bashrc"
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# The corrected ay_yo function
NEW_FUNCTION = f'''
# ============================================================
# PATCHED ay_yo function - Interactive Dashboard Fix
# Applied: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
# This fixes "ay yo i" to launch the Python dashboard
# ============================================================

ay_yo() {{
    # Check for interactive mode first (ay yo i, ay yo interactive, or bare ay yo)
    if [[ $# -eq 0 || "${{1:-}}" == "i" || "${{1:-}}" == "interactive" ]]; then
        if [ -z "${{AF_WSJF_PRESET:-}}" ]; then
            export AF_WSJF_PRESET="P2"
            echo -e "\\033[0;34m[ay yo] WSJF preset: P2 (yolife context)\\033[0m" >&2
        else
            echo -e "\\033[0;33m[ay yo] WSJF preset: ${{AF_WSJF_PRESET}} (override active)\\033[0m" >&2
        fi
        
        # Launch interactive Python dashboard
        local ay_yo_script="{PROJECT_ROOT}/scripts/ay-yo"
        if [ -x "$ay_yo_script" ]; then
            echo -e "\\033[0;34m[ay yo] Launching interactive dashboard...\\033[0m" >&2
            exec "$ay_yo_script" "${{1:-i}}"
        else
            echo -e "\\033[0;31m[ay yo] Error: ay-yo script not found at $ay_yo_script\\033[0m" >&2
            return 1
        fi
    fi
    
    # Help flag
    if [[ "${{1:-}}" == "--help" || "${{1:-}}" == "-h" || "${{1:-}}" == "help" ]]; then
        "$AY_AF" yolife "$@"
        return $?
    fi
    
    # Set WSJF preset for yolife commands
    if [ -z "${{AF_WSJF_PRESET:-}}" ]; then
        export AF_WSJF_PRESET="P2"
        echo -e "\\033[0;34m[ay yo] WSJF preset: P2 (yolife context)\\033[0m" >&2
    else
        echo -e "\\033[0;33m[ay yo] WSJF preset: ${{AF_WSJF_PRESET}} (override active)\\033[0m" >&2
    fi
    
    # Pass to af yolife for specific subcommands (ts-refresh, inventory, ssh-probe, ssm)
    "$AY_AF" yolife "$@"
}}

# Export the function
export -f ay_yo 2>/dev/null || true

# ============================================================
# END PATCH
# ============================================================
'''

def main():
    print(f"🔧 Patching ay_yo function in {BASHRC}...")
    
    # Create backup
    backup_file = BASHRC.with_suffix(f".backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    import shutil
    shutil.copy2(BASHRC, backup_file)
    print(f"✅ Backup created: {backup_file}")
    
    # Append the new function
    with open(BASHRC, 'a') as f:
        f.write(NEW_FUNCTION)
    
    print()
    print("✅ Patch applied successfully!")
    print()
    print("📋 Next steps:")
    print("   1. Reload your shell:")
    print("      source ~/.bashrc")
    print()
    print("   2. Test interactive mode:")
    print("      ay yo i")
    print()
    print("   3. (Optional) Clean up old ay_yo definitions in", BASHRC)
    print("      The new function is at the end, marked with comments")
    print()
    print("💡 If you encounter issues, restore backup with:")
    print(f"   cp {backup_file} ~/.bashrc && source ~/.bashrc")

if __name__ == "__main__":
    main()

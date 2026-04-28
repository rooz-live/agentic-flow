#!/bin/bash
set -euo pipefail
echo "--> [WSJF 8.5] Vaporizing The Graveyard (/Users/Deleted Users)..."
if [ -d "/Users/Deleted Users" ]; then
    sudo chmod -R -N "/Users/Deleted Users" 2>/dev/null || true
    sudo xattr -cr "/Users/Deleted Users" 2>/dev/null || true
    sudo find "/Users/Deleted Users" -depth -exec rm -rf {} \; 2>/dev/null || true
    echo "✅ Graveyard Obliterated."
fi

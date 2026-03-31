#!/usr/bin/env bash
set -euo pipefail

# Launch the Admin Panel (local static file)
PANEL_PATH="$(dirname "$0")/../tools/dashboard/admin_panel.html"

if [[ ! -f "$PANEL_PATH" ]]; then
  echo "Admin panel not found at: $PANEL_PATH" >&2
  exit 1
fi

# Try to open with the default browser (macOS 'open', Linux 'xdg-open')
if command -v open >/dev/null 2>&1; then
  open "$PANEL_PATH"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$PANEL_PATH"
else
  echo "Please open this file in your browser: $PANEL_PATH"
fi

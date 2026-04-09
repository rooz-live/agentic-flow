#!/usr/bin/env bash
# Interactive Yo.life Digital Cockpit - Shell Wrapper

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

exec npx tsx scripts/ay-yo-interactive-cockpit.ts

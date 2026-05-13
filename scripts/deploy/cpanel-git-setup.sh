#!/usr/bin/env bash
# Register the GitHub repo in cPanel Git Version Control
# Run this ON the cPanel server (162.214.80.239) as the ogov user,
# or via WHM Terminal / cPanel Terminal.
#
# Prerequisites:
#   1. SSH key added to GitHub (cPanel > Git Version Control > Manage SSH Keys)
#   2. Node.js installed via cPanel > Setup Node.js App (for builds)
#
# After setup, cPanel auto-deploys on every `git pull` using .cpanel.yml tasks.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/rooz-live/agentic-flow.git}"
REPO_PATH="${REPO_PATH:-/home/tag/repositories/agentic-flow}"
BRANCH="${BRANCH:-main}"

echo "═══════════════════════════════════════════════════"
echo "  cPanel Git Version Control Setup"
echo "═══════════════════════════════════════════════════"

# Check if running on cPanel
if ! command -v uapi &>/dev/null; then
    echo "⚠️  uapi not found — this script must run on the cPanel server."
    echo ""
    echo "Manual steps:"
    echo "  1. Log into cPanel at https://162.214.80.239:2083"
    echo "  2. Go to Git™ Version Control"
    echo "  3. Click 'Create' and enter:"
    echo "     Clone URL:  $REPO_URL"
    echo "     Repo Path:  $REPO_PATH"
    echo "     Branch:     $BRANCH"
    echo "  4. Click 'Create'"
    echo ""
    echo "After creation, deploy by pulling:"
    echo "  cd $REPO_PATH && git pull"
    echo ""
    echo "cPanel will auto-run .cpanel.yml tasks after every pull."
    exit 0
fi

# Create via UAPI
echo "▶ Creating repository via UAPI..."
uapi VersionControl create \
    name="agentic-flow" \
    type="git" \
    repository_root="$REPO_PATH" \
    source_repository="$REPO_URL" \
    branch="$BRANCH"

echo "✅ Repository registered in cPanel Git Version Control"
echo ""

# Initial pull + deploy
echo "▶ Running initial pull and deploy..."
uapi VersionControl update \
    repository_root="$REPO_PATH" \
    branch="$BRANCH"

echo "✅ Initial deployment triggered"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Setup complete"
echo "  Repo:    $REPO_URL"
echo "  Path:    $REPO_PATH"
echo "  Branch:  $BRANCH"
echo "  Deploy:  .cpanel.yml tasks run on every git pull"
echo "═══════════════════════════════════════════════════"

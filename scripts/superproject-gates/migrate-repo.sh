#!/usr/bin/env bash
set -euo pipefail

# Repository Migration: Reduce technical debt, establish lean guardrails
# Moves majority of root files/folders into structured hierarchy

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="$CODE_ROOT.archive-before-$TIMESTAMP"

echo "🔧 Starting repository restructure..."
echo "📁 Code root: $CODE_ROOT"
echo "💾 Backup: $BACKUP_DIR"

# Create backup
mkdir -p "$BACKUP_DIR"
echo "📦 Creating backup snapshot..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.venv' \
  "$CODE_ROOT/" "$BACKUP_DIR/"

# Ensure target structure exists
mkdir -p "$CODE_ROOT/projects"
mkdir -p "$CODE_ROOT/config"
mkdir -p "$CODE_ROOT/docs"
mkdir -p "$CODE_ROOT/observability"
mkdir -p "$CODE_ROOT/testing"
mkdir -p "$CODE_ROOT/tooling"
mkdir -p "$CODE_ROOT/experimental"
mkdir -p "$CODE_ROOT/media"
mkdir -p "$CODE_ROOT/archive"
mkdir -p "$CODE_ROOT/retiring"

# 1. Move core project
if [ -d "$CODE_ROOT/agentic-flow-core" ]; then
  echo "🚀 Moving agentic-flow-core → projects/"
  mv "$CODE_ROOT/agentic-flow-core" "$CODE_ROOT/projects/"
fi

# 2. Consolidate configs
echo "⚙️ Consolidating configurations..."
for cfg in .mcp.json .gitleaks.toml package.json package-lock.json requirements.txt docker-compose*.yml; do
  if [ -f "$CODE_ROOT/$cfg" ]; then
    mv "$CODE_ROOT/$cfg" "$CODE_ROOT/config/"
  fi
done

# 3. Centralize docs
echo "📚 Centralizing documentation..."
if [ -d "$CODE_ROOT/.github" ]; then
  mv "$CODE_ROOT/.github" "$CODE_ROOT/docs/github"
fi
for md in *.md; do
  if [ -f "$CODE_ROOT/$md" ] && [ "$md" != "README.md" ]; then
    mv "$CODE_ROOT/$md" "$CODE_ROOT/docs/"
  fi
done

# 4. Unify testing
echo "🧪 Unifying testing..."
if [ -d "$CODE_ROOT/projects/agentic-flow-core/src/tests" ]; then
  mkdir -p "$CODE_ROOT/testing/agentic-flow-core"
  mv "$CODE_ROOT/projects/agentic-flow-core/src/tests"/* "$CODE_ROOT/testing/agentic-flow-core/"
  rmdir "$CODE_ROOT/projects/agentic-flow-core/src/tests" 2>/dev/null || true
fi
if [ -d "$CODE_ROOT/testing" ] && [ "$(ls -A "$CODE_ROOT/testing")" = "" ]; then
  rmdir "$CODE_ROOT/testing"
fi
mkdir -p "$CODE_ROOT/testing"

# 5. Observability hub
echo "📊 Building observability hub..."
for obs in .swarm .hive-mind .agentdb .claude-flow; do
  if [ -d "$CODE_ROOT/$obs" ]; then
    mv "$CODE_ROOT/$obs" "$CODE_ROOT/observability/"
  fi
done

# 6. Tooling scripts
echo "🛠️ Consolidating tooling..."
if [ -d "$CODE_ROOT/projects/agentic-flow-core/scripts" ]; then
  mkdir -p "$CODE_ROOT/tooling/agentic-flow-core"
  mv "$CODE_ROOT/projects/agentic-flow-core/scripts"/* "$CODE_ROOT/tooling/agentic-flow-core/"
  rmdir "$CODE_ROOT/projects/agentic-flow-core/scripts" 2>/dev/null || true
fi
for script in *.sh tooling scripts; do
  if [ -d "$CODE_ROOT/$script" ] && [ "$script" != "tooling" ]; then
    mv "$CODE_ROOT/$script" "$CODE_ROOT/tooling/"
  fi
done

# 7. Archive legacy
echo "🗄️ Archiving legacy..."
for legacy in archive .archived-temp .snapshots tmp; do
  if [ -d "$CODE_ROOT/$legacy" ]; then
    mv "$CODE_ROOT/$legacy" "$CODE_ROOT/archive/"
  fi
done

# 8. Retiring queue
echo "🗑️ Queue retiring items..."
for retire in retiring .venv .pytest_cache .mypy_cache node_modules; do
  if [ -d "$CODE_ROOT/$retire" ]; then
    mv "$CODE_ROOT/$retire" "$CODE_ROOT/retiring/"
  fi
done

# Update guardrails: hierarchical mesh config
echo "🔧 Updating guardrails..."
cat > "$CODE_ROOT/settings.json" << 'EOF'
{
  "topology": "hierarchical-mesh",
  "maxAgents": 15,
  "memory": {
    "backend": "hybrid",
    "enableHNSW": true,
    "sparseAttention": {
      "enabled": true,
      "sparsity": 0.8,
      "blockSize": 64
    }
  },
  "neural": {"enabled": true},
  "observability": {
    "statusLine": {"enabled": true, "interval": 5000},
    "realtime": {"enabled": true, "websocket": true}
  },
  "guardrails": {
    "maxFolderSizeMB": {
      "projects": 500,
      "config": 50,
      "docs": 100,
      "testing": 200,
      "tooling": 100,
      "experimental": 300,
      "media": 200,
      "archive": 1000,
      "retiring": 50
    },
    "retentionDays": 90
  }
}
EOF

# Create dynamic AY selector with updated paths
cat > "$CODE_ROOT/tooling/ay-dynamic-selector.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV="${AY_ENV:-local}"
MODE="${AY_MODE:-prod}"

# Remote targets
STX_HOST="${YOLIFE_STX_HOST:-}"
STX_PORT="${YOLIFE_STX_PORTS:-2222}"
STX_KEY="${YOLIFE_STX_KEY:-}"
CPANEL_HOST="${YOLIFE_CPANEL_HOST:-}"
CPANEL_PORT="${YOLIFE_CPANEL_PORTS:-2222}"
CPANEL_KEY="${YOLIFE_CPANEL_KEY:-}"
GITLAB_HOST="${YOLIFE_GITLAB_HOST:-}"
GITLAB_PORT="${YOLIFE_GITLAB_PORTS:-2222}"
GITLAB_KEY="${YOLIFE_GITLAB_KEY:-}"

check_ssh() {
  local host="$1" port="$2" key="$3"
  [[ -n "$host" && -n "$key" ]] || return 1
  ssh -i "$key" -p "$port" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$host" 'echo OK' >/dev/null 2>&1
}

select_ay_mode() {
  case "$ENV" in
    stx) check_ssh "$STX_HOST" "$STX_PORT" "$STX_KEY" && echo "ay-prod (remote STX)" && return 0 ;;
    cpanel) check_ssh "$CPANEL_HOST" "$CPANEL_PORT" "$CPANEL_KEY" && echo "ay-prod (remote CPanel)" && return 0 ;;
    gitlab) check_ssh "$GITLAB_HOST" "$GITLAB_PORT" "$GITLAB_KEY" && echo "ay-yolife (remote GitLab)" && return 0 ;;
    hybrid)
      if check_ssh "$GITLAB_HOST" "$GITLAB_PORT" "$GITLAB_KEY"; then
        echo "ay-yolife (remote GitLab)"
      elif check_ssh "$STX_HOST" "$STX_PORT" "$STX_KEY" || check_ssh "$CPANEL_HOST" "$CPANEL_PORT" "$CPANEL_KEY"; then
        echo "ay-prod (remote STX/CPanel)"
      else
        echo "ay-yolife (local fallback)"
      fi
      return 0
      ;;
    *)
      [[ "$MODE" == "yolife" ]] && echo "ay-yolife (local)" || echo "ay-prod (local)"
      return 0
      ;;
  esac
  echo "ay-yolife (local fallback)"
}

run_selected() {
  local selected=$(select_ay_mode)
  echo "🔀 AY Dynamic Selector: $selected"
  case "$selected" in
    *ay-prod*) exec "$PROJECT_ROOT/tooling/agentic-flow-core/ay-prod-cycle.sh" "$@" ;;
    *ay-yolife*) exec "$PROJECT_ROOT/tooling/agentic-flow-core/ay-yo.sh" "$@" ;;
    *) echo "❌ Unable to determine AY mode"; exit 1 ;;
  esac
}

case "${1:-}" in
  check) select_ay_mode ;;
  run) shift; run_selected "$@" ;;
  *) echo "Usage: $0 {check|run [args...]}"; exit 1 ;;
esac
EOF
chmod +x "$CODE_ROOT/tooling/ay-dynamic-selector.sh"

# Update paths in project configs
echo "🔄 Updating import paths..."
find "$CODE_ROOT/projects" -name package.json -exec sed -i.bak 's|"../scripts|"../../tooling|g' {} \;
find "$CODE_ROOT/projects" -name "*.ts" -o -name "*.js" | while read -r f; do
  sed -i.bak 's|from "../../../scripts|from "../../../tooling|g' "$f"
  sed -i.bak 's|from "../../scripts|from "../../tooling|g' "$f"
done

# Summary
echo ""
echo "✅ Repository restructure complete!"
echo "📊 New structure:"
tree -L 2 "$CODE_ROOT" -I '.git|node_modules|.venv'
echo ""
echo "🔧 Next steps:"
echo "  1. Test: $CODE_ROOT/tooling/ay-dynamic-selector.sh check"
echo "  2. Run QE fleet: npm run qe:fleet"
echo "  3. Apply hive-mind sprint: npm run qe:fix"
echo "  4. Commit changes: git add . && git commit -m 'feat: restructure to lean monorepo with guardrails'"
EOF
chmod +x "$CODE_ROOT/tooling/migrate-repo.sh"

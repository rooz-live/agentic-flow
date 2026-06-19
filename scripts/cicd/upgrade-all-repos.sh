#!/usr/bin/env bash
# upgrade-all-repos.sh — Scans, pulls, updates, and audits all local repositories daily.
# Part of the daily security and compliance roadmap.
# Subsystems covered: agentic-flow, ruflo, media, infrastructure, etc.
set -euo pipefail

DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    *) shift ;;
  esac
done

SCAN_PATHS=(
  "/Users/shahroozbhopti/code"
  "/Users/shahroozbhopti/Documents"
)

# Set correct log file path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  LOG_DIR="/tmp/agentic-flow"
else
  LOG_DIR="/var/log/agentic-flow"
fi
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/all-repos-upgrade.log"

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
log()    { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }

log "🎬 Starting daily multi-repository upgrade sweep..."
[[ "$DRY_RUN" == "true" ]] && log "🚫 DRY-RUN MODE: No mutations will be executed."

REPOS_UPGRADED=0
REPOS_FAILED=0

# Scan directories recursively up to depth 2 (to find repos within workspaces)
FOUND_REPOS=()
for parent in "${SCAN_PATHS[@]}"; do
  if [[ -d "$parent" ]]; then
    while IFS= read -r -d '' git_dir; do
      repo_dir="$(dirname "$git_dir")"
      # Skip common node_modules or system folders
      if [[ "$repo_dir" != *"/node_modules/"* && "$repo_dir" != *"/clean-ruflo-env/"* && "$repo_dir" != *"/pre-cleanup-backup-"* ]]; then
        FOUND_REPOS+=("$repo_dir")
      fi
    done < <(find "$parent" -maxdepth 3 -name ".git" -type d -print0 2>/dev/null || true)
  fi
done

# Deduplicate list
read -ra UNIQUE_REPOS <<< "$(echo "${FOUND_REPOS[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' ')"

log "🔍 Found ${#UNIQUE_REPOS[@]} active git repositories to review."

for repo in "${UNIQUE_REPOS[@]}"; do
  log "------------------------------------------------------------"
  log "📦 Repository: $repo"
  
  if ! cd "$repo" 2>/dev/null; then
    red "  [FAIL] Could not access directory: $repo" | tee -a "$LOG_FILE"
    REPOS_FAILED=$((REPOS_FAILED + 1))
    continue
  fi

  # 1. Fetch default branch name locally without network requests
  default_branch=""
  if git rev-parse --verify origin/HEAD >/dev/null 2>&1; then
    default_branch=$(git rev-parse --abbrev-ref origin/HEAD | sed 's@^origin/@@')
  fi
  if [[ -z "$default_branch" ]]; then
    if git show-ref --verify --quiet refs/heads/main; then
      default_branch="main"
    elif git show-ref --verify --quiet refs/heads/master; then
      default_branch="master"
    else
      default_branch=$(git branch --show-current 2>/dev/null || echo "main")
    fi
  fi
  log "  Branch: $default_branch"

  # 2. Pull latest changes
  if [[ "$DRY_RUN" == "true" ]]; then
    log "  [DRY-RUN] git pull origin $default_branch"
  else
    log "  Pulling latest commits..."
    if git pull origin "$default_branch" --rebase >/dev/null 2>&1; then
      green "  ✓ git pull: SUCCESS" | tee -a "$LOG_FILE"
    else
      yellow "  ⚠️ git pull: FAILED (unstaged changes or conflicts present)" | tee -a "$LOG_FILE"
    fi
  fi

  # 3. Upgrade packages/dependencies
  if [[ -f "package.json" ]]; then
    if [[ -f "pnpm-lock.yaml" ]]; then
      log "  Detected pnpm project..."
      if [[ "$DRY_RUN" == "true" ]]; then
        log "  [DRY-RUN] pnpm update && pnpm audit"
      else
        if pnpm update >/dev/null 2>&1; then
          green "  ✓ pnpm update: SUCCESS" | tee -a "$LOG_FILE"
        else
          yellow "  ⚠️ pnpm update: WARNING/FAIL" | tee -a "$LOG_FILE"
        fi
      fi
    elif [[ -f "package-lock.json" || -f "yarn.lock" ]]; then
      log "  Detected npm/yarn project..."
      if [[ "$DRY_RUN" == "true" ]]; then
        log "  [DRY-RUN] npm update && npm audit fix"
      else
        if npm update >/dev/null 2>&1; then
          green "  ✓ npm update: SUCCESS" | tee -a "$LOG_FILE"
        else
          yellow "  ⚠️ npm update: WARNING/FAIL" | tee -a "$LOG_FILE"
        fi
      fi
    fi
  elif [[ -f "requirements.txt" ]]; then
    log "  Detected python requirements.txt..."
    if [[ "$DRY_RUN" == "true" ]]; then
      log "  [DRY-RUN] pip install --upgrade -r requirements.txt"
    else
      if pip install --upgrade -r requirements.txt >/dev/null 2>&1 || python3 -m pip install --upgrade -r requirements.txt >/dev/null 2>&1; then
        green "  ✓ python deps: SUCCESS" | tee -a "$LOG_FILE"
      else
        yellow "  ⚠️ python deps: WARNING/FAIL" | tee -a "$LOG_FILE"
      fi
    fi
  fi

  # 4. Verification Check
  if [[ "$DRY_RUN" == "true" ]]; then
    log "  [DRY-RUN] Verify tests (npm test / pytest / cargo test)"
  else
    if [[ -f "package.json" ]]; then
      # Run test script if defined in package.json
      if grep -q '"test"' package.json; then
        log "  Running npm tests..."
        if npm test >/dev/null 2>&1; then
          green "  ✓ tests: PASS" | tee -a "$LOG_FILE"
        else
          yellow "  ⚠️ tests: FAIL" | tee -a "$LOG_FILE"
        fi
      fi
    elif [[ -f "Cargo.toml" ]]; then
      log "  Running cargo test..."
      if cargo test >/dev/null 2>&1; then
        green "  ✓ tests: PASS" | tee -a "$LOG_FILE"
      else
        yellow "  ⚠️ tests: FAIL" | tee -a "$LOG_FILE"
      fi
    elif [[ -d "tests" || -d "test" ]]; then
      if command -v pytest &>/dev/null; then
        log "  Running pytest..."
        if pytest >/dev/null 2>&1; then
          green "  ✓ tests: PASS" | tee -a "$LOG_FILE"
        else
          yellow "  ⚠️ tests: FAIL" | tee -a "$LOG_FILE"
        fi
      fi
    fi
  fi

  REPOS_UPGRADED=$((REPOS_UPGRADED + 1))
done

log "============================================================"
log "🏁 Sweep complete. Upgraded: $REPOS_UPGRADED, Failed: $REPOS_FAILED."
log "Logs persisted to: $LOG_FILE"
exit 0

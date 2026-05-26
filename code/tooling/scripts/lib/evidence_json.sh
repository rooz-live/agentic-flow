#!/usr/bin/env bash
# Shared NDJSON + evidence artifact helpers (source from gate scripts).

resolve_repo_root() {
  local d
  d="$(cd "${1:-.}" 2>/dev/null && pwd)" || return 1
  while [[ "$d" != "/" ]]; do
    if [[ -f "$d/scripts/one.sh" ]] && git -C "$d" rev-parse --git-dir >/dev/null 2>&1; then
      echo "$d"
      return 0
    fi
    d="$(dirname "$d")"
  done
  return 1
}

ensure_monorepo_repo_root() {
  if [[ -f "${REPO_ROOT}/scripts/one.sh" ]]; then
    return 0
  fi
  local resolved
  if resolved="$(resolve_repo_root "${1:-$REPO_ROOT}")"; then
    REPO_ROOT="$resolved"
    export REPO_ROOT
    return 0
  fi
  echo "ERROR: REPO_ROOT is not the main checkout (missing scripts/one.sh at ${REPO_ROOT})." >&2
  echo "  cd to your full repo (e.g. ~/Documents/code) or export REPO_ROOT=/path/to/repo" >&2
  return 1
}

evidence_dir() {
  local kind="$1"
  echo "${EVIDENCE_ROOT:-${REPO_ROOT:-.}/.goalie/evidence}/$kind"
}

write_evidence_artifact() {
  local kind="$1" exit_code="$2" payload="$3"
  local dir run_id path head_sha
  dir="$(evidence_dir "$kind")"
  mkdir -p "$dir"
  run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  path="$dir/${kind%%/*}_${run_id}.json"
  head_sha="$(git -C "${REPO_ROOT:-.}" rev-parse HEAD 2>/dev/null)" || head_sha="no-commit"
  python3 - "$path" "$kind" "$exit_code" "$head_sha" "$payload" <<'PY'
import hashlib, json, sys, time
path, kind, exit_code, head_sha, payload = sys.argv[1:6]
data = json.loads(payload) if payload else {}
doc = {
  "kind": kind,
  "exit_code": int(exit_code),
  "head_sha": head_sha,
  "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "unix": int(time.time()),
  "checks": data,
}
raw = json.dumps(doc, sort_keys=True).encode()
doc["artifact_sha"] = hashlib.sha256(raw).hexdigest()
open(path, "w").write(json.dumps(doc, indent=2) + "\n")
latest = path.rsplit("/", 1)[0] + "/latest.json"
open(latest, "w").write(json.dumps({"path": path, "head_sha": head_sha, "exit_code": int(exit_code)}, indent=2) + "\n")
print(path)
PY
}

read_latest_evidence() {
  local kind="$1"
  local latest
  latest="$(evidence_dir "$kind")/latest.json"
  [[ -f "$latest" ]] || return 1
  python3 - "$latest" <<'PY'
import json, sys
print(json.dumps(json.load(open(sys.argv[1]))))
PY
}

perceive_evidence() {
  local kind="$1" max_age_sec="${2:-86400}"
  local latest_dir artifact exit_code head current_head
  latest_dir="$(evidence_dir "$kind")"
  [[ -f "$latest_dir/latest.json" ]] || return 1
  read -r artifact exit_code head <<<"$(python3 - "$latest_dir/latest.json" "$max_age_sec" <<'PY' || true
import json, sys, time, os
latest = json.load(open(sys.argv[1]))
max_age = int(sys.argv[2])
path = latest.get("path", "")
if not path or not os.path.isfile(path):
    sys.exit(0)
doc = json.load(open(path))
head = doc.get("head_sha", "")
exit_code = str(doc.get("exit_code", 1))
age = int(time.time()) - int(doc.get("unix", 0))
if age > max_age:
    sys.exit(0)
print(path, exit_code, head)
PY
)"
  [[ -n "${artifact:-}" ]] || return 1
  current_head="$(git -C "${REPO_ROOT:-.}" rev-parse HEAD 2>/dev/null)" || current_head="no-commit"
  if [[ "$exit_code" == "0" ]] && [[ "$head" == "$current_head" ]]; then
    echo "PERCEIVE OK $kind artifact=$artifact head=$head"
    return 0
  fi
  return 1
}

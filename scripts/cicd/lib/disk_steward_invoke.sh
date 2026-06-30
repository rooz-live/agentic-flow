#!/usr/bin/env bash
# Invoke disk_steward when disk is low (shared by doctor, tick, wsjf exec).
# Env (optional): AF_DISK_STEWARD_REPAIR=1 enables REPAIR tier (broken tags, pack quarantine, fetch).
#                 AF_DISK_FSCK_TIMEOUT_SEC overrides full-fsck timeout (default 600; connectivity 60s).
disk_steward_maybe() {
  local root="${1:?root required}"
  if [[ "${AF_SKIP_DISK_STEWARD:-0}" == "1" ]]; then
    echo "SKIP disk_steward (AF_SKIP_DISK_STEWARD=1)"
    return 0
  fi
  [[ -x "$root/scripts/cicd/disk_steward.sh" ]] || return 0
  local auto="${AF_DISK_STEWARD_AUTO_APPLY:-1}"
  local err_set=0
  if [[ "$-" == *e* ]]; then
    err_set=1
  fi
  set +e
  AF_DISK_STEWARD_AUTO_APPLY="$auto" \
    AF_DISK_STEWARD_REPAIR="${AF_DISK_STEWARD_REPAIR:-0}" \
    AF_DISK_FSCK_TIMEOUT_SEC="${AF_DISK_FSCK_TIMEOUT_SEC:-}" \
    REPO_ROOT="$root" bash "$root/scripts/cicd/disk_steward.sh"
  local rc=$?
  if [[ $err_set -eq 1 ]]; then
    set -e
  fi
  if [[ "${AF_DISK_STEWARD_ENFORCE:-0}" == "1" && $rc -ne 0 ]]; then
    return "$rc"
  fi
  return 0
}
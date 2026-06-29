#!/usr/bin/env bash
# Invoke disk_steward when disk is low (shared by doctor, tick, wsjf exec).
disk_steward_maybe() {
  local root="${1:?root required}"
  [[ -x "$root/scripts/cicd/disk_steward.sh" ]] || return 0
  local auto="${AF_DISK_STEWARD_AUTO_APPLY:-1}"
  set +e
  AF_DISK_STEWARD_AUTO_APPLY="$auto" REPO_ROOT="$root" bash "$root/scripts/cicd/disk_steward.sh"
  local rc=$?
  set -e
  if [[ "${AF_DISK_STEWARD_ENFORCE:-0}" == "1" && $rc -ne 0 ]]; then
    return "$rc"
  fi
  return 0
}

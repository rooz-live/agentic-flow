#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation — Runner.

Executes per-repo integration checks with:
  • Per-repo run_timeout_s from registry (fallback: default_run_timeout_s).
  • Configurable retry count (registry retry field); only retries on timeout or
    process-level failure, NOT on deliberate non-zero exit (test failure).
  • Optional DoR command check before the integration test.
  • Log output truncated to log_truncate_bytes to keep evidence artefacts bounded.
  • Optional parallel execution across repos (--parallel flag from engine).
"""

import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LOG_TRUNCATE_BYTES_DEFAULT = 8192
DEFAULT_RUN_TIMEOUT_S = 120
DEFAULT_RETRY = 1

# Exit codes that indicate a transient/process failure worth retrying.
# A deliberate non-zero test failure (e.g. pytest) should NOT be retried.
_TRANSIENT_EXCEPTIONS = (subprocess.TimeoutExpired, OSError, MemoryError)


def _run_cmd(
    command: str,
    project_root: Path,
    timeout_s: int,
    log_truncate_bytes: int,
) -> Tuple[bool, float, str]:
    """Run a shell command, returning (passed, duration_s, truncated_log)."""
    start = time.monotonic()
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        elapsed = round(time.monotonic() - start, 2)
        raw_log = proc.stdout + "\n" + proc.stderr
        log = _truncate(raw_log, log_truncate_bytes)
        return proc.returncode == 0, elapsed, log
    except subprocess.TimeoutExpired:
        elapsed = round(time.monotonic() - start, 2)
        return False, elapsed, f"[TIMEOUT after {timeout_s}s]"
    except Exception as exc:  # noqa: BLE001
        elapsed = round(time.monotonic() - start, 2)
        return False, elapsed, f"[EXCEPTION] {exc}"


def _truncate(text: str, max_bytes: int) -> str:
    encoded = text.encode("utf-8", errors="replace")
    if len(encoded) <= max_bytes:
        return text
    tail = encoded[-max_bytes:]
    truncated_bytes = len(encoded) - max_bytes
    return f"[... {truncated_bytes} bytes truncated ...]\n" + tail.decode("utf-8", errors="replace")


def run_one_repo(
    repo: Dict[str, Any],
    remote_sha: str,
    project_root: Path,
    *,
    run_timeout_s: int = DEFAULT_RUN_TIMEOUT_S,
    retry: int = DEFAULT_RETRY,
    log_truncate_bytes: int = LOG_TRUNCATE_BYTES_DEFAULT,
) -> Dict[str, Any]:
    """Run integration check for a single repo with retry logic.

    DoR command (if present) is checked once before any retry.
    The integration test is retried up to `retry` times on process failure.
    It is NOT retried on deliberate test suite exit-1 (treat as real failure).
    """
    repo_id = repo["id"]
    url = repo["url"]
    branch = repo["branch"]
    test_cmd: str = repo["integration_test"]
    dor_cmd: Optional[str] = repo.get("dor_cmd")

    print(f"\n▶  {repo_id}  ({url}@{branch})")

    # ── DoR check ─────────────────────────────────────────────────────────────
    dor_status = "skipped"
    if dor_cmd:
        print(f"  [DoR] {dor_cmd}")
        ok, dur, log = _run_cmd(dor_cmd, project_root, 30, log_truncate_bytes)
        if not ok:
            print(f"  ❌ DoR FAILED ({dur}s) — skipping integration test for {repo_id}")
            return _result(repo_id, url, branch, remote_sha,
                           passed=False, duration=dur,
                           log=log, dor_status="fail", attempts=0)
        dor_status = "pass"
        print(f"  ✓  DoR passed ({dur}s)")

    # ── Integration test (with retry) ─────────────────────────────────────────
    attempts = 0
    passed = False
    duration = 0.0
    log = ""
    transient_fail = False

    for attempt in range(max(1, retry)):
        attempts += 1
        if attempt > 0:
            print(f"  🔁 Retry {attempt}/{retry - 1} for {repo_id}...")
        print(f"  [test] {test_cmd}")
        try:
            passed, duration, log = _run_cmd(
                test_cmd, project_root, run_timeout_s, log_truncate_bytes
            )
            status_str = "PASS" if passed else "FAIL"
            print(f"  {status_str}  ({duration}s)")
            if passed:
                break
            # If the command ran successfully but tests failed, that's a real
            # failure — do not retry.
            transient_fail = "[TIMEOUT" in log or "[EXCEPTION" in log
            if not transient_fail:
                break
        except _TRANSIENT_EXCEPTIONS as exc:
            duration = round(time.monotonic(), 2)
            log = f"[PROCESS ERROR] {exc}"
            transient_fail = True
            print(f"  ⚠️  Process error on attempt {attempts}: {exc}")

    return _result(repo_id, url, branch, remote_sha,
                   passed=passed, duration=duration,
                   log=log if not passed else None,
                   dor_status=dor_status, attempts=attempts)


def _result(
    repo_id: str,
    url: str,
    branch: str,
    remote_sha: str,
    *,
    passed: bool,
    duration: float,
    log: Optional[str],
    dor_status: str,
    attempts: int,
) -> Dict[str, Any]:
    return {
        "repository_id": repo_id,
        "url": url,
        "branch": branch,
        "latest_commit_sha": remote_sha,
        "integration_status": "PASS" if passed else "FAIL",
        "duration_seconds": duration,
        "skipped": False,
        "attempts": attempts,
        "dor_status": dor_status,
        "log": log,
    }


def run_validations(
    repos: List[Dict[str, Any]],
    to_validate: List[Dict[str, Any]],
    remote_heads: Dict[str, str],
    project_root: Path,
    *,
    parallel: bool = False,
    decentralized: bool = False,
    default_run_timeout_s: int = DEFAULT_RUN_TIMEOUT_S,
    default_retry: int = DEFAULT_RETRY,
    log_truncate_bytes: int = LOG_TRUNCATE_BYTES_DEFAULT,
) -> List[Dict[str, Any]]:
    """Validate all targets; skip repos that are already cached/up-to-date."""
    results: List[Dict[str, Any]] = []
    to_validate_ids = {r["id"] for r in to_validate}

    # Split into skip-list and run-list
    skip_repos = [r for r in repos if r.get("active") and r["id"] not in to_validate_ids]
    run_repos = [r for r in repos if r.get("active") and r["id"] in to_validate_ids]

    # Emit cached-pass entries immediately
    for repo in skip_repos:
        results.append({
            "repository_id": repo["id"],
            "url": repo["url"],
            "branch": repo["branch"],
            "latest_commit_sha": remote_heads.get(repo["id"], "unknown"),
            "integration_status": "PASS",
            "duration_seconds": 0.0,
            "skipped": True,
            "attempts": 0,
            "dor_status": "skipped",
            "log": None,
        })

    if not run_repos:
        return results

    def _run(repo: Dict[str, Any]) -> Dict[str, Any]:
        t = int(repo.get("run_timeout_s", default_run_timeout_s))
        r = int(repo.get("retry", default_retry))
        return run_one_repo(
            repo,
            remote_heads.get(repo["id"], "unknown"),
            project_root,
            run_timeout_s=t,
            retry=r,
            log_truncate_bytes=log_truncate_bytes,
        )

    def _run_with_lock(repo: Dict[str, Any]) -> Dict[str, Any]:
        if decentralized:
            from decentralized_lock import DecentralizedLock
            lock = DecentralizedLock(project_root / ".goalie" / "locks", repo["id"])
            if not lock.acquire():
                print(f"🔒 Repo {repo['id']} is locked by another worker. Skipping.")
                return {
                    "repository_id": repo["id"],
                    "url": repo["url"],
                    "branch": repo["branch"],
                    "latest_commit_sha": remote_heads.get(repo["id"], "unknown"),
                    "integration_status": "PASS",
                    "duration_seconds": 0.0,
                    "skipped": True,
                    "attempts": 0,
                    "dor_status": "locked",
                    "log": "Claimed by another worker",
                }
            try:
                return _run(repo)
            finally:
                lock.release()
        else:
            return _run(repo)

    if parallel and len(run_repos) > 1:
        with ThreadPoolExecutor(max_workers=len(run_repos)) as pool:
            futures = {pool.submit(_run_with_lock, r): r["id"] for r in run_repos}
            for fut in as_completed(futures):
                results.append(fut.result())
    else:
        for repo in run_repos:
            results.append(_run_with_lock(repo))

    return results

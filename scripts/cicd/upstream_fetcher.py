#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation — Fetcher.

Queries remote repository heads concurrently and detects changes against the
local SHA cache.  New vs. previous behaviour:

  • ThreadPoolExecutor parallel ls-remote (one thread per active repo).
  • Per-repo timeout_s from registry (fallback: upgrades_configuration.default_timeout_s).
  • Registry schema validation: required fields, type checks.
  • Returns typed FetchResult namedtuple for easier downstream handling.
"""

import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, NamedTuple, Optional, Tuple

OFFLINE_SENTINEL = "offline_or_cached_sha"
DEFAULT_MAX_RETRIES = 2
REQUIRED_REPO_FIELDS = {"id", "url", "branch", "integration_test"}


# ─────────────────────────────────────────────────────────────────────────────
# Registry schema validation
# ─────────────────────────────────────────────────────────────────────────────

class RegistryValidationError(ValueError):
    pass


def validate_registry(config: dict) -> None:
    """Raise RegistryValidationError if the registry is structurally invalid."""
    repos = config.get("repositories")
    if not isinstance(repos, list):
        raise RegistryValidationError("registry.repositories must be a list")
    for i, repo in enumerate(repos):
        missing = REQUIRED_REPO_FIELDS - set(repo.keys())
        if missing:
            raise RegistryValidationError(
                f"repository[{i}] missing required fields: {missing}"
            )
        if not isinstance(repo.get("active"), bool):
            raise RegistryValidationError(
                f"repository[{i}].active must be boolean (got {repo.get('active')!r})"
            )


# ─────────────────────────────────────────────────────────────────────────────
# Remote HEAD fetch (single repo, called from thread)
# ─────────────────────────────────────────────────────────────────────────────

class FetchResult(NamedTuple):
    repo_id: str
    sha: str          # OFFLINE_SENTINEL when unreachable
    error: Optional[str]


def _fetch_one(repo_id: str, url: str, branch: str, timeout_s: int) -> FetchResult:
    """Fetch HEAD SHA for one remote branch; returns OFFLINE_SENTINEL on any error."""
    try:
        proc = subprocess.run(
            ["git", "ls-remote", url, f"refs/heads/{branch}"],
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        if proc.returncode != 0:
            return FetchResult(repo_id, OFFLINE_SENTINEL,
                               f"ls-remote exit {proc.returncode}: {proc.stderr.strip()}")
        out = proc.stdout.strip()
        if out:
            sha = out.split()[0]
            return FetchResult(repo_id, sha, None)
        return FetchResult(repo_id, OFFLINE_SENTINEL, "empty ls-remote output")
    except subprocess.TimeoutExpired:
        return FetchResult(repo_id, OFFLINE_SENTINEL, f"timeout after {timeout_s}s")
    except Exception as exc:  # noqa: BLE001
        return FetchResult(repo_id, OFFLINE_SENTINEL, str(exc))


def _fetch_one_with_retry(
    repo_id: str,
    url: str,
    branch: str,
    timeout_s: int,
    max_retries: int = DEFAULT_MAX_RETRIES,
) -> FetchResult:
    """Fetch HEAD SHA for one remote branch with exponential-backoff retries.

    Retries only on transient errors (timeout, non-zero exit, empty output).
    Permanent errors such as exit 128 or "not found" are not retried.
    """
    for attempt in range(max_retries + 1):
        result = _fetch_one(repo_id, url, branch, timeout_s)
        if result.sha != OFFLINE_SENTINEL:
            return result

        permanent_error = result.error and (
            "exit 128" in result.error or "not found" in result.error
        )
        if permanent_error or attempt >= max_retries:
            return result

        sleep_s = min(2 ** attempt, 30)
        print(f"⚠️  {repo_id}: transient error, retry {attempt + 1}/{max_retries}...")
        time.sleep(sleep_s)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Cache helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_cache(cache_path: Path) -> Dict[str, str]:
    """Load last-known-good SHAs; return {} on any error."""
    if not cache_path.exists():
        return {}
    try:
        data = json.loads(cache_path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠️  Warning: Failed to load SHA cache ({exc})")
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def fetch_active_targets(
    project_root: Path,
    *,
    parallel: bool = True,
) -> Tuple[List[Dict[str, Any]], Dict[str, str], Dict[str, str], List[Dict[str, Any]]]:
    """Load registry, fetch remote SHAs (parallel by default), diff against cache.

    Returns:
        (repos, cache, remote_heads, to_validate)
    """
    config_path = project_root / "config" / "cicd" / "upstream_registry.json"
    cache_path = (
        project_root / ".goalie" / "evidence" / "upgrades" / "last_known_heads.json"
    )

    if not config_path.exists():
        print(f"❌ Configuration not found: {config_path}")
        return [], {}, {}, []

    config = json.loads(config_path.read_text(encoding="utf-8"))

    try:
        validate_registry(config)
    except RegistryValidationError as exc:
        print(f"❌ Registry validation failed: {exc}")
        return [], {}, {}, []

    cfg = config.get("upgrades_configuration", {})
    default_timeout = int(cfg.get("default_timeout_s", 20))
    use_parallel = parallel and cfg.get("parallel_fetch", True)

    repos = config.get("repositories", [])
    active_repos = [r for r in repos if r.get("active", False)]
    cache = load_cache(cache_path)

    # ── Parallel (or serial) remote HEAD fetch ──────────────────────────────
    print("🔍 Querying remote heads for upstream targets"
          f" ({'parallel' if use_parallel else 'serial'})...")

    remote_heads: Dict[str, str] = {}
    if use_parallel and active_repos:
        fetch_args = [
            (
                r["id"],
                r["url"],
                r["branch"],
                int(r.get("timeout_s", default_timeout)),
                int(r.get("retry", cfg.get("default_retry", cfg.get("default_max_retries", DEFAULT_MAX_RETRIES)))),
            )
            for r in active_repos
        ]
        with ThreadPoolExecutor(max_workers=len(fetch_args)) as pool:
            futures = {
                pool.submit(_fetch_one_with_retry, *args): args[0]
                for args in fetch_args
            }
            for fut in as_completed(futures):
                result: FetchResult = fut.result()
                remote_heads[result.repo_id] = result.sha
                if result.error:
                    print(f"  ⚠️  {result.repo_id}: {result.error}")
    else:
        for repo in active_repos:
            t = int(repo.get("timeout_s", default_timeout))
            max_retries = int(
                repo.get("retry", cfg.get("default_retry", cfg.get("default_max_retries", DEFAULT_MAX_RETRIES)))
            )
            result = _fetch_one_with_retry(
                repo["id"], repo["url"], repo["branch"], t, max_retries
            )
            remote_heads[result.repo_id] = result.sha
            if result.error:
                print(f"  ⚠️  {result.repo_id}: {result.error}")

    # ── Delta detection ─────────────────────────────────────────────────────
    to_validate: List[Dict[str, Any]] = []
    for repo in active_repos:
        repo_id = repo["id"]
        sha = remote_heads.get(repo_id, OFFLINE_SENTINEL)
        last_sha = cache.get(repo_id)

        if sha == OFFLINE_SENTINEL:
            if last_sha:
                print(f"  📦 {repo_id}: offline — using cached SHA {last_sha[:12]}")
                remote_heads[repo_id] = last_sha
            else:
                print(f"  📦 {repo_id}: offline, no cache — queued for validation")
                to_validate.append(repo)
        elif sha != last_sha:
            old = (last_sha or "none")[:12]
            print(f"  📦 {repo_id}: update detected {old} → {sha[:12]} — queued")
            to_validate.append(repo)
        else:
            print(f"  📦 {repo_id}: up to date at {sha[:12]} — skipped")

    return repos, cache, remote_heads, to_validate

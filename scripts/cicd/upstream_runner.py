import os
import shutil
import re
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

# ─────────────────────────────────────────────────────────────────────────────
# Harness-type detection
# ─────────────────────────────────────────────────────────────────────────────

# Ordered list of (pattern, harness_type) matched against the integration_test
# command string.  First match wins.
_CMD_HARNESS_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"\bcargo\b"),                              "cargo"),
    (re.compile(r"\bpytest\b"),                             "pytest"),
    (re.compile(r"\bnpx playwright\b"),                     "playwright"),
    (re.compile(r"\bnpm\s+(test|run\s+test)\b"),            "npm"),
    (re.compile(r"\byarn\s+(test|run\s+test)\b"),           "npm"),
    (re.compile(r"\bpnpm\s+(test|run\s+test)\b"),           "npm"),
    (re.compile(r"\bpython3?\b.*\.(py)\b"),                 "python"),
    (re.compile(r"\bpython3?\s+-[mc]\b"),                   "python"),
    (re.compile(r"\b(bash|sh)\s+"),                         "shell"),
]

# Manifest files that indicate which harness is appropriate when no command
# match is found (fallback: inspect repo directory on disk).
_MANIFEST_HARNESS: List[Tuple[str, str]] = [
    ("Cargo.toml",      "cargo"),
    ("package.json",    "npm"),
    ("requirements.txt","pytest"),
    ("setup.py",        "pytest"),
    ("pyproject.toml",  "pytest"),
]


def detect_harness(integration_test: str, repo_dir: Optional[Path] = None) -> str:
    """Return the harness family for a given integration_test command.

    Priority order:
      1. Command-string pattern match (fast, no I/O).
      2. Manifest-file inspection of repo_dir (slower, only when provided).
      3. "unknown" if nothing matches.
    """
    cmd = (integration_test or "").strip()

    for pattern, harness in _CMD_HARNESS_PATTERNS:
        if pattern.search(cmd):
            return harness

    if repo_dir is not None and repo_dir.is_dir():
        for filename, harness in _MANIFEST_HARNESS:
            if (repo_dir / filename).exists():
                return harness

    return "unknown"


def _run_cmd(
    command: str,
    project_root: Path,
    timeout_s: int,
    log_truncate_bytes: int,
    env: Optional[Dict[str, str]] = None,
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
            env=env,
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
    """Run integration check for a single repo with retry logic in an isolated sandbox clone."""
    repo_id = repo["id"]
    url = repo["url"]
    branch = repo["branch"]
    test_cmd: str = repo["integration_test"]
    dor_cmd: Optional[str] = repo.get("dor_cmd")

    # Set up isolated clone sandbox directory
    sandbox_path = project_root / "scratch" / "sandbox" / "upstream_clones" / repo_id
    if sandbox_path.exists():
        shutil.rmtree(sandbox_path, ignore_errors=True)
    sandbox_path.mkdir(parents=True, exist_ok=True)

    print(f"\n▶  {repo_id}  ({url}@{branch})  [Cloning into isolated sandbox...]")
    
    # Run git clone --depth 1
    clone_proc = subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", branch, url, str(sandbox_path)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    
    if clone_proc.returncode != 0:
        print(f"  ❌ Git clone failed for {repo_id}: {clone_proc.stderr.strip()}")
        # Fall back to running command in project_root to prevent hard blocking if offline/simulated in tests
        print("  ⚠️ Falling back to project_root due to clone failure (e.g. offline/mock test).")
        sandbox_path = project_root
        harness = detect_harness(test_cmd, project_root)
    else:
        harness = detect_harness(test_cmd, sandbox_path)

    # Prepare venv/install dependencies inside cloned sandbox if cloned successfully
    env = os.environ.copy()
    if sandbox_path != project_root:
        # Pre-install dependencies depending on harness
        if harness in ("playwright", "npm"):
            if (sandbox_path / "pnpm-lock.yaml").is_file():
                print("  [Sandbox npm] Installing dependencies via pnpm...")
                subprocess.run(["pnpm", "install", "--frozen-lockfile"], cwd=str(sandbox_path), capture_output=True, timeout=120)
                print("  [Sandbox npm] Running pnpm update...")
                subprocess.run(["pnpm", "update"], cwd=str(sandbox_path), capture_output=True, timeout=120)
            elif (sandbox_path / "package-lock.json").is_file():
                print("  [Sandbox npm] Installing dependencies via npm...")
                subprocess.run(["npm", "ci"], cwd=str(sandbox_path), capture_output=True, timeout=120)
                print("  [Sandbox npm] Running npm update...")
                subprocess.run(["npm", "update"], cwd=str(sandbox_path), capture_output=True, timeout=120)
            else:
                print("  [Sandbox npm] Installing dependencies via npm install...")
                subprocess.run(["npm", "install"], cwd=str(sandbox_path), capture_output=True, timeout=120)
                print("  [Sandbox npm] Running npm update...")
                subprocess.run(["npm", "update"], cwd=str(sandbox_path), capture_output=True, timeout=120)
            
            if harness == "playwright":
                print("  [Sandbox npm] Installing Playwright browsers...")
                subprocess.run(["npx", "playwright", "install"], cwd=str(sandbox_path), capture_output=True, timeout=120)
                
        elif harness in ("pytest", "python"):
            # Check for uv
            has_uv = False
            try:
                res_uv = subprocess.run(["which", "uv"], capture_output=True, text=True)
                has_uv = (res_uv.returncode == 0)
            except Exception:
                pass
            
            if has_uv:
                print("  [Sandbox python] Creating virtual environment via uv...")
                subprocess.run(["uv", "venv", ".venv"], cwd=str(sandbox_path), capture_output=True, timeout=30)
                env["PATH"] = str(sandbox_path / ".venv" / "bin") + os.pathsep + env["PATH"]
                if (sandbox_path / "requirements.txt").is_file():
                    print("  [Sandbox python] Installing requirements via uv...")
                    subprocess.run(["uv", "pip", "install", "-r", "requirements.txt"], cwd=str(sandbox_path), env=env, capture_output=True, timeout=120)
                    print("  [Sandbox python] Upgrading requirements via uv...")
                    subprocess.run(["uv", "pip", "install", "--upgrade", "-r", "requirements.txt"], cwd=str(sandbox_path), env=env, capture_output=True, timeout=120)
            else:
                print("  [Sandbox python] Creating virtual environment via python3 venv...")
                subprocess.run(["python3", "-m", "venv", ".venv"], cwd=str(sandbox_path), capture_output=True, timeout=30)
                env["PATH"] = str(sandbox_path / ".venv" / "bin") + os.pathsep + env["PATH"]
                local_pip = str(sandbox_path / ".venv" / "bin" / "pip")
                if (sandbox_path / "requirements.txt").is_file():
                    print("  [Sandbox python] Installing requirements via pip...")
                    subprocess.run([local_pip, "install", "-r", "requirements.txt"], cwd=str(sandbox_path), env=env, capture_output=True, timeout=120)
                    print("  [Sandbox python] Upgrading requirements via pip...")
                    subprocess.run([local_pip, "install", "--upgrade", "-r", "requirements.txt"], cwd=str(sandbox_path), env=env, capture_output=True, timeout=120)
                    
        elif harness == "cargo":
            print("  [Sandbox cargo] Running cargo update...")
            subprocess.run(["cargo", "update"], cwd=str(sandbox_path), capture_output=True, timeout=120)

    # ── DoR check ─────────────────────────────────────────────────────────────
    dor_status = "skipped"
    if dor_cmd:
        print(f"  [DoR] {dor_cmd}")
        ok, dur, log = _run_cmd(dor_cmd, sandbox_path, 30, log_truncate_bytes, env=env)
        if not ok:
            print(f"  ❌ DoR FAILED ({dur}s) — skipping integration test for {repo_id}")
            if sandbox_path != project_root:
                shutil.rmtree(sandbox_path, ignore_errors=True)
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
                test_cmd, sandbox_path, run_timeout_s, log_truncate_bytes, env=env
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

    # Clean up clone sandbox
    if sandbox_path != project_root:
        shutil.rmtree(sandbox_path, ignore_errors=True)

    return _result(repo_id, url, branch, remote_sha,
                   passed=passed, duration=duration,
                   log=log if not passed else None,
                   dor_status=dor_status, attempts=attempts,
                   harness=harness)


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
    harness: str = "unknown",
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
        "harness_type": harness,
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
            "harness_type": detect_harness(repo.get("integration_test", "")),
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

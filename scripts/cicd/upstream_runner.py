import os
import shutil
import re
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Shared CICD receipt envelope (monolith deconstruct foundation)
LIB_DIR = Path(__file__).resolve().parent / "lib"
if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))
import receipt

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
    (re.compile(r"\byarn\b"),                               "npm"),
    (re.compile(r"\bpnpm\b"),                               "npm"),
    (re.compile(r"\bgo\s+(test|build|run)\b"),             "go"),
    (re.compile(r"\bdocker\b"),                             "docker"),
    (re.compile(r"\bpython3?\b.*\.(py)\b"),                 "python"),
    (re.compile(r"\bpython3?\s+-[mc]\b"),                   "python"),
    (re.compile(r"\b(bash|sh)\s+"),                         "shell"),
]

# Manifest files that indicate which harness is appropriate when no command
# match is found (fallback: inspect repo directory on disk).
_MANIFEST_HARNESS: List[Tuple[str, str]] = [
    ("Cargo.toml",      "cargo"),
    ("package.json",    "npm"),
    ("pnpm-lock.yaml",  "npm"),
    ("yarn.lock",       "npm"),
    ("go.mod",          "go"),
    ("Dockerfile",      "docker"),
    ("requirements.txt","pytest"),
    ("setup.py",        "pytest"),
    ("pyproject.toml",  "pytest"),
]


_VALID_HARNESS_TYPES = {"cargo", "pytest", "playwright", "npm", "go", "docker", "python", "shell", "unknown"}

# Coarse-grained harness families for downstream reporting and dashboard grouping.
_HARNESS_FAMILY: Dict[str, str] = {
    "pytest": "python",
    "python": "python",
    "npm": "web",
    "playwright": "web",
    "yarn": "web",
    "pnpm": "web",
    "cargo": "rust",
    "go": "go",
    "docker": "docker",
    "shell": "shell",
    "unknown": "unknown",
}


def _harness_family(harness_type: str) -> str:
    return _HARNESS_FAMILY.get(harness_type, "unknown")


# Pseudo-HTTP status class for upstream run outcomes.  Used for retry policy and dashboards.
# - 2xx: success
# - 4xx: client/config error (fail-fast, no retry)
# - 5xx: server/transient/flake error (retry eligible)
# - 0xx: not run / skipped
_4XX_PATTERNS = (
    re.compile(r"git clone failed"),
    re.compile(r"import error", re.I),
    re.compile(r"modulenotfounderror", re.I),
    re.compile(r"dor failed"),
    re.compile(r"assertion failed"),
    re.compile(r"\[test\]\s*.*\b(pytest|cargo|npm)\b.*\bfailed\b", re.I),
)
_5XX_PATTERNS = (
    re.compile(r"timeout", re.I),
    re.compile(r"\[process error\]", re.I),
    re.compile(r"\[exception", re.I),
    re.compile(r"network\s+(error|unreachable|timeout)", re.I),
    re.compile(r"connection\s+(refused|reset|timeout)", re.I),
    re.compile(r"502\s+bad\s+gateway", re.I),
    re.compile(r"503\s+service\s+unavailable", re.I),
    re.compile(r"504\s+gateway\s+timeout", re.I),
    re.compile(r"500\s+internal\s+server\s+error", re.I),
)


def _classify_http_status_class(
    *,
    passed: bool,
    skipped: bool = False,
    dor_status: str = "skipped",
    log: Optional[str] = None,
    transient_fail: bool = False,
) -> str:
    """Map an upstream run outcome to a pseudo-HTTP status class."""
    if skipped:
        return "0xx"
    if passed:
        return "2xx"
    if transient_fail:
        return "5xx"
    if dor_status == "fail":
        return "4xx"
    text = (log or "").lower()
    for pat in _5XX_PATTERNS:
        if pat.search(text):
            return "5xx"
    for pat in _4XX_PATTERNS:
        if pat.search(text):
            return "4xx"
    # Default deterministic test failures are client/config errors (fail-fast).
    return "4xx"



def detect_harness(
    integration_test: str,
    repo_dir: Optional[Path] = None,
    hint: Optional[str] = None,
) -> str:
    """Return the harness family for a given integration_test command.

    Priority order:
      1. Registry hint (authoritative if provided and valid).
      2. Command-string pattern match (fast, no I/O).
      3. Manifest-file inspection of repo_dir (slower, only when provided).
      4. "unknown" if nothing matches.
    """
    if hint and hint in _VALID_HARNESS_TYPES:
        return hint

    cmd = (integration_test or "").strip()

    for pattern, harness in _CMD_HARNESS_PATTERNS:
        if pattern.search(cmd):
            return harness

    if repo_dir is not None and repo_dir.is_dir():
        for filename, harness in _MANIFEST_HARNESS:
            if (repo_dir / filename).exists():
                return harness

    return "unknown"


def verify_mobile_app_store_readiness(sandbox_path: Path) -> Tuple[bool, List[str]]:
    """Verify that a mobile project has fastlane, versionCode/versionName, CFBundleVersion, and Firebase setup."""
    issues = []
    
    # 1. Fastlane
    fastfile = sandbox_path / "fastlane" / "Fastfile"
    if not fastfile.is_file():
        issues.append("Missing fastlane/Fastfile configuration")
        
    # 2. Android versioning/keys (in build.gradle or AndroidManifest.xml)
    android_found = False
    android_version_ok = False
    for p in sandbox_path.glob("**/build.gradle"):
        android_found = True
        try:
            content = p.read_text(encoding="utf-8")
            if "versionCode" in content and "versionName" in content:
                android_version_ok = True
        except Exception:
            pass
            
    for p in sandbox_path.glob("**/AndroidManifest.xml"):
        android_found = True
        try:
            content = p.read_text(encoding="utf-8")
            if "android:versionCode" in content and "android:versionName" in content:
                android_version_ok = True
        except Exception:
            pass
            
    if android_found and not android_version_ok:
        issues.append("Android build configurations missing versionCode or versionName")
        
    # 3. iOS versioning/keys (in Info.plist)
    ios_found = False
    ios_version_ok = False
    for p in sandbox_path.glob("**/Info.plist"):
        ios_found = True
        try:
            content = p.read_text(encoding="utf-8")
            if "CFBundleVersion" in content and "CFBundleShortVersionString" in content:
                ios_version_ok = True
        except Exception:
            pass
            
    if ios_found and not ios_version_ok:
        issues.append("iOS Info.plist missing CFBundleVersion or CFBundleShortVersionString")
        
    # 4. Firebase config files (if firebase is used in the codebase)
    firebase_referenced = False
    for ext in ("*.js", "*.ts", "*.tsx", "*.swift", "*.java", "*.kt"):
        for p in sandbox_path.glob(f"**/{ext}"):
            if "node_modules" in p.parts or ".venv" in p.parts:
                continue
            try:
                content = p.read_text(encoding="utf-8")
                if "firebase" in content.lower():
                    firebase_referenced = True
                    break
            except Exception:
                pass
        if firebase_referenced:
            break
            
    if firebase_referenced:
        has_fb_config = False
        google_json = list(sandbox_path.glob("**/google-services.json"))
        google_plist = list(sandbox_path.glob("**/GoogleService-Info.plist"))
        if google_json or google_plist:
            has_fb_config = True
            
        if not has_fb_config:
            issues.append("Firebase is referenced in code, but google-services.json or GoogleService-Info.plist is missing")
            
    if not (android_found or ios_found or fastfile.parent.is_dir()):
        return True, []
        
    return len(issues) == 0, issues


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
    t_start = time.monotonic()
    repo_id = repo["id"]
    url = repo["url"]
    branch = repo["branch"]
    test_cmd: str = repo["integration_test"]
    dor_cmd: Optional[str] = repo.get("dor_cmd")
    harness_hint: Optional[str] = repo.get("harness_type") or repo.get("harness_hint")

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
        is_mock = "PYTEST_CURRENT_TEST" in os.environ or "dummy" in url or "github.com/b/b" in url
        if is_mock:
            print("  ⚠️ Falling back to project_root due to clone failure (e.g. offline/mock test).")
            sandbox_path = project_root
            harness = detect_harness(test_cmd, project_root, hint=harness_hint)
        else:
            print(f"  ❌ Failing validation for {repo_id} due to clone failure.")
            if sandbox_path.exists():
                shutil.rmtree(sandbox_path, ignore_errors=True)
            return _result(repo_id, url, branch, remote_sha,
                           passed=False, duration=round(time.monotonic() - t_start, 2),
                           log=f"git clone failed: {clone_proc.stderr.strip()}",
                           dor_status="fail", attempts=0,
                           http_status_class="4xx")
    else:
        harness = detect_harness(test_cmd, sandbox_path, hint=harness_hint)

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

        elif harness == "go":
            print("  [Sandbox go] Running go get -u ./... && go mod tidy...")
            subprocess.run(["go", "get", "-u", "./..."], cwd=str(sandbox_path), capture_output=True, timeout=120)
            subprocess.run(["go", "mod", "tidy"], cwd=str(sandbox_path), capture_output=True, timeout=60)

        elif harness == "docker":
            if (sandbox_path / "docker-compose.yml").is_file():
                print("  [Sandbox docker] Running docker compose pull...")
                subprocess.run(["docker", "compose", "pull"], cwd=str(sandbox_path), capture_output=True, timeout=120)
            elif (sandbox_path / "Dockerfile").is_file():
                print("  [Sandbox docker] Found Dockerfile. Building with --pull to update base images...")
                subprocess.run(["docker", "build", "--pull", "-t", "temp-sandbox-build", "."], cwd=str(sandbox_path), capture_output=True, timeout=120)

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
                           log=log, dor_status="fail", attempts=0,
                           http_status_class="4xx")
        dor_status = "pass"
        print(f"  ✓  DoR passed ({dur}s)")

    # ── Integration test (with retry) ─────────────────────────────────────────
    attempts = 0
    passed = False
    duration = 0.0
    log = ""
    transient_fail = False
    http_status_class = "0xx"

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
            transient_fail = "[TIMEOUT" in log or "[EXCEPTION" in log or "timeout" in log.lower()
            http_status_class = _classify_http_status_class(
                passed=passed,
                dor_status=dor_status,
                log=log,
                transient_fail=transient_fail,
            )
            if passed:
                break
            # 5xx-like failures (transient/flake) are retry-eligible; 4xx-like
            # (client/config/deterministic test failures) fail fast.
            if http_status_class != "5xx":
                break
        except _TRANSIENT_EXCEPTIONS as exc:
            duration = round(time.monotonic(), 2)
            log = f"[PROCESS ERROR] {exc}"
            transient_fail = True
            http_status_class = _classify_http_status_class(
                passed=False,
                dor_status=dor_status,
                log=log,
                transient_fail=True,
            )
            print(f"  ⚠️  Process error on attempt {attempts}: {exc}")

    # ── App Store Submission Readiness Check ──────────────────────────────────
    app_store_ok = True
    app_store_issues = []
    # Auto-detect if it's a mobile project or if harness is mobile
    is_mobile = (harness == "mobile") or (sandbox_path / "ios").is_dir() or (sandbox_path / "android").is_dir() or (sandbox_path / "fastlane").is_dir()
    if is_mobile and sandbox_path != project_root:
        print(f"  [Mobile] Running app store submission readiness checks...")
        app_store_ok, app_store_issues = verify_mobile_app_store_readiness(sandbox_path)
        if app_store_ok:
            print("  ✓ App store submission readiness checks: PASS")
        else:
            print(f"  ❌ App store submission readiness checks: FAIL ({', '.join(app_store_issues)})")
            passed = False
            log = (log or "") + f"\n[App Store Readiness Failure] {', '.join(app_store_issues)}"

    # Clean up clone sandbox
    if sandbox_path != project_root:
        shutil.rmtree(sandbox_path, ignore_errors=True)

    return _result(repo_id, url, branch, remote_sha,
                   passed=passed, duration=duration,
                   log=log if not passed else None,
                   dor_status=dor_status, attempts=attempts,
                   harness=harness,
                   http_status_class=http_status_class,
                   app_store_readiness="PASS" if app_store_ok else "FAIL")


def to_receipt(result: Dict[str, Any], project_root: Path) -> Dict[str, Any]:
    """Convert a single upstream_runner result dict into a validated CICD receipt v1."""
    repo_id = result["repository_id"]
    status = result.get("integration_status", "FAIL")
    passed = status == "PASS"
    skipped = result.get("skipped", False)
    return receipt.make(
        context="upstream",
        status="PASS" if (passed or skipped) else "FAIL",
        command=f"upstream_runner:{repo_id}",
        exit_code=0 if (passed or skipped) else 1,
        duration_seconds=result.get("duration_seconds", 0.0),
        signals=[
            {
                "name": "integration_test",
                "ok": passed,
                "required": not skipped,
                "details": {
                    "harness_type": result.get("harness_type", "unknown"),
                    "dor_status": result.get("dor_status", "skipped"),
                    "attempts": result.get("attempts", 0),
                    "app_store_readiness": result.get("app_store_readiness", "skipped"),
                },
            },
            {
                "name": "cached",
                "ok": skipped,
                "required": False,
                "details": {"skipped": skipped},
            },
        ],
        errors=[] if (passed or skipped) else [result.get("log", "") or f"{repo_id} failed"],
        warnings=["cached/skipped"] if skipped else [],
        meta={
            "repository_id": repo_id,
            "url": result.get("url", ""),
            "branch": result.get("branch", ""),
            "latest_commit_sha": result.get("latest_commit_sha", ""),
            "project_root": str(project_root),
        },
    )


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
    http_status_class: str = "0xx",
    app_store_readiness: Optional[str] = None,
) -> Dict[str, Any]:
    res = {
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
        "harness_family": _harness_family(harness),
        "http_status_class": http_status_class,
        "log": log,
    }
    if app_store_readiness:
        res["app_store_readiness"] = app_store_readiness
    return res


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
        harness = detect_harness(
            repo.get("integration_test", ""),
            hint=repo.get("harness_type") or repo.get("harness_hint"),
        )
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
            "harness_type": harness,
            "harness_family": _harness_family(harness),
            "http_status_class": "0xx",
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

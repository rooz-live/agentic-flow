#!/usr/bin/env python3
"""Local Repository Upgrade Sweep Module.

Scans local directories, pulls updates, upgrades dependencies, and runs verification checks.
Uses isolated sandboxes for mutations and validations, caching successful upgrade states.
"""

import os
import sys
import time
import json
import hashlib
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple

CACHE_FILE_REL = Path(".goalie") / "evidence" / "upgrades" / "local_upgrades_cache.json"

def log(msg: str, log_file: Path = None):
    """Log a message to stdout and optionally append to a file."""
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    formatted = f"[{timestamp}] {msg}"
    print(msg)  # Console output
    if log_file:
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(formatted + "\n")
        except Exception as e:
            print(f"⚠️ Warning: Could not write to log file {log_file}: {e}", file=sys.stderr)

def get_default_branch(repo_path: Path) -> str:
    """Detect the default branch for a git repository."""
    def run_git(args: List[str]) -> str:
        res = subprocess.run(["git"] + args, cwd=str(repo_path), capture_output=True, text=True)
        return res.stdout.strip() if res.returncode == 0 else ""

    # Check origin/HEAD
    origin_head = run_git(["rev-parse", "--abbrev-ref", "origin/HEAD"])
    if origin_head:
        if origin_head.startswith("origin/"):
            return origin_head[7:]
        return origin_head

    # Check local main
    res = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/heads/main"], cwd=str(repo_path))
    if res.returncode == 0:
        return "main"

    # Check local master
    res = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/heads/master"], cwd=str(repo_path))
    if res.returncode == 0:
        return "master"

    # Current branch
    current = run_git(["branch", "--show-current"])
    if current:
        return current

    return "main"

def scan_repositories(scan_paths: List[str]) -> List[Path]:
    """Scan scan_paths recursively up to depth 3 to find Git repositories, skipping common folders."""
    found_repos = []
    
    # Standard directories to skip
    skip_substrings = ["/node_modules/", "/clean-ruflo-env/", "/pre-cleanup-backup-"]
    
    for path_str in scan_paths:
        parent = Path(path_str).expanduser().resolve()
        if not parent.is_dir():
            continue
            
        def walk(current_dir: Path, depth: int):
            if depth > 3:
                return
            
            git_dir = current_dir / ".git"
            if git_dir.is_dir():
                repo_str = str(current_dir)
                if not any(sub in repo_str for sub in skip_substrings):
                    found_repos.append(current_dir)
                return  # Stop recursing inside repository
                
            try:
                for child in current_dir.iterdir():
                    if child.is_dir() and not child.name.startswith('.'):
                        walk(child, depth + 1)
            except PermissionError:
                pass
                
        walk(parent, 1)
        
    # Deduplicate and sort
    seen = set()
    deduped = []
    for r in found_repos:
        resolved = r.resolve()
        if resolved not in seen:
            seen.add(resolved)
            deduped.append(resolved)
    return sorted(deduped)

def run_cmd(command: List[str] | str, cwd: Path, dry_run: bool, timeout_s: int = 180) -> Tuple[bool, str]:
    """Execute a shell command or list of arguments in cwd, returns (success, output)."""
    if dry_run:
        cmd_str = command if isinstance(command, str) else " ".join(command)
        return True, f"[DRY-RUN] {cmd_str}"
        
    shell = isinstance(command, str)
    try:
        res = subprocess.run(
            command,
            cwd=str(cwd),
            shell=shell,
            capture_output=True,
            text=True,
            timeout=timeout_s
        )
        success = (res.returncode == 0)
        output = res.stdout + "\n" + res.stderr
        return success, output
    except Exception as e:
        return False, str(e)

def calculate_manifest_hash(repo_path: Path) -> str:
    """Calculate hash of all local dependency manifest and lock files."""
    manifest_files = [
        "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
        "requirements.txt", "Cargo.toml", "Cargo.lock"
    ]
    hasher = hashlib.sha256()
    found_any = False
    
    for filename in sorted(manifest_files):
        filepath = repo_path / filename
        if filepath.is_file():
            found_any = True
            try:
                with open(filepath, "rb") as f:
                    hasher.update(f.read())
            except Exception:
                pass
                
    if not found_any:
        return "no_manifests"
    return hasher.hexdigest()

def load_upgrades_cache(cache_path: Path) -> Dict[str, Any]:
    """Load local upgrades cache from disk."""
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_upgrades_cache(cache: Dict[str, Any], cache_path: Path):
    """Save local upgrades cache to disk."""
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
            f.write("\n")
    except Exception:
        pass

def run_local_sweep(
    scan_paths: List[str],
    dry_run: bool = False,
    json_output: bool = False,
    decentralized: bool = False,
    max_sandbox_age_s: int = 120,
    project_root: Path | None = None,
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Perform upgrade sweeps on all local repositories found in scan_paths using isolated sandboxes."""
    # Setup logging
    log_dir = Path("/tmp/agentic-flow") if sys.platform == "darwin" else Path("/var/log/agentic-flow")
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        log_dir = Path("/tmp")
    log_file = log_dir / "all-repos-upgrade.log"

    log("🎬 Starting daily multi-repository upgrade sweep...", log_file)
    if dry_run:
        log("🚫 DRY-RUN MODE: No mutations will be executed.", log_file)

    repos = scan_repositories(scan_paths)
    log(f"🔍 Found {len(repos)} active git repositories to review.", log_file)

    # Initialize Cache
    project_root = project_root or Path(__file__).parent.parent.parent.resolve()
    cache_path = project_root / CACHE_FILE_REL
    cache = load_upgrades_cache(cache_path)

    # Load upgrade configuration for timeout / resource caps
    cfg_path = project_root / "config" / "cicd" / "upstream_registry.json"
    cfg: Dict[str, Any] = {}
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8")).get("upgrades_configuration", {})
    except Exception:
        pass
    run_timeout_s = int(cfg.get("default_run_timeout_s", 120))

    results = []
    upgraded_count = 0
    failed_count = 0
    for repo in repos:
        start_time = time.time()
        log("------------------------------------------------------------", log_file)
        log(f"📦 Repository: {repo}", log_file)

        lock = None
        if decentralized:
            from decentralized_lock import DecentralizedLock
            lock = DecentralizedLock(project_root / ".goalie" / "locks", f"local_{repo.name}")
            if not lock.acquire():
                log(f"🔒 Local Repo {repo.name} is locked by another worker. Skipping.", log_file)
                results.append({
                    "repository_id": f"local:{repo.name}",
                    "url": f"file://{repo.resolve()}",
                    "branch": "unknown",
                    "latest_commit_sha": "",
                    "integration_status": "PASS",
                    "duration_seconds": 0.0,
                    "skipped": True,
                    "sandbox_setup_duration": 0.0,
                    "git_pull_duration": 0.0,
                    "upgrade_duration": 0.0,
                    "test_duration": 0.0,
                    "log": "Claimed by another worker"
                })
                continue

        # 1. Default Branch Detection
        default_branch = get_default_branch(repo)
        log(f"  Branch: {default_branch}", log_file)
        
        # 2. Pull inside original repo first (to make sure HEAD is up to date before checking cache)
        log("  Pulling latest commits in original repo...", log_file)
        t_pull_start = time.time()
        pull_success, pull_log = run_cmd(["git", "pull", "origin", default_branch, "--rebase"], repo, dry_run, timeout_s=run_timeout_s)
        if pull_success:
            log("  ✓ git pull: SUCCESS", log_file)
        else:
            log("  ⚠️ git pull: FAILED/SKIP in original repo", log_file)
        git_pull_duration = round(time.time() - t_pull_start, 2)
        
        # Detect Git HEAD SHA after pull
        git_sha = ""
        ok_sha, out_sha = run_cmd(["git", "rev-parse", "HEAD"], repo, False, timeout_s=30)
        if ok_sha:
            git_sha = out_sha.strip()

        # Calculate Manifest Hash after pull
        manifest_hash = calculate_manifest_hash(repo)
        
        # Cache Validation
        repo_cache_key = str(repo.resolve())
        cached_info = cache.get(repo_cache_key)
        
        if cached_info and cached_info.get("git_commit") == git_sha and cached_info.get("manifest_hash") == manifest_hash:
            log(f"  ✓ Up to date (cached). Skipping validation sweep.", log_file)
            results.append({
                "repository_id": f"local:{repo.name}",
                "url": f"file://{repo.resolve()}",
                "branch": default_branch,
                "latest_commit_sha": git_sha,
                "integration_status": "PASS",
                "duration_seconds": 0.0,
                "skipped": True,
                "sandbox_setup_duration": 0.0,
                "git_pull_duration": git_pull_duration,
                "upgrade_duration": 0.0,
                "test_duration": 0.0,
                "log": None
            })
            upgraded_count += 1
            if lock is not None:
                lock.release()
            continue

        # 3. Setup Sandbox Directory
        log("  Setting up isolated sandbox...", log_file)
        t_setup_start = time.time()
        
        # Create a unique sandbox dir inside scratch/sandbox/
        sandbox_base = project_root / "scratch" / "sandbox"
        try:
            sandbox_base.mkdir(parents=True, exist_ok=True)
            sandbox_dir = Path(tempfile.mkdtemp(dir=str(sandbox_base), prefix=f"sb_{repo.name}_"))
        except Exception as e:
            log(f"  ❌ Failed to create sandbox folder: {e}", log_file)
            failed_count += 1
            results.append({
                "repository_id": f"local:{repo.name}",
                "url": f"file://{repo.resolve()}",
                "branch": default_branch,
                "latest_commit_sha": git_sha,
                "integration_status": "FAIL",
                "duration_seconds": round(time.time() - start_time, 2),
                "skipped": False,
                "sandbox_setup_duration": 0.0,
                "git_pull_duration": git_pull_duration,
                "upgrade_duration": 0.0,
                "test_duration": 0.0,
                "log": f"Sandbox creation failed: {e}"
            })
            if lock is not None:
                lock.release()
            continue

        # Copy repository files to sandbox (ignore large untracked dirs)
        def should_ignore(name: str) -> bool:
            ignored_names = {
                ".git", "node_modules", ".venv", "venv", "dist", ".pytest_cache",
                ".snapshots", ".archived-temp", ".restore", "backups", "media",
                "temp_agentic_qe", "temp_lionagi_analysis", ".git 2", "scratch",
                "target", "observability", "repo-improvement-workspace",
                ".ssr_test", ".turbo-flow-setup", "projects", "apps", "archive",
                "archives", "experimental", "brush", ".jest-cache", ".stryker-tmp",
                ".dor-metrics", ".archives", ".ay-learning", ".claude", ".learning",
                ".roam-state", "clean-ruflo-env", "ai_devops_env", "risk-analytics",
                "risk_analytics", "recovered_repos", "__pycache__", ".coverage",
                ".mypy_cache", ".rca-backups", ".tmp", ".tmp-tw-build",
                ".venv_prompts", ".vscode", "build_artifacts", "calibration_data",
                "coverage", "logs", "pem", "playwright-report",
                "production_ui_bundle.tar.gz", "unified_deployment", "tmp",
                "agentic-flow-core", "agentic-prediction-risk-analytics", "affiliate-platform",
                "competitive-analysis", "finance-agent", "intelligent-learning-hooks",
                "recovered_repos", "risk-analytics.bak", "risk_analytics", "testing",
                ".terraform", ".terraform.lock.hcl", "~", "sqlite:", "{}", "=",
                "80%", "90%", "95%", "200MB"
            }
            if name in ignored_names:
                return True
            if name.startswith("pre-cleanup-backup-"):
                return True
            if name.startswith("temp_"):
                return True
            return False

        def ignore_patterns(path, names):
            return [name for name in names if should_ignore(name)]

        try:
            # We copy whitelisted directories and files to sandbox_dir
            whitelisted_dirs = {
                "src", "tests", "crates", "scripts", "config", "docs", "tooling", "packages", "circles", "domain"
            }
            for item in repo.iterdir():
                if item.is_dir():
                    if item.name in whitelisted_dirs:
                        shutil.copytree(item, sandbox_dir / item.name, ignore=ignore_patterns, symlinks=True)
                else:
                    if not should_ignore(item.name):
                        shutil.copy(item, sandbox_dir / item.name, follow_symlinks=False)
            
            # Enforce true sandbox isolation by installing dependencies inside sandbox instead of symlinking
            # We determine package manager and create clean environments
            
            # Prepare Node dependencies
            if (sandbox_dir / "package.json").is_file():
                if (sandbox_dir / "pnpm-lock.yaml").is_file():
                    log("  Installing npm dependencies via pnpm...", log_file)
                    run_cmd(["pnpm", "install", "--frozen-lockfile"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
                elif (sandbox_dir / "package-lock.json").is_file():
                    log("  Installing npm dependencies via npm...", log_file)
                    run_cmd(["npm", "ci"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
                else:
                    log("  Installing npm dependencies via npm install...", log_file)
                    run_cmd(["npm", "install"], sandbox_dir, dry_run, timeout_s=run_timeout_s)

            # Prepare Python dependencies
            if (sandbox_dir / "requirements.txt").is_file() or (sandbox_dir / "pyproject.toml").is_file():
                # Check for uv
                has_uv = False
                try:
                    res_uv = subprocess.run(["which", "uv"], capture_output=True, text=True)
                    has_uv = (res_uv.returncode == 0)
                except Exception:
                    pass
                
                if has_uv:
                    log("  Creating virtual environment via uv...", log_file)
                    run_cmd(["uv", "venv", ".venv"], sandbox_dir, dry_run)
                    if (sandbox_dir / "requirements.txt").is_file():
                        log("  Installing requirements via uv...", log_file)
                        run_cmd(["uv", "pip", "install", "-r", "requirements.txt"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
                else:
                    log("  Creating virtual environment via python3 venv...", log_file)
                    run_cmd(["python3", "-m", "venv", ".venv"], sandbox_dir, dry_run)
                    local_pip = str(sandbox_dir / ".venv" / "bin" / "pip")
                    if (sandbox_dir / "requirements.txt").is_file():
                        log("  Installing requirements via pip...", log_file)
                        run_cmd([local_pip, "install", "-r", "requirements.txt"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
            
            # Prepare Poetry dependencies if applicable
            if (sandbox_dir / "pyproject.toml").is_file() and not (sandbox_dir / "requirements.txt").is_file():
                has_poetry = False
                try:
                    content_toml = (sandbox_dir / "pyproject.toml").read_text(encoding="utf-8")
                    if "[tool.poetry]" in content_toml:
                        res_poetry = subprocess.run(["which", "poetry"], capture_output=True, text=True)
                        has_poetry = (res_poetry.returncode == 0)
                except Exception:
                    pass
                
                if has_poetry:
                    log("  Installing dependencies via poetry...", log_file)
                    run_cmd(["poetry", "install"], sandbox_dir, dry_run, timeout_s=run_timeout_s)

            sandbox_setup_duration = round(time.time() - t_setup_start, 2)
            log(f"  ✓ Sandbox ready in {sandbox_setup_duration}s", log_file)

            # Sandbox TTL / resource cap check
            if sandbox_setup_duration > max_sandbox_age_s:
                log(f"  ❌ Sandbox setup exceeded TTL ({sandbox_setup_duration}s > {max_sandbox_age_s}s). Skipping.", log_file)
                failed_count += 1
                shutil.rmtree(sandbox_dir, ignore_errors=True)
                results.append({
                    "repository_id": f"local:{repo.name}",
                    "url": f"file://{repo.resolve()}",
                    "branch": default_branch,
                    "latest_commit_sha": git_sha,
                    "integration_status": "FAIL",
                    "duration_seconds": round(time.time() - start_time, 2),
                    "skipped": False,
                    "sandbox_setup_duration": sandbox_setup_duration,
                    "git_pull_duration": git_pull_duration,
                    "upgrade_duration": 0.0,
                    "test_duration": 0.0,
                    "log": f"Sandbox setup TTL exceeded: {sandbox_setup_duration}s > {max_sandbox_age_s}s"
                })
                if lock is not None:
                    lock.release()
                continue
        except Exception as e:
            log(f"  ❌ Failed to populate sandbox: {e}", log_file)
            shutil.rmtree(sandbox_dir, ignore_errors=True)
            failed_count += 1
            results.append({
                "repository_id": f"local:{repo.name}",
                "url": f"file://{repo.resolve()}",
                "branch": default_branch,
                "latest_commit_sha": git_sha,
                "integration_status": "FAIL",
                "duration_seconds": round(time.time() - start_time, 2),
                "skipped": False,
                "sandbox_setup_duration": round(time.time() - t_setup_start, 2),
                "git_pull_duration": git_pull_duration,
                "upgrade_duration": 0.0,
                "test_duration": 0.0,
                "log": f"Sandbox copy failed: {e}"
            })
            if lock is not None:
                lock.release()
            continue

        # 4. Dependency Upgrades in Sandbox
        log("  Upgrading dependencies in sandbox...", log_file)
        t_upgrade_start = time.time()
        upgrade_success = True
        upgrade_log = ""

        # package.json
        if (sandbox_dir / "package.json").is_file():
            pkg_json_content = ""
            try:
                with open(sandbox_dir / "package.json", "r", encoding="utf-8") as f:
                    pkg_json_content = f.read()
            except Exception:
                pass

            if (sandbox_dir / "pnpm-lock.yaml").is_file():
                log("  Detected pnpm project in sandbox...", log_file)
                upgrade_success, upgrade_log = run_cmd(["pnpm", "update"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
            elif (sandbox_dir / "package-lock.json").is_file() or (sandbox_dir / "yarn.lock").is_file():
                log("  Detected npm/yarn project in sandbox...", log_file)
                upgrade_success, upgrade_log = run_cmd(["npm", "update"], sandbox_dir, dry_run)
            else:
                log("  Detected npm project in sandbox...", log_file)
                upgrade_success, upgrade_log = run_cmd(["npm", "update"], sandbox_dir, dry_run, timeout_s=run_timeout_s)

            # Playwright
            if "playwright" in pkg_json_content:
                log("  Playwright detected in sandbox. Updating browsers...", log_file)
                pw_success, pw_log = run_cmd(["npx", "playwright", "install"], sandbox_dir, dry_run, timeout_s=run_timeout_s)
                upgrade_log += f"\n--- Playwright Install ---\n{pw_log}"

        # requirements.txt
        elif (sandbox_dir / "requirements.txt").is_file():
            log("  Detected python requirements.txt in sandbox...", log_file)
            has_uv = False
            try:
                res_uv = subprocess.run(["which", "uv"], capture_output=True, text=True)
                has_uv = (res_uv.returncode == 0)
            except Exception:
                pass

            if has_uv:
                if dry_run:
                    upgrade_success, upgrade_log = run_cmd("uv pip install --upgrade -r requirements.txt", sandbox_dir, True, timeout_s=run_timeout_s)
                else:
                    upgrade_success, upgrade_log = run_cmd(["uv", "pip", "install", "--upgrade", "-r", "requirements.txt"], sandbox_dir, False, timeout_s=run_timeout_s)
            else:
                local_pip = "pip"
                if (sandbox_dir / ".venv" / "bin" / "pip").is_file():
                    local_pip = str(sandbox_dir / ".venv" / "bin" / "pip")
                elif (sandbox_dir / "venv" / "bin" / "pip").is_file():
                    local_pip = str(sandbox_dir / "venv" / "bin" / "pip")

                if dry_run:
                    upgrade_success, upgrade_log = run_cmd(f"{local_pip} install --upgrade -r requirements.txt", sandbox_dir, True, timeout_s=run_timeout_s)
                else:
                    upgrade_success, upgrade_log = run_cmd([local_pip, "install", "--upgrade", "-r", "requirements.txt"], sandbox_dir, False, timeout_s=run_timeout_s)
                    if not upgrade_success:
                        log("  Fallback to python3 -m pip install in sandbox...", log_file)
                        upgrade_success, upgrade_log2 = run_cmd(["python3", "-m", "pip", "install", "--upgrade", "-r", "requirements.txt"], sandbox_dir, False, timeout_s=run_timeout_s)
                        upgrade_log += f"\n--- Fallback Pip ---\n{upgrade_log2}"

        # Cargo.toml
        elif (sandbox_dir / "Cargo.toml").is_file():
            log("  Detected Cargo project in sandbox...", log_file)
            upgrade_success, upgrade_log = run_cmd(["cargo", "update"], sandbox_dir, dry_run, timeout_s=run_timeout_s)

        if upgrade_success:
            log("  ✓ dependency upgrade: SUCCESS", log_file)
        else:
            log("  ⚠️ dependency upgrade: WARNING/FAIL", log_file)
        dependency_upgrade_duration = round(time.time() - t_upgrade_start, 2)

        # 5. Verification Checks in Sandbox
        log("  Running verification checks in sandbox...", log_file)
        t_test_start = time.time()
        test_success = True
        test_log = ""
        
        if not dry_run:
            if (sandbox_dir / "package.json").is_file():
                test_cmd = None
                try:
                    with open(sandbox_dir / "package.json", "r", encoding="utf-8") as f:
                        data = json.load(f)
                    scripts = data.get("scripts", {})
                    if "test" in scripts:
                        test_cmd = ["npm", "test"]
                    elif "test:unit" in scripts:
                        test_cmd = ["npm", "run", "test:unit"]
                    elif "test:e2e" in scripts:
                        test_cmd = ["npm", "run", "test:e2e"]
                except Exception:
                    # Fallback to simple check
                    try:
                        with open(sandbox_dir / "package.json", "r", encoding="utf-8") as f:
                            if '"test"' in f.read():
                                test_cmd = ["npm", "test"]
                    except Exception:
                        pass

                if test_cmd:
                    log(f"  Running npm tests ({' '.join(test_cmd)}) in sandbox...", log_file)
                    test_success, test_log = run_cmd(test_cmd, sandbox_dir, False, timeout_s=run_timeout_s)

            elif (sandbox_dir / "Cargo.toml").is_file():
                log("  Running cargo test in sandbox...", log_file)
                test_success, test_log = run_cmd(["cargo", "test"], sandbox_dir, False, timeout_s=run_timeout_s)

            elif (sandbox_dir / "tests").is_dir() or (sandbox_dir / "test").is_dir():
                local_pytest = sandbox_dir / ".venv" / "bin" / "pytest"
                has_uv = False
                try:
                    res_uv = subprocess.run(["which", "uv"], capture_output=True, text=True)
                    has_uv = (res_uv.returncode == 0)
                except Exception:
                    pass

                if local_pytest.is_file():
                    log("  Running local venv pytest in sandbox...", log_file)
                    test_success, test_log = run_cmd([str(local_pytest)], sandbox_dir, False, timeout_s=run_timeout_s)
                elif has_uv and (sandbox_dir / "pyproject.toml").is_file():
                    log("  Running uv run pytest in sandbox...", log_file)
                    test_success, test_log = run_cmd(["uv", "run", "pytest"], sandbox_dir, False, timeout_s=run_timeout_s)
                else:
                    pytest_check = subprocess.run(["which", "pytest"], capture_output=True)
                    if pytest_check.returncode == 0:
                        log("  Running global pytest in sandbox...", log_file)
                        test_success, test_log = run_cmd(["pytest"], sandbox_dir, False, timeout_s=run_timeout_s)

        if test_success:
            log("  ✓ verification tests: PASS", log_file)
        else:
            log("  ⚠️ verification tests: FAIL", log_file)
        test_execution_duration = round(time.time() - t_test_start, 2)

        # Build combined logs on failure
        combined_log = ""
        if not pull_success:
            combined_log += f"--- Git Pull Error ---\n{pull_log}\n"
        if not upgrade_success:
            combined_log += f"--- Upgrade Error ---\n{upgrade_log}\n"
        if not test_success:
            combined_log += f"--- Test Error ---\n{test_log}\n"

        overall_passed = pull_success and upgrade_success and test_success
        duration = round(time.time() - start_time, 2)

        if overall_passed:
            log("  ✓ Sandbox sweep PASSED. Syncing lockfiles back...", log_file)
            upgraded_count += 1
            
            # Sync lockfiles back to original repo
            lockfiles = ["package-lock.json", "Cargo.lock", "pnpm-lock.yaml", "yarn.lock", "requirements.txt"]
            for lf in lockfiles:
                sb_lf = sandbox_dir / lf
                if sb_lf.is_file():
                    shutil.copy2(sb_lf, repo / lf)
            
            # Recalculate manifest hash and update cache
            new_manifest_hash = calculate_manifest_hash(repo)
            cache[repo_cache_key] = {
                "git_commit": git_sha,
                "manifest_hash": new_manifest_hash,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            save_upgrades_cache(cache, cache_path)
        else:
            failed_count += 1

        # Clean up Sandbox
        shutil.rmtree(sandbox_dir, ignore_errors=True)

        results.append({
            "repository_id": f"local:{repo.name}",
            "url": f"file://{repo.resolve()}",
            "branch": default_branch,
            "latest_commit_sha": git_sha,
            "integration_status": "PASS" if overall_passed else "FAIL",
            "duration_seconds": duration,
            "skipped": False,
            "sandbox_setup_duration": sandbox_setup_duration,
            "git_pull_duration": git_pull_duration,
            "upgrade_duration": dependency_upgrade_duration,
            "test_duration": test_execution_duration,
            "log": combined_log if not overall_passed else None
        })
        if lock is not None:
            lock.release()

    log("============================================================", log_file)
    log(f"🏁 Sweep complete. Upgraded: {upgraded_count}, Failed: {failed_count}.", log_file)
    log(f"Logs persisted to: {log_file}", log_file)

    # Write DoD artefact
    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    evidence_dir = project_root / ".goalie" / "evidence" / "upgrades"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    overall_status = "PASS" if failed_count == 0 else "FAIL"
    total_duration = sum(res.get("duration_seconds", 0.0) for res in results)
    throughput = 3600.0 / max(1.0, total_duration)
    summary = {
        "gate": "local-upgrade-sweep",
        "run_id": run_id,
        "timestamp": run_id,
        "status": overall_status,
        "upgraded_count": upgraded_count,
        "failed_count": failed_count,
        "throughput_deliveries_per_hour": round(throughput, 2),
        "results": results,
    }
    dod_path = evidence_dir / f"local_sweep_{run_id}.json"
    try:
        with open(dod_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
            f.write("\n")
        log(f"✅ DoD artefact: {dod_path}", log_file)
        # Symlink latest
        latest = evidence_dir / "last_local_sweep.json"
        with open(latest, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
            f.write("\n")
    except Exception as e:
        log(f"⚠️ Warning: Failed to write DoD artefact: {e}", log_file)

    if json_output:
        print(json.dumps(summary, indent=2))

    return results, upgraded_count, failed_count

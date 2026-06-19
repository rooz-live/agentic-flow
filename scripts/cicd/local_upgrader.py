#!/usr/bin/env python3
"""Local Repository Upgrade Sweep Module.

Scans local directories, pulls updates, upgrades dependencies, and runs verification checks.
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple

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

def run_cmd(command: List[str] | str, cwd: Path, dry_run: bool) -> Tuple[bool, str]:
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
            timeout=180
        )
        success = (res.returncode == 0)
        output = res.stdout + "\n" + res.stderr
        return success, output
    except Exception as e:
        return False, str(e)

def run_local_sweep(scan_paths: List[str], dry_run: bool = False) -> Tuple[List[Dict[str, Any]], int, int]:
    """Perform upgrade sweeps on all local repositories found in scan_paths."""
    # Setup logging
    log_dir = Path("/tmp/agentic-flow") if sys.platform == "darwin" else Path("/var/log/agentic-flow")
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        # Fallback to local /tmp
        log_dir = Path("/tmp")
    log_file = log_dir / "all-repos-upgrade.log"

    log("🎬 Starting daily multi-repository upgrade sweep...", log_file)
    if dry_run:
        log("🚫 DRY-RUN MODE: No mutations will be executed.", log_file)

    repos = scan_repositories(scan_paths)
    log(f"🔍 Found {len(repos)} active git repositories to review.", log_file)

    results = []
    upgraded_count = 0
    failed_count = 0

    for repo in repos:
        start_time = time.time()
        log("------------------------------------------------------------", log_file)
        log(f"📦 Repository: {repo}", log_file)
        
        # 1. Branch Detection
        default_branch = get_default_branch(repo)
        log(f"  Branch: {default_branch}", log_file)
        
        # Get current SHA before operation
        git_sha = ""
        ok_sha, out_sha = run_cmd(["git", "rev-parse", "HEAD"], repo, False)
        if ok_sha:
            git_sha = out_sha.strip()

        # 2. Pull
        pull_success = True
        pull_log = ""
        if dry_run:
            log(f"  [DRY-RUN] git pull origin {default_branch}", log_file)
        else:
            log("  Pulling latest commits...", log_file)
            pull_success, pull_log = run_cmd(["git", "pull", "origin", default_branch, "--rebase"], repo, False)
            if pull_success:
                log("  ✓ git pull: SUCCESS", log_file)
            else:
                log("  ⚠️ git pull: FAILED (unstaged changes or conflicts present)", log_file)

        # 3. Upgrades
        upgrade_success = True
        upgrade_log = ""
        
        # package.json
        if (repo / "package.json").is_file():
            pkg_json_content = ""
            try:
                with open(repo / "package.json", "r", encoding="utf-8") as f:
                    pkg_json_content = f.read()
            except Exception:
                pass

            if (repo / "pnpm-lock.yaml").is_file():
                log("  Detected pnpm project...", log_file)
                upgrade_success, upgrade_log = run_cmd(["pnpm", "update"], repo, dry_run)
            elif (repo / "package-lock.json").is_file() or (repo / "yarn.lock").is_file():
                log("  Detected npm/yarn project...", log_file)
                upgrade_success, upgrade_log = run_cmd(["npm", "update"], repo, dry_run)
            else:
                log("  Detected npm project (no lockfile)...", log_file)
                upgrade_success, upgrade_log = run_cmd(["npm", "update"], repo, dry_run)

            if upgrade_success:
                log("  ✓ package update: SUCCESS", log_file)
            else:
                log("  ⚠️ package update: WARNING/FAIL", log_file)

            # Playwright
            if "playwright" in pkg_json_content:
                log("  Playwright detected. Updating browsers...", log_file)
                pw_success, pw_log = run_cmd(["npx", "playwright", "install"], repo, dry_run)
                upgrade_log += f"\n--- Playwright Install ---\n{pw_log}"
                if pw_success:
                    log("  ✓ playwright install: SUCCESS", log_file)
                else:
                    log("  ⚠️ playwright install: WARNING/FAIL", log_file)

        # requirements.txt
        elif (repo / "requirements.txt").is_file():
            log("  Detected python requirements.txt...", log_file)
            local_pip = "pip"
            if (repo / ".venv" / "bin" / "pip").is_file():
                local_pip = str(repo / ".venv" / "bin" / "pip")
            elif (repo / "venv" / "bin" / "pip").is_file():
                local_pip = str(repo / "venv" / "bin" / "pip")

            # Try local pip, fallback to python3 -m pip
            if dry_run:
                upgrade_success, upgrade_log = run_cmd(f"{local_pip} install --upgrade -r requirements.txt", repo, True)
            else:
                upgrade_success, upgrade_log = run_cmd([local_pip, "install", "--upgrade", "-r", "requirements.txt"], repo, False)
                if not upgrade_success:
                    log("  Fallback to python3 -m pip install...", log_file)
                    upgrade_success, upgrade_log2 = run_cmd(["python3", "-m", "pip", "install", "--upgrade", "-r", "requirements.txt"], repo, False)
                    upgrade_log += f"\n--- Fallback Pip ---\n{upgrade_log2}"

            if upgrade_success:
                log("  ✓ python deps: SUCCESS", log_file)
            else:
                log("  ⚠️ python deps: WARNING/FAIL", log_file)

        # Cargo.toml
        elif (repo / "Cargo.toml").is_file():
            log("  Detected Cargo project...", log_file)
            upgrade_success, upgrade_log = run_cmd(["cargo", "update"], repo, dry_run)
            if upgrade_success:
                log("  ✓ cargo update: SUCCESS", log_file)
            else:
                log("  ⚠️ cargo update: WARNING/FAIL", log_file)

        # 4. Verification Check
        test_success = True
        test_log = ""
        if dry_run:
            log("  [DRY-RUN] Verify tests (npm test / pytest / cargo test)", log_file)
        else:
            if (repo / "package.json").is_file():
                # Read package.json to check for "test" script
                has_test = False
                try:
                    with open(repo / "package.json", "r", encoding="utf-8") as f:
                        if '"test"' in f.read():
                            has_test = True
                except Exception:
                    pass

                if has_test:
                    log("  Running npm tests...", log_file)
                    test_success, test_log = run_cmd(["npm", "test"], repo, False)
                    if test_success:
                        log("  ✓ tests: PASS", log_file)
                    else:
                        log("  ⚠️ tests: FAIL", log_file)

            elif (repo / "Cargo.toml").is_file():
                log("  Running cargo test...", log_file)
                test_success, test_log = run_cmd(["cargo", "test"], repo, False)
                if test_success:
                    log("  ✓ tests: PASS", log_file)
                else:
                    log("  ⚠️ tests: FAIL", log_file)

            elif (repo / "tests").is_dir() or (repo / "test").is_dir():
                # Check if pytest is available
                pytest_check = subprocess.run(["which", "pytest"], capture_output=True)
                if pytest_check.returncode == 0:
                    log("  Running pytest...", log_file)
                    test_success, test_log = run_cmd(["pytest"], repo, False)
                    if test_success:
                        log("  ✓ tests: PASS", log_file)
                    else:
                        log("  ⚠️ tests: FAIL", log_file)

        duration = round(time.time() - start_time, 2)
        overall_passed = pull_success and upgrade_success and test_success

        if overall_passed:
            upgraded_count += 1
        else:
            failed_count += 1

        # Build detailed log if failed
        combined_log = ""
        if not pull_success:
            combined_log += f"--- Git Pull Error ---\n{pull_log}\n"
        if not upgrade_success:
            combined_log += f"--- Upgrade Error ---\n{upgrade_log}\n"
        if not test_success:
            combined_log += f"--- Test Error ---\n{test_log}\n"

        results.append({
            "repository_id": f"local:{repo.name}",
            "url": f"file://{repo.resolve()}",
            "branch": default_branch,
            "latest_commit_sha": git_sha,
            "integration_status": "PASS" if overall_passed else "FAIL",
            "duration_seconds": duration,
            "skipped": False,
            "log": combined_log if not overall_passed else None
        })

    log("============================================================", log_file)
    log(f"🏁 Sweep complete. Upgraded: {upgraded_count}, Failed: {failed_count}.", log_file)
    log(f"Logs persisted to: {log_file}", log_file)

    return results, upgraded_count, failed_count

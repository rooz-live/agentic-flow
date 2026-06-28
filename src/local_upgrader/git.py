"""Git helpers for local upgrader."""

import subprocess
from pathlib import Path
from typing import List

from src.local_upgrader.executor import run_cmd


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


def detect_head_sha(repo_path: Path, dry_run: bool = False) -> str:
    """Return the current HEAD SHA for a repo, or empty string on failure."""
    ok, out = run_cmd(["git", "rev-parse", "HEAD"], repo_path, dry_run, timeout_s=30)
    return out.strip() if ok else ""

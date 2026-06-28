"""Repository scanning for local upgrader."""

from pathlib import Path
from typing import List


# Standard directories to skip
SKIP_SUBSTRINGS = ["/node_modules/", "/clean-ruflo-env/", "/pre-cleanup-backup-"]


def scan_repositories(scan_paths: List[str]) -> List[Path]:
    """Scan scan_paths recursively up to depth 3 to find Git repositories, skipping common folders."""
    found_repos: List[Path] = []

    for path_str in scan_paths:
        parent = Path(path_str).expanduser().resolve()
        if not parent.is_dir():
            continue

        def walk(current_dir: Path, depth: int) -> None:
            if depth > 3:
                return

            git_dir = current_dir / ".git"
            if git_dir.is_dir():
                repo_str = str(current_dir)
                if not any(sub in repo_str for sub in SKIP_SUBSTRINGS):
                    found_repos.append(current_dir)
                return  # Stop recursing inside repository

            try:
                for child in current_dir.iterdir():
                    if child.is_dir() and not child.name.startswith("."):
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

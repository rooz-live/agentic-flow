"""Dependency manifest hashing for local upgrader."""

import hashlib
from pathlib import Path
from typing import List


MANIFEST_FILES: List[str] = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "requirements.txt",
    "Cargo.toml",
    "Cargo.lock",
]


def calculate_manifest_hash(repo_path: Path) -> str:
    """Calculate hash of all local dependency manifest and lock files."""
    hasher = hashlib.sha256()
    found_any = False

    for filename in sorted(MANIFEST_FILES):
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

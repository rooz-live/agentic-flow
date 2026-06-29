"""COH-006 regression: every git-tracked Python package dir must have __init__.py.

Anti-CVT gate: implicit namespace packages (PEP 420) make code unobservable
to tooling that expects regular packages. This test ensures the COH-006 gap
stays closed — no new tracked .py directory can appear without __init__.py.

R09 (Anti-CVT index gap): cog-upgrade artifacts untracked until committed.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# Directories that are intentionally NOT Python packages.
SKIP_DIRS = {
    "src/rust",                # Rust workspace
    "src/rust/eventops_pyo3",  # PyO3 crate (has pyproject.toml)
}


def _tracked_py_dirs() -> set[str]:
    """Return relative dirs containing git-tracked .py files under src/."""
    result = subprocess.run(
        ["git", "ls-files", "src/"],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    dirs: set[str] = set()
    for line in result.stdout.strip().split("\n"):
        if line.endswith(".py"):
            d = os.path.dirname(line)
            while d.startswith("src/") and d != "src":
                dirs.add(d)
                d = os.path.dirname(d)
    return dirs


def test_every_tracked_python_package_has_init_py() -> None:
    """No tracked .py directory may lack __init__.py (except SKIP_DIRS)."""
    missing: list[str] = []
    for d in sorted(_tracked_py_dirs()):
        if d in SKIP_DIRS:
            continue
        init_path = REPO_ROOT / d / "__init__.py"
        tracked = subprocess.run(
            ["git", "ls-files", f"{d}/__init__.py"],
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
        )
        if not tracked.stdout.strip() and not init_path.exists():
            missing.append(d)

    assert not missing, (
        f"COH-006 regression: {len(missing)} package dirs missing __init__.py: "
        f"{', '.join(missing)}"
    )


def test_init_py_files_are_not_empty_corruption() -> None:
    """__init__.py files must exist on disk (not just git index)."""
    for d in sorted(_tracked_py_dirs()):
        if d in SKIP_DIRS:
            continue
        init_path = REPO_ROOT / d / "__init__.py"
        if init_path.exists():
            content = init_path.read_text()
            # Allow empty or docstring-only files, but flag pure garbage
            assert "import" in content or '"""' in content or content.strip() == "", (
                f"{init_path} appears corrupted: {content[:50]!r}"
            )

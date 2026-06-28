#!/usr/bin/env python3
"""Run pytest with coverage scoped to changed Python files.

Computes changed files vs HEAD, maps them to convention-based test modules,
runs coverage, and enforces a minimum threshold. Returns the pytest exit code.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_THRESHOLD = 80


def changed_python_files(root: Path) -> list[Path]:
    files: list[Path] = []
    seen: set[str] = set()
    for cmd in (
        ["git", "diff", "--cached", "--name-only"],  # staged
        ["git", "diff", "--name-only"],               # unstaged tracked
    ):
        try:
            out = subprocess.check_output(cmd, cwd=root, text=True)
        except subprocess.CalledProcessError:
            continue
        for line in out.splitlines():
            p = root / line.strip()
            key = str(p.resolve())
            if p.suffix == ".py" and p.is_file() and key not in seen:
                seen.add(key)
                files.append(p)
    return files


def test_path_for(source: Path, root: Path) -> Path | None:
    rel = source.relative_to(root)
    parts = list(rel.parts)
    # A test file exercises itself.
    if parts[0] == "tests" and source.name.startswith("test_") and source.is_file():
        return source
    if parts[0] == "scripts":
        parts = parts[1:]
    elif parts[0] == "src":
        parts = parts[1:]
    else:
        return None
    name = Path(parts[-1]).stem
    for test_dir in (root / "tests" / "pytest", root / "tests" / "metrics"):
        candidate = test_dir / f"test_{name}.py"
        if candidate.is_file():
            return candidate
    return None


def run_pytest_coverage(root: Path, threshold: int) -> int:
    sources = changed_python_files(root)
    if not sources:
        print("pytest-coverage: no changed Python files; skipping")
        return 0

    source_files = [s for s in sources if not s.is_relative_to(root / "tests")]
    source_dirs = sorted({str(s.parent.relative_to(root)) for s in source_files}) if source_files else []
    include_patterns = [str(s.relative_to(root)) for s in source_files]
    test_modules = [str(t) for t in {test_path_for(s, root) for s in sources} if t]

    if not test_modules:
        print(f"pytest-coverage: no test modules for {include_patterns}; skipping")
        return 0

    if not include_patterns:
        print(f"pytest-coverage: only test files changed; skipping coverage enforcement")
        return 0

    print(f"pytest-coverage: sources={source_dirs} tests={test_modules}")
    include_arg = ",".join(include_patterns)
    clean_env = {k: v for k, v in os.environ.items() if k not in ("PYTHONPATH", "AF_VERIFY_MODE", "AF_GATE_CONTEXT")}
    cov = subprocess.run(
        [
            sys.executable,
            "-m",
            "coverage",
            "run",
            "--source",
            ",".join(source_dirs),
            "--include",
            include_arg,
            "--omit",
            "*/test_*.py",
            "-m",
            "pytest",
            *test_modules,
            "-q",
        ],
        cwd=root,
        env=clean_env,
    )
    if cov.returncode != 0:
        return cov.returncode

    report_cmd = [
        sys.executable,
        "-m",
        "coverage",
        "report",
        "--include",
        include_arg,
        "--omit",
        "*/test_*.py",
        "--fail-under",
        str(threshold),
    ]
    report = subprocess.run(report_cmd, cwd=root)
    return report.returncode


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Pytest coverage for changed files")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)
    args = parser.parse_args(argv)
    return run_pytest_coverage(args.root.resolve(), args.threshold)


if __name__ == "__main__":
    sys.exit(main())

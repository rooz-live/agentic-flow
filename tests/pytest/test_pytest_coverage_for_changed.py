"""Unit tests for scripts.cicd.pytest_coverage_for_changed."""
from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from scripts.cicd.pytest_coverage_for_changed import (
    changed_python_files,
    main,
    run_pytest_coverage,
    test_path_for as resolve_test_path,
)


def test_resolve_test_path_for_test_file_returns_itself():
    root = Path(__file__).resolve().parents[2]
    p = root / "tests" / "pytest" / "test_pace_from_lnnnl.py"
    assert resolve_test_path(p, root) == p


def test_resolve_test_path_for_script_finds_pytest_test():
    root = Path(__file__).resolve().parents[2]
    assert resolve_test_path(root / "scripts" / "metrics" / "pace_from_lnnnl.py", root) == root / "tests" / "pytest" / "test_pace_from_lnnnl.py"


def test_changed_python_files_sees_staged_change(tmp_path, monkeypatch):
    monkeypatch.setenv("GIT_DIR", str(tmp_path / ".git"))
    (tmp_path / ".git").mkdir()
    (tmp_path / "src.py").write_text("x = 1")
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "add", "src.py"], cwd=tmp_path, check=True, capture_output=True)
    files = changed_python_files(tmp_path)
    assert files == [tmp_path / "src.py"]


def test_changed_python_files_sees_unstaged_change(tmp_path, monkeypatch):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    src = tmp_path / "mod.py"
    src.write_text("x = 1")
    subprocess.run(["git", "add", "mod.py"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)
    src.write_text("x = 2")
    files = changed_python_files(tmp_path)
    assert files == [tmp_path / "mod.py"]


def test_run_pytest_coverage_skips_when_no_test_modules(tmp_path, capsys):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "orphan.py").write_text("x = 1")
    subprocess.run(["git", "add", "orphan.py"], cwd=tmp_path, check=True, capture_output=True)
    assert run_pytest_coverage(tmp_path, 80) == 0
    captured = capsys.readouterr()
    assert "no test modules" in captured.out


def test_main_cli(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "only_tests.py").write_text("x = 1")
    subprocess.run(["git", "add", "only_tests.py"], cwd=tmp_path, check=True, capture_output=True)
    assert main(["--root", str(tmp_path), "--threshold", "80"]) == 0


def test_changed_python_files_handles_non_git_dir(tmp_path):
    # A non-git directory causes git diff to fail; function should return empty list
    files = changed_python_files(tmp_path)
    assert files == []


def test_resolve_test_path_for_unknown_prefix_returns_none(tmp_path):
    unknown = tmp_path / "docs" / "something.py"
    unknown.parent.mkdir(parents=True)
    unknown.write_text("x = 1")
    assert resolve_test_path(unknown, tmp_path) is None


def test_run_pytest_coverage_only_test_files_changed(tmp_path, capsys):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    tests_dir = tmp_path / "tests" / "pytest"
    tests_dir.mkdir(parents=True)
    (tests_dir / "test_mod.py").write_text("def test_mod(): pass\n")
    subprocess.run(["git", "add", "tests"], cwd=tmp_path, check=True, capture_output=True)
    assert run_pytest_coverage(tmp_path, 80) == 0
    captured = capsys.readouterr()
    assert "only test files changed" in captured.out


def test_run_pytest_coverage_runs_tests_and_passes_threshold(tmp_path, capsys):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    scripts_dir = tmp_path / "scripts" / "cicd"
    scripts_dir.mkdir(parents=True)
    (scripts_dir / "mod.py").write_text("def add(a, b): return a + b\n")
    tests_dir = tmp_path / "tests" / "pytest"
    tests_dir.mkdir(parents=True)
    (tests_dir / "test_mod.py").write_text(
        "from scripts.cicd.mod import add\n\ndef test_add():\n    assert add(1, 2) == 3\n"
    )
    subprocess.run(["git", "add", "scripts", "tests"], cwd=tmp_path, check=True, capture_output=True)
    assert run_pytest_coverage(tmp_path, 80) == 0
    captured = capsys.readouterr()
    assert "pytest-coverage:" in captured.out

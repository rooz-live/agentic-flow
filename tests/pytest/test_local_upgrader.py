"""Unit tests for the decomposed src/local_upgrader package.

Covers the pure primitives extracted from the original scripts/cicd/local_upgrader.py
monolith: scanning, manifest hashing, git helpers, command execution, cache I/O,
and logging.
"""

import subprocess
import sys
from pathlib import Path

import pytest

# Add project root to path for local imports (matches sibling tests convention)
ROOT_DIR = Path(__file__).parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.local_upgrader.cache import load_upgrades_cache, save_upgrades_cache
from src.local_upgrader.executor import run_cmd
from src.local_upgrader.git import detect_head_sha, get_default_branch
from src.local_upgrader.logger import log
from src.local_upgrader.manifest import MANIFEST_FILES, calculate_manifest_hash
from src.local_upgrader.scanner import scan_repositories


class TestScanRepositories:
    def test_finds_git_repos(self, tmp_path):
        (tmp_path / "repo_a" / ".git").mkdir(parents=True)
        (tmp_path / "repo_b" / ".git").mkdir(parents=True)
        repos = scan_repositories([str(tmp_path)])
        assert sorted(r.name for r in repos) == ["repo_a", "repo_b"]

    def test_skips_node_modules(self, tmp_path):
        (tmp_path / "repo_a" / ".git").mkdir(parents=True)
        (tmp_path / "repo_b" / ".git").mkdir(parents=True)
        (tmp_path / "repo_b" / "node_modules" / ".git").mkdir(parents=True)
        repos = scan_repositories([str(tmp_path)])
        assert [r.name for r in repos] == ["repo_a", "repo_b"]

    def test_skips_clean_ruflo_env(self, tmp_path):
        (tmp_path / "good" / ".git").mkdir(parents=True)
        (tmp_path / "clean-ruflo-env" / "bad" / ".git").mkdir(parents=True)
        repos = scan_repositories([str(tmp_path)])
        assert [r.name for r in repos] == ["good"]

    def test_respects_depth_limit(self, tmp_path):
        # depth 1: repo at top level
        (tmp_path / "d1" / ".git").mkdir(parents=True)
        # depth 4: too deep, should be ignored
        (tmp_path / "d1" / "nested" / "more" / "deep" / "repo" / ".git").mkdir(parents=True)
        repos = scan_repositories([str(tmp_path)])
        assert [r.name for r in repos] == ["d1"]

    def test_deduplicates_and_sorts(self, tmp_path):
        (tmp_path / "beta" / ".git").mkdir(parents=True)
        (tmp_path / "alpha" / ".git").mkdir(parents=True)
        # Also provide the same path twice via a symlink-equivalent duplicate is hard,
        # so just verify sorting and that the same physical dir appears once.
        repos = scan_repositories([str(tmp_path), str(tmp_path)])
        names = [r.name for r in repos]
        assert names == sorted(set(names))


class TestManifestHash:
    def test_consistent_for_same_files(self, tmp_path):
        repo = tmp_path / "repo"
        repo.mkdir()
        (repo / "package.json").write_text('{"name":"test"}', encoding="utf-8")
        (repo / "package-lock.json").write_text('{"lock":true}', encoding="utf-8")
        h1 = calculate_manifest_hash(repo)
        h2 = calculate_manifest_hash(repo)
        assert h1 == h2
        assert h1 != "no_manifests"

    def test_changes_when_file_changes(self, tmp_path):
        repo = tmp_path / "repo"
        repo.mkdir()
        (repo / "package.json").write_text('{"name":"v1"}', encoding="utf-8")
        h1 = calculate_manifest_hash(repo)
        (repo / "package.json").write_text('{"name":"v2"}', encoding="utf-8")
        h2 = calculate_manifest_hash(repo)
        assert h1 != h2

    def test_no_manifests_returned_when_empty_repo(self, tmp_path):
        repo = tmp_path / "repo"
        repo.mkdir()
        assert calculate_manifest_hash(repo) == "no_manifests"

    def test_only_known_manifest_files_contribute(self, tmp_path):
        repo = tmp_path / "repo"
        repo.mkdir()
        (repo / "ignored.txt").write_text("data", encoding="utf-8")
        assert calculate_manifest_hash(repo) == "no_manifests"
        (repo / "requirements.txt").write_text("requests", encoding="utf-8")
        assert calculate_manifest_hash(repo) != "no_manifests"

    def test_manifest_files_list_is_non_empty(self):
        assert "package.json" in MANIFEST_FILES
        assert "Cargo.toml" in MANIFEST_FILES


class TestGitDefaultBranch:
    def test_returns_main_when_local_main_exists(self, tmp_path):
        subprocess.run(["git", "init", "-b", "main"], cwd=str(tmp_path), check=True, capture_output=True)
        assert get_default_branch(tmp_path) == "main"

    def test_falls_back_to_master(self, tmp_path):
        subprocess.run(["git", "init"], cwd=str(tmp_path), check=True, capture_output=True)
        subprocess.run(["git", "checkout", "-b", "master"], cwd=str(tmp_path), check=True, capture_output=True)
        assert get_default_branch(tmp_path) == "master"

    def test_returns_current_branch_when_no_main_or_master(self, tmp_path):
        subprocess.run(["git", "init"], cwd=str(tmp_path), check=True, capture_output=True)
        subprocess.run(["git", "checkout", "-b", "feature"], cwd=str(tmp_path), check=True, capture_output=True)
        assert get_default_branch(tmp_path) == "feature"

    def test_detect_head_sha(self, tmp_path):
        subprocess.run(["git", "init", "-b", "main"], cwd=str(tmp_path), check=True, capture_output=True)
        (tmp_path / "file.txt").write_text("x", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=str(tmp_path), check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", "init"], cwd=str(tmp_path), check=True, capture_output=True)
        sha = detect_head_sha(tmp_path)
        assert len(sha) == 40


class TestExecutor:
    def test_run_cmd_success(self, tmp_path):
        ok, out = run_cmd(["echo", "hello"], tmp_path, dry_run=False)
        assert ok
        assert "hello" in out

    def test_run_cmd_failure(self, tmp_path):
        ok, out = run_cmd(["false"], tmp_path, dry_run=False)
        assert not ok

    def test_run_cmd_dry_run(self, tmp_path):
        ok, out = run_cmd(["rm", "-rf", "/"], tmp_path, dry_run=True)
        assert ok
        assert "DRY-RUN" in out

    def test_run_cmd_shell_string(self, tmp_path):
        ok, out = run_cmd("echo $PWD", tmp_path, dry_run=False)
        assert ok
        assert str(tmp_path) in out or "/" in out

    def test_run_cmd_timeout(self, tmp_path):
        ok, out = run_cmd(["sleep", "10"], tmp_path, dry_run=False, timeout_s=0)
        assert not ok


class TestCacheIO:
    def test_load_missing_cache_returns_empty(self, tmp_path):
        assert load_upgrades_cache(tmp_path / "missing.json") == {}

    def test_save_and_load_roundtrip(self, tmp_path):
        path = tmp_path / "cache.json"
        data = {"repo1": {"git_commit": "abc", "manifest_hash": "def"}}
        save_upgrades_cache(data, path)
        assert load_upgrades_cache(path) == data

    def test_save_creates_parent_directories(self, tmp_path):
        path = tmp_path / "a" / "b" / "cache.json"
        save_upgrades_cache({}, path)
        assert path.exists()

    def test_load_invalid_json_returns_empty(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text("{not json", encoding="utf-8")
        assert load_upgrades_cache(path) == {}


class TestLogger:
    def test_log_writes_to_stdout(self, capsys):
        log("hello")
        captured = capsys.readouterr()
        assert "hello" in captured.out

    def test_log_appends_to_file(self, tmp_path):
        log_file = tmp_path / "log.txt"
        log("message", log_file)
        content = log_file.read_text(encoding="utf-8")
        assert "message" in content
        assert content.startswith("[")

    def test_log_handles_missing_dir_gracefully(self, tmp_path, capsys):
        log_file = tmp_path / "does" / "not" / "exist" / "log.txt"
        log("message", log_file)
        captured = capsys.readouterr()
        assert "Warning: Could not write" in captured.err


class TestPackageImports:
    def test_public_api_exports_all_helpers(self):
        import src.local_upgrader as lu
        assert callable(lu.scan_repositories)
        assert callable(lu.calculate_manifest_hash)
        assert callable(lu.get_default_branch)
        assert callable(lu.run_cmd)
        assert callable(lu.log)
        assert callable(lu.load_upgrades_cache)
        assert callable(lu.save_upgrades_cache)

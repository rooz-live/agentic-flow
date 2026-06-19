import os
import sys
import json
import argparse
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Ensure scripts/cicd is in sys.path
SCRIPT_DIR = Path(__file__).parent.parent.parent / "scripts" / "cicd"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import local_upgrader
import upstream_upgrade_engine


def test_scan_repositories(tmp_path):
    """Test local repository scanning up to depth 3 with path exclusion."""
    # Structure:
    # tmp_path/repo1/.git -> depth 2 (tmp_path is 1, repo1 is 2, .git is 3)
    # tmp_path/sub/repo2/.git -> depth 3
    # tmp_path/sub/sub/repo3/.git -> depth 4 (should be skipped, too deep)
    # tmp_path/node_modules/repo_nod/.git -> should be excluded by name
    # tmp_path/clean-ruflo-env/repo_cl/.git -> should be excluded by name
    # tmp_path/pre-cleanup-backup-123/repo_bk/.git -> should be excluded by name

    repo1 = tmp_path / "repo1"
    (repo1 / ".git").mkdir(parents=True, exist_ok=True)

    repo2 = tmp_path / "sub" / "repo2"
    (repo2 / ".git").mkdir(parents=True, exist_ok=True)

    repo3 = tmp_path / "sub" / "sub" / "repo3"
    (repo3 / ".git").mkdir(parents=True, exist_ok=True)

    repo_nod = tmp_path / "node_modules" / "repo_nod"
    (repo_nod / ".git").mkdir(parents=True, exist_ok=True)

    repo_cl = tmp_path / "clean-ruflo-env" / "repo_cl"
    (repo_cl / ".git").mkdir(parents=True, exist_ok=True)

    repo_bk = tmp_path / "pre-cleanup-backup-123" / "repo_bk"
    (repo_bk / ".git").mkdir(parents=True, exist_ok=True)

    found = local_upgrader.scan_repositories([str(tmp_path)])
    
    # Resolved paths
    found_resolved = [p.resolve() for p in found]

    assert repo1.resolve() in found_resolved
    assert repo2.resolve() in found_resolved
    assert repo3.resolve() not in found_resolved  # Too deep (depth 4)
    assert repo_nod.resolve() not in found_resolved
    assert repo_cl.resolve() not in found_resolved
    assert repo_bk.resolve() not in found_resolved


@patch("subprocess.run")
def test_get_default_branch_origin_head(mock_run):
    """Test default branch detection when origin/HEAD is defined."""
    # Mock git rev-parse --abbrev-ref origin/HEAD -> origin/main
    mock_res = MagicMock()
    mock_res.returncode = 0
    mock_res.stdout = "origin/main\n"
    mock_run.return_value = mock_res

    branch = local_upgrader.get_default_branch(Path("/dummy/repo"))
    assert branch == "main"


@patch("subprocess.run")
def test_get_default_branch_local_fallback(mock_run):
    """Test default branch fallback checks when origin/HEAD is missing."""
    # First call: git rev-parse --abbrev-ref origin/HEAD -> fails
    # Second call: git show-ref --verify --quiet refs/heads/main -> fails (returns 1)
    # Third call: git show-ref --verify --quiet refs/heads/master -> succeeds (returns 0)
    
    mock_res_fail = MagicMock()
    mock_res_fail.returncode = 1
    mock_res_fail.stdout = ""

    mock_res_ok = MagicMock()
    mock_res_ok.returncode = 0
    mock_res_ok.stdout = ""

    mock_run.side_effect = [mock_res_fail, mock_res_fail, mock_res_ok]

    branch = local_upgrader.get_default_branch(Path("/dummy/repo"))
    assert branch == "master"


def test_run_cmd_dry_run():
    """Test that run_cmd in dry_run mode does not execute command."""
    success, output = local_upgrader.run_cmd("echo 'hello'", Path("/dummy"), dry_run=True)
    assert success is True
    assert "[DRY-RUN]" in output


@patch("subprocess.run")
def test_run_cmd_success(mock_run):
    """Test run_cmd success case."""
    mock_res = MagicMock()
    mock_res.returncode = 0
    mock_res.stdout = "stdout output"
    mock_res.stderr = "stderr output"
    mock_run.return_value = mock_res

    success, output = local_upgrader.run_cmd(["echo", "hello"], Path("/dummy"), dry_run=False)
    assert success is True
    assert "stdout output" in output
    assert "stderr output" in output


@patch("local_upgrader.scan_repositories")
@patch("local_upgrader.get_default_branch")
@patch("local_upgrader.run_cmd")
def test_run_local_sweep_success(mock_run_cmd, mock_get_branch, mock_scan, tmp_path):
    """Test run_local_sweep with success path on python project."""
    repo_path = tmp_path / "my_py_repo"
    repo_path.mkdir()
    # Create requirements.txt to trigger pip upgrade
    (repo_path / "requirements.txt").touch()

    mock_scan.return_value = [repo_path]
    mock_get_branch.return_value = "main"
    
    # 1. git rev-parse HEAD -> sha
    # 2. git pull
    # 3. pip install
    mock_run_cmd.side_effect = [
        (True, "abc123sha\n"),  # git rev-parse HEAD
        (True, "Already up to date.\n"),  # git pull
        (True, "Successfully installed...\n"),  # pip install
    ]

    results, upgraded, failed = local_upgrader.run_local_sweep([str(tmp_path)], dry_run=False)
    
    assert upgraded == 1
    assert failed == 0
    assert len(results) == 1
    assert results[0]["integration_status"] == "PASS"
    assert results[0]["repository_id"] == "local:my_py_repo"


@patch("local_upgrader.scan_repositories")
@patch("local_upgrader.get_default_branch")
@patch("local_upgrader.run_cmd")
def test_run_local_sweep_fail(mock_run_cmd, mock_get_branch, mock_scan, tmp_path):
    """Test run_local_sweep when a command fails (e.g. tests fail)."""
    repo_path = tmp_path / "my_node_repo"
    repo_path.mkdir()
    # package.json with test script
    with open(repo_path / "package.json", "w") as f:
        json.dump({"scripts": {"test": "jest"}}, f)

    mock_scan.return_value = [repo_path]
    mock_get_branch.return_value = "main"

    # Mock runs:
    # 1. git rev-parse HEAD
    # 2. git pull -> success
    # 3. npm update -> success
    # 4. npm test -> fail
    mock_run_cmd.side_effect = [
        (True, "sha123\n"),  # rev-parse
        (True, "git pull output\n"),  # git pull
        (True, "npm update output\n"),  # npm update
        (False, "AssertionError: 1 != 2\n"),  # npm test (failed)
    ]

    results, upgraded, failed = local_upgrader.run_local_sweep([str(tmp_path)], dry_run=False)
    
    assert upgraded == 0
    assert failed == 1
    assert len(results) == 1
    assert results[0]["integration_status"] == "FAIL"
    assert "AssertionError" in results[0]["log"]


@patch("upstream_fetcher.load_cache")
@patch("local_upgrader.run_local_sweep")
@patch("sys.exit")
def test_engine_coordinator_local_only(mock_exit, mock_sweep, mock_load_cache):
    """Test that engine coordinates only local sweep when skip-upstream is passed."""
    mock_load_cache.return_value = {}
    mock_sweep.return_value = ([{
        "repository_id": "local:test",
        "url": "file:///test",
        "branch": "main",
        "latest_commit_sha": "sha",
        "integration_status": "PASS",
        "duration_seconds": 1.0,
        "skipped": False
    }], 1, 0)

    test_args = ["upstream_upgrade_engine.py", "--local", "--skip-upstream"]
    with patch("sys.argv", test_args):
        upstream_upgrade_engine.main()

    assert mock_sweep.called
    assert mock_exit.called
    mock_exit.assert_called_with(0)

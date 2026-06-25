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
import upstream_runner
import upstream_reporter
import edge_fetcher
import edge_runner
import edge_reporter
import edge_gateway_sync_engine


# ==============================================================================
# Upstream Runner / Harness Detection
# ==============================================================================

def test_detect_harness_uses_hint_when_valid():
    """Registry hint is authoritative over command-string inference."""
    assert local_upgrader  # keep import used for side-effect
    assert upstream_runner.detect_harness("cargo check", hint="playwright") == "playwright"


def test_detect_harness_falls_back_to_command_when_hint_invalid():
    assert upstream_runner.detect_harness("cargo check", hint="not_a_harness") == "cargo"


def test_detect_harness_falls_back_to_manifest(tmp_path):
    (tmp_path / "Cargo.toml").write_text("")
    assert upstream_runner.detect_harness("unknown command", repo_dir=tmp_path) == "cargo"


def test_to_receipt_validates_upstream_result(tmp_path):
    """upstream_runner.to_receipt must produce a validated cicd.receipt.v1."""
    result = {
        "repository_id": "repo-b",
        "url": "https://github.com/b/b",
        "branch": "main",
        "latest_commit_sha": "sha456",
        "integration_status": "FAIL",
        "duration_seconds": 2.5,
        "skipped": False,
        "attempts": 1,
        "dor_status": "pass",
        "harness_type": "pytest",
        "log": "assertion failed",
    }
    import lib.receipt as receipt_mod
    rec = upstream_runner.to_receipt(result, tmp_path)
    assert rec["schema"] == "cicd.receipt.v1"
    assert rec["context"] == "upstream"
    assert rec["status"] == "FAIL"
    assert rec["run"]["exit_code"] == 1
    assert rec["signals"][0]["name"] == "integration_test"
    assert rec["signals"][0]["ok"] is False
    assert rec["signals"][0]["details"]["harness_type"] == "pytest"
    assert receipt_mod.validate(rec) == []


def test_local_to_receipt_validates_result(tmp_path):
    """local_upgrader.to_receipt must produce a validated cicd.receipt.v1."""
    result = {
        "repository_id": "local:my_repo",
        "url": "file:///tmp/my_repo",
        "branch": "main",
        "latest_commit_sha": "abc",
        "integration_status": "PASS",
        "duration_seconds": 5.0,
        "skipped": False,
        "sandbox_setup_duration": 1.0,
        "git_pull_duration": 2.0,
        "upgrade_duration": 1.5,
        "test_duration": 0.5,
    }
    import lib.receipt as receipt_mod
    rec = local_upgrader.to_receipt(result)
    assert rec["schema"] == "cicd.receipt.v1"
    assert rec["context"] == "local"
    assert rec["status"] == "PASS"
    assert rec["run"]["exit_code"] == 0
    assert rec["signals"][0]["details"]["test_duration"] == 0.5
    assert receipt_mod.validate(rec) == []


# ==============================================================================
# Upstream Reporter / Error Taxonomy + Throughput
# ==============================================================================

def test_classify_failure_maps_common_signals():
    assert upstream_reporter._classify_failure("", "PASS") == "none"
    assert upstream_reporter._classify_failure("[TIMEOUT after 30s]", "FAIL") == "timeout"
    assert upstream_reporter._classify_failure("git clone failed: 404", "FAIL") == "clone_failed"
    assert upstream_reporter._classify_failure("404 page not found", "FAIL") == "not_found"
    assert upstream_reporter._classify_failure("Traceback (most recent call last)", "FAIL") == "exception"
    assert upstream_reporter._classify_failure("permission denied", "FAIL") == "permission_denied"
    assert upstream_reporter._classify_failure("assert 0 == 1", "FAIL") == "command_failed"


def test_eta_seconds_sanity():
    assert upstream_reporter._eta_seconds(2, 3600.0) == 2.0
    assert upstream_reporter._eta_seconds(0, 3600.0) == 0.0
    assert upstream_reporter._eta_seconds(1, 0.0) == float("inf")


def test_save_report_and_cache_writes_cicd_receipt(tmp_path):
    """save_report_and_cache must also emit a validated cicd.receipt.v1 artefact."""
    results = [
        {
            "repository_id": "repo-a",
            "integration_status": "PASS",
            "latest_commit_sha": "sha123",
            "duration_seconds": 1.0,
            "skipped": False,
            "log": "ok",
        }
    ]
    cache = {}
    ok = upstream_reporter.save_report_and_cache(
        results, cache, tmp_path, "20260619T100000Z", run_id="run-1"
    )
    assert ok is True
    receipt_file = tmp_path / ".goalie" / "evidence" / "upgrades" / "receipt_20260619T100000Z.json"
    assert receipt_file.is_file()
    data = json.loads(receipt_file.read_text(encoding="utf-8"))
    assert data["schema"] == "cicd.receipt.v1"
    assert data["context"] == "upstream"
    assert data["status"] == "PASS"
    assert data["run"]["exit_code"] == 0
    assert data["signals"][0]["name"] == "repo:repo-a"
    assert data["signals"][0]["ok"] is True


# ==============================================================================
# Local Upgrader Unit Tests
# ==============================================================================

def test_scan_repositories(tmp_path):
    """Test local repository scanning up to depth 3 with path exclusion."""
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
    mock_res = MagicMock()
    mock_res.returncode = 0
    mock_res.stdout = "origin/main\n"
    mock_run.return_value = mock_res

    branch = local_upgrader.get_default_branch(Path("/dummy/repo"))
    assert branch == "main"


@patch("subprocess.run")
def test_get_default_branch_local_fallback(mock_run):
    """Test default branch fallback checks when origin/HEAD is missing."""
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
    (repo_path / "requirements.txt").touch()

    mock_scan.return_value = [repo_path]
    mock_get_branch.return_value = "main"
    
    mock_run_cmd.side_effect = [
        (True, "abc123sha\n"),  # git rev-parse HEAD
        (True, "Already up to date.\n"),  # git pull
        (True, "venv created\n"),  # uv venv .venv
        (True, "Successfully installed...\n"),  # uv pip install -r requirements.txt
        (True, "Successfully upgraded...\n"),  # uv pip install --upgrade -r requirements.txt
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
    with open(repo_path / "package.json", "w") as f:
        json.dump({"scripts": {"test": "jest"}}, f)

    mock_scan.return_value = [repo_path]
    mock_get_branch.return_value = "main"

    mock_run_cmd.side_effect = [
        (True, "git pull output\n"),  # git pull
        (True, "sha123\n"),  # rev-parse
        (True, "npm install output\n"),  # npm install
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

    test_args = ["upstream_upgrade_engine.py", "--local", "--skip-upstream", "--no-coherence"]
    with patch("sys.argv", test_args):
        upstream_upgrade_engine.main()

    assert mock_sweep.called
    assert mock_exit.called
    mock_exit.assert_called_with(0)


# ==============================================================================
# Edge Gateway Deconstruction Unit Tests
# ==============================================================================

def test_parse_edge_cfg(tmp_path):
    """Test parsing Caddy-style configuration files for virtualhosts."""
    cfg_file = tmp_path / "edge_gateway.cfg"
    cfg_content = """
# Header comment
{
    email test@bhopti.com
}

billing.bhopti.com {
    reverse_proxy 127.0.0.1:30083
}

# Duplicate / Multiple
crm.bhopti.com, shop.bhopti.com {
    reverse_proxy 127.0.0.1:8000
}
"""
    cfg_file.write_text(cfg_content)
    fqdns = edge_fetcher.parse_edge_cfg(cfg_file)
    assert fqdns == ["billing.bhopti.com", "crm.bhopti.com", "shop.bhopti.com"]


def test_load_fqdn_registry(tmp_path):
    """Test loading fqdn_registry.yaml map."""
    reg_file = tmp_path / "fqdn_registry.yaml"
    reg_content = """
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
  - fqdn: crm.bhopti.com
    origin: "${ENV_IP}"
"""
    reg_file.write_text(reg_content)
    registry = edge_fetcher.load_fqdn_registry(reg_file)
    # Checks that non-placeholder values are mapped correctly
    assert registry.get("billing.bhopti.com") == "23.92.79.2"
    assert "crm.bhopti.com" not in registry  # skipped placeholder


@patch("edge_fetcher.get_live_resolution")
@patch("edge_fetcher.load_edge_state_cache")
def test_fetch_edge_status(mock_cache, mock_dns, tmp_path):
    """Test fetch_edge_status delta detection."""
    import hashlib
    cfg_content = "billing.bhopti.com {\n}\ncrm.bhopti.com {\n}\n"
    cfg_hash = hashlib.sha256(cfg_content.encode("utf-8")).hexdigest()
    mock_cache.return_value = {
        "billing.bhopti.com": "23.92.79.2",
        "crm.bhopti.com": "23.92.79.2",
        "_cfg_hash": cfg_hash
    }
    # billing.bhopti.com matches cache & registry -> skipped
    # crm.bhopti.com IP mismatched -> queued
    mock_dns.side_effect = lambda f: "23.92.79.2" if f == "billing.bhopti.com" else "127.0.0.1"

    # Setup directories
    proxies_dir = tmp_path / "src" / "proxies"
    proxies_dir.mkdir(parents=True)
    (proxies_dir / "edge_gateway.cfg").write_text("billing.bhopti.com {\n}\ncrm.bhopti.com {\n}\n")
    
    config_dir = tmp_path / "config"
    config_dir.mkdir(parents=True)
    (config_dir / "fqdn_registry.yaml").write_text("domains:\n  - fqdn: billing.bhopti.com\n    origin: \"23.92.79.2\"\n  - fqdn: crm.bhopti.com\n    origin: \"23.92.79.2\"\n")

    fqdns, registry, live_resolutions, cache, to_sync, fqdn_metadata = edge_fetcher.fetch_edge_status(tmp_path)
    assert "billing.bhopti.com" in fqdns
    assert "crm.bhopti.com" in fqdns
    assert to_sync == ["crm.bhopti.com"]


@patch("subprocess.run")
def test_run_edge_sync_success(mock_sub_run):
    """Test run_edge_sync under valid matching state."""
    mock_sub_run.return_value = MagicMock(returncode=1)
    fqdns = ["billing.bhopti.com"]
    to_sync = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live_resolutions = {"billing.bhopti.com": "23.92.79.2"}

    results = edge_runner.run_edge_sync(fqdns, to_sync, registry, live_resolutions, Path("/dummy"))
    assert len(results) == 1
    assert results[0]["status"] == "PASS"
    assert results[0]["fqdn"] == "billing.bhopti.com"
    assert results[0]["skipped"] is False


def test_run_edge_sync_mismatch():
    """Test run_edge_sync under drift/mismatch state."""
    fqdns = ["billing.bhopti.com"]
    to_sync = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live_resolutions = {"billing.bhopti.com": "127.0.0.1"}

    results = edge_runner.run_edge_sync(fqdns, to_sync, registry, live_resolutions, Path("/dummy"))
    assert len(results) == 1
    assert results[0]["status"] == "FAIL"
    assert "MISMATCH" in results[0]["log"] or "expected" in results[0]["log"]


def test_save_edge_report_and_cache(tmp_path):
    """Test report file generation and cache write."""
    results = [
        {
            "fqdn": "billing.bhopti.com",
            "status": "PASS",
            "resolved_ip": "23.92.79.2",
            "expected_ip": "23.92.79.2",
            "duration_seconds": 0.5,
            "skipped": False
        }
    ]
    cache = {}
    passed, _ = edge_reporter.save_edge_report_and_cache(results, cache, tmp_path, "20260619T100000Z")
    assert passed is True
    
    cache_file = tmp_path / ".goalie" / "evidence" / "edge_gateway" / "last_known_state.json"
    assert cache_file.is_file()
    with open(cache_file, "r") as f:
        data = json.load(f)
        assert data.get("billing.bhopti.com") == "23.92.79.2"


@patch("edge_fetcher.fetch_edge_status")
@patch("edge_reporter.save_edge_report_and_cache")
@patch("sys.exit")
def test_edge_engine_coordinator(mock_exit, mock_report, mock_fetch):
    """Test that edge gateway sync engine coordinates fetch, run, and report."""
    mock_fetch.return_value = (["billing.bhopti.com"], {"billing.bhopti.com": "23.92.79.2"}, {"billing.bhopti.com": "23.92.79.2"}, {}, [], {"billing.bhopti.com": {"origin": "23.92.79.2"}})
    mock_report.return_value = (True, {"status": "PASS"})

    test_args = ["edge_gateway_sync_engine.py", "--dry-run"]
    with patch("sys.argv", test_args):
        edge_gateway_sync_engine.main()

    assert mock_fetch.called
    assert mock_exit.called
    mock_exit.assert_called_with(0)


def test_decentralized_lock(tmp_path):
    """Test DecentralizedLock acquire and release behaviors."""
    from decentralized_lock import DecentralizedLock
    lock1 = DecentralizedLock(tmp_path, "res1")
    lock2 = DecentralizedLock(tmp_path, "res1")
    
    assert lock1.acquire() is True
    # Try to acquire lock while held by lock1 - should fail
    assert lock2.acquire() is False
    
    # Release and try again - should succeed
    lock1.release()
    assert lock2.acquire() is True
    lock2.release()


@patch("local_upgrader.scan_repositories")
@patch("local_upgrader.get_default_branch")
def test_run_local_sweep_decentralized_locked(mock_get_branch, mock_scan, tmp_path):
    """Test that when run in decentralized mode, locked repositories are skipped with PASS."""
    from decentralized_lock import DecentralizedLock
    repo_path = tmp_path / "locked_repo"
    repo_path.mkdir()
    
    # Hold the lock
    lock = DecentralizedLock(tmp_path / ".goalie" / "locks", "local_locked_repo")
    assert lock.acquire() is True
    
    mock_scan.return_value = [repo_path]
    mock_get_branch.return_value = "main"
    
    # Run sweep with decentralized=True
    results, upgraded, failed = local_upgrader.run_local_sweep(
        [str(tmp_path)],
        decentralized=True,
        project_root=tmp_path
    )
    
    assert len(results) == 1
    assert results[0]["integration_status"] == "PASS"
    assert results[0]["skipped"] is True
    assert results[0]["log"] == "Claimed by another worker"
    
    lock.release()


def test_run_validations_decentralized_locked(tmp_path):
    """Test that run_validations skips locked repositories under decentralized mode."""
    from decentralized_lock import DecentralizedLock
    import upstream_runner
    
    # Hold the lock
    lock = DecentralizedLock(tmp_path / ".goalie" / "locks", "repo_a")
    assert lock.acquire() is True
    
    repos = [{"id": "repo_a", "url": "https://github.com/a/a", "branch": "main", "active": True, "integration_test": "pytest"}]
    to_validate = [{"id": "repo_a"}]
    remote_heads = {"repo_a": "sha1"}
    
    results = upstream_runner.run_validations(
        repos,
        to_validate,
        remote_heads,
        tmp_path,
        decentralized=True
    )
    
    assert len(results) == 1
    assert results[0]["integration_status"] == "PASS"
    assert results[0]["skipped"] is True
    assert results[0]["dor_status"] == "locked"
    
    lock.release()


@patch("sys.exit")
def test_engine_htr_verify(mock_exit, tmp_path):
    """Test that htr-verify runs and exits 0 on valid structure."""
    # Write a valid tree
    tree_dir = tmp_path / ".goalie" / "evidence"
    tree_dir.mkdir(parents=True)
    tree_file = tree_dir / "htr_tree.json"
    tree_file.write_text(json.dumps({
        "tree_id": "test",
        "nodes": [{
            "id": "H-001",
            "parent_id": None,
            "hypothesis": "test",
            "status": "PASS",
            "metrics": {}
        }]
    }))
    
    test_args = ["upstream_upgrade_engine.py", "--htr-verify"]
    with patch("sys.argv", test_args), patch("upstream_upgrade_engine.SCRIPT_DIR", tmp_path / "scripts" / "cicd"):
        # Create dummy path structure to satisfy script dir
        (tmp_path / "scripts" / "cicd").mkdir(parents=True, exist_ok=True)
        upstream_upgrade_engine.main()
        
    assert mock_exit.called
    mock_exit.assert_called_with(0)

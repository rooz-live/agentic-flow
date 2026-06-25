"""Tests for scripts/metrics/timescape_envelope.py — timescape_envelope.v2 schema."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path setup — import the module under test directly
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "metrics" / "timescape_envelope.py"

sys.path.insert(0, str(REPO_ROOT / "scripts" / "metrics"))
import timescape_envelope as te  # noqa: E402

# ---------------------------------------------------------------------------
# Required output-schema keys (per deliverable spec)
# ---------------------------------------------------------------------------
REQUIRED_KEYS = {
    "timestamp",
    "ati",
    "rehydration_loop_tick_count",
    "inbox_zero_percent",
    "inbox_zero_open",
    "pace_cod_weight",
    "envelope_status",
    "sources",
}

VALID_STATUSES = {"RELATE", "TRANSFORM", "TRAIN", "BLOCK"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_agentic_time(tmp_root: Path, ati: float = 0.131, pace: float = 1.5) -> Path:
    """Write a minimal agentic_time_latest.json into tmp_root."""
    evidence = tmp_root / ".goalie" / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    doc = {
        "timestamp": "2026-06-25T19:18:41.395Z",
        "schema": "agentic_time.v1",
        "synthetic_proxy": True,
        "relate_only": True,
        "source": "@ruvector/emergent-time via apps/agent-harness",
        "inputs": {
            "pace_cod_weight": pace,
            "anti_cvt_score": 21,
            "absolute_open_items": 30,
        },
        "tick": {
            "delta_time": 2.5543,
            "class": "Progress",
            "reason": "Progress: dominated by plan movement",
        },
        "clock": {
            "cumulative_time": 2.5543,
            "cumulative_progress": 0.335,
            "ati": ati,
            "health": "Drifting",
        },
    }
    p = evidence / "agentic_time_latest.json"
    p.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return p


def _make_rehydration(tmp_root: Path, tick_count: int = 3) -> Path:
    """Write a rehydration_latest.json into tmp_root."""
    learning = tmp_root / ".goalie" / "evidence" / "learning"
    learning.mkdir(parents=True, exist_ok=True)
    doc = {
        "schema": "cls.rehydration.v1",
        "run_id": "20260625T183850Z-91998",
        "timestamp_utc": "2026-06-25T18:38:52Z",
        "head_sha": "bdc3f2b955d7df7d252e59a16cf5202ed1bd25ca",
        "loop_item": "P1-INDEX-02",
        "loop_tick_count": tick_count,
        "perceive_ec": 0,
        "cls_ec": 0,
        "tick_exit": 0,
    }
    p = learning / "rehydration_latest.json"
    p.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return p


def _make_inbox_zero(
    tmp_root: Path,
    pct_closed: float = 67.03,
    open_count: int = 30,
    pace: float = 1.5,
) -> Path:
    """Write an inbox_zero_latest.json into tmp_root."""
    evidence = tmp_root / ".goalie" / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    doc = {
        "schema_version": "1.0.0",
        "timestamp": "2026-06-25T19:18:41Z",
        "metrics": {
            "pct_closed": pct_closed,
            "open_count": open_count,
            "velocity": 2.5417,
            "pace": pace,
        },
        "pct_closed": pct_closed,
        "open_count": open_count,
        "velocity": 2.5417,
        "pace": pace,
        "pace_cod_weight": pace,
        "anti_cvt": {"total": 21},
        "anti_cvt_score": 21,
        "absolute_open_items": open_count,
        "completion_ratio_percent": pct_closed,
    }
    p = evidence / "inbox_zero_latest.json"
    p.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Unit tests — build_envelope()
# ---------------------------------------------------------------------------

class TestBuildEnvelopeSchema:
    """Verify required output keys are present and correctly typed."""

    def test_all_required_keys_present(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        missing = REQUIRED_KEYS - set(result.keys())
        assert not missing, f"Missing keys: {missing}"

    def test_timestamp_is_iso8601(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        ts = result["timestamp"]
        # Must parse without error
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None

    def test_ati_is_float(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.131)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["ati"], float)
        assert abs(result["ati"] - 0.131) < 1e-6

    def test_rehydration_loop_tick_count_is_int(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path, tick_count=7)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["rehydration_loop_tick_count"], int)
        assert result["rehydration_loop_tick_count"] == 7

    def test_inbox_zero_percent_is_float(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=67.03)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["inbox_zero_percent"], float)
        assert abs(result["inbox_zero_percent"] - 67.03) < 0.01

    def test_inbox_zero_open_is_int(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, open_count=42)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["inbox_zero_open"], int)
        assert result["inbox_zero_open"] == 42

    def test_pace_cod_weight_is_float(self, tmp_path):
        _make_agentic_time(tmp_path, pace=1.5)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pace=1.5)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["pace_cod_weight"], float)
        assert result["pace_cod_weight"] == pytest.approx(1.5)

    def test_envelope_status_valid(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        assert result["envelope_status"] in VALID_STATUSES

    def test_sources_is_list(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        assert isinstance(result["sources"], list)
        assert len(result["sources"]) >= 1


class TestEnvelopeStatusLogic:
    """Verify status derivation thresholds."""

    def test_block_when_ati_below_threshold(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.02)   # below 0.05 → BLOCK
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=80.0)

        result = te.build_envelope(tmp_path)
        assert result["envelope_status"] == "BLOCK"

    def test_block_when_inbox_below_threshold(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.50)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=10.0)   # below 20% → BLOCK

        result = te.build_envelope(tmp_path)
        assert result["envelope_status"] == "BLOCK"

    def test_train_when_high_ati_and_inbox(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.75)   # >= 0.60
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=70.0)   # >= 60%

        result = te.build_envelope(tmp_path)
        assert result["envelope_status"] == "TRAIN"

    def test_transform_when_mid_ati_and_inbox(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.30)   # >= 0.25
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=50.0)   # >= 40%

        result = te.build_envelope(tmp_path)
        assert result["envelope_status"] == "TRANSFORM"

    def test_relate_when_low_mid_ati(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.15)   # < 0.25, > 0.05
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=35.0)   # < 40%

        result = te.build_envelope(tmp_path)
        assert result["envelope_status"] == "RELATE"


class TestMissingSourceFiles:
    """Envelope must not crash when source files are absent; defaults apply."""

    def test_all_sources_missing_returns_defaults(self, tmp_path):
        # No evidence files written at all
        result = te.build_envelope(tmp_path)

        assert set(result.keys()) >= REQUIRED_KEYS
        assert result["ati"] == 0.0
        assert result["rehydration_loop_tick_count"] == 0
        assert result["inbox_zero_percent"] == 0.0
        assert result["inbox_zero_open"] == 0
        assert result["pace_cod_weight"] == 0.0
        # With all zeros → ati < 0.05 → BLOCK
        assert result["envelope_status"] == "BLOCK"
        assert result["sources"] == []

    def test_missing_rehydration_falls_back_to_glob(self, tmp_path):
        """If rehydration_latest.json absent but timestamped file exists, use it."""
        _make_agentic_time(tmp_path)
        _make_inbox_zero(tmp_path)
        learning = tmp_path / ".goalie" / "evidence" / "learning"
        learning.mkdir(parents=True, exist_ok=True)
        ts_doc = {"schema": "cls.rehydration.v1", "loop_tick_count": 5}
        (learning / "rehydration_20260625T180000Z-12345.json").write_text(
            json.dumps(ts_doc), encoding="utf-8"
        )

        result = te.build_envelope(tmp_path)
        assert result["rehydration_loop_tick_count"] == 5


class TestSourcePaths:
    """Source list contains relative paths."""

    def test_sources_are_relative_posix_paths(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = te.build_envelope(tmp_path)

        for src in result["sources"]:
            # Must be relative (not absolute)
            assert not src.startswith("/"), f"Expected relative path, got: {src}"
            assert src.endswith(".json"), f"Expected .json source, got: {src}"


# ---------------------------------------------------------------------------
# Integration test — CLI invocation writes timescape_latest.json
# ---------------------------------------------------------------------------

class TestCLIOutput:
    """Run timescape_envelope.py as a subprocess and check the written file."""

    def test_cli_writes_timescape_latest_json(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(tmp_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, f"Script failed:\n{result.stderr}"

        out_path = tmp_path / ".goalie" / "evidence" / "timescape_latest.json"
        assert out_path.is_file(), "timescape_latest.json not written"

        data = json.loads(out_path.read_text(encoding="utf-8"))
        missing = REQUIRED_KEYS - set(data.keys())
        assert not missing, f"Missing keys in written file: {missing}"

    def test_cli_dry_run_prints_json_not_writes(self, tmp_path):
        _make_agentic_time(tmp_path)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path)

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(tmp_path), "--dry-run"],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0
        parsed = json.loads(result.stdout)
        missing = REQUIRED_KEYS - set(parsed.keys())
        assert not missing, f"dry-run output missing keys: {missing}"

        # dry-run must NOT write the file
        out_path = tmp_path / ".goalie" / "evidence" / "timescape_latest.json"
        assert not out_path.exists(), "dry-run should not write file"

    def test_cli_stdout_contains_status(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.75)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=70.0)

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(tmp_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0
        # The echo line must contain the status
        assert "TRAIN" in result.stdout


# ---------------------------------------------------------------------------
# Malformed source files and write path
# ---------------------------------------------------------------------------

class TestMalformedSources:
    def test_malformed_agentic_time_is_ignored(self, tmp_path):
        evidence = tmp_path / ".goalie" / "evidence"
        evidence.mkdir(parents=True)
        (evidence / "agentic_time_latest.json").write_text("not json", encoding="utf-8")
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=70.0)

        result = te.build_envelope(tmp_path)
        assert result["ati"] == 0.0
        assert "agentic_time_latest.json" not in result["sources"]

    def test_malformed_inbox_zero_is_ignored(self, tmp_path):
        evidence = tmp_path / ".goalie" / "evidence"
        evidence.mkdir(parents=True)
        _make_agentic_time(tmp_path, ati=0.75)
        _make_rehydration(tmp_path)
        (evidence / "inbox_zero_latest.json").write_text("not json", encoding="utf-8")

        result = te.build_envelope(tmp_path)
        assert result["inbox_zero_percent"] == 0.0
        assert "inbox_zero_latest.json" not in result["sources"]

    def test_rehydration_glob_fallback(self, tmp_path):
        evidence = tmp_path / ".goalie" / "evidence"
        learning = evidence / "learning"
        learning.mkdir(parents=True)
        _make_agentic_time(tmp_path, ati=0.75)
        _make_inbox_zero(tmp_path, pct_closed=70.0)
        (learning / "rehydration_20260625T000000Z.json").write_text(
            json.dumps({"loop_tick_count": 42}), encoding="utf-8"
        )

        result = te.build_envelope(tmp_path)
        assert result["rehydration_loop_tick_count"] == 42
        assert any("rehydration_20260625T000000Z" in s for s in result["sources"])

    def test_malformed_rehydration_glob_ignored(self, tmp_path):
        evidence = tmp_path / ".goalie" / "evidence"
        learning = evidence / "learning"
        learning.mkdir(parents=True)
        _make_agentic_time(tmp_path, ati=0.75)
        _make_inbox_zero(tmp_path, pct_closed=70.0)
        (learning / "rehydration_20260625T000000Z.json").write_text("not json", encoding="utf-8")

        result = te.build_envelope(tmp_path)
        assert result["rehydration_loop_tick_count"] == 0
        assert not any("rehydration" in s for s in result["sources"])

    def test_cli_writes_timescape_latest_json(self, tmp_path):
        _make_agentic_time(tmp_path, ati=0.75)
        _make_rehydration(tmp_path)
        _make_inbox_zero(tmp_path, pct_closed=70.0)

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(tmp_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0
        out_path = tmp_path / ".goalie" / "evidence" / "timescape_latest.json"
        assert out_path.is_file()
        doc = json.loads(out_path.read_text(encoding="utf-8"))
        assert doc["envelope_status"] == "TRAIN"


# ---------------------------------------------------------------------------
# Real-data smoke test (skipped if live evidence files absent)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not (REPO_ROOT / ".goalie" / "evidence" / "agentic_time_latest.json").is_file(),
    reason="Live agentic_time_latest.json not present",
)
def test_real_evidence_produces_valid_envelope():
    """Smoke-test against live evidence files in the repo."""
    result = te.build_envelope(REPO_ROOT)

    missing = REQUIRED_KEYS - set(result.keys())
    assert not missing, f"Live envelope missing keys: {missing}"
    assert result["envelope_status"] in VALID_STATUSES
    assert isinstance(result["ati"], float)
    assert isinstance(result["rehydration_loop_tick_count"], int)
    assert isinstance(result["inbox_zero_percent"], float)
    assert isinstance(result["inbox_zero_open"], int)
    assert isinstance(result["sources"], list)

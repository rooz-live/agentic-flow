"""Unit tests for scripts/cicd/lib/receipt.py."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest


def _load_module():
    import sys
    sys.path.insert(0, "scripts/cicd/lib")
    import receipt
    return receipt


@pytest.fixture()
def receipt():
    return _load_module()


def test_make_valid(receipt):
    r = receipt.make(
        context="upstream",
        status="PASS",
        command="pytest",
        exit_code=0,
        signals=[{"name": "pytest", "ok": True}],
    )
    assert r["schema"] == "cicd.receipt.v1"
    assert r["context"] == "upstream"
    assert r["status"] == "PASS"
    assert r["run"]["exit_code"] == 0
    assert r["signals"][0]["name"] == "pytest"


def test_make_invalid_context(receipt):
    with pytest.raises(ValueError, match="invalid context"):
        receipt.make(context="bad", status="PASS", command="x", exit_code=0)


def test_make_invalid_status(receipt):
    with pytest.raises(ValueError, match="invalid status"):
        receipt.make(context="upstream", status="bad", command="x", exit_code=0)


def test_validate_detects_missing_fields(receipt):
    errors = receipt.validate({"schema": "cicd.receipt.v1"})
    assert any("missing required field" in e for e in errors)


def test_validate_detects_bad_schema(receipt):
    r = receipt.make("upstream", "PASS", "x", 0)
    r["schema"] = "bad"
    errors = receipt.validate(r)
    assert any("schema must be" in e for e in errors)


def test_run_and_capture_success(receipt, tmp_path):
    script = tmp_path / "ok.sh"
    script.write_text("#!/bin/sh\necho hello\n", encoding="utf-8")
    rec, proc = receipt.run_and_capture(["sh", str(script)], "local")
    assert rec["status"] == "PASS"
    assert rec["run"]["exit_code"] == 0
    assert "hello" in rec["run"]["stdout"]
    assert rec["run"]["duration_seconds"] >= 0


def test_run_and_capture_failure(receipt, tmp_path):
    script = tmp_path / "fail.sh"
    script.write_text("#!/bin/sh\necho err >&2\nexit 1\n", encoding="utf-8")
    rec, proc = receipt.run_and_capture(["sh", str(script)], "edge")
    assert rec["status"] == "FAIL"
    assert rec["run"]["exit_code"] == 1
    assert "err" in rec["run"]["stderr"]


def test_write_and_read(receipt, tmp_path):
    r = receipt.make("orchestration", "PASS", "echo hi", 0)
    path = receipt.write(r, tmp_path / "receipts" / "test.json")
    assert path.exists()
    loaded = receipt.read(path)
    assert loaded["receipt_id"] == r["receipt_id"]

"""Unit tests for one.sh upstream/edge-sync receipt path printing."""
from __future__ import annotations

import subprocess
from pathlib import Path


def test_one_sh_upstream_prints_receipt_path():
    """one.sh upstream must be wired to print the CICD receipt path."""
    root = Path(__file__).resolve().parents[2]
    one_sh = root / "scripts" / "one.sh"
    content = one_sh.read_text(encoding="utf-8")
    # Should reference a flag or echo that surfaces the receipt path
    upstream_block = content.split("upstream)")[1].split(";;")[0]
    assert "receipt" in upstream_block.lower(), "upstream block does not surface receipt path"


def test_one_sh_edge_sync_prints_receipt_path():
    """one.sh edge-sync must be wired to print the CICD receipt path."""
    root = Path(__file__).resolve().parents[2]
    one_sh = root / "scripts" / "one.sh"
    content = one_sh.read_text(encoding="utf-8")
    edge_block = content.split("edge-sync)")[1].split(";;")[0]
    assert "receipt" in edge_block.lower(), "edge-sync block does not surface receipt path"


def test_upstream_engine_accepts_print_receipt_flag():
    """upstream_upgrade_engine.py must accept a --print-receipt flag."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["python3", str(root / "scripts" / "cicd" / "upstream_upgrade_engine.py"), "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert "--print-receipt" in result.stdout, "upstream engine missing --print-receipt"


def test_edge_engine_accepts_print_receipt_flag():
    """edge_gateway_sync_engine.py must accept a --print-receipt flag."""
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["python3", str(root / "scripts" / "cicd" / "edge_gateway_sync_engine.py"), "--help"],
        capture_output=True,
        text=True,
        cwd=str(root),
        timeout=30,
    )
    assert "--print-receipt" in result.stdout, "edge engine missing --print-receipt"

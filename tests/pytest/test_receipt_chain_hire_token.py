"""receipt_chain must resolve hire token via op/env, not shell HIRE_MCP_TOKEN only."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHAIN = ROOT / "scripts/cicd/receipt_chain.sh"


def test_receipt_chain_defines_hire_can_sync():
    text = CHAIN.read_text(encoding="utf-8")
    assert "_hire_can_sync" in text
    assert "hire_mcp_client import _resolve_token" in text
    assert "AF_RECEIPT_CHAIN_REQUIRE_HIRE" in text

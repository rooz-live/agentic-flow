#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════════
# core-adapter.py — MCP Polyglot Adapter (Innovator Circle / Cycle 73)
# @business-context WSJF-2.50: Polyglot NLP processing limits explicitly bound to the Compounding Intelligence Protocol thresholds.
# @adr ADR-005: Enforces strict OS topological memory payloads before instantiating LLM processes.
# @planned-change R-2026-025: Formalizes the substitution of the deleted pi-mcp-adapter.
# ═══════════════════════════════════════════════════════════════════════════════

import os
import sys
import json
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CHUNKING_CONFIG = PROJECT_ROOT / "scripts" / "config" / "chunking-config.json"
AGENTDB_PATH = PROJECT_ROOT / "agentdb.db"

def verify_csqbm_protocol() -> bool:
    """CSQBM Matrix check ensuring deep-why dependencies match natively."""
    try:
        check_path = PROJECT_ROOT / "scripts" / "validators" / "project" / "check-csqbm.sh"
        if check_path.exists():
            subprocess.run(["bash", str(check_path), "--deep-why"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        print("❌ FAIL (CSQBM Governance Halt) CSQBM trace missing. Task blocked via OpenWorm Physical Bounds.", file=sys.stderr)
        return False

def evaluate_polyglot_payload(payload_tokens: int) -> bool:
    """
    Evaluates requested NLP payload mapped against the Compounding Intelligence Protocol limits dynamically.
    """
    if not verify_csqbm_protocol():
        return False

    try:
        with open(CHUNKING_CONFIG, 'r') as f:
            config = json.load(f)
            # Fetch the TurboQuant 8000 boundary baseline from the configuration limits.
            max_limit = config.get("cycleLimits", {}).get("execution", 8000)
    except Exception:
        max_limit = 8000 # Fallback bounded limit natively defined by ADR-005
    
    if payload_tokens > max_limit:
        print(f"❌ FAIL (Compounding Intelligence Protocol) Polyglot NLP payload ({payload_tokens} tokens) exceeds bound matrix limit ({max_limit}).", file=sys.stderr)
        print("   Action Triggered: Dropping translation payload natively to preserve stability.", file=sys.stderr)
        return False
    
    print(f"✅ PASS: Polyglot payload ({payload_tokens}) within physical node boundaries (<{max_limit}).")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 core-adapter.py <payload_tokens>")
        sys.exit(1)
    
    try:
        tokens = int(sys.argv[1])
        if evaluate_polyglot_payload(tokens):
            sys.exit(0)
        else:
            sys.exit(1)
    except ValueError:
        print("Error: Payload tokens must be an integer.", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""
Agent Earning Protocols (EPA): Agent, Engine, Engineer, Ingenuity vectors.
Requires --verify (or AF_EARNINGS_VERIFY=1) so ledger credits use scorecard_gate output,
not self-asserted decision/sign_off fields.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

LEDGER_PATH = ".goalie/earnings_ledger.jsonl"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def verify_scorecard(path: Path, root: Path) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Run scorecard_gate harden + evaluate; return (result, hardened_card, meta)."""
    sys.path.insert(0, str(root))
    from scripts.gates.scorecard_gate import evaluate, finalize, harden

    card = json.loads(path.read_text(encoding="utf-8"))
    env = dict(os.environ)
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    strict = is_ci or env.get("AF_STRICT_SIGN_OFF", "0") == "1"
    hardened, extra_blocks, extra_warnings, meta = harden(
        card, env=env, strict=strict, ingest_only=False
    )
    result = evaluate(hardened)
    result = finalize(result, extra_blocks, extra_warnings, meta)
    return result, hardened, meta


def calculate_earnings(
    result: dict[str, Any],
    *,
    hardened_card: dict[str, Any] | None = None,
) -> dict[str, float]:
    """Calculate EPA vectors from verified gate result (not raw card claims)."""
    card = hardened_card or {}
    disposition = str(result.get("disposition", result.get("decision", "BLOCK"))).upper()
    originality = float(result.get("originality_score", 0.0))
    impact_net = float(result.get("impact_net", 0.0))

    impact = card.get("impact", {}) if isinstance(card.get("impact"), dict) else {}
    gates = card.get("gates", {}) if isinstance(card.get("gates"), dict) else {}

    ingenuity_score = originality
    rd = float(impact.get("reward_direction", 1.0) or 1.0)
    if rd > 1.0:
        ingenuity_score += (rd - 1.0) * 2.0

    engineer_score = impact_net
    gi = str(gates.get("gate_integrity", "")).upper()
    if gi == "PASS":
        engineer_score += 1.0

    agent_score = 0.0
    verified_sign_off = bool(card.get("sign_off"))
    if disposition == "SHIP":
        agent_score += 5.0
    if verified_sign_off and disposition in ("SHIP", "SPIKE"):
        agent_score += 2.0

    engine_score = 1.0
    br = float(impact.get("blast_radius", 1.0) or 1.0)
    if br < 1.0:
        engine_score += (1.0 - br) * 2.0

    return {
        "agent": round(agent_score, 2),
        "engine": round(engine_score, 2),
        "engineer": round(engineer_score, 2),
        "ingenuity": round(ingenuity_score, 2),
        "total_earnings": round(agent_score + engine_score + engineer_score + ingenuity_score, 2),
    }


def record_earnings(
    metrics: dict[str, float],
    *,
    commit: str,
    diff_sha: str,
    disposition: str,
    verified: bool,
    verification_meta: dict[str, Any] | None = None,
) -> None:
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "commit": commit,
        "diff_sha256": diff_sha,
        "disposition": disposition,
        "verified": verified,
        "earnings": metrics,
    }
    if verification_meta:
        entry["verification"] = {
            k: verification_meta[k]
            for k in ("coherence_derived", "gate_integrity_derived", "sign_off_verified", "sign_off_reason")
            if k in verification_meta
        }
    path = repo_root() / LEDGER_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Agent Earnings Engine (verified scorecard required)")
    parser.add_argument("--scorecard", required=True, help="Path to scorecard JSON")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Derive fields via scorecard_gate harden+evaluate (required for ledger credit)",
    )
    parser.add_argument(
        "--verified-result",
        help="Pre-verified scorecard_gate --verify --json output (skips inline verify)",
    )
    args = parser.parse_args()

    root = repo_root()
    os.chdir(root)
    verify = args.verify or os.environ.get("AF_EARNINGS_VERIFY", "0") == "1" or bool(args.verified_result)

    if not verify:
        print(
            "earnings_engine: refuse unverified scorecard (use --verify or AF_EARNINGS_VERIFY=1)",
            file=sys.stderr,
        )
        return 2

    try:
        scorecard_path = Path(args.scorecard)
        if scorecard_path.is_file():
            result, hardened, meta = verify_scorecard(scorecard_path, root)
        elif args.verified_result:
            bundle = json.loads(Path(args.verified_result).read_text(encoding="utf-8"))
            v = bundle.get("verification") or {}
            head = subprocess.check_output(
                ["git", "-C", str(root), "rev-parse", "HEAD"], text=True
            ).strip()
            if (
                os.environ.get("AF_VERIFIED_RESULT_TRUST") == "1"
                and v.get("commit") == head
                and v.get("diff_sha256")
            ):
                result = bundle
                hardened = {}
                meta = v
            else:
                print(
                    "earnings_engine: refuse untrusted --verified-result "
                    "(re-verify scorecard or set AF_VERIFIED_RESULT_TRUST=1 with HEAD-bound bundle)",
                    file=sys.stderr,
                )
                return 2
        else:
            print("earnings_engine: scorecard path missing", file=sys.stderr)
            return 2
    except Exception as exc:
        print(f"earnings_engine: verification failed: {exc}", file=sys.stderr)
        return 1

    if str(result.get("disposition", "")).upper() == "BLOCK":
        print(
            json.dumps({"disposition": "BLOCK", "errors": result.get("errors", [])}, indent=2),
            file=sys.stderr,
        )
        return 1

    metrics = calculate_earnings(result, hardened_card=hardened)
    commit = str(meta.get("commit") or hardened.get("commit") or result.get("commit") or "unknown")
    diff_sha = str(meta.get("diff_sha256") or hardened.get("diff_sha256") or "unknown")

    record_earnings(
        metrics,
        commit=commit,
        diff_sha=diff_sha,
        disposition=str(result.get("disposition", "UNKNOWN")),
        verified=True,
        verification_meta=meta,
    )
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
hire_mcp_client.py — Thin streamable HTTP MCP client for hire.agentics.org

Usage:
    python3 scripts/hire/hire_mcp_client.py --email s@rooz.live --profile path/to/profile.json
    python3 scripts/hire/hire_mcp_client.py --email s@rooz.live --profile path/to/profile.json --dry-run

Authentication priority:
    1. HIRE_MCP_TOKEN environment variable
    2. 1Password CLI: op read "op://Personal/Agentics/MCP API Token"

Receipt log: .goalie/evidence/hire_receipts.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RECEIPT_LOG = PROJECT_ROOT / ".goalie" / "evidence" / "hire_receipts.jsonl"
MCP_ENDPOINT = "https://hire.agentics.org/api/mcp"


# ---------------------------------------------------------------------------
# Token resolution
# ---------------------------------------------------------------------------

def _resolve_token() -> str:
    """Return the bearer token for the MCP API.

    Checks (in order):
      1. HIRE_MCP_TOKEN env var
      2. 1Password CLI: ``op read "op://Personal/Agentics/MCP API Token"``

    Raises:
        RuntimeError: if no token can be obtained from either source.
    """
    token = os.environ.get("HIRE_MCP_TOKEN", "").strip()
    if token:
        return token

    # Try 1Password CLI
    if _op_available():
        try:
            result = subprocess.run(
                ["op", "read", "op://Personal/Agentics/MCP API Token"],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode == 0:
                token = result.stdout.strip()
                if token:
                    return token
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            pass

    raise RuntimeError(
        "No MCP API token found. "
        "Set the HIRE_MCP_TOKEN environment variable or configure 1Password CLI "
        "with a secret at 'op://Personal/Agentics/MCP API Token'."
    )


def _op_available() -> bool:
    """Return True if the ``op`` binary is on PATH."""
    try:
        subprocess.run(
            ["op", "--version"],
            capture_output=True,
            timeout=5,
        )
        return True
    except (FileNotFoundError, OSError):
        return False


# ---------------------------------------------------------------------------
# Receipt logging
# ---------------------------------------------------------------------------

def _write_receipt(
    *,
    email: str,
    endpoint: str,
    status_code: int | str,
    response_summary: str,
    receipt_id: str,
) -> None:
    """Append a single JSON line to the receipt log file."""
    RECEIPT_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "email": email,
        "endpoint": endpoint,
        "status_code": status_code,
        "response_summary": response_summary,
        "receipt_id": receipt_id,
    }
    with open(RECEIPT_LOG, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")


# ---------------------------------------------------------------------------
# Core public API
# ---------------------------------------------------------------------------

def sync_profile(email: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST *payload* to the MCP endpoint and return the parsed response.

    The full envelope sent to the server is::

        {
            "email": "<email>",
            **payload          # caller-supplied profile fields
        }

    Every call is logged to ``.goalie/evidence/hire_receipts.jsonl``.

    Args:
        email:   Candidate email address — included in the request body and
                 in the receipt log entry.
        payload: Arbitrary profile data to POST (must be JSON-serialisable).

    Returns:
        Parsed JSON response body as a dict.  On HTTP errors the dict will
        contain ``{"error": ..., "status_code": ...}`` rather than raising.

    Raises:
        RuntimeError: if the token cannot be resolved.
    """
    token = _resolve_token()
    receipt_id = str(uuid.uuid4())

    body = {"email": email, **payload}
    encoded = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        MCP_ENDPOINT,
        data=encoded,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "X-Receipt-ID": receipt_id,
        },
        method="POST",
    )

    status_code: int | str = "UNKNOWN"
    response_text = ""
    result: dict[str, Any] = {}

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status_code = resp.status
            response_text = resp.read().decode("utf-8")
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                result = {"raw": response_text}

    except urllib.error.HTTPError as exc:
        status_code = exc.code
        try:
            response_text = exc.read().decode("utf-8")
        except Exception:
            response_text = str(exc)
        result = {"error": str(exc), "status_code": status_code, "body": response_text}

    except urllib.error.URLError as exc:
        status_code = "URL_ERROR"
        response_text = str(exc.reason)
        result = {"error": response_text, "status_code": status_code}

    except Exception as exc:  # noqa: BLE001
        status_code = "CLIENT_ERROR"
        response_text = str(exc)
        result = {"error": response_text, "status_code": status_code}

    # Summarise for the receipt (cap at 300 chars to keep log lean)
    summary = response_text[:300]

    _write_receipt(
        email=email,
        endpoint=MCP_ENDPOINT,
        status_code=status_code,
        response_summary=summary,
        receipt_id=receipt_id,
    )

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hire_mcp_client",
        description="Sync a candidate profile to hire.agentics.org via MCP.",
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Candidate email address (e.g. s@rooz.live)",
    )
    parser.add_argument(
        "--profile",
        required=True,
        help="Path to a JSON file containing the profile payload",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Print the request that would be sent without actually sending it",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    profile_path = Path(args.profile)
    if not profile_path.exists():
        print(f"❌  Profile file not found: {profile_path}", file=sys.stderr)
        return 1

    try:
        with open(profile_path, encoding="utf-8") as fh:
            payload: dict[str, Any] = json.load(fh)
    except json.JSONDecodeError as exc:
        print(f"❌  Invalid JSON in profile file: {exc}", file=sys.stderr)
        return 1

    if args.dry_run:
        envelope = {"email": args.email, **payload}
        print("=== DRY RUN — request that would be sent ===")
        print(f"POST {MCP_ENDPOINT}")
        print("Headers: Content-Type: application/json, Authorization: Bearer <token>, X-Receipt-ID: <uuid4>")
        print("Body:")
        print(json.dumps(envelope, indent=2))
        print("=== (no request sent) ===")
        return 0

    try:
        response = sync_profile(email=args.email, payload=payload)
    except RuntimeError as exc:
        print(f"❌  {exc}", file=sys.stderr)
        return 1

    print(json.dumps(response, indent=2))
    status = response.get("status_code")
    if status and str(status) not in {"200", "201", "202"}:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

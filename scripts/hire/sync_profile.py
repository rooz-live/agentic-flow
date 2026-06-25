#!/usr/bin/env python3
import os
import sys
import json
import datetime
import urllib.request
import urllib.error
import importlib.util
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = PROJECT_ROOT / "profile_readme.md"
RECEIPT_PATH = PROJECT_ROOT / ".goalie" / "evidence" / "hire_sync_receipt.json"

# Load shared JSON-RPC envelope
_MCP_JSONRPC_PATH = Path(__file__).resolve().parent / "mcp_jsonrpc.py"
if not _MCP_JSONRPC_PATH.exists():
    raise RuntimeError(f"Required module {_MCP_JSONRPC_PATH} not found")
_mcp_jsonrpc_spec = importlib.util.spec_from_file_location("mcp_jsonrpc", _MCP_JSONRPC_PATH)
assert _mcp_jsonrpc_spec is not None and _mcp_jsonrpc_spec.loader is not None
mcp_jsonrpc = importlib.util.module_from_spec(_mcp_jsonrpc_spec)
_mcp_jsonrpc_spec.loader.exec_module(mcp_jsonrpc)

def main():
    token = os.environ.get("MCP_API_TOKEN") or os.environ.get("HIRE_AGENTICS_TOKEN")
    if not token:
        print("❌ No MCP_API_TOKEN or HIRE_AGENTICS_TOKEN set; hire sync refused (fail-closed).", file=sys.stderr)
        return 1

    if not PROFILE_PATH.exists():
        print(f"❌ Profile file not found at {PROFILE_PATH}", file=sys.stderr)
        return 1

    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        profile_content = f.read()

    # JSON-RPC 2.0 envelope
    synced_at = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    params = {
        "email": "s@rooz.live",
        "profile_markdown": profile_content,
        "synced_at": synced_at,
    }
    envelope = mcp_jsonrpc.request("profile/sync", params)

    # Attempt API call
    url = "https://hire.agentics.org/api/mcp"
    req = urllib.request.Request(
        url,
        data=json.dumps(envelope).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="POST"
    )

    status = "UNKNOWN"
    response_body = ""
    error_message = None

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = str(response.status)
            response_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        status = str(e.code)
        response_body = e.read().decode("utf-8")
        error_message = str(e)
    except urllib.error.URLError as e:
        status = "CONNECTION_ERROR"
        error_message = str(e.reason)
    except Exception as e:
        status = "ERROR"
        error_message = str(e)

    try:
        parsed_response = json.loads(response_body)
    except Exception:
        parsed_response = None

    rpc_error = mcp_jsonrpc.error_message(parsed_response) if parsed_response else None
    success = status in ("200", "201") and not rpc_error

    receipt = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
        "url": url,
        "status": status,
        "token_used": token[:8] + "..." if len(token) > 8 else token,
        "success": success,
        "error_message": rpc_error or error_message,
        "response_preview": response_body[:200],
        "jsonrpc_valid": mcp_jsonrpc.is_valid_response(parsed_response) if parsed_response else False,
    }

    # Ensure goalie evidence folder exists
    RECEIPT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(RECEIPT_PATH, "w", encoding="utf-8") as f:
        json.dump(receipt, f, indent=2)

    print(f"Profile sync completed. Status: {status}")
    print(f"Receipt written to {RECEIPT_PATH}")
    return 0 if receipt["success"] else 1

if __name__ == "__main__":
    sys.exit(main())

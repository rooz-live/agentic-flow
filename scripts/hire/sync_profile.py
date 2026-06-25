#!/usr/bin/env python3
import os
import sys
import json
import datetime
import urllib.request
import urllib.error
from pathlib import Path

PROJECT_ROOT = Path("/Users/shahroozbhopti/Documents/code")
PROFILE_PATH = PROJECT_ROOT / "profile_readme.md"
RECEIPT_PATH = PROJECT_ROOT / ".goalie" / "evidence" / "hire_sync_receipt.json"

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

    # Payload
    payload = {
        "email": "s@rooz.live",
        "profile_markdown": profile_content,
        "synced_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    }

    # Attempt API call
    url = "https://hire.agentics.org/api/mcp"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
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

    receipt = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
        "url": url,
        "status": status,
        "token_used": token[:8] + "..." if len(token) > 8 else token,
        "success": status in ("200", "201"),
        "error_message": error_message,
        "response_preview": response_body[:200]
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

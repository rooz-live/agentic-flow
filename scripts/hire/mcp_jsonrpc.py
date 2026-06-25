#!/usr/bin/env python3
"""Shared JSON-RPC 2.0 envelope for hire.agentics.org MCP API."""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict


def request(method: str, params: Dict[str, Any], request_id: str | None = None) -> Dict[str, Any]:
    """Build a JSON-RPC 2.0 request envelope."""
    return {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": request_id or str(uuid.uuid4()),
    }


def is_valid_response(response: Dict[str, Any]) -> bool:
    """Return True if parsed JSON is a valid JSON-RPC response without error."""
    return isinstance(response, dict) and response.get("jsonrpc") == "2.0" and "error" not in response


def error_message(response: Dict[str, Any]) -> str | None:
    """Extract error message from a JSON-RPC response, or None."""
    err = response.get("error") if isinstance(response, dict) else None
    if isinstance(err, dict):
        return err.get("message") or json.dumps(err)
    if isinstance(err, str):
        return err
    return None

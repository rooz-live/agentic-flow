"""Shared CICD receipt helpers.

Provides the standard ``receipt.json`` envelope used by fetch-run-report cycles
across the upstream, local, edge, orchestration, and scorecard contexts.
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "cicd.receipt.v1"


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return value if isinstance(value, str) else str(value)


def make(
    context: str,
    status: str,
    command: str,
    exit_code: int,
    *,
    stdout: str = "",
    stderr: str = "",
    duration_seconds: float | None = None,
    signals: list[dict] | None = None,
    errors: list[str] | None = None,
    warnings: list[str] | None = None,
    meta: dict | None = None,
    receipt_id: str | None = None,
) -> dict:
    """Create a validated receipt dict."""
    if context not in {"upstream", "local", "edge", "orchestration", "scorecard", "hire"}:
        raise ValueError(f"invalid context: {context}")
    if status not in {"PASS", "FAIL", "BLOCK", "SKIP", "TIMEOUT"}:
        raise ValueError(f"invalid status: {status}")

    return {
        "receipt_id": receipt_id or str(uuid.uuid4()),
        "schema": SCHEMA_VERSION,
        "timestamp": _now(),
        "context": context,
        "status": status,
        "run": {
            "command": command,
            "exit_code": exit_code,
            "stdout": stdout,
            "stderr": stderr,
            "duration_seconds": duration_seconds,
        },
        "signals": signals or [],
        "errors": errors or [],
        "warnings": warnings or [],
        "meta": meta or {},
    }


def run_and_capture(
    cmd: list[str],
    context: str,
    *,
    timeout: float | None = None,
    cwd: str | None = None,
    env: dict | None = None,
    signals: list[dict] | None = None,
    meta: dict | None = None,
) -> tuple[dict, subprocess.CompletedProcess]:
    """Run a command and return a receipt plus the completed process."""
    start = datetime.datetime.now(datetime.timezone.utc)
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            env=env,
        )
    except subprocess.TimeoutExpired as e:
        proc = subprocess.CompletedProcess(
            args=cmd,
            returncode=-1,
            stdout=e.stdout or "",
            stderr=e.stderr or "",
        )
        status = "TIMEOUT"
    else:
        status = "PASS" if proc.returncode == 0 else "FAIL"

    duration = (datetime.datetime.now(datetime.timezone.utc) - start).total_seconds()
    receipt = make(
        context=context,
        status=status,
        command=" ".join(cmd),
        exit_code=proc.returncode,
        stdout=proc.stdout[-4000:],
        stderr=proc.stderr[-2000:],
        duration_seconds=duration,
        signals=signals,
        meta=meta,
    )
    return receipt, proc


def validate(receipt: dict) -> list[str]:
    """Return a list of validation errors for the receipt dict."""
    errors: list[str] = []
    required = ["receipt_id", "schema", "timestamp", "context", "status", "run"]
    for key in required:
        if key not in receipt:
            errors.append(f"missing required field: {key}")
    if receipt.get("schema") != SCHEMA_VERSION:
        errors.append(f"schema must be {SCHEMA_VERSION}")
    if receipt.get("context") not in {"upstream", "local", "edge", "orchestration", "scorecard", "hire"}:
        errors.append("invalid context")
    if receipt.get("status") not in {"PASS", "FAIL", "BLOCK", "SKIP", "TIMEOUT"}:
        errors.append("invalid status")
    run = receipt.get("run")
    if not isinstance(run, dict):
        errors.append("run must be a dict")
    elif "command" not in run or "exit_code" not in run:
        errors.append("run must contain command and exit_code")
    return errors


def write(receipt: dict, path: str | Path) -> Path:
    """Write a receipt to disk, creating parent directories as needed."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(receipt, indent=2, default=str), encoding="utf-8")
    return p


def read(path: str | Path) -> dict:
    """Read a receipt from disk."""
    return json.loads(Path(path).read_text(encoding="utf-8"))

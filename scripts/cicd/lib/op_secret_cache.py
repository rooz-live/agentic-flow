"""Shared 1Password op:// read with in-process TTL cache."""
from __future__ import annotations

import os
import re
import subprocess
import time

OP_REF_RE = re.compile(r"^op://")
PLACEHOLDER_RE = re.compile(r"(your_|placeholder|_here\b|changeme|xxx)", re.I)

_CACHE: dict[str, tuple[str, float]] = {}


def _is_placeholder(value: str) -> bool:
    if not value or not value.strip():
        return True
    return bool(PLACEHOLDER_RE.search(value))


def cache_ttl_sec() -> int:
    return int(os.environ.get("AF_OP_CACHE_TTL_SEC", "600"))


def clear_op_cache() -> None:
    _CACHE.clear()


def op_read(ref: str) -> str | None:
    """Read op:// ref via CLI; cache hits avoid duplicate 1Password prompts."""
    if not OP_REF_RE.match(ref):
        return None
    if os.environ.get("AF_SKIP_OP_READ") == "1":
        return None

    now = time.monotonic()
    cached = _CACHE.get(ref)
    if cached is not None:
        value, expires = cached
        if now < expires:
            return value
        _CACHE.pop(ref, None)

    try:
        proc = subprocess.run(
            ["op", "read", ref],
            capture_output=True,
            text=True,
            timeout=int(os.environ.get("AF_OP_READ_TIMEOUT_SEC", "60")),
            check=False,
        )
        if proc.returncode == 0:
            val = proc.stdout.strip()
            if val and not _is_placeholder(val):
                _CACHE[ref] = (val, now + cache_ttl_sec())
                return val
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None

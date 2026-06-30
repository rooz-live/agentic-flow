"""Shared disk gate thresholds for steward + doctor (R-DISK-01)."""
from __future__ import annotations

import os

DEFAULT_LOW_PCT = 90.0
DEFAULT_APPLY_PCT = 92.0
STEWARD_EVIDENCE_MAX_AGE_SEC = 3600
LOOSE_OBJECT_REPACK_THRESHOLD = 10_000


def low_pct() -> float:
    raw = os.environ.get("AF_DISK_LOW_PCT", str(DEFAULT_LOW_PCT))
    try:
        return float(raw)
    except ValueError:
        return DEFAULT_LOW_PCT


def apply_pct() -> float:
    raw = os.environ.get("AF_DISK_APPLY_PCT", str(DEFAULT_APPLY_PCT))
    try:
        return float(raw)
    except ValueError:
        return DEFAULT_APPLY_PCT

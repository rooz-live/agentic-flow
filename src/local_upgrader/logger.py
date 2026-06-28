"""Console / file logging helpers for local upgrader."""

import sys
import time
from pathlib import Path
from typing import Optional


def log(msg: str, log_file: Optional[Path] = None) -> None:
    """Log a message to stdout and optionally append to a file."""
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    formatted = f"[{timestamp}] {msg}"
    print(msg)  # Console output
    if log_file:
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(formatted + "\n")
        except Exception as e:
            print(f"Warning: Could not write to log file {log_file}: {e}", file=sys.stderr)

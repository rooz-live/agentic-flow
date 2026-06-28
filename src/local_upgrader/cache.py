"""Local upgrades cache I/O for local upgrader."""

import json
from pathlib import Path
from typing import Any, Dict


def load_upgrades_cache(cache_path: Path) -> Dict[str, Any]:
    """Load local upgrades cache from disk."""
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_upgrades_cache(cache: Dict[str, Any], cache_path: Path) -> None:
    """Save local upgrades cache to disk."""
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
            f.write("\n")
    except Exception:
        pass

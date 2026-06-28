"""Local Repository Upgrade Sweep — decomposed package.

Pure, testable primitives extracted from the original
scripts/cicd/local_upgrader.py monolith. The orchestration
(sandbox lifecycle, dependency upgrades, verification) remains in the
CLI wrapper; reusable helpers live here.
"""

from src.local_upgrader.cache import load_upgrades_cache, save_upgrades_cache
from src.local_upgrader.executor import run_cmd
from src.local_upgrader.git import get_default_branch
from src.local_upgrader.logger import log
from src.local_upgrader.manifest import calculate_manifest_hash
from src.local_upgrader.scanner import scan_repositories

__all__ = [
    "load_upgrades_cache",
    "save_upgrades_cache",
    "run_cmd",
    "get_default_branch",
    "log",
    "calculate_manifest_hash",
    "scan_repositories",
]

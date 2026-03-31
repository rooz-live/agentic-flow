"""
af prod Script Wiring Configuration

Dynamic script selection and review for af prod integration.
Uses WSJF prioritization to select critical/urgent scripts.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
import os
import glob

class ScriptCategory(Enum):
    CRITICAL = "critical"
    URGENT = "urgent"
    IMPORTANT = "important"
    ROUTINE = "routine"

@dataclass
class ScriptConfig:
    path: str
    name: str
    category: ScriptCategory
    wsjf_score: float
    description: str
    enabled: bool = True
    systems: List[str] = None  # Which systems this script applies to

    def __post_init__(self):
        if self.systems is None:
            self.systems = ["all"]

# Critical scripts that must always run
CRITICAL_SCRIPTS: List[ScriptConfig] = [
    ScriptConfig(
        path="scripts/preflight_health_check.sh",
        name="Preflight Health Check",
        category=ScriptCategory.CRITICAL,
        wsjf_score=18.0,  # High CoD (18) / Low JS (1)
        description="Pre-flight checks before prod cycle",
    ),
    ScriptConfig(
        path="scripts/quality/prod_quality_gates.py",
        name="Production Quality Gates",
        category=ScriptCategory.CRITICAL,
        wsjf_score=15.0,
        description="Validates pre/post context and exit codes",
    ),
    ScriptConfig(
        path="scripts/validate_blockers.sh",
        name="Blocker Validation",
        category=ScriptCategory.CRITICAL,
        wsjf_score=14.0,
        description="Validates blockers before deployment",
    ),
]

# Urgent scripts for immediate issues
URGENT_SCRIPTS: List[ScriptConfig] = [
    ScriptConfig(
        path="scripts/monitoring/watch_prod_cycle.sh",
        name="Prod Cycle Monitor",
        category=ScriptCategory.URGENT,
        wsjf_score=12.0,
        description="Real-time telemetry monitoring",
    ),
    ScriptConfig(
        path="scripts/agentic/show_roam_risks.py",
        name="ROAM Risk Snapshot",
        category=ScriptCategory.URGENT,
        wsjf_score=10.0,
        description="Lightweight risk assessment",
    ),
]

# Important scripts for regular operations
IMPORTANT_SCRIPTS: List[ScriptConfig] = [
    ScriptConfig(
        path="scripts/cmd_prod_cycle.py",
        name="Prod Cycle Command",
        category=ScriptCategory.IMPORTANT,
        wsjf_score=9.0,
        description="Main production cycle execution",
    ),
    ScriptConfig(
        path="scripts/cmd_wsjf.py",
        name="WSJF Calculator",
        category=ScriptCategory.IMPORTANT,
        wsjf_score=8.0,
        description="WSJF prioritization calculations",
    ),
    ScriptConfig(
        path="scripts/emit_metrics.py",
        name="Metrics Emitter",
        category=ScriptCategory.IMPORTANT,
        wsjf_score=7.0,
        description="Pattern metrics emission",
    ),
]

def get_all_scripts() -> List[ScriptConfig]:
    """Get all configured scripts sorted by WSJF score."""
    all_scripts = CRITICAL_SCRIPTS + URGENT_SCRIPTS + IMPORTANT_SCRIPTS
    return sorted(all_scripts, key=lambda s: s.wsjf_score, reverse=True)

def discover_scripts(base_path: str = "scripts") -> List[str]:
    """Discover all available scripts in the scripts directory."""
    patterns = ["*.sh", "*.py", "*.ts"]
    discovered = []

    for pattern in patterns:
        discovered.extend(glob.glob(f"{base_path}/**/{pattern}", recursive=True))

    return sorted(discovered)

def review_script(path: str) -> Dict:
    """Review a script for integration into af prod."""
    if not os.path.exists(path):
        return {"status": "not_found", "path": path}

    with open(path, "r") as f:
        content = f.read()

    # Basic analysis
    lines = content.split("\n")
    has_shebang = lines[0].startswith("#!") if lines else False
    has_docstring = '"""' in content or "'''" in content or "# " in content[:100]

    # Check for af prod integration points
    integrations = []
    if "af prod" in content:
        integrations.append("af_prod")
    if "pattern_metrics" in content.lower():
        integrations.append("pattern_metrics")
    if "wsjf" in content.lower():
        integrations.append("wsjf")
    if "telemetry" in content.lower():
        integrations.append("telemetry")

    return {
        "status": "reviewed",
        "path": path,
        "lines": len(lines),
        "has_shebang": has_shebang,
        "has_docstring": has_docstring,
        "integrations": integrations,
        "recommendation": "integrate" if integrations else "evaluate",
    }

def select_scripts_for_run(
    max_scripts: int = 10,
    categories: Optional[List[ScriptCategory]] = None
) -> List[ScriptConfig]:
    """Select scripts for a prod run based on WSJF and categories."""
    all_scripts = get_all_scripts()

    if categories:
        all_scripts = [s for s in all_scripts if s.category in categories]

    enabled_scripts = [s for s in all_scripts if s.enabled]

    return enabled_scripts[:max_scripts]

if __name__ == "__main__":
    import json

    print("=== af prod Script Configuration ===\n")

    print("Configured Scripts (by WSJF):")
    for script in get_all_scripts():
        status = "✅" if script.enabled else "❌"
        print(f"  {status} [{script.wsjf_score:5.1f}] {script.name} ({script.category.value})")

    print("\n\nDiscovered Scripts:")
    discovered = discover_scripts()
    print(f"  Found {len(discovered)} scripts in scripts/")

    print("\n\nSelected for Next Run:")
    selected = select_scripts_for_run(max_scripts=5)
    for script in selected:
        print(f"  → {script.name}: {script.path}")

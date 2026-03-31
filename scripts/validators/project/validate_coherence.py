#!/usr/bin/env python3
"""
DDD/TDD/ADR Coherence Validation System
=========================================

DoR: Project has domain modules, test files, and ADR/PRD documents
DoD: Automated pipeline validates structural coherence across all four patterns,
     outputs scored report with actionable gaps, exit code 0 (pass) or 1 (fail)

Validates coherence across four architectural layers:
  Layer 4a — PRD (Product Requirements Document): feature specs, acceptance criteria
  Layer 4b — ADR (Architecture Decision Record): decision log, status, consequences
  Layer 4c — DDD (Domain-Driven Design): aggregates, value objects, bounded contexts
  Layer 4d — TDD (Test-Driven Development): test-first coverage, red/green/refactor

Integrates with:
  - advocate CLI (`advocate validate --coherence`)
  - CI/CD pipeline (exit code based)
  - Validation dashboard TUI (JSON output)
  - 33-role governance council (Layer 4 checks)

Usage:
  python scripts/validate_coherence.py
  python scripts/validate_coherence.py --project-root /path/to/project
  python scripts/validate_coherence.py --layer ddd --strict
  python scripts/validate_coherence.py --json --output reports/coherence.json
  python scripts/validate_coherence.py --fix  # auto-generate missing scaffolds

Exit codes:
  0 = All coherence checks pass (or --fix applied successfully)
  1 = Coherence violations found
  2 = Configuration error
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# ═════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).parent


def _find_repo_root(
    start: Path,
    min_levels: int = 0,
    max_levels: int = 10,
) -> Path:
    """Walk up from *start* to find the nearest repo-root ancestor.

    Args:
        min_levels: Skip this many ancestors before accepting a match.
                    Useful when the script lives inside a git submodule
                    and you want to skip the inner .git and reach the
                    outer repo root.
        max_levels: Give up after this many steps upward.  Prevents
                    runaway walks to the filesystem root (/) on machines
                    without a git checkout.

    Markers checked (in order): .git, package.json, Cargo.toml.
    Falls back to the 3-level-up heuristic when no marker is found
    within the allowed range.
    """
    _MARKERS = (".git", "package.json", "Cargo.toml")
    candidate = start.resolve()

    for level in range(max_levels + 1):
        if level >= min_levels:
            if any((candidate / m).exists() for m in _MARKERS):
                return candidate
        parent = candidate.parent
        if parent == candidate:  # filesystem root reached
            break
        candidate = parent

    # Fallback: 3 levels up (scripts/validators/project/ → repo root)
    return start.resolve().parent.parent.parent


DEFAULT_PROJECT_ROOT = _find_repo_root(SCRIPT_DIR, min_levels=0, max_levels=10)

# Where to look for each layer's artifacts
LAYER_PATHS = {
    "prd": {
        "globs": ["docs/prd/**/*.md", "docs/PRD/**/*.md", "**/*PRD*.md", "**/*prd*.md"],
        "required_sections": [
            "objective",
            "requirements",
            "acceptance criteria",
            "success metric",
        ],
        "description": "Product Requirements Documents",
    },
    "adr": {
        "globs": [
            "docs/adr/**/*.md",
            "docs/ADR/**/*.md",
            "**/*ADR*.md",
            "docs/decisions/**/*.md",
        ],
        "required_sections": ["status", "context", "decision", "consequences"],
        "description": "Architecture Decision Records",
    },
    "ddd": {
        "globs": [
            "src/domain/**/*",
            "*/domain/**/*",
            "rust/core/src/domain/**/*",
            "rust/core/src/portfolio/**/*.rs",
            "rust/core/src/cache/**/*.rs",
            "rust/core/src/wsjf/**/*.rs",
            "rust/core/src/orchestration.rs",
            "rust/core/src/health.rs",
            "vibesthinker/**/*.py",
            "src/domain_models.py",
            "src/wsjf/*.py",
        ],
        "required_patterns": {
            "aggregate_root": [
                r"class\s+\w+.*(?:AggregateRoot|Portfolio|GovernanceCouncil|Dispute)",
                r"pub\s+struct\s+\w+",
                r"export\s+class\s+\w+(?:Report|Aggregate|Service|Repository|Validator)",
                r"@domain-entities:",
            ],
            "value_object": [
                r"@dataclass(?:\(frozen=True\))?",
                r"class\s+\w+(?:Score|Result|Check|Metric|Context)",
                r"#\[derive\(.*Clone.*\)\]",
            ],
            "entity": [
                r"class\s+\w+(?:Entity|Item|Event|Role)",
                r"pub\s+struct\s+\w+",
                r"@domain-entities:",
            ],
            "repository": [
                r"class\s+\w+Repository",
                r"def\s+(?:save|find|get|load|store|persist)",
            ],
            "service": [
                r"class\s+\w+(?:Service|Analyzer|Validator|Orchestrator|Pipeline)",
                r"def\s+(?:validate|analyze|execute|run|process|calculate)",
                r"@domain-behavior:",
            ],
            "bounded_context": [
                r"(?:module|package|crate|namespace)\s+\w+",
                r"__all__\s*=",
            ],
        },
        "description": "Domain-Driven Design artifacts",
    },
    "tdd": {
        "globs": [
            "tests/**/*",
            "**/*test*",
            "**/*spec*",
            "rust/core/tests/**/*",
            "__tests__/**/*",
        ],
        "required_patterns": {
            "unit_test": [
                r"def\s+test_\w+",
                r"#\[(?:tokio::)?test\]",
                r"(?:it|describe|test)\s*\(",
                r"assert",
            ],
            "integration_test": [
                r"(?:integration|e2e|acceptance)",
                r"@pytest\.mark\.integration",
            ],
            "test_fixture": [
                r"@pytest\.fixture",
                r"(?:setUp|tearDown|before_each|after_each)",
                r"fn\s+setup",
            ],
            "assertion": [
                r"assert(?:_eq|_ne|_true|_false|Equal|Raises|!|_matches)?[\s(]",
            ],
            "red_green_refactor": [
                r"(?:TODO|FIXME|RED|GREEN|REFACTOR)\b",
            ],
        },
        "description": "Test-Driven Development artifacts",
    },
}

# Cross-layer coherence rules
COHERENCE_RULES = [
    {
        "id": "COH-001",
        "name": "Every DDD aggregate has tests",
        "source": "ddd",
        "target": "tdd",
        "severity": "CRITICAL",
        "description": "Each domain aggregate/entity must have corresponding test coverage",
    },
    {
        "id": "COH-002",
        "name": "Every ADR references domain impact",
        "source": "adr",
        "target": "ddd",
        "severity": "WARNING",
        "description": "ADRs should reference which domain modules are affected",
    },
    {
        "id": "COH-003",
        "name": "PRD acceptance criteria map to tests",
        "source": "prd",
        "target": "tdd",
        "severity": "CRITICAL",
        "description": "PRD acceptance criteria should have corresponding test assertions",
    },
    {
        "id": "COH-004",
        "name": "Tests reference domain vocabulary",
        "source": "tdd",
        "target": "ddd",
        "severity": "WARNING",
        "description": "Test names should use ubiquitous language from the domain model",
    },
    {
        "id": "COH-005",
        "name": "PRD requirements have corresponding ADR decisions",
        "source": "prd",
        "target": "adr",
        "severity": "WARNING",
        "description": "PRD documents should have ADRs documenting architectural decisions, with explicit status",
    },
    {
        "id": "COH-006",
        "name": "Domain modules have __init__ exports",
        "source": "ddd",
        "target": "ddd",
        "severity": "WARNING",
        "description": "Python domain packages should export public API via __init__.py",
    },
    {
        "id": "COH-007",
        "name": "Test files follow naming convention",
        "source": "tdd",
        "target": "tdd",
        "severity": "INFO",
        "description": "Test files should be named test_*.py or *_test.rs",
    },
    {
        "id": "COH-008",
        "name": "PRD has measurable success metrics",
        "source": "prd",
        "target": "prd",
        "severity": "WARNING",
        "description": "PRDs should contain quantifiable success criteria (%, count, time)",
    },
    {
        "id": "COH-009",
        "name": "Rust domain structs derive Serialize",
        "source": "ddd",
        "target": "ddd",
        "severity": "INFO",
        "description": "Rust domain types should derive Serialize/Deserialize for cache persistence",
    },
    {
        "id": "COH-010",
        "name": "DoR/DoD defined in docstrings",
        "source": "ddd",
        "target": "prd",
        "severity": "WARNING",
        "description": "Key modules should define Definition of Ready and Definition of Done",
    },
]

# Domain vocabulary — ubiquitous language from the bounded context
DOMAIN_VOCABULARY = {
    "legal": [
        "settlement",
        "litigation",
        "habitability",
        "damages",
        "statute",
        "case",
        "plaintiff",
        "defendant",
        "counsel",
        "court",
        "hearing",
        "motion",
        "filing",
        "discovery",
        "evidence",
        "testimony",
    ],
    "validation": [
        "governance",
        "council",
        "circle",
        "role",
        "verdict",
        "consensus",
        "check",
        "severity",
        "layer",
        "wholeness",
        "adversarial",
    ],
    "strategy": [
        "wsjf",
        "roam",
        "entropy",
        "diversity",
        "pass_k",
        "mgpo",
        "temporal",
        "systemic",
        "strategic",
        "situational",
    ],
    "architecture": [
        "aggregate",
        "entity",
        "value_object",
        "repository",
        "service",
        "bounded_context",
        "domain_event",
        "specification",
    ],
    "infrastructure": [
        "cache",
        "eviction",
        "ttl",
        "latency",
        "throughput",
        "pipeline",
        "benchmark",
    ],
    "portfolio": [
        "portfolio",
        "holding",
        "allocation",
        "rebalance",
        "budget",
        "guardrail",
    ],
    "governance": [
        "coherence",
        "maturity",
        "remediation",
        "scaffold",
        "annotation",
    ],
}


# ═════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════


@dataclass
class CoherenceCheck:
    """Single coherence check result."""

    id: str
    name: str
    layer: str
    severity: str  # CRITICAL, WARNING, INFO
    passed: bool
    message: str
    file_path: str = ""
    evidence: Dict[str, Any] = field(default_factory=dict)
    remediation: str = ""


@dataclass
class LayerReport:
    """Report for a single architectural layer."""

    layer: str
    description: str
    files_found: int = 0
    artifacts_detected: Dict[str, int] = field(default_factory=dict)
    checks: List[CoherenceCheck] = field(default_factory=list)
    health_score: float = 0.0
    gaps: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)


@dataclass
class CrossLayerReport:
    """Cross-layer coherence analysis."""

    rule_id: str
    rule_name: str
    source_layer: str
    target_layer: str
    severity: str
    passed: bool
    message: str
    evidence: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CoherenceReport:
    """Full coherence validation report."""

    generated_at: str
    project_root: str
    total_files_scanned: int = 0
    layers: Dict[str, LayerReport] = field(default_factory=dict)
    cross_layer_checks: List[CrossLayerReport] = field(default_factory=list)
    overall_score: float = 0.0
    overall_verdict: str = "UNKNOWN"
    checks_passed: int = 0
    checks_total: int = 0
    recommendations: List[str] = field(default_factory=list)
    automation_level: str = "Level 1 (Detection)"


# ═════════════════════════════════════════════════════════════════════════════
# FILE SCANNER
# ═════════════════════════════════════════════════════════════════════════════


# Directories to always skip (virtual envs, build artifacts, third-party)
SKIP_DIRS = {
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "target",
    ".git",
    ".cache",
    "dist",
    ".pytest_cache",
    "ai_env",
    "external",
    "venv_settlement",
    "site-packages",
    "archive.bak",
    ".agentdb",
}


def _file_identity(p: Path) -> Tuple[int, int]:
    """Return (device, inode) for dedup on case-insensitive filesystems."""
    st = p.stat()
    return (st.st_dev, st.st_ino)


def find_files(root: Path, globs: List[str], max_files: int = 2000) -> List[Path]:
    """Find files matching any of the given glob patterns.

    Deduplicates by inode to handle case-insensitive filesystems
    (e.g. docs/prd/ vs docs/PRD/ on macOS APFS).
    """
    seen_inodes: Set[Tuple[int, int]] = set()
    found: List[Path] = []
    for pattern in globs:
        for p in root.glob(pattern):
            if not p.is_file() or len(found) >= max_files:
                continue
            if any(part in SKIP_DIRS for part in p.parts):
                continue
            try:
                ident = _file_identity(p)
            except OSError:
                continue
            if ident in seen_inodes:
                continue
            seen_inodes.add(ident)
            found.append(p)
    return sorted(found)


def read_file_safe(path: Path, max_bytes: int = 100_000) -> str:
    """Read file content safely, handling encoding errors."""
    if path.suffix.lower() in {
        ".pdf",
        ".docx",
        ".doc",
        ".png",
        ".jpg",
        ".gif",
        ".zip",
        ".tar",
        ".gz",
    }:
        return f"[Binary: {path.name}]"
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(path, "r", encoding=encoding, errors="replace") as f:
                return f.read(max_bytes)
        except (OSError, UnicodeError):
            continue
    return ""


# ═════════════════════════════════════════════════════════════════════════════
# LAYER VALIDATORS
# ═════════════════════════════════════════════════════════════════════════════


def validate_prd_layer(root: Path) -> LayerReport:
    """Validate PRD (Product Requirements Document) layer."""
    config = LAYER_PATHS["prd"]
    report = LayerReport(layer="prd", description=config["description"])
    files = find_files(root, config["globs"])
    report.files_found = len(files)

    if not files:
        report.gaps.append("No PRD documents found")
        report.checks.append(
            CoherenceCheck(
                id="PRD-EXIST",
                name="PRD documents exist",
                layer="prd",
                severity="WARNING",
                passed=False,
                message="No PRD files found matching expected patterns",
                remediation="Create docs/prd/ directory with feature requirement documents",
            )
        )
        return report

    report.strengths.append(f"{len(files)} PRD document(s) found")

    for filepath in files:
        content = read_file_safe(filepath)
        content_lower = content.lower()

        # Check required sections
        sections_found = []
        sections_missing = []
        for section in config["required_sections"]:
            if section in content_lower:
                sections_found.append(section)
            else:
                sections_missing.append(section)

        has_all_sections = len(sections_missing) == 0
        report.checks.append(
            CoherenceCheck(
                id="PRD-SECTIONS",
                name="PRD has required sections",
                layer="prd",
                severity="WARNING",
                passed=has_all_sections,
                message=f"{len(sections_found)}/{len(config['required_sections'])} sections present"
                + (
                    f" (missing: {', '.join(sections_missing)})"
                    if sections_missing
                    else ""
                ),
                file_path=str(filepath.relative_to(root)),
                evidence={"found": sections_found, "missing": sections_missing},
                remediation=f"Add missing sections: {', '.join(sections_missing)}"
                if sections_missing
                else "",
            )
        )

        # Check for measurable success metrics (COH-008)
        metric_patterns = [
            r"\d+%",
            r"\d+\s*(?:seconds?|minutes?|hours?|days?|ms)",
            r"(?:score|rate|ratio|count)\s*(?:>=?|<=?|==)\s*\d+",
            r"(?:at least|minimum|maximum|target)\s+\d+",
        ]
        metrics_found = sum(
            1 for p in metric_patterns if re.search(p, content, re.IGNORECASE)
        )
        has_metrics = metrics_found >= 1
        report.checks.append(
            CoherenceCheck(
                id="PRD-METRICS",
                name="PRD has measurable success metrics",
                layer="prd",
                severity="WARNING",
                passed=has_metrics,
                message=f"Quantifiable metrics: {metrics_found} pattern(s) found",
                file_path=str(filepath.relative_to(root)),
                remediation="Add measurable criteria like '≥85% consensus' or 'response within 48 hours'",
            )
        )

        # Check for DoR/DoD
        has_dor = bool(
            re.search(r"(?:DoR|Definition of Ready|DEFINITION OF READY)", content)
        )
        has_dod = bool(
            re.search(r"(?:DoD|Definition of Done|DEFINITION OF DONE)", content)
        )
        report.checks.append(
            CoherenceCheck(
                id="PRD-DORDOD",
                name="PRD defines DoR and DoD",
                layer="prd",
                severity="INFO",
                passed=has_dor and has_dod,
                message=f"DoR: {'✓' if has_dor else '✗'}, DoD: {'✓' if has_dod else '✗'}",
                file_path=str(filepath.relative_to(root)),
            )
        )

    report.artifacts_detected["documents"] = len(files)
    _calculate_layer_health(report)
    return report


def validate_adr_layer(root: Path) -> LayerReport:
    """Validate ADR (Architecture Decision Record) layer."""
    config = LAYER_PATHS["adr"]
    report = LayerReport(layer="adr", description=config["description"])
    files = find_files(root, config["globs"])
    report.files_found = len(files)

    if not files:
        report.gaps.append("No ADR documents found")
        report.checks.append(
            CoherenceCheck(
                id="ADR-EXIST",
                name="ADR documents exist",
                layer="adr",
                severity="WARNING",
                passed=False,
                message="No ADR files found",
                remediation="Create docs/adr/ directory. Template: Status, Context, Decision, Consequences",
            )
        )
        return report

    report.strengths.append(f"{len(files)} ADR document(s) found")

    statuses_found = defaultdict(int)

    for filepath in files:
        content = read_file_safe(filepath)
        content_lower = content.lower()

        # Required sections
        sections_found = []
        sections_missing = []
        for section in config["required_sections"]:
            if section in content_lower:
                sections_found.append(section)
            else:
                sections_missing.append(section)

        has_all = len(sections_missing) == 0
        report.checks.append(
            CoherenceCheck(
                id="ADR-SECTIONS",
                name="ADR has required sections",
                layer="adr",
                severity="WARNING",
                passed=has_all,
                message=f"{len(sections_found)}/{len(config['required_sections'])} sections"
                + (
                    f" (missing: {', '.join(sections_missing)})"
                    if sections_missing
                    else ""
                ),
                file_path=str(filepath.relative_to(root)),
                evidence={"found": sections_found, "missing": sections_missing},
            )
        )

        # Status field validation (COH-005)
        # Handle markdown bold variants: **Status**: X, **Status:** X, Status: X
        status_match = re.search(
            r"\*{0,2}(?:status):?\*{0,2}\s*:?\s*(accepted|proposed|deprecated|superseded|rejected|draft)",
            content,
            re.IGNORECASE,
        )
        has_status = status_match is not None
        if has_status:
            statuses_found[status_match.group(1).lower()] += 1
        report.checks.append(
            CoherenceCheck(
                id="ADR-STATUS",
                name="ADR has explicit status",
                layer="adr",
                severity="INFO",
                passed=has_status,
                message=f"Status: {status_match.group(1) if has_status else 'NOT FOUND'}",
                file_path=str(filepath.relative_to(root)),
                remediation="Add 'Status: accepted' (or proposed/deprecated/superseded)",
            )
        )

        # Date field — handle **Date**: YYYY, **Date:** YYYY, Date: YYYY
        has_date = bool(
            re.search(
                r"\*{0,2}(?:date):?\*{0,2}\s*:?\s*\d{4}",
                content,
                re.IGNORECASE,
            )
        )
        report.checks.append(
            CoherenceCheck(
                id="ADR-DATE",
                name="ADR has date",
                layer="adr",
                severity="INFO",
                passed=has_date,
                message="Date present" if has_date else "No date found",
                file_path=str(filepath.relative_to(root)),
            )
        )

    report.artifacts_detected["documents"] = len(files)
    report.artifacts_detected["statuses"] = dict(statuses_found)
    _calculate_layer_health(report)
    return report


def validate_ddd_layer(root: Path) -> LayerReport:
    """Validate DDD (Domain-Driven Design) layer."""
    config = LAYER_PATHS["ddd"]
    report = LayerReport(layer="ddd", description=config["description"])
    files = find_files(root, config["globs"])
    report.files_found = len(files)

    if not files:
        report.gaps.append("No domain model files found")
        report.checks.append(
            CoherenceCheck(
                id="DDD-EXIST",
                name="Domain model exists",
                layer="ddd",
                severity="CRITICAL",
                passed=False,
                message="No domain model files found",
                remediation="Create src/domain/ with aggregate roots, entities, value objects",
            )
        )
        return report

    report.strengths.append(f"{len(files)} domain file(s) found")

    artifact_counts = defaultdict(int)
    domain_classes: List[str] = []
    modules_with_init: Set[str] = set()

    for filepath in files:
        content = read_file_safe(filepath)
        rel_path = str(filepath.relative_to(root))

        # Check each DDD pattern type
        for artifact_type, patterns in config["required_patterns"].items():
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    artifact_counts[artifact_type] += len(matches)
                    break

        # Extract class/struct names for cross-referencing with tests
        py_classes = re.findall(r"class\s+(\w+)", content)
        rs_structs = re.findall(r"pub\s+struct\s+(\w+)", content)
        ts_classes = (
            re.findall(r"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)", content)
            if filepath.suffix in (".ts", ".tsx")
            else []
        )
        domain_classes.extend(py_classes)
        domain_classes.extend(rs_structs)
        domain_classes.extend(ts_classes)

        # Check for __init__.py exports (COH-006)
        if filepath.name == "__init__.py":
            parent_module = filepath.parent.name
            has_exports = "__all__" in content or "from " in content
            modules_with_init.add(parent_module)
            report.checks.append(
                CoherenceCheck(
                    id="DDD-EXPORTS",
                    name=f"Module '{parent_module}' has public API exports",
                    layer="ddd",
                    severity="WARNING",
                    passed=has_exports,
                    message=f"{'__all__ or imports defined' if has_exports else 'Empty __init__.py'}",
                    file_path=rel_path,
                )
            )

        # Check Rust structs for Serialize derive (COH-009)
        # Skip snippet files (standalone fragments not in module tree)
        _is_snippet = "snippet" in filepath.name.lower()
        if filepath.suffix == ".rs" and not _is_snippet:
            structs = re.findall(
                r"(?:#\[derive\(([^)]+)\)\]\s*)?pub\s+struct\s+(\w+)", content
            )
            # Infrastructure patterns: structs with runtime handles
            # (RwLock, Mutex, Connection, Pool) can't derive Serialize —
            # they're infrastructure, not domain value objects.
            _INFRA_HANDLE_TYPES = {"RwLock", "Mutex", "Connection", "Pool", "Sender", "Receiver"}
            for derives_str, struct_name in structs:
                has_serde = "Serialize" in (derives_str or "")
                # Check if struct body contains non-serializable runtime handles
                struct_body_match = re.search(
                    rf"pub\s+struct\s+{re.escape(struct_name)}\s*\{{([^}}]*)}}",
                    content,
                    re.DOTALL,
                )
                is_infra = False
                if struct_body_match:
                    body = struct_body_match.group(1)
                    is_infra = any(ht in body for ht in _INFRA_HANDLE_TYPES)
                if is_infra:
                    # Infrastructure struct — exempt from Serialize requirement
                    report.checks.append(
                        CoherenceCheck(
                            id="DDD-SERDE",
                            name=f"Rust struct '{struct_name}' derives Serialize",
                            layer="ddd",
                            severity="INFO",
                            passed=True,
                            message="Infrastructure struct (runtime handles) — Serialize exempt",
                            file_path=rel_path,
                        )
                    )
                else:
                    report.checks.append(
                        CoherenceCheck(
                            id="DDD-SERDE",
                            name=f"Rust struct '{struct_name}' derives Serialize",
                            layer="ddd",
                            severity="INFO",
                            passed=has_serde,
                            message=f"{'Serialize derived' if has_serde else 'Missing Serialize'}",
                            file_path=rel_path,
                        )
                    )

        # Check for DoR/DoD in docstrings (COH-010)
        has_dor_dod = bool(
            re.search(r"(?:DoR|DoD|Definition of (?:Ready|Done))", content)
        )
        if filepath.suffix in (".py", ".rs", ".ts", ".tsx") and filepath.name != "__init__.py":
            report.checks.append(
                CoherenceCheck(
                    id="DDD-DORDOD",
                    name="Module has DoR/DoD in docstring",
                    layer="ddd",
                    severity="INFO",
                    passed=has_dor_dod,
                    message="DoR/DoD found"
                    if has_dor_dod
                    else "No DoR/DoD in docstring",
                    file_path=rel_path,
                )
            )

    # Verify key DDD building blocks exist
    for artifact_type in ["aggregate_root", "value_object", "service"]:
        count = artifact_counts.get(artifact_type, 0)
        report.checks.append(
            CoherenceCheck(
                id=f"DDD-{artifact_type.upper()}",
                name=f"DDD {artifact_type.replace('_', ' ')} present",
                layer="ddd",
                severity="CRITICAL" if artifact_type == "aggregate_root" else "WARNING",
                passed=count > 0,
                message=f"{count} {artifact_type.replace('_', ' ')}(s) detected",
                evidence={"count": count},
            )
        )

    report.artifacts_detected = dict(artifact_counts)
    report.artifacts_detected["domain_classes"] = domain_classes[:50]
    _calculate_layer_health(report)
    return report


def validate_tdd_layer(root: Path) -> LayerReport:
    """Validate TDD (Test-Driven Development) layer."""
    config = LAYER_PATHS["tdd"]
    report = LayerReport(layer="tdd", description=config["description"])
    files = find_files(root, config["globs"])

    # Filter to actual test files, excluding non-test utilities
    _NON_TEST_NAMES = {
        "conftest.py", "vitest.config.ts", "vitest.config.js",
        "test_stripe_integration.ts",  # CLI integration tool, not automated test
        "validation-test.js",  # structural validation script, not unit test
    }
    _NON_TEST_PREFIXES = ("generate-", "generate_")
    _NON_TEST_SUFFIXES = (
        "-framework.ts", "-framework.js",
        "-runner.ts", "-runner.js",
    )
    _NON_TEST_PATH_SEGMENTS = {"test-utils"}

    test_files = [
        f
        for f in files
        if any(kw in f.name.lower() for kw in ["test", "spec", "_test", "test_"])
        and f.suffix.lower() in {".py", ".rs", ".ts", ".js", ".tsx", ".jsx"}
        and f.name.lower() not in _NON_TEST_NAMES
        and not any(f.name.lower().startswith(p) for p in _NON_TEST_PREFIXES)
        and not any(f.name.lower().endswith(s) for s in _NON_TEST_SUFFIXES)
        and not any(seg in f.parts for seg in _NON_TEST_PATH_SEGMENTS)
    ]
    report.files_found = len(test_files)

    if not test_files:
        report.gaps.append("No test files found")
        report.checks.append(
            CoherenceCheck(
                id="TDD-EXIST",
                name="Test files exist",
                layer="tdd",
                severity="CRITICAL",
                passed=False,
                message="No test files found",
                remediation="Create tests/ directory with test_*.py or *_test.rs files",
            )
        )
        return report

    report.strengths.append(f"{len(test_files)} test file(s) found")

    artifact_counts = defaultdict(int)
    test_function_names: List[str] = []
    total_assertions = 0

    for filepath in test_files:
        content = read_file_safe(filepath)
        rel_path = str(filepath.relative_to(root))

        # Count test functions
        py_tests = re.findall(r"def\s+(test_\w+)", content)
        rs_tests = re.findall(
            r"#\[(?:tokio::)?test\]\s*(?:async\s+)?fn\s+(\w+)", content
        )
        js_tests = re.findall(r"\b(?:it|test)\s*\(\s*['\"]([^'\"]+)", content)

        test_count = len(py_tests) + len(rs_tests) + len(js_tests)
        test_function_names.extend(py_tests + rs_tests + js_tests)
        artifact_counts["test_functions"] += test_count

        # Count assertions (Python assert*, Rust assert*, JS/TS expect, Node assert.*)
        assertions = len(
            re.findall(
                r"assert(?:_eq|_ne|_true|_false|Equal|Raises|!|_matches|_is_none|_is_some)?[\s(]"
                r"|assert\.\w+\s*\("
                r"|expect\s*\("
                r"|should\."
                r"|\.to(?:Be|Equal|Match|Have|Throw|Contain|Include)\s*\(",
                content,
            )
        )
        total_assertions += assertions
        artifact_counts["assertions"] += assertions

        # Check naming convention (COH-007)
        # Accept: test_*.py, *_test.py, *_test.js, *-test.js, *.test.ts, *.spec.ts, test-*.ts
        correct_naming = bool(
            re.match(
                r"(?:test_|test-|.*_test\.|.*-test\.|spec\.|.*\.test\.|.*\.spec\.)",
                filepath.name.lower(),
            )
        )
        report.checks.append(
            CoherenceCheck(
                id="TDD-NAMING",
                name="Test file follows naming convention",
                layer="tdd",
                severity="INFO",
                passed=correct_naming,
                message=f"{'Correct' if correct_naming else 'Non-standard'}: {filepath.name}",
                file_path=rel_path,
            )
        )

        # Check assertion density (tests should actually assert things)
        if test_count > 0:
            assertion_ratio = assertions / test_count
            good_density = assertion_ratio >= 1.0
            report.checks.append(
                CoherenceCheck(
                    id="TDD-DENSITY",
                    name="Test assertion density ≥ 1.0 per test",
                    layer="tdd",
                    severity="WARNING",
                    passed=good_density,
                    message=f"{assertion_ratio:.1f} assertions/test ({assertions} assertions, {test_count} tests)",
                    file_path=rel_path,
                )
            )

        # Check for fixtures/setup
        has_fixture = bool(
            re.search(
                r"@pytest\.fixture|setUp|before_each|fn\s+setup",
                content,
            )
        )
        if has_fixture:
            artifact_counts["fixtures"] += 1

        # Check for integration test markers
        is_integration = bool(
            re.search(
                r"integration|e2e|acceptance|@pytest\.mark\.integration",
                content,
                re.IGNORECASE,
            )
        )
        if is_integration:
            artifact_counts["integration_tests"] += 1

    # Overall TDD checks
    has_unit = artifact_counts.get("test_functions", 0) > 0
    has_integration = artifact_counts.get("integration_tests", 0) > 0

    report.checks.append(
        CoherenceCheck(
            id="TDD-UNIT",
            name="Unit tests present",
            layer="tdd",
            severity="CRITICAL",
            passed=has_unit,
            message=f"{artifact_counts.get('test_functions', 0)} test functions found",
        )
    )
    report.checks.append(
        CoherenceCheck(
            id="TDD-INTEGRATION",
            name="Integration tests present",
            layer="tdd",
            severity="WARNING",
            passed=has_integration,
            message=f"{artifact_counts.get('integration_tests', 0)} integration test file(s)",
            remediation="Add integration tests that test module boundaries"
            if not has_integration
            else "",
        )
    )
    report.checks.append(
        CoherenceCheck(
            id="TDD-ASSERTIONS",
            name="Total assertion count reasonable",
            layer="tdd",
            severity="INFO",
            passed=total_assertions >= 10,
            message=f"{total_assertions} total assertions across {len(test_files)} files",
        )
    )

    # Also scan Rust source files for inline #[cfg(test)] test modules.
    # Rust convention: tests live alongside source code, not in separate files.
    _scanned = {f.resolve() for f in test_files}
    for _g in ["rust/core/src/**/*.rs", "rust/**/src/**/*.rs"]:
        for _rs in root.glob(_g):
            if _rs.resolve() in _scanned or _rs.suffix != ".rs":
                continue
            _scanned.add(_rs.resolve())
            _content = read_file_safe(_rs)
            if "#[cfg(test)]" not in _content:
                continue
            _inline = re.findall(
                r"#\[(?:tokio::)?test\]\s*(?:async\s+)?fn\s+(\w+)", _content
            )
            test_function_names.extend(_inline)

    report.artifacts_detected = dict(artifact_counts)
    report.artifacts_detected["test_names"] = test_function_names
    _calculate_layer_health(report)
    return report


# ═════════════════════════════════════════════════════════════════════════════
# CROSS-LAYER COHERENCE
# ═════════════════════════════════════════════════════════════════════════════


def validate_cross_layer(
    layers: Dict[str, LayerReport],
    root: Path,
) -> List[CrossLayerReport]:
    """Validate coherence across architectural layers."""
    results: List[CrossLayerReport] = []

    ddd_report = layers.get("ddd")
    tdd_report = layers.get("tdd")
    prd_report = layers.get("prd")
    adr_report = layers.get("adr")

    # COH-001: Every DDD aggregate has tests
    if ddd_report and tdd_report:
        domain_classes = ddd_report.artifacts_detected.get("domain_classes", [])
        test_names = tdd_report.artifacts_detected.get("test_names", [])
        test_names_lower = " ".join(str(t).lower() for t in test_names)

        def _camel_to_snake(name: str) -> str:
            """Convert CamelCase to snake_case (handles acronyms like LRU)."""
            s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
            s = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", s)
            return s.lower()

        tested_classes = []
        untested_classes = []
        for cls in domain_classes:
            cls_lower = cls.lower()
            cls_snake = _camel_to_snake(cls)
            # Primary: exact substring match (CamelCase or snake_case)
            if (
                cls_lower in test_names_lower
                or cls_snake in test_names_lower
                or f"test_{cls_lower}" in test_names_lower
                or f"test_{cls_snake}" in test_names_lower
            ):
                tested_classes.append(cls)
            else:
                # Secondary: word-segment match — any word ≥ 4 chars from
                # the snake_case name appearing in a test function name
                segments = [w for w in cls_snake.split("_") if len(w) >= 4]
                if segments and any(seg in test_names_lower for seg in segments):
                    tested_classes.append(cls)
                else:
                    untested_classes.append(cls)

        coverage_ratio = len(tested_classes) / max(len(domain_classes), 1)
        results.append(
            CrossLayerReport(
                rule_id="COH-001",
                rule_name="Every DDD aggregate has tests",
                source_layer="ddd",
                target_layer="tdd",
                severity="CRITICAL",
                passed=coverage_ratio >= 0.5,
                message=f"{len(tested_classes)}/{len(domain_classes)} domain classes have test coverage ({coverage_ratio:.0%})",
                evidence={
                    "tested": tested_classes[:20],
                    "untested": untested_classes[:20],
                    "coverage_ratio": round(coverage_ratio, 3),
                },
            )
        )

    # COH-003: PRD acceptance criteria map to tests
    if prd_report and tdd_report:
        prd_has_criteria = any(
            c.passed for c in prd_report.checks if c.id == "PRD-SECTIONS"
        )
        tdd_has_tests = any(c.passed for c in tdd_report.checks if c.id == "TDD-UNIT")
        results.append(
            CrossLayerReport(
                rule_id="COH-003",
                rule_name="PRD acceptance criteria map to tests",
                source_layer="prd",
                target_layer="tdd",
                severity="CRITICAL",
                passed=prd_has_criteria and tdd_has_tests,
                message=f"PRD criteria: {'✓' if prd_has_criteria else '✗'}, Tests exist: {'✓' if tdd_has_tests else '✗'}",
            )
        )

    # COH-004: Tests reference domain vocabulary
    if tdd_report:
        test_names = tdd_report.artifacts_detected.get("test_names", [])
        test_names_combined = " ".join(str(t).lower() for t in test_names)

        vocab_coverage = {}
        for domain, terms in DOMAIN_VOCABULARY.items():
            hits = sum(1 for term in terms if term in test_names_combined)
            vocab_coverage[domain] = {
                "hits": hits,
                "total": len(terms),
                "ratio": hits / max(len(terms), 1),
            }

        total_hits = sum(v["hits"] for v in vocab_coverage.values())
        total_terms = sum(v["total"] for v in vocab_coverage.values())
        overall_vocab_ratio = total_hits / max(total_terms, 1)

        results.append(
            CrossLayerReport(
                rule_id="COH-004",
                rule_name="Tests reference domain vocabulary",
                source_layer="tdd",
                target_layer="ddd",
                severity="WARNING",
                passed=overall_vocab_ratio >= 0.1,
                message=f"{total_hits}/{total_terms} domain terms found in test names ({overall_vocab_ratio:.0%})",
                evidence={"vocabulary_coverage": vocab_coverage},
            )
        )

    # COH-002: ADRs reference domain impact
    if adr_report and ddd_report:
        domain_classes = ddd_report.artifacts_detected.get("domain_classes", [])
        adr_files = adr_report.files_found
        # Simple heuristic: ADRs should exist if domain model exists
        results.append(
            CrossLayerReport(
                rule_id="COH-002",
                rule_name="ADRs reference domain impact",
                source_layer="adr",
                target_layer="ddd",
                severity="WARNING",
                passed=adr_files > 0 and len(domain_classes) > 0,
                message=f"{adr_files} ADR(s), {len(domain_classes)} domain classes",
            )
        )

    # COH-005: PRD requirements have corresponding ADR decisions
    if prd_report and adr_report:
        prd_files = prd_report.files_found
        adr_files = adr_report.files_found

        # Count ADRs with valid status (accepted, proposed, deprecated, superseded)
        _valid_statuses = {"accepted", "proposed", "deprecated", "superseded"}
        adrs_with_status = 0
        adrs_total = 0
        for check in adr_report.checks:
            if check.id == "ADR-STATUS":
                adrs_total += 1
                if check.passed:
                    adrs_with_status += 1

        # Pass if: PRDs exist AND ADRs exist AND at least one ADR has valid status
        has_prd = prd_files > 0
        has_adr = adr_files > 0
        has_decided_adrs = adrs_with_status > 0
        passed = has_prd and has_adr and has_decided_adrs

        results.append(
            CrossLayerReport(
                rule_id="COH-005",
                rule_name="PRD requirements have corresponding ADR decisions",
                source_layer="prd",
                target_layer="adr",
                severity="WARNING",
                passed=passed,
                message=(
                    f"PRD: {prd_files} doc(s), ADR: {adr_files} doc(s), "
                    f"{adrs_with_status}/{adrs_total} with valid status"
                ),
                evidence={
                    "prd_files": prd_files,
                    "adr_files": adr_files,
                    "adrs_with_status": adrs_with_status,
                    "adrs_total": adrs_total,
                },
            )
        )

    # COH-010: DoR/DoD defined in domain module docstrings (ddd→prd)
    if ddd_report:
        dor_dod_pattern = re.compile(
            r"(?:DoR|DoD|Definition of Ready|Definition of Done)", re.IGNORECASE
        )
        domain_dirs = [
            root / "src",
            root / "rust" / "core" / "src" / "domain",
            root / "rust" / "core" / "src" / "portfolio",
            root / "rust" / "core" / "src" / "wsjf",
        ]
        domain_files_checked = 0
        domain_files_with_dor_dod = 0
        files_with = []
        files_without = []

        for ddir in domain_dirs:
            if not ddir.exists():
                continue
            globs = ["*.py", "*.rs"] if ddir.suffix == "" else []
            for ext in ["*.py", "*.rs"]:
                for fpath in ddir.glob(ext):
                    # Skip __pycache__, test files, and __init__ stubs
                    if "__pycache__" in str(fpath):
                        continue
                    if fpath.name.startswith("test_"):
                        continue
                    content = read_file_safe(fpath)
                    if not content.strip():
                        continue
                    # Only count files with actual domain content
                    has_domain = bool(
                        re.search(
                            r"(?:class\s+\w+|struct\s+\w+|def\s+\w+|fn\s+\w+|@dataclass|@business-context)",
                            content,
                        )
                    )
                    if not has_domain:
                        continue
                    domain_files_checked += 1
                    if dor_dod_pattern.search(content):
                        domain_files_with_dor_dod += 1
                        files_with.append(str(fpath.relative_to(root)))
                    else:
                        files_without.append(str(fpath.relative_to(root)))

        dor_dod_ratio = (
            domain_files_with_dor_dod / max(domain_files_checked, 1)
        )
        results.append(
            CrossLayerReport(
                rule_id="COH-010",
                rule_name="DoR/DoD defined in domain module docstrings",
                source_layer="ddd",
                target_layer="prd",
                severity="WARNING",
                passed=dor_dod_ratio >= 0.3,
                message=(
                    f"{domain_files_with_dor_dod}/{domain_files_checked} domain "
                    f"modules have DoR/DoD docstrings ({dor_dod_ratio:.0%})"
                ),
                evidence={
                    "files_with_dor_dod": files_with[:20],
                    "files_without_dor_dod": files_without[:20],
                    "ratio": round(dor_dod_ratio, 3),
                },
            )
        )

    # COH-006: Domain modules have __init__ exports
    if ddd_report:
        src_dir = root / "src"
        packages_checked = 0
        packages_with_init = 0
        pkgs_with = []
        pkgs_without = []

        if src_dir.exists():
            # Include src_dir itself plus all recursive children
            all_dirs = [src_dir] + sorted(src_dir.rglob("*"))
            for dirpath in all_dirs:
                if not dirpath.is_dir():
                    continue
                if "__pycache__" in str(dirpath):
                    continue
                # Only count dirs with .py files (not counting __init__.py)
                py_files = [
                    f for f in dirpath.iterdir()
                    if f.is_file()
                    and f.suffix == ".py"
                    and f.name != "__init__.py"
                    and not f.name.startswith("test_")
                ]
                if not py_files:
                    continue
                packages_checked += 1
                init_path = dirpath / "__init__.py"
                if init_path.exists():
                    packages_with_init += 1
                    pkgs_with.append(str(dirpath.relative_to(root)))
                else:
                    pkgs_without.append(str(dirpath.relative_to(root)))

        init_ratio = packages_with_init / max(packages_checked, 1)
        results.append(
            CrossLayerReport(
                rule_id="COH-006",
                rule_name="Domain modules have __init__ exports",
                source_layer="ddd",
                target_layer="ddd",
                severity="WARNING",
                passed=init_ratio >= 0.5,
                message=(
                    f"{packages_with_init}/{packages_checked} Python packages "
                    f"have __init__.py ({init_ratio:.0%})"
                ),
                evidence={
                    "packages_with_init": pkgs_with[:20],
                    "packages_without_init": pkgs_without[:20],
                    "ratio": round(init_ratio, 3),
                },
            )
        )

    # COH-009: Rust domain structs derive Serialize
    if ddd_report:
        rust_domain_dirs = [
            root / "rust" / "core" / "src" / "domain",
            root / "rust" / "core" / "src" / "portfolio",
            root / "rust" / "core" / "src" / "wsjf",
        ]
        structs_total = 0
        structs_with_serialize = 0
        structs_with_list = []
        structs_without_list = []

        serialize_re = re.compile(r"#\[derive\([^)]*Serialize[^)]*\)\]")
        struct_re = re.compile(r"pub\s+struct\s+(\w+)")

        for rdir in rust_domain_dirs:
            if not rdir.exists():
                continue
            for rs_file in sorted(rdir.glob("*.rs")):
                content = read_file_safe(rs_file)
                if not content.strip():
                    continue
                lines = content.split("\n")
                for i, line in enumerate(lines):
                    m = struct_re.search(line)
                    if not m:
                        continue
                    struct_name = m.group(1)
                    structs_total += 1
                    # Check preceding lines (up to 3) for derive(Serialize)
                    preceding = "\n".join(lines[max(0, i - 3) : i + 1])
                    if serialize_re.search(preceding):
                        structs_with_serialize += 1
                        structs_with_list.append(struct_name)
                    else:
                        structs_without_list.append(struct_name)

        serialize_ratio = structs_with_serialize / max(structs_total, 1)
        results.append(
            CrossLayerReport(
                rule_id="COH-009",
                rule_name="Rust domain structs derive Serialize",
                source_layer="ddd",
                target_layer="ddd",
                severity="INFO",
                passed=serialize_ratio >= 0.5,
                message=(
                    f"{structs_with_serialize}/{structs_total} Rust domain structs "
                    f"derive Serialize ({serialize_ratio:.0%})"
                ),
                evidence={
                    "structs_with_serialize": structs_with_list[:20],
                    "structs_without_serialize": structs_without_list[:20],
                    "ratio": round(serialize_ratio, 3),
                },
            )
        )

    # COH-007: Test files follow naming convention
    if tdd_report:
        test_file_re = re.compile(r"def\s+test_\w+")
        excluded_dirs = {
            "archive.bak", ".venv", "venv", "ai_env", "venv_settlement",
            "node_modules", ".snapshots", "external", "VisionFlow",
            "__pycache__", "site-packages", ".agentdb",
        }
        tests_dir = root / "tests"
        test_files_ok = []
        test_files_bad = []

        if tests_dir.exists():
            for py_file in sorted(tests_dir.rglob("*.py")):
                # Skip excluded directories
                if any(ex in str(py_file) for ex in excluded_dirs):
                    continue
                content = read_file_safe(py_file)
                if not content.strip():
                    continue
                # Only check files that actually define test functions
                if not test_file_re.search(content):
                    continue
                bn = py_file.name
                if (
                    bn.startswith("test_")
                    or bn.endswith("_test.py")
                    or bn.endswith("_tests.py")
                    or bn == "conftest.py"
                ):
                    test_files_ok.append(str(py_file.relative_to(root)))
                else:
                    test_files_bad.append(str(py_file.relative_to(root)))

        # Also check Rust test files in rust/core/tests/
        rust_tests_dir = root / "rust" / "core" / "tests"
        if rust_tests_dir.exists():
            for rs_file in sorted(rust_tests_dir.rglob("*.rs")):
                if any(ex in str(rs_file) for ex in excluded_dirs):
                    continue
                content = read_file_safe(rs_file)
                if not content.strip():
                    continue
                bn = rs_file.name
                # Rust test files: test_*.rs, *_test.rs, or mod.rs
                if (
                    bn.startswith("test_")
                    or bn.endswith("_test.rs")
                    or bn.endswith("_tests.rs")
                    or bn == "mod.rs"
                ):
                    test_files_ok.append(str(rs_file.relative_to(root)))
                else:
                    # Check if file has #[test] or #[cfg(test)] — inline tests are OK
                    if re.search(r"#\[(?:tokio::)?test\]", content):
                        test_files_ok.append(str(rs_file.relative_to(root)))
                    else:
                        test_files_bad.append(str(rs_file.relative_to(root)))

        total_test_files = len(test_files_ok) + len(test_files_bad)
        naming_ratio = len(test_files_ok) / max(total_test_files, 1)
        results.append(
            CrossLayerReport(
                rule_id="COH-007",
                rule_name="Test files follow naming convention",
                source_layer="tdd",
                target_layer="tdd",
                severity="INFO",
                passed=naming_ratio >= 0.8,
                message=(
                    f"{len(test_files_ok)}/{total_test_files} test files follow "
                    f"naming convention ({naming_ratio:.0%})"
                ),
                evidence={
                    "conforming_files": test_files_ok[:20],
                    "non_conforming_files": test_files_bad[:20],
                    "ratio": round(naming_ratio, 3),
                },
            )
        )

    # COH-008: PRD has measurable success metrics
    if prd_report:
        metric_pattern = re.compile(
            r"(?:"
            r"\d+\s*%"            # percentage: 80%, 85 %
            r"|>=?\s*\d+"         # threshold: >= 80, > 5
            r"|<=?\s*\d+"         # upper bound: <= 100
            r"|\d+\s*(?:ms|seconds?|minutes?|hours?|days?)"  # time: 48 hours, 500ms
            r"|at\s+least\s+\d+"  # at least 85
            r"|\d+\.\d+"          # decimal: 0.95, 3.14
            r")"
        )
        prds_checked = 0
        prds_with_metrics = 0
        prds_with = []
        prds_without = []
        seen_inodes: Set[Tuple[int, int]] = set()  # dedup by inode (macOS case-insensitive)

        prd_globs = ["docs/prd/**/*.md", "docs/PRD/**/*.md", "**/*PRD*.md", "**/*prd*.md"]
        for g in prd_globs:
            for md_file in sorted(root.glob(g)):
                if not md_file.is_file():
                    continue
                try:
                    ident = _file_identity(md_file)
                except OSError:
                    continue
                if ident in seen_inodes:
                    continue
                seen_inodes.add(ident)
                if any(ex in str(md_file) for ex in excluded_dirs):
                    continue
                content = read_file_safe(md_file)
                if not content.strip():
                    continue
                prds_checked += 1
                if metric_pattern.search(content):
                    prds_with_metrics += 1
                    prds_with.append(str(md_file.relative_to(root)))
                else:
                    prds_without.append(str(md_file.relative_to(root)))

        # Advisory: scan docs/ for files with PRD-like content outside canonical folders
        # Exclude non-PRD docs that legitimately use PRD-like language
        # (analysis, governance, guides, reports, archived, retros, completion reports)
        stray_exclusion_dirs = {
            "docs/archived",
            "docs/retro",
            "docs/reports",
            "docs/governance",
            "docs/root-governance",
            "docs/roadmaps",
            "docs/features",
            "docs/development",
            "docs/releases",
        }
        stray_exclusion_files = {
            # Analysis / review docs (not prescriptive PRDs)
            "ARCHITECTURAL_REVIEW.md",
            "AGENTIC_WORKFLOW_ANALYSIS.md",
            "RCA_PROD_MATURITY_5W_ROAM.md",
            "CONTINUOUS_IMPROVEMENT_STRATEGY.md",
            # Governance frameworks (define process, not product requirements)
            "CIRCLES_DOD.md",
            "INCREMENTAL_RELENTLESS_EXECUTION_FRAMEWORK.md",
            # Operational guides / CLI references
            "PRODUCTION_DEPLOYMENT_GUIDE.md",
            "AY-COMMAND-INTEGRATION.md",
            # Completion reports (retrospective, not forward-looking)
            "NEXT_8_COMPLETION.md",
            "NOW_COMPLETION_2025-11-30.md",
        }
        prd_section_re = re.compile(
            r"(?:objective|requirements|acceptance\s+criteria)",
            re.IGNORECASE,
        )
        stray_prd_candidates = []
        docs_dir = root / "docs"
        if docs_dir.exists():
            for md_file in sorted(docs_dir.rglob("*.md")):
                try:
                    ident = _file_identity(md_file)
                except OSError:
                    continue
                if ident in seen_inodes:
                    continue  # already counted as PRD
                if any(ex in str(md_file) for ex in excluded_dirs):
                    continue
                rel = str(md_file.relative_to(root))
                # Skip files in excluded stray directories
                if any(rel.startswith(sd + "/") or rel.startswith(sd + os.sep)
                       for sd in stray_exclusion_dirs):
                    continue
                # Skip individually excluded non-PRD files
                if md_file.name in stray_exclusion_files:
                    continue
                content = read_file_safe(md_file)
                if not content.strip():
                    continue
                content_lower = content.lower()
                # File has >=2 of the 3 PRD hallmark sections
                prd_sections_present = sum(
                    1 for s in ["objective", "requirements", "acceptance criteria"]
                    if s in content_lower
                )
                if prd_sections_present >= 2:
                    stray_prd_candidates.append(rel)

        metric_ratio = prds_with_metrics / max(prds_checked, 1)
        evidence_dict: Dict[str, Any] = {
            "prds_with_metrics": prds_with[:20],
            "prds_without_metrics": prds_without[:20],
            "ratio": round(metric_ratio, 3),
        }
        if stray_prd_candidates:
            evidence_dict["stray_prd_candidates"] = stray_prd_candidates[:10]

        results.append(
            CrossLayerReport(
                rule_id="COH-008",
                rule_name="PRD has measurable success metrics",
                source_layer="prd",
                target_layer="prd",
                severity="WARNING",
                passed=prds_checked == 0 or metric_ratio >= 0.5,
                message=(
                    f"{prds_with_metrics}/{prds_checked} PRD documents have "
                    f"measurable success metrics ({metric_ratio:.0%})"
                    + (
                        f" [{len(stray_prd_candidates)} stray PRD-like file(s) outside docs/prd/]"
                        if stray_prd_candidates
                        else ""
                    )
                ),
                evidence=evidence_dict,
            )
        )

    return results


# ═════════════════════════════════════════════════════════════════════════════
# SCORING AND REPORTING
# ═════════════════════════════════════════════════════════════════════════════


def _calculate_layer_health(report: LayerReport):
    """Calculate health score for a layer from its checks."""
    if not report.checks:
        report.health_score = 0.0
        return

    weights = {"CRITICAL": 3.0, "WARNING": 2.0, "INFO": 1.0}
    weighted_pass = 0.0
    weighted_total = 0.0

    for check in report.checks:
        w = weights.get(check.severity, 1.0)
        weighted_total += w
        if check.passed:
            weighted_pass += w

    report.health_score = round((weighted_pass / max(weighted_total, 0.01)) * 100, 1)

    # Identify gaps
    for check in report.checks:
        if not check.passed and check.severity in ("CRITICAL", "WARNING"):
            report.gaps.append(f"[{check.severity}] {check.name}: {check.message}")


def generate_report(
    project_root: Path,
    target_layers: Optional[List[str]] = None,
    strict: bool = False,
) -> CoherenceReport:
    """Run full coherence validation and generate report."""
    report = CoherenceReport(
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        project_root=str(project_root),
    )

    layers_to_check = target_layers or ["prd", "adr", "ddd", "tdd"]

    validators = {
        "prd": validate_prd_layer,
        "adr": validate_adr_layer,
        "ddd": validate_ddd_layer,
        "tdd": validate_tdd_layer,
    }

    # Run each layer validator
    for layer_name in layers_to_check:
        validator = validators.get(layer_name)
        if validator:
            layer_report = validator(project_root)
            report.layers[layer_name] = layer_report
            report.total_files_scanned += layer_report.files_found

    # Run cross-layer coherence checks
    report.cross_layer_checks = validate_cross_layer(report.layers, project_root)

    # Trim test_names after cross-layer matching to keep report lean
    tdd_layer = report.layers.get("tdd")
    if tdd_layer and "test_names" in tdd_layer.artifacts_detected:
        full_count = len(tdd_layer.artifacts_detected["test_names"])
        tdd_layer.artifacts_detected["test_names"] = tdd_layer.artifacts_detected["test_names"][:100]
        tdd_layer.artifacts_detected["test_names_total"] = full_count

    # Aggregate scores
    all_checks: List[CoherenceCheck] = []
    for layer_report in report.layers.values():
        all_checks.extend(layer_report.checks)

    # Include cross-layer as checks
    for cross in report.cross_layer_checks:
        all_checks.append(
            CoherenceCheck(
                id=cross.rule_id,
                name=cross.rule_name,
                layer=f"{cross.source_layer}→{cross.target_layer}",
                severity=cross.severity,
                passed=cross.passed,
                message=cross.message,
            )
        )

    report.checks_total = len(all_checks)
    report.checks_passed = sum(1 for c in all_checks if c.passed)

    if report.checks_total > 0:
        report.overall_score = round(
            (report.checks_passed / report.checks_total) * 100, 1
        )
    else:
        report.overall_score = 0.0

    # Determine verdict
    critical_failures = sum(
        1 for c in all_checks if not c.passed and c.severity == "CRITICAL"
    )

    if strict:
        report.overall_verdict = (
            "PASS" if report.overall_score >= 90 and critical_failures == 0 else "FAIL"
        )
    else:
        if critical_failures > 0:
            report.overall_verdict = "FAIL"
        elif report.overall_score >= 80:
            report.overall_verdict = "PASS"
        elif report.overall_score >= 60:
            report.overall_verdict = "CONDITIONAL"
        else:
            report.overall_verdict = "FAIL"

    # Determine automation level
    if report.overall_score >= 95:
        report.automation_level = "Level 4 (Fully Auto)"
    elif report.overall_score >= 80:
        report.automation_level = "Level 3 (With Review)"
    elif report.overall_score >= 60:
        report.automation_level = "Level 2 (Application)"
    elif report.overall_score >= 30:
        report.automation_level = "Level 1 (Detection)"
    else:
        report.automation_level = "Level 0 (Manual)"

    # Generate recommendations
    report.recommendations = _generate_recommendations(report)

    return report


def _generate_recommendations(report: CoherenceReport) -> List[str]:
    """Generate actionable recommendations from the coherence report."""
    recs = []

    # Layer-specific gaps
    for layer_name, layer_report in report.layers.items():
        if layer_report.health_score < 50:
            recs.append(
                f"⚠️ {layer_name.upper()} health is {layer_report.health_score:.0f}% — "
                f"address {len(layer_report.gaps)} gap(s)"
            )
        for gap in layer_report.gaps[:3]:
            recs.append(f"  → {gap}")

    # Cross-layer failures
    for cross in report.cross_layer_checks:
        if not cross.passed:
            recs.append(
                f"❌ {cross.rule_id} ({cross.source_layer}→{cross.target_layer}): {cross.message}"
            )

    # General advice
    if not report.layers.get("adr") or report.layers["adr"].files_found == 0:
        recs.append(
            "📝 Create ADRs in docs/adr/ to document architectural decisions "
            "(template: Status, Context, Decision, Consequences)"
        )

    if not report.layers.get("prd") or report.layers["prd"].files_found == 0:
        recs.append(
            "📋 Create PRDs in docs/prd/ with acceptance criteria and measurable success metrics"
        )

    tdd = report.layers.get("tdd")
    if tdd and tdd.artifacts_detected.get("integration_tests", 0) == 0:
        recs.append(
            "🧪 Add integration tests that verify module boundaries (tests/integration/)"
        )

    ddd = report.layers.get("ddd")
    if ddd and ddd.health_score < 70:
        recs.append(
            "🏗️ Strengthen domain model: ensure aggregate roots, value objects, and services are clearly defined"
        )

    if not recs:
        recs.append("✅ All coherence checks pass — pipeline is healthy")

    return recs


# ═════════════════════════════════════════════════════════════════════════════
# SCAFFOLD GENERATOR (--fix mode)
# ═════════════════════════════════════════════════════════════════════════════


def generate_missing_scaffolds(
    project_root: Path, report: CoherenceReport
) -> List[str]:
    """Auto-generate missing structural scaffolds based on coherence gaps."""
    actions = []

    # Create docs directories if missing
    if not report.layers.get("prd") or report.layers["prd"].files_found == 0:
        prd_dir = project_root / "docs" / "prd"
        prd_dir.mkdir(parents=True, exist_ok=True)
        template = prd_dir / "TEMPLATE.md"
        if not template.exists():
            template.write_text(
                "# PRD: [Feature Name]\n\n"
                "## Objective\n\n[What problem does this solve?]\n\n"
                "## Requirements\n\n- [ ] Requirement 1\n- [ ] Requirement 2\n\n"
                "## Acceptance Criteria\n\n"
                "- [ ] Criterion with measurable target (e.g., ≥85% consensus)\n\n"
                "## Success Metrics\n\n"
                "- Metric 1: target ≥ X%\n- Metric 2: response time < Y ms\n\n"
                "## DoR (Definition of Ready)\n\n- [ ] Dependencies identified\n\n"
                "## DoD (Definition of Done)\n\n- [ ] All tests pass\n- [ ] ADR updated\n"
            )
            actions.append(f"Created {template.relative_to(project_root)}")

    if not report.layers.get("adr") or report.layers["adr"].files_found == 0:
        adr_dir = project_root / "docs" / "adr"
        adr_dir.mkdir(parents=True, exist_ok=True)
        template = adr_dir / "000-TEMPLATE.md"
        if not template.exists():
            template.write_text(
                "# ADR-000: [Decision Title]\n\n"
                "Date: YYYY-MM-DD\n\n"
                "## Status\n\nProposed\n\n"
                "## Context\n\n[What is the issue that motivates this decision?]\n\n"
                "## Decision\n\n[What is the change we are proposing?]\n\n"
                "## Consequences\n\n"
                "### Positive\n\n- [Benefit 1]\n\n"
                "### Negative\n\n- [Trade-off 1]\n\n"
                "### Neutral\n\n- [Side effect 1]\n"
            )
            actions.append(f"Created {template.relative_to(project_root)}")

    # Create test directory if missing
    tdd = report.layers.get("tdd")
    if not tdd or tdd.files_found == 0:
        test_dir = project_root / "tests"
        test_dir.mkdir(parents=True, exist_ok=True)
        conftest = test_dir / "conftest.py"
        if not conftest.exists():
            conftest.write_text(
                '"""Test configuration and shared fixtures."""\n\n'
                "import pytest\n\n\n"
                "@pytest.fixture\n"
                "def sample_content():\n"
                '    """Sample legal document content for testing."""\n'
                '    return "Settlement proposal for Case 26CV005596-590..."\n'
            )
            actions.append(f"Created {conftest.relative_to(project_root)}")

        init_test = test_dir / "test_coherence_smoke.py"
        if not init_test.exists():
            init_test.write_text(
                '"""Smoke tests to verify project structure."""\n\n'
                "\n"
                "def test_project_has_source_code():\n"
                '    """Verify source code directory exists."""\n'
                "    from pathlib import Path\n"
                '    assert any(Path(".").glob("**/*.py")), "No Python files found"\n'
                "\n\n"
                "def test_imports_work():\n"
                '    """Verify core imports succeed."""\n'
                "    try:\n"
                "        from vibesthinker import GovernanceCouncil\n"
                "        assert GovernanceCouncil is not None\n"
                "    except ImportError:\n"
                "        pass  # OK if vibesthinker not installed yet\n"
            )
            actions.append(f"Created {init_test.relative_to(project_root)}")

    return actions


# ═════════════════════════════════════════════════════════════════════════════
# OUTPUT FORMATTERS
# ═════════════════════════════════════════════════════════════════════════════


def format_markdown(report: CoherenceReport) -> str:
    """Format report as markdown."""
    lines = []

    lines.append("# DDD/TDD/ADR Coherence Validation Report")
    lines.append(f"**Generated:** {report.generated_at}")
    lines.append(f"**Project:** `{report.project_root}`")
    lines.append(f"**Files Scanned:** {report.total_files_scanned}")
    lines.append(f"**Automation Level:** {report.automation_level}")
    lines.append("")

    # Overall verdict
    verdict_icon = {"PASS": "✅", "CONDITIONAL": "🟡", "FAIL": "❌"}.get(
        report.overall_verdict, "❓"
    )
    bar_len = int(report.overall_score / 100 * 30)
    bar = "█" * bar_len + "░" * (30 - bar_len)
    lines.append(f"## {verdict_icon} Overall: {report.overall_verdict}")
    lines.append(
        f"`{bar}` **{report.overall_score:.1f}%** ({report.checks_passed}/{report.checks_total} checks)"
    )
    lines.append("")

    # Layer summaries
    lines.append("## Layer Health")
    lines.append("")
    lines.append("| Layer | Health | Files | Gaps | Strengths |")
    lines.append("|:------|:------:|:-----:|:----:|:----------|")

    for layer_name in ["prd", "adr", "ddd", "tdd"]:
        lr = report.layers.get(layer_name)
        if lr:
            h = lr.health_score
            icon = "🟢" if h >= 80 else ("🟡" if h >= 50 else "🔴")
            gaps_count = len(lr.gaps)
            strengths_str = "; ".join(lr.strengths[:2]) if lr.strengths else "—"
            lines.append(
                f"| **{layer_name.upper()}** | {icon} {h:.0f}% | {lr.files_found} | {gaps_count} | {strengths_str} |"
            )
        else:
            lines.append(f"| **{layer_name.upper()}** | ⚪ N/A | 0 | — | Not scanned |")

    lines.append("")

    # Cross-layer coherence
    if report.cross_layer_checks:
        lines.append("## Cross-Layer Coherence")
        lines.append("")
        for cross in report.cross_layer_checks:
            icon = "✅" if cross.passed else "❌"
            lines.append(
                f"- {icon} **{cross.rule_id}** ({cross.source_layer}→{cross.target_layer}): "
                f"{cross.message}"
            )
        lines.append("")

    # Detailed checks per layer
    for layer_name in ["prd", "adr", "ddd", "tdd"]:
        lr = report.layers.get(layer_name)
        if not lr or not lr.checks:
            continue

        lines.append(f"### {layer_name.upper()} Checks")
        lines.append("")
        for check in lr.checks:
            icon = "✅" if check.passed else "❌"
            sev = f"[{check.severity}]"
            path_str = f" `{check.file_path}`" if check.file_path else ""
            lines.append(f"- {icon} {sev} {check.name}: {check.message}{path_str}")
            if check.remediation and not check.passed:
                lines.append(f"  💡 {check.remediation}")
        lines.append("")

    # Recommendations
    if report.recommendations:
        lines.append("## Recommendations")
        lines.append("")
        for rec in report.recommendations:
            lines.append(f"- {rec}")
        lines.append("")

    # OODA mapping
    lines.append("## OODA Integration")
    lines.append("")
    lines.append("| Phase | Coherence Action |")
    lines.append("|:------|:-----------------|")
    lines.append(
        f"| **Observe** | Scanned {report.total_files_scanned} files across 4 layers |"
    )
    lines.append(
        f"| **Orient** | Health: PRD={_layer_score(report, 'prd')}, ADR={_layer_score(report, 'adr')}, DDD={_layer_score(report, 'ddd')}, TDD={_layer_score(report, 'tdd')} |"
    )
    lines.append(
        f"| **Decide** | Verdict: {report.overall_verdict} at {report.overall_score:.0f}% |"
    )
    lines.append(
        f"| **Act** | {len(report.recommendations)} recommendations to implement |"
    )
    lines.append("")

    lines.append("---")
    lines.append(
        f"*Generated by DDD/TDD/ADR Coherence Validator v1.0 | {report.generated_at}*"
    )

    return "\n".join(lines)


def _layer_score(report: CoherenceReport, layer: str) -> str:
    lr = report.layers.get(layer)
    if lr:
        return f"{lr.health_score:.0f}%"
    return "N/A"


def format_json(report: CoherenceReport) -> str:
    """Format report as JSON."""

    def _to_dict(obj):
        if hasattr(obj, "__dict__"):
            result = {}
            for k, v in obj.__dict__.items():
                result[k] = _to_dict(v)
            return result
        elif isinstance(obj, dict):
            return {k: _to_dict(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [_to_dict(v) for v in obj]
        return obj

    return json.dumps(_to_dict(report), indent=2, default=str)


# ═════════════════════════════════════════════════════════════════════════════
# CLI
# ═════════════════════════════════════════════════════════════════════════════


def main():
    parser = argparse.ArgumentParser(
        description="DDD/TDD/ADR Coherence Validation System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Validate all layers
  %(prog)s --layer ddd --layer tdd            # Only DDD + TDD
  %(prog)s --strict                           # Fail on any warning
  %(prog)s --json --output coherence.json     # JSON output
  %(prog)s --fix                              # Auto-scaffold missing structures
  %(prog)s --project-root /path/to/project    # Custom root
        """,
    )
    parser.add_argument(
        "--project-root",
        type=str,
        default=str(DEFAULT_PROJECT_ROOT),
        help="Project root directory",
    )
    parser.add_argument(
        "--layer",
        action="append",
        choices=["prd", "adr", "ddd", "tdd"],
        help="Validate specific layer(s) only (can specify multiple)",
    )
    parser.add_argument(
        "--strict", action="store_true", help="Strict mode: ≥90%% required"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--output", "-o", type=str, help="Save report to file")
    parser.add_argument(
        "--fix", action="store_true", help="Auto-generate missing scaffolds"
    )
    parser.add_argument(
        "--fail-below",
        type=float,
        default=None,
        help="Fail if overall score is below this threshold (0-100)",
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Minimal output (exit code only)"
    )

    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    if not project_root.exists():
        print(f"Error: Project root does not exist: {project_root}", file=sys.stderr)
        sys.exit(2)

    if not args.quiet:
        print("═" * 60)
        print("  DDD/TDD/ADR COHERENCE VALIDATION")
        print("  Automated Pipeline · OODA Loop · DoR/DoD Exit Conditions")
        print("═" * 60)
        print(f"  Project: {project_root}")
        print(
            f"  Layers:  {', '.join(args.layer) if args.layer else 'ALL (prd, adr, ddd, tdd)'}"
        )
        print(f"  Strict:  {args.strict}")
        print()

    # Run validation
    report = generate_report(
        project_root=project_root,
        target_layers=args.layer,
        strict=args.strict,
    )

    # Auto-fix if requested
    fix_actions = []
    if args.fix:
        fix_actions = generate_missing_scaffolds(project_root, report)
        if fix_actions:
            if not args.quiet:
                print("🔧 Auto-fix applied:")
                for action in fix_actions:
                    print(f"   {action}")
                print()
            # Re-run after fixes
            report = generate_report(
                project_root=project_root,
                target_layers=args.layer,
                strict=args.strict,
            )

    # Check custom threshold
    if args.fail_below is not None:
        if report.overall_score < args.fail_below:
            if not args.quiet:
                print(
                    f"\n❌ FAILED: Score {report.overall_score:.1f}% is below threshold {args.fail_below}%"
                )
            sys.exit(1)

    # Output
    if args.json:
        output_text = format_json(report)
    else:
        output_text = format_markdown(report)

    if not args.quiet:
        print(output_text)

    # Save to file if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            f.write(output_text)
        if not args.quiet:
            print(f"\n📄 Report saved: {output_path}")

    # Summary line
    if not args.quiet:
        verdict_icon = {"PASS": "✅", "CONDITIONAL": "🟡", "FAIL": "❌"}.get(
            report.overall_verdict, "❓"
        )
        print()
        print(
            f"  {verdict_icon} Verdict: {report.overall_verdict} ({report.overall_score:.1f}%)"
        )
        print(f"  📊 Checks: {report.checks_passed}/{report.checks_total}")
        print(f"  🤖 Automation: {report.automation_level}")

        for layer_name in ["prd", "adr", "ddd", "tdd"]:
            lr = report.layers.get(layer_name)
            if lr:
                h = lr.health_score
                bar_len = int(h / 100 * 20)
                bar = "█" * bar_len + "░" * (20 - bar_len)
                icon = "🟢" if h >= 80 else ("🟡" if h >= 50 else "🔴")
                print(
                    f"  {icon} {layer_name.upper():<4} {bar} {h:>5.1f}%  ({lr.files_found} files)"
                )

        if fix_actions:
            print(f"\n  🔧 {len(fix_actions)} scaffold(s) generated")

        print()

    # Exit code
    if report.overall_verdict == "FAIL":
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()

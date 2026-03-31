#!/usr/bin/env python3
"""
Coherence Validator - Validates consistency across PRD/ADR/DDD/TDD layers.

Usage:
    ./validate_coherence.py [--layer <layer>] [--all-layers] [--verbose]

Layers:
    prd - Product Requirements Documents
    adr - Architecture Decision Records
    ddd - Domain-Driven Design
    tdd - Test-Driven Development

Exit Codes:
    0 - All checks pass (or SKIP if no files found)
    1 - Validation failures detected
    2 - Configuration/runtime error
"""

import argparse
import sys
import os
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple
from datetime import datetime

try:
    import yaml
except ImportError:
    yaml = None

try:
    from dateutil import parser as dateparser
except ImportError:
    dateparser = None


@dataclass
class LayerHealth:
    """Health metrics for a validation layer."""
    layer: str
    files_found: int
    checks_passed: int
    checks_total: int
    percentage: float
    issues: List[str]
    status: str  # PASS, FAIL, SKIP


@dataclass
class CoherenceIssue:
    """Cross-layer coherence issue."""
    code: str
    severity: str  # CRITICAL, WARNING, INFO
    message: str
    source_layer: str
    target_layer: str


class CoherenceValidator:
    """Validates coherence across architectural layers."""

    def __init__(self, root_path: Path, verbose: bool = False):
        self.root = root_path
        self.verbose = verbose
        self.config = self._load_config()

    def _load_config(self) -> Dict:
        """Load configuration from yaml if exists, else use defaults."""
        config_path = self.root / "scripts" / "validators" / "validate_coherence_config.yaml"

        if config_path.exists() and yaml:
            try:
                with open(config_path) as f:
                    return yaml.safe_load(f)
            except Exception as e:
                print(f"Warning: Failed to load config: {e}", file=sys.stderr)

        # Default configuration
        return {
            "scan_paths": [
                "docs/prd/",
                "docs/adr/",
                "src/domain/",
                "rust/core/src/",
                "tests/"
            ],
            "exclude_patterns": [
                "**/*.backup",
                "**/*.tmp",
                "**/node_modules/**",
                "**/__pycache__/**"
            ]
        }

    def validate_layer(self, layer: str) -> LayerHealth:
        """Validate a specific layer."""
        if layer == "prd":
            return self._validate_prd()
        elif layer == "adr":
            return self._validate_adr()
        elif layer == "ddd":
            return self._validate_ddd()
        elif layer == "tdd":
            return self._validate_tdd()
        else:
            raise ValueError(f"Unknown layer: {layer}")

    def _validate_prd(self) -> LayerHealth:
        """Validate Product Requirements Documents."""
        prd_dir = self.root / "docs" / "prd"
        issues = []

        if not prd_dir.exists():
            return LayerHealth("PRD", 0, 0, 0, 0.0, ["No docs/prd/ directory"], "SKIP")

        prd_files = list(prd_dir.glob("*.md"))
        if not prd_files:
            return LayerHealth("PRD", 0, 0, 0, 0.0, ["No PRD files found"], "SKIP")

        checks_passed = 0
        checks_total = len(prd_files) * 3  # Title, Problem, Success checks

        for prd_file in prd_files:
            content = prd_file.read_text()

            # Check 1: Has title
            if re.search(r'^#\s+.+', content, re.MULTILINE):
                checks_passed += 1
            else:
                issues.append(f"{prd_file.name}: Missing title")

            # Check 2: Has problem statement
            if re.search(r'##\s*Problem', content, re.IGNORECASE):
                checks_passed += 1
            else:
                issues.append(f"{prd_file.name}: Missing Problem section")

            # Check 3: Has success criteria
            if re.search(r'##\s*Success', content, re.IGNORECASE):
                checks_passed += 1
            else:
                issues.append(f"{prd_file.name}: Missing Success section")

        percentage = (checks_passed / checks_total * 100) if checks_total > 0 else 0
        status = "PASS" if percentage >= 80 else "FAIL"

        return LayerHealth("PRD", len(prd_files), checks_passed, checks_total,
                          percentage, issues, status)

    def _validate_adr(self) -> LayerHealth:
        """Validate Architecture Decision Records."""
        adr_dir = self.root / "docs" / "adr"
        issues = []

        if not adr_dir.exists():
            return LayerHealth("ADR", 0, 0, 0, 0.0, ["No docs/adr/ directory"], "SKIP")

        adr_files = list(adr_dir.glob("*.md"))
        if not adr_files:
            return LayerHealth("ADR", 0, 0, 0, 0.0, ["No ADR files found"], "SKIP")

        checks_passed = 0
        checks_total = len(adr_files) * 4  # Title, Context, Decision, Date checks

        for adr_file in adr_files:
            content = adr_file.read_text()

            # Check 1: Has title
            if re.search(r'^#\s+.+', content, re.MULTILINE):
                checks_passed += 1
            else:
                issues.append(f"{adr_file.name}: Missing title")

            # Check 2: Has context
            if re.search(r'##\s*Context', content, re.IGNORECASE):
                checks_passed += 1
            else:
                issues.append(f"{adr_file.name}: Missing Context section")

            # Check 3: Has decision
            if re.search(r'##\s*Decision', content, re.IGNORECASE):
                checks_passed += 1
            else:
                issues.append(f"{adr_file.name}: Missing Decision section")

            # Check 4: Has date
            if re.search(r'##\s*Date', content, re.IGNORECASE) or re.search(r'(?m)^date:\s*\S+', content, re.IGNORECASE):
                checks_passed += 1
            else:
                issues.append(f"{adr_file.name}: Missing Date section")

        percentage = (checks_passed / checks_total * 100) if checks_total > 0 else 0
        status = "PASS" if percentage >= 80 else "FAIL"

        return LayerHealth("ADR", len(adr_files), checks_passed, checks_total,
                          percentage, issues, status)

    def _validate_ddd(self) -> LayerHealth:
        """Validate Domain-Driven Design structure."""
        issues = []
        domain_files = []

        # Scan multiple possible domain locations
        scan_paths = [
            self.root / "src" / "domain",
            self.root / "rust" / "core" / "src" / "validation",
            self.root / "rust" / "core" / "src" / "domain",
            self.root / "crates" / "wsjf-domain-bridge" / "src" / "domains",
            self.root / "crates" / "reverse-recruiter" / "src" / "domains",
            self.root / "crates" / "reverse-recruiter" / "src" / "scoring",
            self.root / "crates" / "reverse-recruiter" / "src" / "wasm"
        ]

        for scan_path in scan_paths:
            if scan_path.exists():
                domain_files.extend(scan_path.rglob("*.rs"))
                domain_files.extend(scan_path.rglob("*.py"))
                domain_files.extend(scan_path.rglob("*.ts"))

        if not domain_files:
            return LayerHealth("DDD", 0, 0, 0, 0.0,
                             ["No domain model files found in src/domain/, rust/core/src/validation/, or rust/core/src/domain/"],
                             "SKIP")

        checks_passed = 0
        checks_total = len(domain_files) * 2  # Has aggregate, has value objects

        for domain_file in domain_files:
            content = domain_file.read_text()

            # Skip infrastructure/barrel modules annotated as DDD-INFRASTRUCTURE
            if re.search(r'@constraint\s+DDD-INFRASTRUCTURE', content):
                checks_total -= 2  # Remove both checks for this file
                if self.verbose:
                    print(f"  Skipping {domain_file}: DDD-INFRASTRUCTURE annotated")
                continue

            # Check 1: Contains aggregate/entity pattern
            # Note: Added 'enum' for Rust domain types (value objects, errors)
            # RCA 2026-03-08: Original regex missed Rust enums like ValidationError
            # Enhancement 2026-03-08: Added @domain-entities annotation detection
            if (re.search(r'(struct|class|interface|enum)\s+\w+', content) or
                re.search(r'@domain-entities:', content)):
                checks_passed += 1
            else:
                issues.append(f"{domain_file}: No domain entities found")

            # Check 2: Has domain methods/behavior
            # Enhancement 2026-03-08: Added @domain-behavior annotation detection
            if (re.search(r'(impl|def|function|fn)\s+\w+', content) or
                re.search(r'@domain-behavior:', content)):
                checks_passed += 1
            else:
                issues.append(f"{domain_file}: No domain behavior found")

        percentage = (checks_passed / checks_total * 100) if checks_total > 0 else 0
        status = "PASS" if percentage >= 60 else "FAIL"  # Lower threshold for DDD

        return LayerHealth("DDD", len(domain_files), checks_passed, checks_total,
                          percentage, issues, status)

    def _validate_tdd(self) -> LayerHealth:
        """Validate Test-Driven Development structure."""
        tests_dir = self.root / "tests"
        issues = []

        if not tests_dir.exists():
            return LayerHealth("TDD", 0, 0, 0, 0.0, ["No tests/ directory"], "SKIP")

        test_files = list(tests_dir.rglob("test_*.py")) + list(tests_dir.rglob("*_test.rs"))
        if not test_files:
            return LayerHealth("TDD", 0, 0, 0, 0.0, ["No test files found"], "SKIP")

        checks_passed = 0
        checks_total = len(test_files) * 3  # Has test functions, has assertions, has integration tests

        has_integration = (tests_dir / "integration").exists()

        for test_file in test_files:
            content = test_file.read_text()

            # Check 1: Has test functions
            if re.search(r'(def test_|fn test_|#\[test\])', content):
                checks_passed += 1
            else:
                issues.append(f"{test_file.name}: No test functions found")

            # Check 2: Has assertions
            if re.search(r'(assert|expect)', content):
                checks_passed += 1
            else:
                issues.append(f"{test_file.name}: No assertions found")

            # Check 3: Integration test coverage
            if has_integration:
                checks_passed += 1

        if not has_integration:
            issues.append("No tests/integration/ directory")

        percentage = (checks_passed / checks_total * 100) if checks_total > 0 else 0
        status = "PASS" if percentage >= 70 else "FAIL"

        return LayerHealth("TDD", len(test_files), checks_passed, checks_total,
                          percentage, issues, status)

    def validate_all_layers(self) -> Dict[str, LayerHealth]:
        """Validate all layers."""
        return {
            "PRD": self.validate_layer("prd"),
            "ADR": self.validate_layer("adr"),
            "DDD": self.validate_layer("ddd"),
            "TDD": self.validate_layer("tdd")
        }

    def check_cross_layer_coherence(self, layer_results: Dict[str, LayerHealth]) -> List[CoherenceIssue]:
        """Check coherence between layers."""
        issues = []

        # COH-001: DDD → TDD (domain classes should have tests)
        ddd = layer_results["DDD"]
        tdd = layer_results["TDD"]
        if ddd.files_found > 0 and tdd.files_found == 0:
            issues.append(CoherenceIssue(
                "COH-001", "CRITICAL",
                f"DDD has {ddd.files_found} domain files but TDD has no tests",
                "DDD", "TDD"
            ))

        # COH-002: ADR → DDD (decisions should lead to domain models)
        adr = layer_results["ADR"]
        if adr.files_found > 0 and ddd.files_found == 0:
            issues.append(CoherenceIssue(
                "COH-002", "WARNING",
                f"ADR has {adr.files_found} decisions but DDD has no domain model",
                "ADR", "DDD"
            ))

        # COH-003: PRD → ADR (requirements should have decisions)
        prd = layer_results["PRD"]
        if prd.files_found > 0 and adr.files_found == 0:
            issues.append(CoherenceIssue(
                "COH-003", "WARNING",
                f"PRD has {prd.files_found} requirements but ADR has no decisions",
                "PRD", "ADR"
            ))

        return issues


def format_layer_health(health: LayerHealth, verbose: bool = False) -> str:
    """Format layer health for display."""
    emoji = "🟢" if health.status == "PASS" else "🔴" if health.status == "FAIL" else "🟡"
    output = f"{emoji} {health.layer}: {health.percentage:.0f}% ({health.checks_passed}/{health.checks_total})"

    if health.status == "SKIP":
        output += " - Skipped (no files)"
    elif health.status == "FAIL":
        output += f" - Failed"

    if verbose and health.issues:
        output += "\n  Issues:"
        for issue in health.issues[:5]:  # Limit to first 5 issues
            output += f"\n    - {issue}"
        if len(health.issues) > 5:
            output += f"\n    ... and {len(health.issues) - 5} more"

    return output


def main():
    parser = argparse.ArgumentParser(description="Validate coherence across architectural layers")
    parser.add_argument("--layer", choices=["prd", "adr", "ddd", "tdd"],
                       help="Validate specific layer")
    parser.add_argument("--all-layers", action="store_true",
                       help="Validate all layers")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Show detailed issues")

    args = parser.parse_args()

    # Find project root (current directory or parent with .git)
    root = Path.cwd()
    while root != root.parent:
        if (root / ".git").exists() or (root / "scripts").exists():
            break
        root = root.parent

    validator = CoherenceValidator(root, args.verbose)

    try:
        if args.layer:
            # Validate single layer
            health = validator.validate_layer(args.layer)
            print(format_layer_health(health, args.verbose))
            sys.exit(0 if health.status != "FAIL" else 1)

        elif args.all_layers or not args.layer:
            # Validate all layers
            results = validator.validate_all_layers()

            print("# Layer Coherence Report")
            print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

            for layer_name, health in results.items():
                print(format_layer_health(health, args.verbose))

            # Check cross-layer coherence
            coherence_issues = validator.check_cross_layer_coherence(results)
            if coherence_issues:
                print("\n# Cross-Layer Coherence Issues")
                for issue in coherence_issues:
                    emoji = "🔴" if issue.severity == "CRITICAL" else "🟡"
                    print(f"{emoji} {issue.code}: {issue.message}")

            # Calculate overall DPC_R
            total_passed = sum(h.checks_passed for h in results.values())
            total_checks = sum(h.checks_total for h in results.values())
            dpc_r = (total_passed / total_checks * 100) if total_checks > 0 else 0

            print(f"\n# Overall DPC_R: {dpc_r:.1f}% ({total_passed}/{total_checks} checks)")

            # Exit with failure if any layer failed
            has_failures = any(h.status == "FAIL" for h in results.values())
            sys.exit(1 if has_failures else 0)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(2)


if __name__ == "__main__":
    main()

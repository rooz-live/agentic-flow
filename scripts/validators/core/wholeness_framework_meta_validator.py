#!/usr/bin/env python3
"""
Wholeness Framework Meta-Validator
===================================

Validates the wholeness validation framework itself, checking:
1. Layer coverage (4 layers: Circles, Legal Roles, Government Counsel, Software Patterns)
2. Circle completeness (6 circles: analyst, assessor, innovator, intuitive, orchestrator, seeker)
3. Role simulation depth (6+ roles per layer)
4. Iteration count and convergence
5. Design pattern integration (PRD/ADR/DDD/TDD)
6. Coverage metrics across legal case files

Usage:
    python3 wholeness_framework_meta_validator.py --legal-dir /path/to/legal/files
    python3 wholeness_framework_meta_validator.py --framework-only  # Just validate framework files
    python3 wholeness_framework_meta_validator.py --metrics  # Display current metrics
"""

import ast
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


# ══════════════════════════════════════════════════════════
# DATA STRUCTURES
# ══════════════════════════════════════════════════════════

@dataclass
class LayerCoverage:
    """Coverage metrics for a validation layer"""
    layer_name: str
    roles_defined: Set[str] = field(default_factory=set)
    roles_implemented: Set[str] = field(default_factory=set)
    iteration_count: int = 0
    convergence_score: float = 0.0
    examples_found: int = 0
    
    @property
    def completeness(self) -> float:
        """Calculate layer completeness (0.0-1.0)"""
        if not self.roles_defined:
            return 0.0
        return len(self.roles_implemented) / len(self.roles_defined)


@dataclass
class FrameworkMetrics:
    """Overall framework validation metrics"""
    total_layers: int = 4
    layers_implemented: int = 0
    total_circles: int = 6
    circles_implemented: int = 0
    total_legal_roles: int = 6
    legal_roles_implemented: int = 0
    total_gov_counsel: int = 5
    gov_counsel_implemented: int = 0
    software_patterns: Set[str] = field(default_factory=set)
    
    iteration_rounds: int = 0
    convergence_threshold: float = 0.95
    convergence_achieved: bool = False
    
    legal_files_analyzed: int = 0
    emails_with_wholeness: int = 0
    
    layer_coverage: Dict[str, LayerCoverage] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        """Convert to JSON-serializable dict"""
        return {
            "layers": {
                "total": self.total_layers,
                "implemented": self.layers_implemented,
                "completeness": f"{(self.layers_implemented / self.total_layers * 100):.1f}%"
            },
            "circles": {
                "total": self.total_circles,
                "implemented": self.circles_implemented,
                "completeness": f"{(self.circles_implemented / self.total_circles * 100):.1f}%"
            },
            "legal_roles": {
                "total": self.total_legal_roles,
                "implemented": self.legal_roles_implemented,
                "completeness": f"{(self.legal_roles_implemented / self.total_legal_roles * 100):.1f}%"
            },
            "government_counsel": {
                "total": self.total_gov_counsel,
                "implemented": self.gov_counsel_implemented,
                "completeness": f"{(self.gov_counsel_implemented / self.total_gov_counsel * 100):.1f}%"
            },
            "software_patterns": list(self.software_patterns),
            "iteration": {
                "rounds": self.iteration_rounds,
                "convergence_threshold": self.convergence_threshold,
                "convergence_achieved": self.convergence_achieved
            },
            "legal_analysis": {
                "files_analyzed": self.legal_files_analyzed,
                "emails_with_wholeness": self.emails_with_wholeness,
                "coverage_rate": f"{(self.emails_with_wholeness / max(self.legal_files_analyzed, 1) * 100):.1f}%"
            },
            "layer_details": {
                name: {
                    "completeness": f"{cov.completeness * 100:.1f}%",
                    "roles_defined": len(cov.roles_defined),
                    "roles_implemented": len(cov.roles_implemented),
                    "iterations": cov.iteration_count,
                    "convergence": cov.convergence_score,
                    "examples": cov.examples_found
                }
                for name, cov in self.layer_coverage.items()
            }
        }


# ══════════════════════════════════════════════════════════
# FRAMEWORK FILE ANALYZERS
# ══════════════════════════════════════════════════════════

class FrameworkFileAnalyzer:
    """Analyze wholeness framework Python files for role/circle coverage"""
    
    # Expected roles per layer
    LAYER_1_CIRCLES = {"analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"}
    LAYER_2_LEGAL = {"judge", "prosecutor", "defense", "expert", "jury", "mediator"}
    LAYER_3_GOVERNMENT = {"county_attorney", "state_ag", "hud", "legal_aid", "appellate"}
    LAYER_4_PATTERNS = {"PRD", "ADR", "DDD", "TDD"}
    
    def __init__(self, framework_dir: Path):
        self.framework_dir = framework_dir
        self.metrics = FrameworkMetrics()
        
    def analyze_all_files(self) -> FrameworkMetrics:
        """Analyze all framework files and return metrics"""
        framework_files = [
            "wholeness_validation_framework.py",
            "wholeness_validator_extended.py",
            "wholeness_validator_legal_patterns.py",
            "validate_legal_patterns_cli.py"
        ]
        
        for filename in framework_files:
            filepath = self.framework_dir / filename
            if filepath.exists():
                self._analyze_python_file(filepath)
        
        # Check documentation files
        self._analyze_documentation()
        
        # Calculate layer completeness
        self._calculate_layer_completeness()
        
        return self.metrics
    
    def _analyze_python_file(self, filepath: Path):
        """Analyze a single Python file for role definitions"""
        content = filepath.read_text()
        
        # Layer 1: Circle detection
        for circle in self.LAYER_1_CIRCLES:
            if re.search(rf'\b{circle}\b', content, re.IGNORECASE):
                if "Layer1" not in self.metrics.layer_coverage:
                    self.metrics.layer_coverage["Layer1"] = LayerCoverage("Circle-based Orchestration")
                self.metrics.layer_coverage["Layer1"].roles_defined.add(circle)
                
                # Check if implemented (has class or function)
                if re.search(rf'class.*{circle}|def.*{circle}', content, re.IGNORECASE):
                    self.metrics.layer_coverage["Layer1"].roles_implemented.add(circle)
                    self.metrics.circles_implemented += 1
        
        # Layer 2: Legal role detection
        for role in self.LAYER_2_LEGAL:
            if re.search(rf'\b{role}\b', content, re.IGNORECASE):
                if "Layer2" not in self.metrics.layer_coverage:
                    self.metrics.layer_coverage["Layer2"] = LayerCoverage("Legal Role Simulation")
                self.metrics.layer_coverage["Layer2"].roles_defined.add(role)
                
                if re.search(rf'class.*{role}|def.*{role}', content, re.IGNORECASE):
                    self.metrics.layer_coverage["Layer2"].roles_implemented.add(role)
                    self.metrics.legal_roles_implemented += 1
        
        # Layer 3: Government counsel detection
        for counsel in self.LAYER_3_GOVERNMENT:
            pattern = counsel.replace("_", "[ _-]")  # Flexible matching
            if re.search(rf'\b{pattern}\b', content, re.IGNORECASE):
                if "Layer3" not in self.metrics.layer_coverage:
                    self.metrics.layer_coverage["Layer3"] = LayerCoverage("Government Counsel Review")
                self.metrics.layer_coverage["Layer3"].roles_defined.add(counsel)
                
                if re.search(rf'class.*{pattern}|def.*{pattern}', content, re.IGNORECASE):
                    self.metrics.layer_coverage["Layer3"].roles_implemented.add(counsel)
                    self.metrics.gov_counsel_implemented += 1
        
        # Layer 4: Software pattern detection
        for pattern in self.LAYER_4_PATTERNS:
            if re.search(rf'\b{pattern}\b', content):
                if "Layer4" not in self.metrics.layer_coverage:
                    self.metrics.layer_coverage["Layer4"] = LayerCoverage("Software Patterns")
                self.metrics.layer_coverage["Layer4"].roles_defined.add(pattern)
                self.metrics.software_patterns.add(pattern)
                
                # Check for implementation (class/function/docstring)
                if re.search(rf'class.*{pattern}|def.*{pattern}|{pattern}.*implementation', content, re.IGNORECASE):
                    self.metrics.layer_coverage["Layer4"].roles_implemented.add(pattern)
        
        # Iteration count detection
        iteration_matches = re.findall(r'iteration[s]?\s*[=:]\s*(\d+)|round[s]?\s*[=:]\s*(\d+)', content, re.IGNORECASE)
        if iteration_matches:
            max_iterations = max(int(m[0] or m[1]) for m in iteration_matches)
            self.metrics.iteration_rounds = max(self.metrics.iteration_rounds, max_iterations)
        
        # Convergence detection
        convergence_matches = re.findall(r'convergence[^0-9]*([0-9.]+)', content, re.IGNORECASE)
        if convergence_matches:
            convergence_vals = [float(v) for v in convergence_matches if 0 <= float(v) <= 1]
            if convergence_vals:
                for layer_cov in self.metrics.layer_coverage.values():
                    layer_cov.convergence_score = max(convergence_vals)
    
    def _analyze_documentation(self):
        """Analyze README and documentation files"""
        doc_files = [
            "WHOLENESS_VALIDATION_README.md",
            "QUICKSTART_VALIDATION.md",
            "ROBUSTNESS_IMPROVEMENTS.md",
            "PHASE3_PHASE4_DDD_ARCHITECTURE.md"
        ]
        
        for filename in doc_files:
            filepath = self.framework_dir / filename
            if filepath.exists():
                content = filepath.read_text()
                
                # Count examples
                example_count = len(re.findall(r'example|usage|demo', content, re.IGNORECASE))
                for layer_cov in self.metrics.layer_coverage.values():
                    layer_cov.examples_found += example_count
    
    def _calculate_layer_completeness(self):
        """Calculate overall layer implementation status"""
        self.metrics.layers_implemented = len(self.metrics.layer_coverage)
        
        # Deduplicate circle counts
        self.metrics.circles_implemented = len(self.metrics.layer_coverage.get("Layer1", LayerCoverage("")).roles_implemented)
        self.metrics.legal_roles_implemented = len(self.metrics.layer_coverage.get("Layer2", LayerCoverage("")).roles_implemented)
        self.metrics.gov_counsel_implemented = len(self.metrics.layer_coverage.get("Layer3", LayerCoverage("")).roles_implemented)
        
        # Check convergence
        avg_convergence = sum(cov.convergence_score for cov in self.metrics.layer_coverage.values()) / max(len(self.metrics.layer_coverage), 1)
        self.metrics.convergence_achieved = avg_convergence >= self.metrics.convergence_threshold


# ══════════════════════════════════════════════════════════
# LEGAL FILE ANALYZER
# ══════════════════════════════════════════════════════════

class LegalFileAnalyzer:
    """Analyze legal case files for wholeness framework coverage"""
    
    def __init__(self, legal_dir: Path):
        self.legal_dir = legal_dir
        
    def analyze_legal_files(self, metrics: FrameworkMetrics) -> FrameworkMetrics:
        """Scan legal files for wholeness validation evidence"""
        if not self.legal_dir.exists():
            print(f"Warning: Legal directory not found: {self.legal_dir}")
            return metrics
        
        # Find all .eml and .txt files
        legal_files = list(self.legal_dir.rglob("*.eml")) + list(self.legal_dir.rglob("*.txt"))
        metrics.legal_files_analyzed = len(legal_files)
        
        for filepath in legal_files:
            if self._has_wholeness_validation(filepath):
                metrics.emails_with_wholeness += 1
        
        return metrics
    
    def _has_wholeness_validation(self, filepath: Path) -> bool:
        """Check if file contains wholeness validation signatures"""
        try:
            content = filepath.read_text(errors='ignore')
            
            # Check for wholeness indicators
            indicators = [
                r'Evidence-Based Systemic Analysis',
                r'Governance Council',
                r'Layer [1-4]',
                r'Circle.*Orchestration',
                r'Legal Role Simulation',
                r'Government Counsel',
                r'PRD|ADR|DDD|TDD',
                r'weighted.*consensus',
                r'multi-agent.*iterative'
            ]
            
            matches = sum(1 for ind in indicators if re.search(ind, content, re.IGNORECASE))
            return matches >= 2  # At least 2 indicators = wholeness validated
            
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return False


# ══════════════════════════════════════════════════════════
# REPORTING
# ══════════════════════════════════════════════════════════

class MetricsReporter:
    """Generate formatted reports of framework metrics"""
    
    @staticmethod
    def print_console_report(metrics: FrameworkMetrics):
        """Print colorized console report"""
        print("\n" + "=" * 80)
        print("WHOLENESS FRAMEWORK META-VALIDATION REPORT")
        print("=" * 80)
        
        # Layer summary
        print(f"\n📊 LAYER COVERAGE ({metrics.layers_implemented}/{metrics.total_layers} layers)")
        print("-" * 80)
        
        for i, (layer_name, coverage) in enumerate(metrics.layer_coverage.items(), 1):
            status = "✅" if coverage.completeness >= 0.8 else "⚠️" if coverage.completeness >= 0.5 else "❌"
            print(f"{status} {layer_name}: {coverage.layer_name}")
            print(f"   Roles: {len(coverage.roles_implemented)}/{len(coverage.roles_defined)} "
                  f"({coverage.completeness * 100:.1f}%)")
            print(f"   Implemented: {', '.join(sorted(coverage.roles_implemented)) or 'None'}")
            if coverage.roles_defined - coverage.roles_implemented:
                print(f"   Missing: {', '.join(sorted(coverage.roles_defined - coverage.roles_implemented))}")
            print(f"   Iterations: {coverage.iteration_count}, Convergence: {coverage.convergence_score:.3f}")
            print(f"   Examples: {coverage.examples_found}")
        
        # Circle details
        print(f"\n🔵 CIRCLE ORCHESTRATION ({metrics.circles_implemented}/{metrics.total_circles})")
        print("-" * 80)
        layer1 = metrics.layer_coverage.get("Layer1")
        if layer1:
            implemented = layer1.roles_implemented
            missing = FrameworkFileAnalyzer.LAYER_1_CIRCLES - implemented
            print(f"✅ Implemented: {', '.join(sorted(implemented)) or 'None'}")
            if missing:
                print(f"❌ Missing: {', '.join(sorted(missing))}")
        
        # Legal roles
        print(f"\n⚖️  LEGAL ROLE SIMULATION ({metrics.legal_roles_implemented}/{metrics.total_legal_roles})")
        print("-" * 80)
        layer2 = metrics.layer_coverage.get("Layer2")
        if layer2:
            implemented = layer2.roles_implemented
            missing = FrameworkFileAnalyzer.LAYER_2_LEGAL - implemented
            print(f"✅ Implemented: {', '.join(sorted(implemented)) or 'None'}")
            if missing:
                print(f"❌ Missing: {', '.join(sorted(missing))}")
        
        # Government counsel
        print(f"\n🏛️  GOVERNMENT COUNSEL ({metrics.gov_counsel_implemented}/{metrics.total_gov_counsel})")
        print("-" * 80)
        layer3 = metrics.layer_coverage.get("Layer3")
        if layer3:
            implemented = layer3.roles_implemented
            missing = FrameworkFileAnalyzer.LAYER_3_GOVERNMENT - implemented
            print(f"✅ Implemented: {', '.join(sorted(implemented)) or 'None'}")
            if missing:
                print(f"❌ Missing: {', '.join(sorted(missing))}")
        
        # Software patterns
        print(f"\n🔧 SOFTWARE PATTERNS ({len(metrics.software_patterns)}/{len(FrameworkFileAnalyzer.LAYER_4_PATTERNS)})")
        print("-" * 80)
        print(f"Detected: {', '.join(sorted(metrics.software_patterns)) or 'None'}")
        missing_patterns = FrameworkFileAnalyzer.LAYER_4_PATTERNS - metrics.software_patterns
        if missing_patterns:
            print(f"❌ Missing: {', '.join(sorted(missing_patterns))}")
        
        # Iteration metrics
        print(f"\n🔄 ITERATION & CONVERGENCE")
        print("-" * 80)
        print(f"Total Iteration Rounds: {metrics.iteration_rounds}")
        print(f"Convergence Threshold: {metrics.convergence_threshold:.2f}")
        print(f"Convergence Achieved: {'✅ YES' if metrics.convergence_achieved else '❌ NO'}")
        
        # Legal file coverage
        print(f"\n📧 LEGAL FILE COVERAGE")
        print("-" * 80)
        print(f"Files Analyzed: {metrics.legal_files_analyzed}")
        print(f"Files with Wholeness: {metrics.emails_with_wholeness}")
        if metrics.legal_files_analyzed > 0:
            coverage_pct = (metrics.emails_with_wholeness / metrics.legal_files_analyzed * 100)
            status = "✅" if coverage_pct >= 80 else "⚠️" if coverage_pct >= 50 else "❌"
            print(f"{status} Coverage Rate: {coverage_pct:.1f}%")
        
        # Overall score
        print(f"\n🎯 OVERALL FRAMEWORK COMPLETENESS")
        print("-" * 80)
        total_roles = metrics.total_circles + metrics.total_legal_roles + metrics.total_gov_counsel + len(FrameworkFileAnalyzer.LAYER_4_PATTERNS)
        implemented_roles = metrics.circles_implemented + metrics.legal_roles_implemented + metrics.gov_counsel_implemented + len(metrics.software_patterns)
        overall_pct = (implemented_roles / total_roles * 100) if total_roles > 0 else 0
        
        if overall_pct >= 90:
            status = "🏆 EXCELLENT"
        elif overall_pct >= 75:
            status = "✅ GOOD"
        elif overall_pct >= 50:
            status = "⚠️ MODERATE"
        else:
            status = "❌ NEEDS WORK"
        
        print(f"{status}: {implemented_roles}/{total_roles} roles ({overall_pct:.1f}%)")
        print("=" * 80 + "\n")
    
    @staticmethod
    def save_json_report(metrics: FrameworkMetrics, output_path: Path):
        """Save metrics as JSON file"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics.to_dict()
        }
        
        output_path.write_text(json.dumps(report, indent=2))
        print(f"✅ JSON report saved: {output_path}")


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Wholeness Framework Meta-Validator")
    parser.add_argument("--framework-dir", type=Path, default=Path("."),
                        help="Directory containing framework Python files")
    parser.add_argument("--legal-dir", type=Path,
                        help="Directory containing legal case files")
    parser.add_argument("--framework-only", action="store_true",
                        help="Only validate framework files (skip legal file scan)")
    parser.add_argument("--metrics", action="store_true",
                        help="Display current metrics")
    parser.add_argument("--json", type=Path,
                        help="Save metrics to JSON file")
    
    args = parser.parse_args()
    
    # Analyze framework files
    print("Analyzing wholeness framework files...")
    framework_analyzer = FrameworkFileAnalyzer(args.framework_dir)
    metrics = framework_analyzer.analyze_all_files()
    
    # Analyze legal files (if requested)
    if not args.framework_only and args.legal_dir:
        print(f"Analyzing legal case files in {args.legal_dir}...")
        legal_analyzer = LegalFileAnalyzer(args.legal_dir)
        metrics = legal_analyzer.analyze_legal_files(metrics)
    
    # Display report
    MetricsReporter.print_console_report(metrics)
    
    # Save JSON (if requested)
    if args.json:
        MetricsReporter.save_json_report(metrics, args.json)
    
    # Exit code based on completeness
    total_roles = metrics.total_circles + metrics.total_legal_roles + metrics.total_gov_counsel + len(FrameworkFileAnalyzer.LAYER_4_PATTERNS)
    implemented_roles = metrics.circles_implemented + metrics.legal_roles_implemented + metrics.gov_counsel_implemented + len(metrics.software_patterns)
    overall_pct = (implemented_roles / total_roles * 100) if total_roles > 0 else 0
    
    if overall_pct >= 90:
        sys.exit(0)  # Excellent
    elif overall_pct >= 75:
        sys.exit(0)  # Good
    elif overall_pct >= 50:
        sys.exit(1)  # Moderate - warning
    else:
        sys.exit(2)  # Needs work - fail


if __name__ == "__main__":
    main()

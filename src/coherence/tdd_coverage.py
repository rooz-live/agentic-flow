#!/usr/bin/env python3
"""
TDD Coverage Analyzer - Test-Driven Development Coverage Analysis
==================================================================
Analyzes test coverage for domain models and validates TDD practices.

DoD:
- Maps tests to domain models
- Calculates coverage percentage
- Identifies untested domain logic
- Generates coverage report (JSON)
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Set
from dataclasses import dataclass, asdict


@dataclass
class TestCoverage:
    """Test coverage for a domain model"""
    model_name: str
    model_file: str
    test_files: List[str]
    test_count: int
    has_tests: bool
    coverage_score: float


class TDDCoverageAnalyzer:
    """Analyzes TDD test coverage"""
    
    def __init__(self, tests_dir: Path, src_dir: Path):
        self.tests_dir = Path(tests_dir)
        self.src_dir = Path(src_dir)
        self.coverage_results: List[TestCoverage] = []
    
    def analyze_all(self) -> Dict[str, Any]:
        """Analyze test coverage for all source files"""
        # Find all Python source files
        src_files = list(self.src_dir.rglob("*.py"))
        src_files = [f for f in src_files if not f.name.startswith("test_")]
        
        # Find all test files
        test_files = list(self.tests_dir.rglob("test_*.py"))
        
        for src_file in src_files:
            coverage = self._analyze_file_coverage(src_file, test_files)
            if coverage:
                self.coverage_results.append(coverage)
        
        return self._generate_report()
    
    def _analyze_file_coverage(self, src_file: Path, test_files: List[Path]) -> TestCoverage:
        """Analyze test coverage for a single source file"""
        try:
            content = src_file.read_text()
            
            # Extract class names
            class_matches = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
            if not class_matches:
                return None
            
            # Find related test files
            related_tests = []
            test_count = 0
            
            for test_file in test_files:
                test_content = test_file.read_text()
                
                # Check if any class from src_file is tested
                for class_name in class_matches:
                    if class_name.lower() in test_content.lower():
                        if str(test_file) not in related_tests:
                            related_tests.append(str(test_file.relative_to(self.tests_dir.parent)))
                        
                        # Count test methods
                        test_count += len(re.findall(
                            rf'def\s+test_.*{class_name.lower()}',
                            test_content,
                            re.IGNORECASE
                        ))
            
            # Calculate coverage score
            has_tests = len(related_tests) > 0
            coverage_score = min(100.0, test_count * 10) if has_tests else 0.0
            
            return TestCoverage(
                model_name=class_matches[0],  # Primary class
                model_file=str(src_file.relative_to(self.src_dir.parent)),
                test_files=related_tests,
                test_count=test_count,
                has_tests=has_tests,
                coverage_score=coverage_score
            )
        except Exception:
            return None
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate coverage report"""
        total_models = len(self.coverage_results)
        tested_models = sum(1 for c in self.coverage_results if c.has_tests)
        avg_coverage = sum(c.coverage_score for c in self.coverage_results) / total_models if total_models > 0 else 0
        
        # Find untested models
        untested = [c.model_name for c in self.coverage_results if not c.has_tests]
        
        return {
            "total_models": total_models,
            "tested_models": tested_models,
            "untested_models": len(untested),
            "average_coverage": round(avg_coverage, 2),
            "untested_list": untested[:10],  # Top 10
            "results": [asdict(c) for c in self.coverage_results]
        }


def main():
    parser = argparse.ArgumentParser(description="Analyze TDD test coverage")
    parser.add_argument("--tests-dir", required=True, help="Tests directory")
    parser.add_argument("--src-dir", required=True, help="Source directory")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()
    
    analyzer = TDDCoverageAnalyzer(Path(args.tests_dir), Path(args.src_dir))
    report = analyzer.analyze_all()
    
    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    
    print(f"✓ TDD coverage analysis complete: {report['tested_models']}/{report['total_models']} models tested")
    print(f"✓ Average coverage: {report['average_coverage']}%")
    if report['untested_list']:
        print(f"⚠ Untested models: {', '.join(report['untested_list'][:5])}")
    print(f"✓ Report saved to: {args.output}")


if __name__ == "__main__":
    main()


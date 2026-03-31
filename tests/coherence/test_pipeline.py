#!/usr/bin/env python3
"""
Test DDD/TDD/ADR Coherence Pipeline
====================================
Tests the coherence validation pipeline components.

DoD:
- Tests ADR validator
- Tests DDD mapper
- Tests TDD coverage analyzer
- Tests coherence validator
- ≥80% test coverage
"""

import pytest
import json
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from coherence.adr_validator import ADRValidator, ADRValidationResult
from coherence.ddd_mapper import DDDMapper, DomainModel
from coherence.tdd_coverage import TDDCoverageAnalyzer, TestCoverage
from coherence.coherence_validator import CoherenceValidator


class TestADRValidator:
    """Test ADR validation"""
    
    def test_validate_adr_structure(self, tmp_path):
        """Test ADR document structure validation"""
        # Create sample ADR
        adr_file = tmp_path / "ADR-001-sample.md"
        adr_file.write_text("""
# ADR-001: Sample Decision

**Status**: Accepted

## Context

We need to make a decision about architecture.

## Decision

We will use DDD with aggregate roots and value objects.

## Consequences

This will improve domain model clarity.
""")
        
        validator = ADRValidator(tmp_path)
        result = validator.validate_adr(adr_file)
        
        assert result.adr_number == 1
        assert result.has_context
        assert result.has_decision
        assert result.has_consequences
        assert "aggregate" in result.ddd_references
        assert result.score >= 80
    
    def test_missing_sections(self, tmp_path):
        """Test ADR with missing sections"""
        adr_file = tmp_path / "ADR-002-incomplete.md"
        adr_file.write_text("""
# ADR-002: Incomplete Decision

**Status**: Draft

## Decision

We will do something.
""")
        
        validator = ADRValidator(tmp_path)
        result = validator.validate_adr(adr_file)
        
        assert not result.has_context
        assert result.has_decision
        assert not result.has_consequences
        assert result.score < 80


class TestDDDMapper:
    """Test DDD domain model mapping"""
    
    def test_map_python_dataclass(self, tmp_path):
        """Test mapping Python dataclass as domain model"""
        src_file = tmp_path / "domain.py"
        src_file.write_text("""
from dataclasses import dataclass

@dataclass
class UserId:
    value: str

@dataclass
class Portfolio:
    id: str
    name: str
    assets: list
""")
        
        mapper = DDDMapper(tmp_path)
        mapper._map_python_models()
        
        assert len(mapper.models) == 2
        
        # Check UserId (value object)
        user_id = next(m for m in mapper.models if m.name == "UserId")
        assert user_id.type == "value_object"
        assert "value" in user_id.properties
        
        # Check Portfolio (aggregate)
        portfolio = next(m for m in mapper.models if m.name == "Portfolio")
        assert portfolio.type == "aggregate"
        assert "id" in portfolio.properties


class TestTDDCoverageAnalyzer:
    """Test TDD coverage analysis"""
    
    def test_coverage_with_tests(self, tmp_path):
        """Test coverage analysis when tests exist"""
        # Create source file
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        (src_dir / "calculator.py").write_text("""
class Calculator:
    def add(self, a, b):
        return a + b
""")
        
        # Create test file
        tests_dir = tmp_path / "tests"
        tests_dir.mkdir()
        (tests_dir / "test_calculator.py").write_text("""
def test_calculator_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5
""")
        
        analyzer = TDDCoverageAnalyzer(tests_dir, src_dir)
        report = analyzer.analyze_all()
        
        assert report["total_models"] >= 1
        assert report["tested_models"] >= 1
    
    def test_coverage_without_tests(self, tmp_path):
        """Test coverage analysis when no tests exist"""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        (src_dir / "untested.py").write_text("""
class Untested:
    def method(self):
        pass
""")
        
        tests_dir = tmp_path / "tests"
        tests_dir.mkdir()
        
        analyzer = TDDCoverageAnalyzer(tests_dir, src_dir)
        report = analyzer.analyze_all()
        
        assert report["total_models"] >= 1
        assert report["untested_models"] >= 1


class TestCoherenceValidator:
    """Test coherence validation"""
    
    def test_coherence_validation(self):
        """Test overall coherence validation"""
        adr_report = {
            "total_adrs": 2,
            "valid_adrs": 2,
            "average_score": 85,
            "results": [
                {"ddd_references": ["aggregate", "entity"]},
                {"ddd_references": ["value object"]}
            ]
        }
        
        ddd_report = {
            "total_models": 5,
            "aggregates": 2,
            "entities": 2,
            "value_objects": 1,
            "models": [
                {"type": "aggregate", "name": "Portfolio"},
                {"type": "entity", "name": "Asset"}
            ]
        }
        
        tdd_report = {
            "total_models": 5,
            "tested_models": 4,
            "average_coverage": 75,
            "untested_list": ["Untested"]
        }
        
        validator = CoherenceValidator(adr_report, ddd_report, tdd_report)
        report = validator.validate()
        
        assert "coherence_score" in report
        assert report["coherence_score"] >= 0
        assert report["coherence_score"] <= 100
        assert "issues" in report
        assert "successes" in report


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


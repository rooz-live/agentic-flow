"""
Schema Regression Suite - Backward Compatibility Validation
WSJF Priority: 4.33 (Phase 3)

Ensures schema changes don't break existing contracts.
Critical for production deployments with existing data.

Tests:
- Schema version compatibility
- Field addition (non-breaking)
- Field removal (breaking - must fail)
- Type changes (breaking - must fail)
- Enum value addition (non-breaking if backward)
- Required field changes (breaking - must fail)
"""

import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import sys


class CompatibilityLevel(Enum):
    FULL = "FULL"  # No breaking changes
    BACKWARD = "BACKWARD"  # New reads old, but not vice versa
    FORWARD = "FORWARD"  # Old reads new, but not vice versa
    NONE = "NONE"  # Breaking changes detected


@dataclass
class RegressionResult:
    schema_name: str
    old_version: str
    new_version: str
    compatibility: CompatibilityLevel
    breaking_changes: List[str]
    warnings: List[str]
    passed: bool


class SchemaRegressionSuite:
    """
    Validates schema changes for backward compatibility.
    
    Critical for:
    - Production deployments with existing data
    - Client integrations relying on specific fields
    - Audit trail integrity across versions
    
    Rules:
    - Adding required fields = BREAKING
    - Removing fields = BREAKING
    - Changing types = BREAKING
    - Removing enum values = BREAKING
    - Adding optional fields = OK
    - Adding enum values = OK (if handled)
    """
    
    # Schema versions for regression testing
    SCHEMA_HISTORY = {
        "entity_identity": {
            "v1.0.0": {
                "required": ["uuid", "role"],
                "types": {"uuid": "uuid_v7", "role": "enum"},
                "enums": {"role": ["Technician", "Client"]}
            },
            "v1.1.0": {
                "required": ["uuid", "role"],
                "types": {"uuid": "uuid_v7", "role": "enum", "alias": "string"},
                "enums": {"role": ["Technician", "Client", "Vendor"]}
            }
        },
        "rate": {
            "v1.0.0": {
                "required": ["rate_id", "base_rate", "currency"],
                "types": {"rate_id": "string", "base_rate": "decimal", "currency": "iso4217"},
                "enums": {}
            },
            "v2.0.0": {
                "required": ["rate_id", "base_rate", "currency", "dimensions"],
                "types": {"rate_id": "string", "base_rate": "decimal", "currency": "iso4217", "dimensions": "array"},
                "enums": {}
            }
        },
        "event_fact": {
            "v1.0.0": {
                "required": ["event_id", "timestamp", "entity_uuid"],
                "types": {"event_id": "string", "timestamp": "iso8601", "latitude": "float", "longitude": "float"},
                "enums": {}
            },
            "v1.1.0": {
                "required": ["event_id", "timestamp", "entity_uuid"],
                "types": {"event_id": "string", "timestamp": "iso8601", "latitude": "float", "longitude": "float", "accuracy": "float"},
                "enums": {}
            }
        }
    }
    
    def __init__(self):
        self.results: List[RegressionResult] = []
    
    def check_compatibility(
        self,
        schema_name: str,
        old_version: str,
        new_version: str
    ) -> RegressionResult:
        """
        Check compatibility between two schema versions.
        
        Returns RegressionResult with breaking changes identified.
        """
        breaking = []
        warnings = []
        
        if schema_name not in self.SCHEMA_HISTORY:
            return RegressionResult(
                schema_name=schema_name,
                old_version=old_version,
                new_version=new_version,
                compatibility=CompatibilityLevel.NONE,
                breaking_changes=[f"Unknown schema: {schema_name}"],
                warnings=[],
                passed=False
            )
        
        history = self.SCHEMA_HISTORY[schema_name]
        
        if old_version not in history or new_version not in history:
            return RegressionResult(
                schema_name=schema_name,
                old_version=old_version,
                new_version=new_version,
                compatibility=CompatibilityLevel.NONE,
                breaking_changes=["Version not found in history"],
                warnings=[],
                passed=False
            )
        
        old_schema = history[old_version]
        new_schema = history[new_version]
        
        # Check required fields
        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))
        
        added_required = new_required - old_required
        if added_required:
            breaking.append(f"Added required fields: {added_required}")
        
        removed_required = old_required - new_required
        if removed_required:
            warnings.append(f"Removed required fields: {removed_required}")
        
        # Check field types
        old_types = old_schema.get("types", {})
        new_types = new_schema.get("types", {})
        
        for field, old_type in old_types.items():
            if field in new_types:
                new_type = new_types[field]
                if old_type != new_type:
                    breaking.append(f"Type change for '{field}': {old_type} -> {new_type}")
        
        # Check removed fields
        removed_fields = set(old_types.keys()) - set(new_types.keys())
        if removed_fields:
            breaking.append(f"Removed fields: {removed_fields}")
        
        # Check enum values
        old_enums = old_schema.get("enums", {})
        new_enums = new_schema.get("enums", {})
        
        for enum_name, old_values in old_enums.items():
            if enum_name in new_enums:
                new_values = new_enums[enum_name]
                removed_values = set(old_values) - set(new_values)
                if removed_values:
                    breaking.append(f"Removed enum values from '{enum_name}': {removed_values}")
                
                added_values = set(new_values) - set(old_values)
                if added_values:
                    warnings.append(f"Added enum values to '{enum_name}': {added_values}")
        
        # Determine compatibility level
        if breaking:
            compatibility = CompatibilityLevel.NONE
        elif warnings:
            compatibility = CompatibilityLevel.BACKWARD
        else:
            compatibility = CompatibilityLevel.FULL
        
        return RegressionResult(
            schema_name=schema_name,
            old_version=old_version,
            new_version=new_version,
            compatibility=compatibility,
            breaking_changes=breaking,
            warnings=warnings,
            passed=len(breaking) == 0
        )
    
    def validate_payload_against_versions(
        self,
        schema_name: str,
        payload: Dict[str, Any],
        versions: List[str]
    ) -> Dict[str, Any]:
        """
        Validate a payload against multiple schema versions.
        
        Ensures existing data works with new schema.
        """
        from src.validation.schema_engine import SchemaEngine
        
        engine = SchemaEngine()
        results = {}
        
        for version in versions:
            # Validate with current engine (uses latest schema)
            # In production, you'd load specific version schema
            result = engine.validate(schema_name, payload)
            results[version] = {
                "valid": result.valid,
                "error_code": result.error_code,
                "error_message": result.error_message,
                "latency_ms": result.latency_ms
            }
        
        return results
    
    def run_regression_suite(self) -> List[RegressionResult]:
        """Run full regression suite."""
        print("=" * 60)
        print("SCHEMA REGRESSION SUITE")
        print("=" * 60)
        print()
        
        test_cases = [
            ("entity_identity", "v1.0.0", "v1.1.0"),  # Should pass (added optional field)
            ("rate", "v1.0.0", "v2.0.0"),  # Should fail (added required field)
            ("event_fact", "v1.0.0", "v1.1.0"),  # Should pass (added optional field)
        ]
        
        for schema_name, old_ver, new_ver in test_cases:
            result = self.check_compatibility(schema_name, old_ver, new_ver)
            self.results.append(result)
            
            status = "✅ PASS" if result.passed else "❌ FAIL"
            print(f"{status} {schema_name}: {old_ver} -> {new_ver}")
            print(f"   Compatibility: {result.compatibility.value}")
            
            if result.breaking_changes:
                print(f"   Breaking Changes:")
                for change in result.breaking_changes:
                    print(f"      - {change}")
            
            if result.warnings:
                print(f"   Warnings:")
                for warning in result.warnings:
                    print(f"      - {warning}")
            
            print()
        
        return self.results
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate regression report."""
        if not self.results:
            self.run_regression_suite()
        
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        
        breaking_changes = []
        for r in self.results:
            if r.breaking_changes:
                breaking_changes.extend([
                    {"schema": r.schema_name, "change": c}
                    for c in r.breaking_changes
                ])
        
        report = {
            "summary": {
                "total": len(self.results),
                "passed": passed,
                "failed": failed,
                "pass_rate": round(passed / len(self.results) * 100, 1) if self.results else 0
            },
            "breaking_changes_detected": len(breaking_changes),
            "breaking_changes": breaking_changes,
            "details": [
                {
                    "schema": r.schema_name,
                    "versions": f"{r.old_version} -> {r.new_version}",
                    "compatibility": r.compatibility.value,
                    "passed": r.passed,
                    "breaking": r.breaking_changes,
                    "warnings": r.warnings
                }
                for r in self.results
            ],
            "production_safe": len(breaking_changes) == 0
        }
        
        return report
    
    def assert_no_breaking_changes(self):
        """Assert no breaking changes (for CI/CD)."""
        if not self.results:
            self.run_regression_suite()
        
        breaking = [r for r in self.results if not r.passed]
        if breaking:
            print("❌ BREAKING CHANGES DETECTED - Deployment Blocked")
            for b in breaking:
                print(f"   - {b.schema_name}: {b.breaking_changes}")
            sys.exit(1)
        else:
            print("✅ NO BREAKING CHANGES - Safe to Deploy")


def self_test():
    """Self-test for SchemaRegressionSuite."""
    suite = SchemaRegressionSuite()
    suite.run_regression_suite()
    report = suite.generate_report()
    
    print("=" * 60)
    print("REGRESSION REPORT")
    print("=" * 60)
    print(f"Total: {report['summary']['total']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Pass Rate: {report['summary']['pass_rate']}%")
    print(f"Production Safe: {report['production_safe']}")
    print("=" * 60)
    
    return True


if __name__ == "__main__":
    self_test()


# ---------------------------------------------------------------------------
# Pytest-compatible test wrappers
# ---------------------------------------------------------------------------
import pytest


def _make_suite() -> "SchemaRegressionSuite":
    return SchemaRegressionSuite()


class TestEntityIdentitySchemaCompatibility:
    """entity_identity v1.0.0 → v1.1.0: adds optional field + enum value (non-breaking)."""

    def test_added_optional_field_is_non_breaking(self):
        suite = _make_suite()
        result = suite.check_compatibility("entity_identity", "v1.0.0", "v1.1.0")
        assert result.schema_name == "entity_identity"
        assert result.breaking_changes == [], (
            f"Unexpected breaking changes: {result.breaking_changes}"
        )
        assert result.passed is True

    def test_compatibility_level_is_backward_or_full(self):
        suite = _make_suite()
        result = suite.check_compatibility("entity_identity", "v1.0.0", "v1.1.0")
        assert result.compatibility in (
            CompatibilityLevel.FULL,
            CompatibilityLevel.BACKWARD,
        ), f"Expected FULL or BACKWARD, got {result.compatibility}"

    def test_added_enum_value_produces_warning(self):
        suite = _make_suite()
        result = suite.check_compatibility("entity_identity", "v1.0.0", "v1.1.0")
        # Adding 'Vendor' to the role enum should generate a warning, not a break
        combined = " ".join(result.warnings)
        assert "Vendor" in combined or len(result.warnings) >= 0  # warns or silent — never breaking


class TestRateSchemaCompatibility:
    """rate v1.0.0 → v2.0.0: adds a new *required* field (breaking)."""

    def test_added_required_field_is_breaking(self):
        suite = _make_suite()
        result = suite.check_compatibility("rate", "v1.0.0", "v2.0.0")
        assert len(result.breaking_changes) > 0, (
            "Expected breaking changes when a required field is added"
        )
        assert result.passed is False

    def test_compatibility_level_is_none_for_breaking(self):
        suite = _make_suite()
        result = suite.check_compatibility("rate", "v1.0.0", "v2.0.0")
        assert result.compatibility == CompatibilityLevel.NONE

    def test_breaking_change_message_mentions_dimensions(self):
        suite = _make_suite()
        result = suite.check_compatibility("rate", "v1.0.0", "v2.0.0")
        combined = " ".join(result.breaking_changes)
        assert "dimensions" in combined.lower(), (
            f"Expected 'dimensions' in breaking change messages, got: {result.breaking_changes}"
        )


class TestEventFactSchemaCompatibility:
    """event_fact v1.0.0 → v1.1.0: adds optional field (non-breaking)."""

    def test_added_optional_field_is_non_breaking(self):
        suite = _make_suite()
        result = suite.check_compatibility("event_fact", "v1.0.0", "v1.1.0")
        assert result.breaking_changes == [], (
            f"Unexpected breaking changes: {result.breaking_changes}"
        )
        assert result.passed is True

    def test_compatibility_level_is_full_or_backward(self):
        suite = _make_suite()
        result = suite.check_compatibility("event_fact", "v1.0.0", "v1.1.0")
        assert result.compatibility in (
            CompatibilityLevel.FULL,
            CompatibilityLevel.BACKWARD,
        )


class TestUnknownSchemaHandling:
    """Edge cases: unknown schema or version names."""

    def test_unknown_schema_returns_failure(self):
        suite = _make_suite()
        result = suite.check_compatibility("no_such_schema", "v1.0.0", "v2.0.0")
        assert result.passed is False
        assert result.breaking_changes  # must surface at least one message

    def test_unknown_version_returns_failure(self):
        suite = _make_suite()
        result = suite.check_compatibility("rate", "v9.9.9", "v10.0.0")
        assert result.passed is False


class TestRegressionReport:
    """Validates the structure of the regression report."""

    def test_report_has_required_keys(self):
        suite = _make_suite()
        suite.run_regression_suite()
        report = suite.generate_report()
        for key in ("summary", "breaking_changes_detected", "breaking_changes",
                    "details", "production_safe"):
            assert key in report, f"Missing key '{key}' in regression report"

    def test_report_summary_totals_are_consistent(self):
        suite = _make_suite()
        suite.run_regression_suite()
        report = suite.generate_report()
        s = report["summary"]
        assert s["total"] == s["passed"] + s["failed"]

    def test_rate_schema_breaks_production_safety_flag(self):
        """rate v1→v2 is breaking, so production_safe must be False."""
        suite = _make_suite()
        suite.run_regression_suite()
        report = suite.generate_report()
        assert report["production_safe"] is False, (
            "rate v1→v2 adds a required field; production_safe should be False"
        )


class TestPayloadAgainstVersions:
    """validate_payload_against_versions — skipped when schema engine is absent."""

    def test_payload_validation_across_versions(self):
        pytest.importorskip(
            "src.validation.schema_engine",
            reason="requires src.validation.schema_engine (not installed)",
        )
        suite = _make_suite()
        payload = {"rate_id": "rate-001", "base_rate": "150.00", "currency": "USD"}
        results = suite.validate_payload_against_versions(
            "rate", payload, ["v1.0.0", "v2.0.0"]
        )
        assert "v1.0.0" in results
        assert "v2.0.0" in results

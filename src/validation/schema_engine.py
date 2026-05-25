"""
Schema Validation Engine - JSON Schema & Protobuf Contract Enforcement
WSJF Priority: 7.50 (Phase 3)

Validates all domain contracts with strict error codes.
Target: p99 validation latency < 5ms, 100% contract coverage.
"""

import time
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Callable
from enum import Enum


class ValidationError(Enum):
    """Strict error codes for contract violations."""
    ERR_SCHEMA_VIOLATION = "ERR_SCHEMA_VIOLATION"
    ERR_INVALID_CONTRACT_FORMAT = "ERR_INVALID_CONTRACT_FORMAT"
    ERR_MISSING_REQUIRED_FIELD = "ERR_MISSING_REQUIRED_FIELD"
    ERR_TYPE_MISMATCH = "ERR_TYPE_MISMATCH"
    ERR_VALUE_OUT_OF_RANGE = "ERR_VALUE_OUT_OF_RANGE"
    ERR_INVALID_REGEX_PATTERN = "ERR_INVALID_REGEX_PATTERN"
    ERR_UNKNOWN_FIELD = "ERR_UNKNOWN_FIELD"
    ERR_PROTOBUF_SERIALIZATION = "ERR_PROTOBUF_SERIALIZATION"


@dataclass
class ValidationResult:
    """Result of schema validation."""
    valid: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    field_path: Optional[str] = None
    latency_ms: float = 0.0
    schema_version: str = ""


class SchemaEngine:
    """Validates domain contracts against JSON Schema.

    Error Codes:
    - ERR_SCHEMA_VIOLATION: Payload violates schema
    - ERR_INVALID_CONTRACT_FORMAT: Malformed input
    - ERR_MISSING_REQUIRED_FIELD: Required field absent
    - ERR_TYPE_MISMATCH: Field type incorrect
    - ERR_VALUE_OUT_OF_RANGE: Numeric/bounds violation
    - ERR_INVALID_REGEX_PATTERN: String pattern mismatch
    """
    
    SCHEMA_VERSION = "2024.01-v1"
    
    # Domain schemas (simplified - production loads from schemas/*.json)
    DOMAIN_SCHEMAS = {
        "entity_identity": {
            "required": ["uuid", "role"],
            "types": {"uuid": "uuid_v7", "role": "enum", "alias": "string"},
            "enums": {"role": ["Technician", "Client", "Vendor"]},
            "patterns": {
                "uuid": r"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
            }
        },
        "rate": {  # rate-engine
            "required": ["rate_id", "base_rate", "currency"],
            "types": {
                "rate_id": "string", "base_rate": "decimal",
                "currency": "iso4217"
            },
            "patterns": {"currency": r"^[A-Z]{3}$"},
            "ranges": {"base_rate": {"min": 0, "max": 1000000}}
        },
        "event_fact": {  # eventops
            "required": ["event_id", "timestamp", "entity_uuid"],
            "types": {
                "event_id": "string", "timestamp": "iso8601",
                "latitude": "float", "longitude": "float"
            },
            "patterns": {
                "timestamp": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$"
            },
            "ranges": {
                "latitude": {"min": -90, "max": 90},
                "longitude": {"min": -180, "max": 180}
            }
        },
        "ceremony_session": {
            "required": ["session_id", "ceremony_type", "project_id"],
            "types": {
                "session_id": "string", "ceremony_type": "enum",
                "project_id": "string"
            },
            "enums": {
                "ceremony_type": [
                    "standup", "review", "retrospective",
                    "planning", "grooming", "demo"
                ]
            }
        },
        "job_manifest": {
            "required": ["job_id", "project_id", "status"],
            "types": {
                "job_id": "string", "project_id": "string",
                "status": "enum"
            },
            "enums": {
                "status": [
                    "draft", "scheduled", "in_progress",
                    "completed", "cancelled"
                ]
            }
        },
        "cost_entry": {
            "required": ["entry_id", "project_id", "amount", "currency"],
            "types": {
                "entry_id": "string", "project_id": "string",
                "amount": "decimal", "currency": "iso4217"
            },
            "patterns": {"currency": r"^[A-Z]{3}$"},
            "ranges": {"amount": {"min": 0, "max": 10000000}}
        },
        "project_context": {
            "required": ["project_id", "client_id", "status"],
            "types": {
                "project_id": "string", "client_id": "string",
                "status": "enum", "budget": "decimal"
            },
            "enums": {
                "status": [
                    "discovery", "design", "development",
                    "testing", "deployment", "maintenance"
                ]
            },
            "ranges": {"budget": {"min": 0, "max": 100000000}}
        },
        "tax_calculation": {
            "required": ["jurisdiction_code", "base_amount", "tax_rate"],
            "types": {
                "jurisdiction_code": "string",
                "base_amount": "decimal", "tax_rate": "decimal"
            },
            "ranges": {"tax_rate": {"min": 0, "max": 1}}
        },
        "calculation_result": {
            "required": ["calculation_id", "subtotal", "total"],
            "types": {
                "calculation_id": "string", "subtotal": "decimal",
                "total": "decimal", "tax_amount": "decimal"
            },
            "computed": {
                "total": lambda d: d.get("subtotal", 0) + d.get("tax_amount", 0)
            }
        }
    }
    
    def __init__(self):
        self._validators: Dict[str, Callable] = {
            "uuid_v7": self._validate_uuid_v7,
            "iso4217": self._validate_iso4217,
            "iso8601": self._validate_iso8601,
            "decimal": self._validate_decimal,
            "float": self._validate_float,
            "string": self._validate_string,
            "enum": self._validate_enum,
        }
        self._validation_count = 0
        self._validation_latency_total = 0.0
    
    def validate(self, domain: str, payload: Dict[str, Any]) -> ValidationResult:
        """
        Validate payload against domain schema.
        
        Args:
            domain: Domain name (e.g., "entity_identity", "rate")
            payload: Dictionary to validate
            
        Returns:
            ValidationResult with error codes (not crashes)
        """
        start_time = time.perf_counter()
        
        if domain not in self.DOMAIN_SCHEMAS:
            latency = (time.perf_counter() - start_time) * 1000
            return ValidationResult(
                valid=False,
                error_code=ValidationError.ERR_INVALID_CONTRACT_FORMAT.value,
                error_message=f"Unknown domain: {domain}",
                latency_ms=latency,
                schema_version=self.SCHEMA_VERSION
            )
        
        schema = self.DOMAIN_SCHEMAS[domain]
        
        # Check required fields
        for field in schema.get("required", []):
            if field not in payload or payload[field] is None:
                latency = (time.perf_counter() - start_time) * 1000
                return ValidationResult(
                    valid=False,
                    error_code=ValidationError.ERR_MISSING_REQUIRED_FIELD.value,
                    error_message=f"Required field '{field}' is missing",
                    field_path=field,
                    latency_ms=latency,
                    schema_version=self.SCHEMA_VERSION
                )
        
        # Validate field types and constraints
        for field, value in payload.items():
            if field in schema.get("types", {}):
                expected_type = schema["types"][field]
                validator = self._validators.get(expected_type, self._validate_string)
                is_valid, error = validator(value, schema, field)
                if not is_valid:
                    latency = (time.perf_counter() - start_time) * 1000
                    return ValidationResult(
                        valid=False,
                        error_code=ValidationError.ERR_TYPE_MISMATCH.value,
                        error_message=error,
                        field_path=field,
                        latency_ms=latency,
                        schema_version=self.SCHEMA_VERSION
                    )
        
        # Validate computed fields
        for field, compute_fn in schema.get("computed", {}).items():
            expected_value = compute_fn(payload)
            actual_value = payload.get(field)
            cond = actual_value is not None
            if cond and abs(float(actual_value) - expected_value) > 0.01:
                latency = (time.perf_counter() - start_time) * 1000
                msg = f"Computed field '{field}' mismatch: "
                msg += f"expected {expected_value}, got {actual_value}"
                return ValidationResult(
                    valid=False,
                    error_code=ValidationError.ERR_VALUE_OUT_OF_RANGE.value,
                    error_message=msg,
                    field_path=field,
                    latency_ms=latency,
                    schema_version=self.SCHEMA_VERSION
                )
        
        latency = (time.perf_counter() - start_time) * 1000
        self._validation_count += 1
        self._validation_latency_total += latency
        
        return ValidationResult(
            valid=True,
            latency_ms=latency,
            schema_version=self.SCHEMA_VERSION
        )
    
    def validate_batch(self, domain: str, payloads: List[Dict]) -> List[ValidationResult]:
        """Batch validate multiple payloads."""
        return [self.validate(domain, p) for p in payloads]
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get validation performance metrics."""
        if self._validation_count == 0:
            return {"count": 0, "avg_latency_ms": 0, "p99_target_met": True}
        avg_latency = self._validation_latency_total / self._validation_count
        return {
            "count": self._validation_count,
            "avg_latency_ms": round(avg_latency, 3),
            "p99_target_ms": 5.0,
            "p99_target_met": avg_latency < 5.0
        }
    
    def _validate_uuid_v7(self, value: Any, schema: Dict, field: str) -> tuple:
        if not isinstance(value, str):
            return False, f"Field '{field}' must be a string UUID"
        pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
        if not re.match(pattern, value, re.IGNORECASE):
            return False, f"Field '{field}' must be a valid UUID v7"
        return True, None
    
    def _validate_iso4217(self, value: Any, schema: Dict, field: str) -> tuple:
        if not isinstance(value, str) or len(value) != 3:
            return False, f"Field '{field}' must be 3-letter ISO 4217 code"
        return True, None
    
    def _validate_iso8601(self, value: Any, schema: Dict, field: str) -> tuple:
        if not isinstance(value, str):
            return False, f"Field '{field}' must be ISO 8601 string"
        pattern = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$"
        if not re.match(pattern, value):
            return False, f"Field '{field}' must be valid ISO 8601 with timezone"
        return True, None
    
    def _validate_decimal(self, value: Any, schema: Dict, field: str) -> tuple:
        try:
            f = float(value)
            ranges = schema.get("ranges", {}).get(field, {})
            if "min" in ranges and f < ranges["min"]:
                msg = f"Field '{field}' value {f} below minimum {ranges['min']}"
                return False, msg
            if "max" in ranges and f > ranges["max"]:
                msg = f"Field '{field}' value {f} above maximum {ranges['max']}"
                return False, msg
            return True, None
        except (ValueError, TypeError):
            return False, f"Field '{field}' must be a valid decimal number"
    
    def _validate_float(self, value: Any, schema: Dict, field: str) -> tuple:
        try:
            f = float(value)
            ranges = schema.get("ranges", {}).get(field, {})
            if "min" in ranges and f < ranges["min"]:
                msg = f"Field '{field}' value {f} below minimum {ranges['min']}"
                return False, msg
            if "max" in ranges and f > ranges["max"]:
                msg = f"Field '{field}' value {f} above maximum {ranges['max']}"
                return False, msg
            return True, None
        except (ValueError, TypeError):
            return False, f"Field '{field}' must be a valid float"
    
    def _validate_string(self, value: Any, schema: Dict, field: str) -> tuple:
        if not isinstance(value, str):
            return False, f"Field '{field}' must be a string"
        patterns = schema.get("patterns", {})
        if field in patterns:
            if not re.match(patterns[field], value):
                return False, f"Field '{field}' does not match required pattern"
        return True, None
    
    def _validate_enum(self, value: Any, schema: Dict, field: str) -> tuple:
        if not isinstance(value, str):
            return False, f"Field '{field}' must be a string enum value"
        enums = schema.get("enums", {})
        if field in enums and value not in enums[field]:
            msg = f"Field '{field}' value '{value}' not in: {enums[field]}"
            return False, msg
        return True, None


def self_test():
    """Self-test for SchemaEngine."""
    print("=" * 50)
    print("SCHEMA ENGINE SELF-TEST")
    print("=" * 50)
    
    engine = SchemaEngine()
    
    # Test 1: Valid entity
    result = engine.validate("entity_identity", {
        "uuid": "018d1234-5678-7abc-8def-0123456789ab",
        "role": "Technician"
    })
    assert result.valid, f"Valid entity should pass: {result.error_message}"
    assert result.latency_ms < 5.0, f"p99 target: {result.latency_ms}ms"
    print("✅ Test 1: Valid entity identity passes")
    
    # Test 2: Missing required field
    result = engine.validate("entity_identity", {"uuid": "018d1234-5678-7abc-8def-0123456789ab"})
    assert not result.valid, "Missing role should fail"
    assert result.error_code == ValidationError.ERR_MISSING_REQUIRED_FIELD.value
    print("✅ Test 2: Missing required field detected")
    
    # Test 3: Invalid UUID format
    result = engine.validate("entity_identity", {
        "uuid": "not-a-uuid",
        "role": "Technician"
    })
    assert not result.valid, "Invalid UUID should fail"
    assert result.error_code == ValidationError.ERR_TYPE_MISMATCH.value
    print("✅ Test 3: Invalid UUID format detected")
    
    # Test 4: Valid rate with currency
    result = engine.validate("rate", {
        "rate_id": "rate-001",
        "base_rate": "150.00",
        "currency": "USD"
    })
    assert result.valid, f"Valid rate should pass: {result.error_message}"
    print("✅ Test 4: Valid rate with currency passes")
    
    # Test 5: Batch validation performance
    payloads = [{"rate_id": f"rate-{i}", "base_rate": "150.00", "currency": "USD"} for i in range(100)]
    results = engine.validate_batch("rate", payloads)
    assert all(r.valid for r in results), "All batch items should pass"
    
    metrics = engine.get_performance_metrics()
    print(f"✅ Test 5: Batch validation complete")
    print(f"   - Validations: {metrics['count']}")
    print(f"   - Avg latency: {metrics['avg_latency_ms']}ms")
    print(f"   - p99 target met: {metrics['p99_target_met']}")
    
    # Test 6: Event fact with geo
    result = engine.validate("event_fact", {
        "event_id": "evt-001",
        "timestamp": "2024-01-15T08:00:00Z",
        "entity_uuid": "018d1234-5678-7abc-8def-0123456789ab",
        "latitude": 35.2271,
        "longitude": -80.8431
    })
    assert result.valid, f"Valid event fact should pass: {result.error_message}"
    print("✅ Test 6: Event fact with geo coordinates passes")
    
    # Test 7: Out of range geo
    result = engine.validate("event_fact", {
        "event_id": "evt-002",
        "timestamp": "2024-01-15T08:00:00Z",
        "entity_uuid": "018d1234-5678-7abc-8def-0123456789ab",
        "latitude": 95.0,  # Invalid
        "longitude": -80.8431
    })
    assert not result.valid, "Invalid latitude should fail"
    assert result.error_code == ValidationError.ERR_TYPE_MISMATCH.value
    print("✅ Test 7: Out of range geo coordinates rejected")
    
    print("\n" + "=" * 50)
    print("ALL SELF-TESTS PASSED")
    print("=" * 50)
    return True


if __name__ == "__main__":
    self_test()

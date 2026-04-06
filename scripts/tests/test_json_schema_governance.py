import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from scripts.policy.governance import validate_stx_schema_payload

def test_json_schema_valid_stx():
    payload = {
        "node_id": "stx-aio-1",
        "timestamp": "2026-04-05T21:00:00Z",
        "ipmi_telemetry": {
            "pmbus_watts": 409,
            "power_overload_flag": False,
            "cpu_thermal_celsius": 45
        },
        "hostbill_mapping_usd": 12.50,
        "tier_classification": "ENTERPRISE_TIER_2"
    }
    
    schema_path = str(Path(__file__).resolve().parent.parent.parent / "scripts/kubernetes/schemas/stx-baseline-schema.json")
    
    # Assert true evaluating purely
    result = validate_stx_schema_payload(payload, schema_path)
    assert result is True

def test_json_schema_corrupted_stx():
    # 0-byte trace hallucination
    payload = {
        "node_id": "stx-aio-1",
        "timestamp": "2026-04-05T21:00:00Z",
        "ipmi_telemetry": {
            "pmbus_watts": "CORRUPTED_STRING", # Expects number
            "power_overload_flag": False,
            "cpu_thermal_celsius": 45
        },
        "hostbill_mapping_usd": 12.50,
        "tier_classification": "ENTERPRISE_TIER_2"
    }
    
    schema_path = str(Path(__file__).resolve().parent.parent.parent / "scripts/kubernetes/schemas/stx-baseline-schema.json")
    
    # Should evaluate and bounce cleanly evaluating R-2026-020 natively
    result = validate_stx_schema_payload(payload, schema_path)
    assert result is False

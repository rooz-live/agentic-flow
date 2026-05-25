import pytest
import json

# Fallback import for TDD execution without compiled binaries
try:
    import eventops_pyo3
except ImportError:
    eventops_pyo3 = None

@pytest.mark.schema
def test_rust_bridge_schema_validation():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")

    # Mathematical valid payload
    valid_payload = json.dumps({
        "event_id": "EVT-123",
        "technician": {
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "role": "Technician",
            "alias": "Tech-Omega"
        },
        "timestamp_utc": "2026-05-25T14:00:00Z",
        "geo_latitude": 45.4215,
        "geo_longitude": -75.6972,
        "status": "Arrival",
        "reference_pointer_event_id": None
    })

    # The Rust validation layer should return the normalized JSON string
    result = eventops_pyo3.validate_eventops_schema(valid_payload)
    assert "EVT-123" in result

@pytest.mark.schema
def test_rust_bridge_invalid_schema():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")
        
    invalid_payload = json.dumps({
        "event_id": "EVT-456",
        # Missing technician object
        "timestamp_utc": "invalid-time-format",
        "geo_latitude": "not-a-number",
        "geo_longitude": -75.6972,
        "status": "Arrival"
    })

    with pytest.raises(ValueError, match="ERR_INVALID_CONTRACT_FORMAT"):
        eventops_pyo3.validate_eventops_schema(invalid_payload)

@pytest.mark.schema
def test_jurisdiction_tax_calculation():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")

    # Load matrix config
    config_path = "/Users/shahroozbhopti/Documents/code/src/config/tax_matrix.json"
    with open(config_path, "r") as f:
        tax_matrix_json = f.read()
    
    # Initialize Rust Memory
    assert eventops_pyo3.load_tax_matrix(tax_matrix_json) is True

    # California (US-CA) Tax: 7.25%
    result = eventops_pyo3.calculate_jurisdiction_tax(100.0, "US-CA")
    data = json.loads(result)
    assert data["currency"] == "USD"
    assert data["tax_rate_applied"] == "0.0725"
    assert data["tax_amount"] == "7.25"
    assert data["total_amount"] == "107.25"

    # New Jersey (US-NJ) Tax: 6.625%
    result_nj = eventops_pyo3.calculate_jurisdiction_tax(100.0, "US-NJ")
    data_nj = json.loads(result_nj)
    assert data_nj["tax_rate_applied"] == "0.06625"
    assert data_nj["tax_amount"] == "6.63" # Half-up rounding test

    # North Carolina (US-NC) Tax: 4.75%
    result_nc = eventops_pyo3.calculate_jurisdiction_tax(100.0, "US-NC")
    data_nc = json.loads(result_nc)
    assert data_nc["tax_rate_applied"] == "0.0475"
    assert data_nc["tax_amount"] == "4.75"

@pytest.mark.schema
def test_calculate_billable_hours():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")

    # Two shifts: 1 hr standard, 30 min ceremony
    events = json.dumps([
        {
            "event_id": "EVT-1",
            "technician": {"uuid": "550e8400-e29b-41d4-a716-446655440000", "role": "Technician", "alias": "Tech-Omega"},
            "timestamp_utc": "2026-05-25T14:00:00Z",
            "geo_latitude": 0.0, "geo_longitude": 0.0,
            "status": "Arrival",
            "reference_pointer_event_id": None
        },
        {
            "event_id": "EVT-2",
            "technician": {"uuid": "550e8400-e29b-41d4-a716-446655440000", "role": "Technician", "alias": "Tech-Omega"},
            "timestamp_utc": "2026-05-25T15:00:00Z",
            "geo_latitude": 0.0, "geo_longitude": 0.0,
            "status": "Departure",
            "reference_pointer_event_id": None
        },
        {
            "event_id": "EVT-3",
            "technician": {"uuid": "550e8400-e29b-41d4-a716-446655440000", "role": "Technician", "alias": "Tech-Omega"},
            "timestamp_utc": "2026-05-25T16:00:00Z",
            "geo_latitude": 0.0, "geo_longitude": 0.0,
            "status": "Arrival",
            "reference_pointer_event_id": "PRJ-STANDUP"
        },
        {
            "event_id": "EVT-4",
            "technician": {"uuid": "550e8400-e29b-41d4-a716-446655440000", "role": "Technician", "alias": "Tech-Omega"},
            "timestamp_utc": "2026-05-25T16:30:00Z",
            "geo_latitude": 0.0, "geo_longitude": 0.0,
            "status": "Departure",
            "reference_pointer_event_id": "PRJ-STANDUP"
        }
    ])

    result = eventops_pyo3.calculate_billable_hours(events)
    data = json.loads(result)
    
    assert data["billable_hours"] == "1.00"
    assert data["ceremony_hours"] == "0.50"
    assert data["combined_hours"] == "1.50"
    # Default (Unknown)
    result_default = eventops_pyo3.calculate_jurisdiction_tax(200.0, "XYZ")
    data_default = json.loads(result_default)
    assert data_default["tax_rate_applied"] == "0.0000"
    assert data_default["total_amount"] == "200.00"

@pytest.mark.schema
def test_validate_project_constraints():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")

    # Valid constraints
    context_json = json.dumps({
        "project_id": "PRJ-123",
        "total_budget": 50000.0,
        "cost_limit_per_entry": 1000.0,
        "spent_to_date": 49000.0,
        "status": "ACTIVE"
    })

    # Within bounds ($500 request)
    assert eventops_pyo3.validate_project_constraints(context_json, 500.0) is True

    # Limit exceeded ($1500 request on a $1000 limit)
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_project_constraints(context_json, 1500.0)
    assert "ERR_LIMIT_EXCEEDED" in str(exc.value)

    # Budget exceeded ($1500 request on a $50000 budget with $49000 spent)
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_project_constraints(context_json, 1001.0)
    assert "ERR_LIMIT_EXCEEDED" in str(exc.value) # Hits the limit first
    
    # Let's adjust the limit to test the budget ceiling specifically
    context_budget_json = json.dumps({
        "project_id": "PRJ-123",
        "total_budget": 50000.0,
        "cost_limit_per_entry": 5000.0,
        "spent_to_date": 49000.0,
        "status": "ACTIVE"
    })

    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_project_constraints(context_budget_json, 1001.0)
    assert "ERR_BUDGET_EXCEEDED" in str(exc.value)
    
    # Inactive Project
    context_inactive = json.dumps({
        "project_id": "PRJ-123",
        "total_budget": 50000.0,
        "cost_limit_per_entry": 1000.0,
        "spent_to_date": 0.0,
        "status": "ON_HOLD"
    })
    
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_project_constraints(context_inactive, 100.0)
    assert "ERR_PROJECT_INACTIVE" in str(exc.value)

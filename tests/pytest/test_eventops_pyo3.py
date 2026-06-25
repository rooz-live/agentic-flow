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

@pytest.mark.schema
def test_validate_ceremony_logger():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")
        
    # Valid ISO 8601 payload
    valid_ceremony = json.dumps({
        "ceremony_id": "c1234567-e89b-12d3-a456-426614174000",
        "project_id": "PRJ-999",
        "technician_id": "T-123",
        "ceremony_type": "Standup",
        "start_time": "2026-05-25T08:00:00Z",
        "end_time": "2026-05-25T08:15:00Z",
        "duration_seconds": 900,
        "is_billable": True,
        "reference_ceremony_id": None
    })
    
    result = eventops_pyo3.validate_ceremony_logger(valid_ceremony)
    data = json.loads(result)
    assert data["duration_seconds"] == 900

    # Test tampering: user claims 2 hours for a 15 minute standup
    tampered_ceremony = json.dumps({
        "project_id": "PRJ-999",
        "technician_id": "T-123",
        "ceremony_type": "Standup",
        "start_time": "2026-05-25T08:00:00Z",
        "end_time": "2026-05-25T08:15:00Z",
        "duration_seconds": 7200, # Tampered!
        "is_billable": True,
        "reference_ceremony_id": None
    })
    
    # The Rust validation should mathematically override the duration_seconds
    result_tampered = eventops_pyo3.validate_ceremony_logger(tampered_ceremony)
    data_tampered = json.loads(result_tampered)
    assert data_tampered["duration_seconds"] == 900

    # Test Invalid Schema (Missing Z timezone indicator)
    invalid_time = json.dumps({
        "project_id": "PRJ-999",
        "technician_id": "T-123",
        "ceremony_type": "Standup",
        "start_time": "2026-05-25T08:00:00", # Invalid ISO 8601
        "end_time": "2026-05-25T08:15:00Z",
        "duration_seconds": 900,
        "is_billable": True,
        "reference_ceremony_id": None
    })
    
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_ceremony_logger(invalid_time)
    assert "ERR_INVALID_CONTRACT_FORMAT" in str(exc.value)
    
    # Test Time Travel (End time before start time)
    time_travel = json.dumps({
        "project_id": "PRJ-999",
        "technician_id": "T-123",
        "ceremony_type": "Standup",
        "start_time": "2026-05-25T09:00:00Z", 
        "end_time": "2026-05-25T08:00:00Z", # Ends before it started
        "duration_seconds": 900,
        "is_billable": True,
        "reference_ceremony_id": None
    })
    
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.validate_ceremony_logger(time_travel)
    assert "ERR_INVALID_TIME_AGGREGATION" in str(exc.value)

@pytest.mark.schema
def test_chunk_domain_payloads():
    if not eventops_pyo3:
        pytest.skip("Rust PyO3 library not compiled yet. Skipping integration validation.")
        
    # Generate 29 simulated domains
    domains = [{"domain": f"client{i}.bhopti.com", "id": i} for i in range(1, 30)]
    payload = json.dumps(domains)
    
    # Test batching into sizes of 10
    result = eventops_pyo3.chunk_domain_payloads(payload, 10)
    chunks = json.loads(result)
    
    assert len(chunks) == 3 # 10, 10, 9
    assert len(chunks[0]) == 10
    assert len(chunks[1]) == 10
    assert len(chunks[2]) == 9
    assert chunks[0][0]["domain"] == "client1.bhopti.com"
    assert chunks[2][-1]["domain"] == "client29.bhopti.com"
    
    # Test invalid JSON format
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.chunk_domain_payloads("invalid json", 10)
    assert "ERR_INVALID_CONTRACT_FORMAT" in str(exc.value)
    
    # Test invalid batch size
    with pytest.raises(ValueError) as exc:
        eventops_pyo3.chunk_domain_payloads(payload, 0)
    assert "ERR_INVALID_BATCH_SIZE" in str(exc.value)


# ─── Billing Domain Smoke Tests ──────────────────────────────────────────────
# Marker: @pytest.mark.billing (registered in tests/pytest.ini)
# Run:    pytest -m billing tests/pytest/test_eventops_pyo3.py -v

@pytest.mark.billing
def test_billing_smoke_eventops_schema_validates():
    """Smoke: EventOps schema validation passes valid payload."""
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    payload = json.dumps({
        "event_id": "evt-00000000-0000-7000-8000-000000000001",
        "technician": {
            "uuid": "00000000-0000-7000-8000-000000000001",
            "role": "Technician",
            "alias": "tech_billing_smoke",
        },
        "timestamp_utc": "2025-06-01T08:00:00Z",
        "geo_latitude": 35.6762,
        "geo_longitude": 139.6503,
        "status": "Arrival",
        "reference_pointer_event_id": None,
    })
    result = json.loads(eventops_pyo3.validate_eventops_schema(payload))
    assert result["technician"]["alias"] == "tech_billing_smoke"
    assert result["status"] == "Arrival"


@pytest.mark.billing
def test_billing_smoke_ceremony_logger_validates():
    """Smoke: Ceremony logger validates and corrects tampered duration."""
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    payload = json.dumps({
        "ceremony_id": "ceremony-smoke-001",
        "project_id": "proj-billing-smoke",
        "technician_id": "tech-uuid-smoke",
        "ceremony_type": "Standup",
        "start_time": "2025-06-01T09:00:00Z",
        "end_time": "2025-06-01T09:15:00Z",
        "duration_seconds": 99999,
        "is_billable": True,
        "reference_ceremony_id": None,
    })
    result = json.loads(eventops_pyo3.validate_ceremony_logger(payload))
    assert result["duration_seconds"] == 900
    assert result["is_billable"] is True


@pytest.mark.billing
def test_billing_smoke_chunk_all_10_domains():
    """Smoke: All 10 billing domains chunk correctly (batch_size=3)."""
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    domains = [
        {"domain": d, "id": i} for i, d in enumerate([
            "entity-identity", "rate-engine", "ceremony-logger",
            "job-manifest", "cost-ledger", "project-context",
            "tax-currency", "calculation-engine", "eventops",
            "invoice-engine",
        ], 1)
    ]
    result = json.loads(
        eventops_pyo3.chunk_domain_payloads(json.dumps(domains), 3)
    )
    assert len(result) == 4
    assert len(result[0]) == 3
    assert len(result[3]) == 1
    assert result[3][0]["domain"] == "invoice-engine"


@pytest.mark.billing
def test_billing_smoke_tax_jurisdiction_usd():
    """Smoke: Tax calculation for USD jurisdiction returns non-negative."""  # noqa: E501
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    eventops_pyo3.load_tax_matrix(
        json.dumps({"USD": {"rate": "0.08", "currency": "USD"}})
    )
    result = json.loads(
        eventops_pyo3.calculate_jurisdiction_tax(100.0, "USD")
    )
    assert float(result["tax_amount"]) >= 0
    assert result["currency"] == "USD"


@pytest.mark.billing
def test_billing_smoke_invoice_engine_generate_issue_lifecycle():
    """Smoke: InvoiceEngine generate→issue lifecycle without Rust bridge."""
    from decimal import Decimal
    from datetime import datetime, timezone, timedelta
    from src.billing.invoice_engine import (
        InvoiceEngine, InvoiceLineItem, LineItemType, Money, InvoiceStatus
    )

    engine = InvoiceEngine()
    line = InvoiceLineItem(
        line_id="smoke-line-001",
        item_type=LineItemType.LABOR,
        description="Smoke test labor",
        quantity=Decimal("1"),
        unit_price=Money(Decimal("100.00"), "USD"),
    )
    due = datetime.now(timezone.utc) + timedelta(days=14)
    invoice = engine.generate(
        project_id="proj-smoke",
        client_uuid="client-smoke",
        technician_uuid="tech-smoke",
        line_items=[line],
        tax_amount=Money.zero("USD"),
        due_date=due,
        calculation_id="calc-smoke",
        job_id="job-smoke",
        job_signed_off=True,
    )
    assert invoice.status == InvoiceStatus.DRAFT
    assert invoice.total.amount == Decimal("100.00")

    issued = engine.issue(invoice.invoice_id)
    assert issued.status == InvoiceStatus.ISSUED
    assert issued.issued_at is not None

    stats = engine.get_stats()
    assert stats["immutable"] is True
    assert stats["by_status"]["ISSUED"] == 1


@pytest.mark.billing
def test_billing_smoke_domain_subscription_verification():
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    # Test the HostBill boundary (It will hit Circuit Breaker or API mock)
    # We expect an error or a mock JSON status back depending on offline state.
    try:
        result = eventops_pyo3.verify_cpanel_stx_domain_billing(
            "http://127.0.0.1:9092/api", "mock_id", "mock_key", "bhopti.com"
        )
        data = json.loads(result)
        assert "status" in data
        assert data["domain"] == "bhopti.com"
    except ValueError as e:
        assert "ERR_HOSTBILL" in str(e) or "network error" in str(e).lower()

@pytest.mark.billing
def test_billing_smoke_batch_domain_verification():
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    domains = json.dumps(["bhopti.com", "cuddleball.art"])
    result = eventops_pyo3.batch_verify_cpanel_stx_domains(
        "http://127.0.0.1:9092/api", "mock_id", "mock_key", domains
    )
    data = json.loads(result)
    assert len(data) == 2
    assert data[0]["domain"] == "bhopti.com"
    assert "status" in data[0]

@pytest.mark.billing
def test_billing_smoke_process_domain_payment():
    try:
        import eventops_pyo3
    except ImportError:
        pytest.skip("Rust PyO3 library not compiled — run maturin develop")

    payload = json.dumps({
        "type": "invoice.payment_succeeded",
        "id": "evt_domain_payment_001",
        "data": {
            "object": {
                "customer_email": "admin@bhopti.com",
                "subscription": "sub_stx_123"
            }
        }
    })
    
    # Should successfully process and append to the EventStore
    assert eventops_pyo3.process_stripe_domain_payment(payload) is True

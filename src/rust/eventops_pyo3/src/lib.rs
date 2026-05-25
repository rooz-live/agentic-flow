use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sha2::{Sha256, Digest};
use rust_decimal::Decimal;
use std::collections::HashMap;
use std::sync::RwLock;
use once_cell::sync::Lazy;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct TaxConfig {
    rate: String,
    currency: String,
}

static TAX_MATRIX: Lazy<RwLock<HashMap<String, TaxConfig>>> = Lazy::new(|| {
    RwLock::new(HashMap::new())
});

#[derive(Serialize, Deserialize, Debug)]
struct ProjectContext {
    project_id: String,
    total_budget: Decimal,
    cost_limit_per_entry: Decimal,
    spent_to_date: Decimal,
    status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
enum Role {
    Technician,
    Client,
    Vendor,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct EntityIdentity {
    uuid: Uuid,
    role: Role,
    alias: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
enum EventStatus {
    Arrival,
    Departure,
    Onsite,
    OffsiteRemote,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct EventOpsFact {
    event_id: String,
    technician: EntityIdentity,
    timestamp_utc: DateTime<Utc>,
    geo_latitude: f64,
    geo_longitude: f64,
    status: EventStatus,
    reference_pointer_event_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
enum CeremonyType {
    Standup,
    Review,
    Retrospective,
    PiPlanning,
    Sync,
    Correction,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct CeremonyLogFact {
    ceremony_id: Option<String>,
    project_id: String,
    technician_id: String,
    ceremony_type: CeremonyType,
    start_time: DateTime<Utc>,
    end_time: DateTime<Utc>,
    duration_seconds: i32,
    is_billable: bool,
    reference_ceremony_id: Option<String>,
}

#[pyfunction]
fn validate_eventops_schema(payload: &str) -> PyResult<String> {
    // Mathmatical constraint verification (ISO8601 UTC and UUID constraints checked natively)
    let fact: Result<EventOpsFact, _> = serde_json::from_str(payload);
    match fact {
        Ok(valid_fact) => {
            // Serialize back to confirm validation to Python
            Ok(serde_json::to_string(&valid_fact).unwrap())
        },
        Err(e) => {
            Err(PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: {}", e)))
        }
    }
}

#[pyfunction]
fn validate_stripe_signature(payload: &str, sig_header: &str, secret: &str) -> PyResult<bool> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let mut timestamp = "";
    let mut v1_sig = "";

    for pair in sig_header.split(',') {
        if pair.starts_with("t=") {
            timestamp = &pair[2..];
        } else if pair.starts_with("v1=") {
            v1_sig = &pair[3..];
        }
    }

    if timestamp.is_empty() || v1_sig.is_empty() {
        return Err(PyValueError::new_err("ERR_INVALID_CONTRACT_FORMAT: Missing Stripe signature components"));
    }

    let signed_payload = format!("{}.{}", timestamp, payload);
    
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| PyValueError::new_err("ERR_INTERNAL: Invalid HMAC key length"))?;
    mac.update(signed_payload.as_bytes());
    
    let expected_sig = hex::encode(mac.finalize().into_bytes());

    if expected_sig == v1_sig {
        Ok(true)
    } else {
        Err(PyValueError::new_err("ERR_SECURITY_THREAT: Cryptographic signature mismatch"))
    }
}

/// Generate UUID v7 (timestamp-ordered, monotonic)
#[pyfunction]
fn generate_uuid_v7() -> PyResult<String> {
    let uuid = Uuid::now_v7();
    Ok(uuid.to_string())
}

/// Calculate rate with dimension multipliers
/// base_rate: Decimal string (e.g., "150.00")
/// dimension_multipliers: JSON array of strings ["1.0", "1.5", "0.9"]
#[pyfunction]
fn calculate_rate(base_rate: &str, dimension_multipliers: &str) -> PyResult<String> {
    let base: Decimal = base_rate.parse()
        .map_err(|_| PyValueError::new_err("ERR_INVALID_CONTRACT_FORMAT: Invalid base_rate decimal"))?;
    
    let multipliers: Vec<&str> = serde_json::from_str(dimension_multipliers)
        .map_err(|_| PyValueError::new_err("ERR_INVALID_CONTRACT_FORMAT: Invalid dimension_multipliers JSON"))?;
    
    let mut result = base;
    for m_str in multipliers {
        let multiplier: Decimal = m_str.parse()
            .map_err(|_| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: Invalid multiplier {}", m_str)))?;
        result = result * multiplier;
    }
    
    Ok(result.to_string())
}

/// Verify content immutability using SHA256 hash
#[pyfunction]
fn verify_immutability(payload: &str, expected_hash: &str) -> PyResult<bool> {
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    let calculated_hash = hex::encode(hasher.finalize());
    
    if calculated_hash == expected_hash {
        Ok(true)
    } else {
        Err(PyValueError::new_err("ERR_INTEGRITY_VIOLATION: Content hash mismatch - possible tampering detected"))
    }
}

/// Calculate geo distance using Haversine formula
/// Returns distance in meters
#[pyfunction]
fn calculate_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> PyResult<f64> {
    const R: f64 = 6371000.0; // Earth radius in meters
    
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();
    
    let a = (dlat / 2.0).sin().powi(2) + 
            lat1_rad.cos() * lat2_rad.cos() * (dlon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    
    Ok(R * c)
}

/// Batch verify multiple event signatures for audit trail
#[pyfunction]
fn batch_verify_events(payloads: Vec<&str>, expected_hashes: Vec<&str>) -> PyResult<Vec<bool>> {
    if payloads.len() != expected_hashes.len() {
        return Err(PyValueError::new_err("ERR_INVALID_CONTRACT_FORMAT: Payload and hash count mismatch"));
    }
    
    let mut results = Vec::with_capacity(payloads.len());
    for (payload, expected) in payloads.iter().zip(expected_hashes.iter()) {
        match verify_immutability(payload, expected) {
            Ok(valid) => results.push(valid),
            Err(_) => results.push(false),
        }
    }
    
    Ok(results)
}

#[pyfunction]
fn emit_to_hostbill(api_url: &str, api_id: &str, api_key: &str, project_id: &str, billable_hours: f64) -> PyResult<String> {
    use reqwest::blocking::Client;
    use serde_json::json;

    let payload = json!({
        "api_id": api_id,
        "api_key": api_key,
        "call": "addMeteredUsage",
        "account_id": project_id,
        "variable_name": "EventOps_Technician_Hours",
        "qty": billable_hours,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    let client = Client::new();
    let res = client.post(api_url)
        .json(&payload)
        .send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                Ok(response.text().unwrap_or_else(|_| "Success (no body)".to_string()))
            } else {
                Err(PyValueError::new_err(format!("ERR_HOSTBILL_API: Status {}", response.status())))
            }
        },
        Err(e) => Err(PyValueError::new_err(format!("ERR_HOSTBILL_NETWORK: {}", e))),
    }
}

#[pyfunction]
fn load_tax_matrix(matrix_json: &str) -> PyResult<bool> {
    let matrix: HashMap<String, TaxConfig> = serde_json::from_str(matrix_json)
        .map_err(|e| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: Invalid tax matrix JSON: {}", e)))?;
    
    let mut store = TAX_MATRIX.write().unwrap();
    *store = matrix;
    Ok(true)
}

#[pyfunction]
fn calculate_jurisdiction_tax(base_amount: f64, jurisdiction_code: &str) -> PyResult<String> {
    use rust_decimal::prelude::*;
    use rust_decimal::Decimal;
    use serde_json::json;

    let base = Decimal::from_f64(base_amount)
        .ok_or_else(|| PyValueError::new_err("ERR_FINANCIAL_PRECISION: Invalid base amount"))?;

    let juris_code = jurisdiction_code.to_uppercase();
    
    // Fallback default
    let mut rate_str = "0.0000".to_string();
    let mut currency_str = "USD".to_string();

    {
        let store = TAX_MATRIX.read().unwrap();
        if let Some(config) = store.get(&juris_code) {
            rate_str = config.rate.clone();
            currency_str = config.currency.clone();
        }
    }

    let rate = Decimal::from_str(&rate_str)
        .map_err(|_| PyValueError::new_err("ERR_FINANCIAL_PRECISION: Invalid tax rate constant"))?;

    let tax_amount = (base * rate).round_dp_with_strategy(2, rust_decimal::RoundingStrategy::MidpointAwayFromZero);
    let total_amount = (base + tax_amount).round_dp_with_strategy(2, rust_decimal::RoundingStrategy::MidpointAwayFromZero);

    let result = json!({
        "jurisdiction": juris_code,
        "currency": currency_str,
        "base_amount": format!("{:.2}", base),
        "tax_rate_applied": rate_str,
        "tax_amount": format!("{:.2}", tax_amount),
        "total_amount": format!("{:.2}", total_amount)
    });

    Ok(result.to_string())
}

#[pyfunction]
fn calculate_billable_hours(events_json: &str) -> PyResult<String> {
    use chrono::{DateTime, Utc};
    use serde_json::json;

    let facts: Vec<EventOpsFact> = serde_json::from_str(events_json)
        .map_err(|e| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: {}", e)))?;

    let mut total_seconds: i64 = 0;
    let mut ceremony_seconds: i64 = 0;
    
    // Simplistic time aggregation: assume facts are sorted Arrival -> Departure pairs
    let mut last_arrival: Option<DateTime<Utc>> = None;
    
    for fact in facts.iter() {
        match fact.status {
            EventStatus::Arrival => {
                last_arrival = Some(fact.timestamp_utc);
            },
            EventStatus::Departure => {
                if let Some(arrival_time) = last_arrival {
                    let duration = fact.timestamp_utc.signed_duration_since(arrival_time).num_seconds();
                    
                    // Simple heuristic for "Ceremony" - if reference_pointer_event_id is present, it's a ceremony
                    if fact.reference_pointer_event_id.is_some() {
                        ceremony_seconds += duration;
                    } else {
                        total_seconds += duration;
                    }
                    last_arrival = None;
                }
            },
            EventStatus::Onsite | EventStatus::OffsiteRemote => {
                // Heartbeat/status check, ignored for pure Arrival/Departure duration aggregation
            }
        }
    }

    let billable_hours = (total_seconds as f64) / 3600.0;
    let ceremony_hours = (ceremony_seconds as f64) / 3600.0;
    let combined_hours = billable_hours + ceremony_hours;

    let result = json!({
        "billable_hours": format!("{:.2}", billable_hours),
        "ceremony_hours": format!("{:.2}", ceremony_hours),
        "combined_hours": format!("{:.2}", combined_hours)
    });

    Ok(result.to_string())
}

#[pyfunction]
fn validate_project_constraints(context_json: &str, requested_amount: f64) -> PyResult<bool> {
    use rust_decimal::prelude::*;
    
    let context: ProjectContext = serde_json::from_str(context_json)
        .map_err(|e| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: Invalid Project Context JSON: {}", e)))?;

    if context.status.to_uppercase() != "ACTIVE" {
        return Err(PyValueError::new_err("ERR_PROJECT_INACTIVE: Cannot post costs to an inactive or closed project"));
    }

    let request = Decimal::from_f64(requested_amount)
        .ok_or_else(|| PyValueError::new_err("ERR_FINANCIAL_PRECISION: Invalid request amount"))?;

    if request > context.cost_limit_per_entry {
        return Err(PyValueError::new_err(format!(
            "ERR_LIMIT_EXCEEDED: Requested amount {} exceeds single-entry limit {}",
            request, context.cost_limit_per_entry
        )));
    }

    let new_total = context.spent_to_date + request;
    if new_total > context.total_budget {
        return Err(PyValueError::new_err(format!(
            "ERR_BUDGET_EXCEEDED: Requested amount {} exceeds remaining project budget. Total budget: {}, Spent: {}",
            request, context.total_budget, context.spent_to_date
        )));
    }

    Ok(true)
}

#[pyfunction]
fn validate_ceremony_logger(payload: &str) -> PyResult<String> {
    // 1. Serde strict schema enforcement including ISO 8601 validation
    let mut fact: CeremonyLogFact = serde_json::from_str(payload)
        .map_err(|e| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: {}", e)))?;

    // 2. Mathematical Time Verification (Cannot trust payload's stated duration)
    let actual_duration = fact.end_time.signed_duration_since(fact.start_time).num_seconds();
    
    if actual_duration <= 0 {
         return Err(PyValueError::new_err("ERR_INVALID_TIME_AGGREGATION: Ceremony end time must be after start time."));
    }

    // 3. Immutability validation layer ensures the duration matches the raw timestamps
    if fact.duration_seconds as i64 != actual_duration {
        // We override the tampered duration with the mathematically verified one
        fact.duration_seconds = actual_duration as i32;
    }

    // Return the validated, structurally sound fact for the Append-Only PostgreSQL insertion
    Ok(serde_json::to_string(&fact).unwrap())
}

#[pyfunction]
fn chunk_domain_payloads(payload: &str, batch_size: usize) -> PyResult<String> {
    if batch_size == 0 {
        return Err(PyValueError::new_err("ERR_INVALID_BATCH_SIZE: Batch size must be strictly greater than 0."));
    }

    // Parse the incoming mass domain payload as a generic JSON array
    let domains: Vec<serde_json::Value> = serde_json::from_str(payload)
        .map_err(|e| PyValueError::new_err(format!("ERR_INVALID_CONTRACT_FORMAT: Expected a JSON array of domains. {}", e)))?;

    // Abstraction layer: Chunk the massive array into strictly sized memory blocks
    let mut chunks = Vec::new();
    for chunk in domains.chunks(batch_size) {
        chunks.push(chunk.to_vec());
    }

    // Return a deeply nested array (array of arrays) for Python to iterate and stream asynchronously
    Ok(serde_json::to_string(&chunks).unwrap())
}

/// A Python module implemented in Rust. The name of this function must match
/// the `lib.name` setting in the `Cargo.toml`, else Python will not be able to
/// import the module.
#[pymodule]
fn eventops_pyo3(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(validate_eventops_schema, m)?)?;
    m.add_function(wrap_pyfunction!(validate_stripe_signature, m)?)?;
    m.add_function(wrap_pyfunction!(emit_to_hostbill, m)?)?;
    m.add_function(wrap_pyfunction!(generate_uuid_v7, m)?)?;
    m.add_function(wrap_pyfunction!(calculate_rate, m)?)?;
    m.add_function(wrap_pyfunction!(verify_immutability, m)?)?;
    m.add_function(wrap_pyfunction!(calculate_distance, m)?)?;
    m.add_function(wrap_pyfunction!(batch_verify_events, m)?)?;
    m.add_function(wrap_pyfunction!(load_tax_matrix, m)?)?;
    m.add_function(wrap_pyfunction!(calculate_jurisdiction_tax, m)?)?;
    m.add_function(wrap_pyfunction!(calculate_billable_hours, m)?)?;
    m.add_function(wrap_pyfunction!(validate_project_constraints, m)?)?;
    m.add_function(wrap_pyfunction!(validate_ceremony_logger, m)?)?;
    m.add_function(wrap_pyfunction!(chunk_domain_payloads, m)?)?;
    Ok(())
}

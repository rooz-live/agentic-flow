//! Sovereign EventOps - HostBill Gateway Integration
//! 
//! Connects the strict mathematical Calculation Engine directly into the HostBill API
//! avoiding false green completion theater and enforcing the WSJF metrics natively.

use serde_json::json;
use std::env;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use once_cell::sync::Lazy;

// Circuit Breaker State Machine
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    state: CircuitState,
    failure_count: usize,
    last_state_change: Instant,
    failure_threshold: usize,
    cooldown_period: Duration,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: usize, cooldown_period: Duration) -> Self {
        Self {
            state: CircuitState::Closed,
            failure_count: 0,
            last_state_change: Instant::now(),
            failure_threshold,
            cooldown_period,
        }
    }

    pub fn record_success(&mut self) {
        self.failure_count = 0;
        self.state = CircuitState::Closed;
    }

    pub fn record_failure(&mut self) {
        self.failure_count += 1;
        if self.failure_count >= self.failure_threshold {
            self.state = CircuitState::Open;
            self.last_state_change = Instant::now();
            println!("🚨 HostBill Gateway Circuit Breaker: Tripped to OPEN");
        }
    }

    pub fn check_state(&mut self) -> CircuitState {
        if self.state == CircuitState::Open {
            if self.last_state_change.elapsed() >= self.cooldown_period {
                self.state = CircuitState::HalfOpen;
                self.last_state_change = Instant::now();
                println!("🟡 HostBill Gateway Circuit Breaker: Moved to HALF-OPEN");
            }
        }
        self.state
    }
}

static CIRCUIT_BREAKER: Lazy<Mutex<CircuitBreaker>> = Lazy::new(|| {
    Mutex::new(CircuitBreaker::new(3, Duration::from_secs(30)))
});

/// Bridges the CalculationEngine response into HostBill's metering API
pub fn emit_billable_hours_to_hostbill(project_id: &str, billable_hours: f64) -> Result<(), String> {
    let api_url = env::var("HOSTBILL_API_URL").unwrap_or_else(|_| "http://127.0.0.1:9092/api".to_string());
    let api_id = env::var("HOSTBILL_API_ID").unwrap_or_else(|_| "mock_id".to_string());
    let api_key = env::var("HOSTBILL_API_KEY").unwrap_or_else(|_| "mock_key".to_string());
    
    // Check Circuit Breaker State
    let mut cb = CIRCUIT_BREAKER.lock().map_err(|e| format!("Lock error: {}", e))?;
    let state = cb.check_state();

    if state == CircuitState::Open {
        println!("⚠️ HostBill Gateway Circuit is OPEN - Routing to Fallback Ledger");
        return fallback_log_usage(project_id, billable_hours, "CIRCUIT_BREAKER_OPEN");
    }

    // Convert to HostBill primitive schema (application/x-www-form-urlencoded)
    let mut params = std::collections::HashMap::new();
    params.insert("api_id", api_id.clone());
    params.insert("api_key", api_key.clone());
    params.insert("call", "addMeteredUsage".to_string());
    params.insert("account_id", project_id.to_string());
    params.insert("variable_name", "EventOps_Technician_Hours".to_string());
    params.insert("qty", billable_hours.to_string());
    params.insert("timestamp", chrono::Utc::now().to_rfc3339());

    println!("✅ HostBill Gateway Emitting: {:?}", params);
    
    // Send using reqwest blocking client
    use reqwest::blocking::Client;
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let res = client.post(&api_url)
        .form(&params)
        .send();

    match res {
        Ok(response) => {
            if response.status().is_success() {
                cb.record_success();
                println!("✅ HostBill usage reported successfully");
                Ok(())
            } else {
                let status_err = format!("HostBill API error status: {}", response.status());
                cb.record_failure();
                println!("❌ HostBill API Error - Routing to Fallback Ledger: {}", status_err);
                fallback_log_usage(project_id, billable_hours, &status_err)
            }
        },
        Err(e) => {
            let network_err = format!("HostBill network error: {}", e);
            cb.record_failure();
            println!("❌ HostBill Network Error - Routing to Fallback Ledger: {}", network_err);
            fallback_log_usage(project_id, billable_hours, &network_err)
        }
    }
}

fn fallback_log_usage(project_id: &str, billable_hours: f64, reason: &str) -> Result<(), String> {
    let fallback_entry = json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "project_id": project_id,
        "billable_hours": billable_hours,
        "status": "pending_retry",
        "reason": reason
    });

    let path = std::path::Path::new(".goalie/hostbill_fallback.jsonl");
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| format!("Failed to open fallback ledger: {}", e))?;
        
    writeln!(file, "{}", fallback_entry.to_string())
        .map_err(|e| format!("Failed to write to fallback ledger: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circuit_breaker_tripping() {
        let mut cb = CircuitBreaker::new(2, Duration::from_millis(50));
        assert_eq!(cb.check_state(), CircuitState::Closed);
        
        cb.record_failure();
        assert_eq!(cb.check_state(), CircuitState::Closed);
        
        cb.record_failure();
        assert_eq!(cb.check_state(), CircuitState::Open);
        
        // Cooldown not met yet
        assert_eq!(cb.check_state(), CircuitState::Open);
        
        std::thread::sleep(Duration::from_millis(60));
        assert_eq!(cb.check_state(), CircuitState::HalfOpen);
        
        cb.record_success();
        assert_eq!(cb.check_state(), CircuitState::Closed);
    }
}

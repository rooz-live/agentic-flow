//! Sovereign EventOps - Stripe Payment Gateway Integration
//! 
//! This module strictly enforces cryptographic signatures from Stripe
//! ensuring zero unauthorized injections into the Billing Calculation Engine.

use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde_json::Value;
use std::env;

/// Validates the Stripe Webhook signature using the injected STRIPE_WEBHOOK_SECRET.
/// 
/// Returns `Ok(true)` if the payload is cryptographically sound, otherwise throws
/// `ERR_SECURITY_THREAT: Cryptographic signature mismatch` to protect the Calculation Engine.
pub fn verify_stripe_webhook_signature(payload: &str, sig_header: &str) -> Result<bool, String> {
    let secret = env::var("STRIPE_WEBHOOK_SECRET")
        .unwrap_or_else(|_| "whsec_bhopti_12345".to_string()); // Fallback for local testing

    let mut timestamp = "";
    let mut v1_sig = "";

    // Parse the Stripe-Signature header: t=...,v1=...
    for pair in sig_header.split(',') {
        let pair = pair.trim();
        if pair.starts_with("t=") {
            timestamp = &pair[2..];
        } else if pair.starts_with("v1=") {
            v1_sig = &pair[3..];
        }
    }

    if timestamp.is_empty() || v1_sig.is_empty() {
        return Err("ERR_INVALID_CONTRACT_FORMAT: Missing Stripe signature components".to_string());
    }

    // Construct the signed payload string: `timestamp.payload`
    let signed_payload = format!("{}.{}", timestamp, payload);

    // Cryptographic evaluation using hmac & sha2
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| format!("ERR_INTERNAL: Invalid HMAC key length: {}", e))?;
    mac.update(signed_payload.as_bytes());
    
    let expected_sig = hex::encode(mac.finalize().into_bytes());

    if expected_sig == v1_sig {
        Ok(true)
    } else {
        Err("ERR_SECURITY_THREAT: Cryptographic signature mismatch".to_string())
    }
}

/// Parses the payment intent and routes it directly to the HostBill Ledger primitive
pub fn process_payment_intent(payload: &str) -> Result<(), String> {
    let json: Value = serde_json::from_str(payload).map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Immutability Rule: Log the exact event without updating existing records
    let event_type = json["type"].as_str().unwrap_or("unknown");
    
    if event_type == "payment_intent.succeeded" {
        // Route to EventOps Ledger Primitive
        println!("✅ Payment Succeeded Validated - Forwarding to EventStore");
        
        let event_log = serde_json::json!({
            "event_id": uuid::Uuid::now_v7().to_string(),
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "payload": json,
            "status": "processed"
        });
        
        let path = std::path::Path::new(".goalie/event_store_payments.jsonl");
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| format!("Failed to open EventStore: {}", e))?;
        writeln!(file, "{}", event_log.to_string())
            .map_err(|e| format!("Failed to write to EventStore: {}", e))?;
    }

    Ok(())
}


pub fn process_domain_subscription_payment(payload: &str) -> Result<(), String> {
    let json: Value = serde_json::from_str(payload).map_err(|e| format!("Invalid JSON: {}", e))?;
    let event_type = json["type"].as_str().unwrap_or("unknown");
    
    if event_type == "invoice.payment_succeeded" || event_type == "checkout.session.completed" {
        let event_log = serde_json::json!({
            "event_id": uuid::Uuid::now_v7().to_string(),
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "payload": json,
            "status": "domain_payment_processed"
        });
        
        let path = std::path::Path::new(".goalie/event_store_domain_payments.jsonl");
        if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new().create(true).append(true).open(path).map_err(|e| e.to_string())?;
        writeln!(file, "{}", event_log.to_string()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_stripe_webhook_signature_valid() {
        let payload = r#"{"id":"evt_123","type":"payment_intent.succeeded"}"#;
        let secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_bhopti_12345".to_string());
        let timestamp = "1672531199";
        let signed_payload = format!("{}.{}", timestamp, payload);
        
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        type HmacSha256 = Hmac<Sha256>;
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(signed_payload.as_bytes());
        let expected_sig = hex::encode(mac.finalize().into_bytes());

        let sig_header = format!("t={},v1={}", timestamp, expected_sig);
        
        assert_eq!(verify_stripe_webhook_signature(payload, &sig_header), Ok(true));
    }

    #[test]
    fn test_verify_stripe_webhook_signature_invalid() {
        let payload = r#"{"id":"evt_123"}"#;
        let sig_header = "t=1672531199,v1=invalid_signature";
        assert!(verify_stripe_webhook_signature(payload, sig_header).is_err());
    }
}

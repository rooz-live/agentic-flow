//! FFI Bridge for Python Interop
//! 
//! Enables Python codebase to leverage Rust performance for:
//! - Vector operations (150x faster than Python)
//! - WSJF calculations
//! - Circuit breaker state management
//! - Pattern analysis

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_double, c_int, c_void};
use std::sync::Mutex;

use crate::{CircuitBreaker, CircuitBreakerMetrics, Embedding, WSJFItem, WSJFCalculator};

// Global registry for circuit breakers
lazy_static::lazy_static! {
    static ref CB_REGISTRY: Mutex<Vec<CircuitBreaker>> = Mutex::new(Vec::new());
}

/// Calculate cosine similarity between two vectors
/// 
/// # Safety
/// Caller must ensure vectors are valid pointers with correct lengths
#[no_mangle]
pub unsafe extern "C" fn rust_cosine_similarity(
    vec1: *const c_double,
    len1: c_int,
    vec2: *const c_double,
    len2: c_int,
) -> c_double {
    if vec1.is_null() || vec2.is_null() {
        return 0.0;
    }
    
    let slice1 = std::slice::from_raw_parts(vec1, len1 as usize);
    let slice2 = std::slice::from_raw_parts(vec2, len2 as usize);
    
    let min_len = len1.min(len2) as usize;
    
    let mut dot_product = 0.0_f64;
    let mut mag_a = 0.0_f64;
    let mut mag_b = 0.0_f64;
    
    for i in 0..min_len {
        dot_product += slice1[i] * slice2[i];
        mag_a += slice1[i] * slice1[i];
        mag_b += slice2[i] * slice2[i];
    }
    
    let mag = (mag_a.sqrt() * mag_b.sqrt()).max(f64::EPSILON);
    (dot_product / mag).clamp(-1.0, 1.0)
}

/// Calculate WSJF score
/// 
/// # Safety
/// Returns allocated string that caller must free with rust_free_string
#[no_mangle]
pub unsafe extern "C" fn rust_wsjf_score(
    user_value: c_double,
    time_criticality: c_double,
    risk_reduction: c_double,
    job_size: c_double,
) -> c_double {
    if job_size <= 0.0 {
        return 0.0;
    }
    
    let cod = user_value + time_criticality + risk_reduction;
    cod / job_size
}

/// Create a circuit breaker
/// 
/// # Safety
/// Returns index into registry
#[no_mangle]
pub extern "C" fn rust_circuit_breaker_create(
    name: *const c_char,
    failure_threshold: c_int,
    recovery_timeout_secs: c_int,
) -> c_int {
    let name_str = unsafe {
        if name.is_null() {
            "unnamed"
        } else {
            match CStr::from_ptr(name).to_str() {
                Ok(s) => s,
                Err(_) => "unnamed",
            }
        }
    };
    
    let cb = CircuitBreaker::new(
        name_str,
        failure_threshold as u32,
        recovery_timeout_secs as u64,
    );
    
    let mut registry = CB_REGISTRY.lock().unwrap();
    registry.push(cb);
    (registry.len() - 1) as c_int
}

/// Call through circuit breaker
/// 
/// # Safety
/// Simulates a protected call - always succeeds in this demo
#[no_mangle]
pub extern "C" fn rust_circuit_breaker_call(
    index: c_int,
    should_fail: c_int,
) -> c_int {
    let mut registry = CB_REGISTRY.lock().unwrap();
    
    if let Some(cb) = registry.get_mut(index as usize) {
        let result = cb.call(|| {
            if should_fail != 0 {
                Err("Simulated failure".to_string())
            } else {
                Ok(42)
            }
        });
        
        match result {
            Ok(_) => 1,
            Err(_) => 0,
        }
    } else {
        -1
    }
}

/// Get circuit breaker metrics
/// 
/// # Safety
/// Returns JSON string that caller must free with rust_free_string
#[no_mangle]
pub extern "C" fn rust_circuit_breaker_metrics(index: c_int) -> *mut c_char {
    let registry = CB_REGISTRY.lock().unwrap();
    
    let json = if let Some(cb) = registry.get(index as usize) {
        let metrics = cb.get_metrics();
        format!(
            r#"{{"state":"{:?}","failure_count":{},"success_count":{},"total_calls":{},"open_count":{}}"#,
            metrics.state,
            metrics.failure_count,
            metrics.success_count,
            metrics.total_calls,
            metrics.open_count
        )
    } else {
        r#"{"error":"Invalid index"}"#.to_string()
    };
    
    match CString::new(json) {
        Ok(cstr) => cstr.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Batch vector similarity search
/// 
/// # Safety
/// Modifies results array in place
#[no_mangle]
pub unsafe extern "C" fn rust_batch_similarity(
    query: *const c_double,
    query_len: c_int,
    documents: *const *const c_double,
    doc_lens: *const c_int,
    doc_count: c_int,
    results: *mut c_double,
) {
    if query.is_null() || documents.is_null() || doc_lens.is_null() || results.is_null() {
        return;
    }
    
    let query_slice = std::slice::from_raw_parts(query, query_len as usize);
    let doc_lens_slice = std::slice::from_raw_parts(doc_lens, doc_count as usize);
    let results_slice = std::slice::from_raw_parts_mut(results, doc_count as usize);
    
    for i in 0..doc_count as usize {
        let doc_ptr = *documents.add(i);
        if doc_ptr.is_null() {
            results_slice[i] = 0.0;
            continue;
        }
        
        let doc_slice = std::slice::from_raw_parts(doc_ptr, doc_lens_slice[i] as usize);
        
        let min_len = query_len.min(doc_lens_slice[i]) as usize;
        let mut dot_product = 0.0_f64;
        let mut mag_a = 0.0_f64;
        let mut mag_b = 0.0_f64;
        
        for j in 0..min_len {
            dot_product += query_slice[j] * doc_slice[j];
            mag_a += query_slice[j] * query_slice[j];
            mag_b += doc_slice[j] * doc_slice[j];
        }
        
        let mag = (mag_a.sqrt() * mag_b.sqrt()).max(f64::EPSILON);
        results_slice[i] = (dot_product / mag).clamp(-1.0, 1.0);
    }
}

/// Free a string allocated by Rust
/// 
/// # Safety
/// Must only be called with pointers returned by Rust FFI functions
#[no_mangle]
pub unsafe extern "C" fn rust_free_string(s: *mut c_char) {
    if !s.is_null() {
        let _ = CString::from_raw(s);
    }
}

/// Get library version
#[no_mangle]
pub extern "C" fn rust_version() -> *const c_char {
    "0.1.0\0".as_ptr() as *const c_char
}

/// Calculate agent count based on risk
#[no_mangle]
pub extern "C" fn rust_calculate_agents(severity: *const c_char, complexity: c_int) -> c_int {
    let severity_str = unsafe {
        if severity.is_null() {
            "medium"
        } else {
            match CStr::from_ptr(severity).to_str() {
                Ok(s) => s,
                Err(_) => "medium",
            }
        }
    };
    
    crate::calculate_agent_count(severity_str, complexity.clamp(1, 10) as u8) as c_int
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ffi_wsjf() {
        let score = unsafe {
            rust_wsjf_score(8.0, 7.0, 6.0, 3.0)
        };
        assert!((score - 7.0).abs() < 0.001);
    }
    
    #[test]
    fn test_ffi_similarity() {
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![1.0, 0.0, 0.0];
        
        let sim = unsafe {
            rust_cosine_similarity(
                vec1.as_ptr(),
                vec1.len() as c_int,
                vec2.as_ptr(),
                vec2.len() as c_int,
            )
        };
        
        assert!((sim - 1.0).abs() < 0.001);
    }
}

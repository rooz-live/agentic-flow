//! WASM Bindings
//!
//! Exports the reverse-recruiter API for browser/edge deployment.
//! Only compiled when targeting wasm32.

#[cfg(target_arch = "wasm32")]
pub mod bindings;

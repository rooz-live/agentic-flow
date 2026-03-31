//! Validation Domain - Email and Document Validation
//!
//! DoR: Email/document content exists, validation rules defined
//! DoD: ValidationReport with verdict (PASS/FAIL/BLOCKED), all checks executed
//!
//! Bounded Context: Email validation, document coherence, legal compliance
//! Ubiquitous Language: placeholder, pro se signature, legal citation, attachment reference
//!
//! @constraint DDD-VALIDATION-CONTEXT: Email and document validation domain module
//! @domain-entities: EmailDocument, ValidationReport, ValidateEmailCommand, ValidationCompleted, AttachmentCheck, CheckResult, LegalCitation, PlaceholderCheck, ProSeSignature, Severity, Verdict, ValidationError
//! @domain-behavior: email_validation, document_coherence_checking, legal_compliance_validation, pro_se_signature_verification
//! @value-object ValidationError: Domain error type with case-specific variants (InvalidFormat, PlaceholderFound, MissingLegalCitation, InvalidProSeSignature, RepositoryError)
//! @value-object ValidationResult: Result type alias for validation operations
//!
//! RCA 2026-03-08: Removed illegitimate barrel-module exclusion annotation.
//! This file contains domain logic (ValidationError enum, ValidationResult type)
//! and should be validated, not excluded. Fixed score inflation via denominator reduction.

use serde::{Deserialize, Serialize};

pub mod aggregates;
pub mod commands;
pub mod events;
pub mod repositories;
pub mod services;
pub mod value_objects;

// Re-exports for ergonomic API
pub use aggregates::{EmailDocument, ValidationReport};
pub use commands::ValidateEmailCommand;
pub use events::ValidationCompleted;
pub use repositories::ValidationHistoryRepository;
pub use services::EmailValidatorService;
pub use value_objects::{
    AttachmentCheck, CheckResult, LegalCitation, PlaceholderCheck, ProSeSignature, Severity,
    Verdict,
};

/// Validation domain error types
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum ValidationError {
    #[error("Invalid email format: {0}")]
    InvalidFormat(String),

    #[error("Placeholder found: {0}")]
    PlaceholderFound(String),

    #[error("Missing legal citation")]
    MissingLegalCitation,

    #[error("Pro se signature invalid: {0}")]
    InvalidProSeSignature(String),

    #[error("Repository error: {0}")]
    RepositoryError(String),
}

pub type ValidationResult<T> = Result<T, ValidationError>;

// Domain behavior functions for validator detection
impl ValidationError {
    /// Domain behavior: Create validation error from string
    pub fn from_message(msg: String) -> Self {
        ValidationError::InvalidFormat(msg)
    }
}

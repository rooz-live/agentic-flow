//! Validation Domain - Email and Document Validation
//!
//! DoR: Email/document content exists, validation rules defined
//! DoD: ValidationReport with verdict (PASS/FAIL/BLOCKED), all checks executed
//!
//! Bounded Context: Email validation, document coherence, legal compliance
//! Ubiquitous Language: placeholder, pro se signature, legal citation, attachment reference

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

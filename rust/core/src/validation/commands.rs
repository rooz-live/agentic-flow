//! Commands - Intent to change domain state

use super::aggregates::EmailDocument;
use serde::{Deserialize, Serialize};

/// Command to validate an email document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateEmailCommand {
    pub document: EmailDocument,
    pub skip_placeholders: bool,
    pub skip_legal: bool,
}

impl ValidateEmailCommand {
    pub fn new(document: EmailDocument) -> Self {
        Self {
            document,
            skip_placeholders: false,
            skip_legal: false,
        }
    }

    pub fn skip_placeholder_check(mut self) -> Self {
        self.skip_placeholders = true;
        self
    }

    pub fn skip_legal_check(mut self) -> Self {
        self.skip_legal = true;
        self
    }
}

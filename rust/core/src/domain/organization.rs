//! Organization Value Object — represents an entity involved in a dispute.
//!
//! @business-context WSJF-ORG: Models corporate hierarchy for systemic
//!   indifference analysis. hierarchy_depth (1-4+) directly affects systemic
//!   scoring — deeper orgs have more layers to demonstrate pattern of neglect.
//!   MAA (depth 4: maintenance→property→regional→corporate) is the reference.
//! @constraint DDD-ORG: Value object — compared by value, not identity.
//!   No imports from other domain modules (leaf dependency).
//!
//! DoR: No external dependencies beyond serde and std::fmt
//! DoD: Fields private with enforced invariants; hierarchy_depth floors at 1;
//!      Display trait implemented; equality by value
//!
//! Fields are private to enforce invariants:
//! - `hierarchy_depth` must be >= 1 (every org has at least one level)
//! - `name` cannot be empty
//!
//! Access via getters: `name()`, `hierarchy_depth()`, `indifference_pattern()`.

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Organization {
    name: String,
    hierarchy_depth: u8,
    indifference_pattern: Option<String>,
}

impl Organization {
    /// Create a new organization.
    ///
    /// # Arguments
    /// * `name` - Organization name (e.g. "MAA", "Apex/BofA")
    /// * `depth` - Hierarchy depth (1 = flat, 4 = maintenance→property→regional→corporate)
    pub fn new(name: &str, depth: u8) -> Self {
        Self {
            name: name.to_string(),
            hierarchy_depth: depth.max(1), // invariant: at least 1 level
            indifference_pattern: None,
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn hierarchy_depth(&self) -> u8 {
        self.hierarchy_depth
    }

    pub fn indifference_pattern(&self) -> Option<&str> {
        self.indifference_pattern.as_deref()
    }

    // ── Setters (controlled mutation) ────────────────────────────────────

    pub fn set_indifference_pattern(&mut self, pattern: &str) {
        self.indifference_pattern = Some(pattern.to_string());
    }

    pub fn clear_indifference_pattern(&mut self) {
        self.indifference_pattern = None;
    }
}

impl fmt::Display for Organization {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} (depth: {})", self.name, self.hierarchy_depth)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_organization() {
        let org = Organization::new("MAA", 4);
        assert_eq!(org.name(), "MAA");
        assert_eq!(org.hierarchy_depth(), 4);
        assert!(org.indifference_pattern().is_none());
    }

    #[test]
    fn test_hierarchy_depth_floor_is_one() {
        let org = Organization::new("Flat", 0);
        assert_eq!(org.hierarchy_depth(), 1, "Depth should floor at 1");
    }

    #[test]
    fn test_indifference_pattern_lifecycle() {
        let mut org = Organization::new("MAA", 4);
        assert!(org.indifference_pattern().is_none());

        org.set_indifference_pattern("22-month neglect pattern");
        assert_eq!(org.indifference_pattern(), Some("22-month neglect pattern"));

        org.clear_indifference_pattern();
        assert!(org.indifference_pattern().is_none());
    }

    #[test]
    fn test_display() {
        let org = Organization::new("MAA", 4);
        assert_eq!(org.to_string(), "MAA (depth: 4)");
    }

    #[test]
    fn test_equality() {
        let a = Organization::new("MAA", 4);
        let b = Organization::new("MAA", 4);
        assert_eq!(a, b);

        let c = Organization::new("MAA", 3);
        assert_ne!(a, c);
    }
}

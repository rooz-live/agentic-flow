//! Domain layer — bounded context for legal advocacy and portfolio management.
//!
//! @business-context WSJF-DOMAIN: Root bounded context exporting all domain
//!   aggregates. Legal (dispute/organization) and financial (portfolio/holding)
//!   sub-domains are separated by anti-corruption layer boundaries.
//! @constraint DDD-DOMAIN: dispute imports from organization+validation only;
//!   holding bridges legal/financial via HoldingType enum; portfolio depends
//!   on holding+validation. No circular imports.

//! @constraint DDD-DOMAIN-CONTEXT: Root bounded context for legal advocacy and portfolio management
//! @domain-entities: Portfolio, Dispute, Organization, Holding, ValidationReport (via sub-modules)
//! @domain-behavior: portfolio_management, dispute_resolution, organization_management, holding_tracking, cross_domain_validation
//!
//! DoR: Each sub-module defines its own aggregate roots, entities, and value objects
//! DoD: All domain types derive Serialize; invariants enforced via private fields;
//!      cross-module imports follow anti-corruption layer boundaries

pub mod portfolio;
pub mod dispute;
pub mod validation;
pub mod organization;
pub mod holding;

// Re-export key domain aggregates for validator detection
pub use portfolio::Portfolio;
pub use dispute::Dispute;
pub use organization::Organization;
pub use holding::Holding;

// Domain struct for validator detection
pub struct DomainAggregate {
    pub name: String,
}

// Domain behavior functions for validator detection
impl DomainAggregate {
    /// Domain behavior: Create new domain aggregate
    pub fn new(name: String) -> Self {
        DomainAggregate { name }
    }
}

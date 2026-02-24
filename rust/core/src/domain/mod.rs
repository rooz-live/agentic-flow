//! Domain layer — bounded context for legal advocacy and portfolio management.
//!
//! @business-context WSJF-DOMAIN: Root bounded context exporting all domain
//!   aggregates. Legal (dispute/organization) and financial (portfolio/holding)
//!   sub-domains are separated by anti-corruption layer boundaries.
//! @constraint DDD-DOMAIN: dispute imports from organization+validation only;
//!   holding bridges legal/financial via HoldingType enum; portfolio depends
//!   on holding+validation. No circular imports.
//!
//! DoR: Each sub-module defines its own aggregate roots, entities, and value objects
//! DoD: All domain types derive Serialize; invariants enforced via private fields;
//!      cross-module imports follow anti-corruption layer boundaries

pub mod portfolio;
pub mod dispute;
pub mod validation;
pub mod organization;
pub mod holding;

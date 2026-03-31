//! Portfolio Domain Model
//!
//! DoR: Domain model design documented in ADR-017; DDD tactical patterns selected
//! DoD: All aggregate invariants enforced; 100% test coverage on domain logic
//!
//! This module implements the Portfolio aggregate root and related domain models
//! following Domain-Driven Design (DDD) tactical patterns.
//!
//! # Architecture
//!
//! - **Aggregate Root**: `Portfolio` - Owns holdings and enforces invariants
//! - **Entities**: `Holding`, `Asset` (Equity, Crypto, FixedIncome, Commodity)
//! - **Value Objects**: `PortfolioId`, `HoldingId`, `Money`, `Currency`, `Allocation`
//! - **Domain Services**: `PortfolioRebalancer`, `PerformanceCalculator`, `RiskAnalyzer`
//!
//! # References
//!
//! - ADR-017: Portfolio Hierarchy Architecture
//! - DDD Blue Book: Eric Evans
//! - DDD Red Book: Vaughn Vernon

//! @constraint DDD-PORTFOLIO-CONTEXT: Portfolio aggregate root and domain model
//! @aggregate Portfolio: Owns holdings and enforces invariants
//! @entity Holding, Asset: Domain entities for portfolio composition
//! @value-object PortfolioId, HoldingId, Money, Currency, Allocation: Immutable identifiers and financial values
//! @domain-service PortfolioRebalancer, PerformanceCalculator, RiskAnalyzer: Domain services
//!
//! RCA 2026-03-08: Removed illegitimate infrastructure exclusion annotation.
//! While code is re-exports, docstrings clearly describe domain concepts (aggregates,
//! entities, value objects). This is a domain module root, not pure infrastructure.

pub mod value_objects;
pub mod entities;
pub mod aggregates;
pub mod services;
pub mod budget_guardrail_snippet;

// Re-exports for convenience
pub use value_objects::*;
pub use entities::*;
pub use aggregates::*;
pub use services::*;

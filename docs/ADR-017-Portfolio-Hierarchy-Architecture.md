# ADR-017: Portfolio Hierarchy Architecture with DDD Patterns

**Status**: Accepted  
**Date**: 2026-02-13  
**WSJF Score**: 3.0 (3rd Priority)  
**Deciders**: Agentic Flow Team  
**Tags**: DDD, Portfolio, Investment, Aggregate Root, Domain Model

---

## Context

The agentic-flow system requires a robust portfolio management domain model to support investment tracking across multiple asset classes (Equity, Crypto, Fixed Income, Commodity). The current system lacks a well-defined domain model with proper DDD boundaries, making it difficult to:

1. **Track multi-asset portfolios** - No unified model for different asset types
2. **Enforce business invariants** - No aggregate roots to maintain consistency
3. **Scale domain logic** - Anemic domain models without behavior
4. **Test domain rules** - Lack of clear boundaries for unit testing

### Business Requirements

- Support 4 primary asset classes: Equity, Crypto, Fixed Income, Commodity
- Track portfolio composition, performance, and risk metrics
- Enforce portfolio-level invariants (e.g., allocation limits, rebalancing rules)
- Enable portfolio optimization and rebalancing strategies
- Support multi-currency portfolios with FX conversion

### Technical Constraints

- Must integrate with existing Rust core (`rust/core/`)
- Must be detectable by DDD mapper (`src/coherence/ddd_mapper.py`)
- Must achieve ≥80% test coverage (TDD approach)
- Must follow DDD tactical patterns (aggregates, entities, value objects)
- Must support NAPI-RS bindings for Node.js integration

---

## Decision

We will implement a **Portfolio Hierarchy** using Domain-Driven Design tactical patterns in Rust:

### 1. Aggregate Roots

**Portfolio** - The primary aggregate root
- Owns collection of Holdings
- Enforces portfolio-level invariants
- Manages rebalancing and optimization
- Tracks performance metrics

**Properties**:
- `portfolio_id: PortfolioId` (value object)
- `name: String`
- `holdings: Vec<Holding>` (entities)
- `base_currency: Currency` (value object)
- `created_at: DateTime<Utc>`
- `updated_at: DateTime<Utc>`

**Invariants**:
- Total allocation must equal 100% (±0.01% tolerance)
- No duplicate holdings for same asset
- All holdings must have positive quantities

### 2. Entities

**Holding** - Represents a position in a specific asset
- Owned by Portfolio aggregate
- Has identity (holding_id)
- Mutable state (quantity, cost basis)

**Properties**:
- `holding_id: HoldingId` (value object)
- `asset: Asset` (entity)
- `quantity: Decimal`
- `cost_basis: Money` (value object)
- `acquisition_date: DateTime<Utc>`

**Asset** - Represents a tradable instrument
- Polymorphic: Equity | Crypto | FixedIncome | Commodity
- Has identity (asset_id, ticker/symbol)
- Immutable reference data

**Asset Types**:

1. **Equity**
   - `ticker: String` (e.g., "AAPL")
   - `exchange: Exchange` (e.g., NASDAQ)
   - `sector: Sector` (e.g., Technology)
   - `market_cap: MarketCap` (Large/Mid/Small)

2. **Crypto**
   - `symbol: String` (e.g., "BTC")
   - `blockchain: Blockchain` (e.g., Bitcoin, Ethereum)
   - `token_type: TokenType` (Coin, Token, NFT)

3. **FixedIncome**
   - `isin: String` (International Securities ID)
   - `coupon_rate: Decimal`
   - `maturity_date: DateTime<Utc>`
   - `credit_rating: CreditRating`

4. **Commodity**
   - `commodity_type: CommodityType` (Gold, Silver, Oil, etc.)
   - `unit: Unit` (Troy Ounce, Barrel, etc.)
   - `exchange: Exchange`

### 3. Value Objects

**PortfolioId** - Unique identifier for portfolio
```rust
pub struct PortfolioId(Uuid);
```

**HoldingId** - Unique identifier for holding
```rust
pub struct HoldingId(Uuid);
```

**Money** - Amount with currency
```rust
pub struct Money {
    amount: Decimal,
    currency: Currency,
}
```

**Currency** - ISO 4217 currency code
```rust
pub enum Currency {
    USD, EUR, GBP, JPY, BTC, ETH, // ... etc
}
```

**Allocation** - Percentage allocation (0-100%)
```rust
pub struct Allocation(Decimal); // 0.00 - 100.00
```

### 4. Domain Services

**PortfolioRebalancer** - Calculates rebalancing trades
**PerformanceCalculator** - Computes returns and metrics
**RiskAnalyzer** - Analyzes portfolio risk (VaR, Sharpe, etc.)

---

## Consequences

### Positive

✅ **Clear domain boundaries** - Aggregate roots enforce consistency  
✅ **Type safety** - Value objects prevent invalid states  
✅ **Testability** - Pure domain logic, easy to unit test  
✅ **Extensibility** - Easy to add new asset types  
✅ **Performance** - Rust's zero-cost abstractions  
✅ **Interoperability** - NAPI-RS enables Node.js integration  
✅ **Coherence** - Detected by DDD mapper, validated by pipeline  

### Negative

⚠️ **Complexity** - More types and abstractions than anemic model  
⚠️ **Learning curve** - Team must understand DDD patterns  
⚠️ **Boilerplate** - More code for value objects and invariants  

### Neutral

- Rust ownership model aligns well with aggregate boundaries
- Requires comprehensive test suite (≥80% coverage)
- Must document domain model for future maintainers

---

## Implementation Plan

### Phase 1: Value Objects (TDD)
1. Write tests for `PortfolioId`, `HoldingId`, `Money`, `Currency`, `Allocation`
2. Implement value objects with validation
3. Achieve ≥80% coverage

### Phase 2: Entities (TDD)
1. Write tests for `Asset` (Equity, Crypto, FixedIncome, Commodity)
2. Implement asset types with proper polymorphism
3. Write tests for `Holding`
4. Implement `Holding` entity

### Phase 3: Aggregate Root (TDD)
1. Write tests for `Portfolio` aggregate
2. Implement `Portfolio` with invariants
3. Test portfolio-level operations (add/remove holdings, rebalance)

### Phase 4: Domain Services
1. Implement `PortfolioRebalancer`
2. Implement `PerformanceCalculator`
3. Implement `RiskAnalyzer`

### Phase 5: Integration
1. Add NAPI-RS bindings
2. Integrate with coherence pipeline
3. Update DDD mapper to detect new models
4. Document architecture

---

## References

- **DDD Blue Book**: Eric Evans, "Domain-Driven Design"
- **DDD Red Book**: Vaughn Vernon, "Implementing Domain-Driven Design"
- **Rust DDD**: https://github.com/rust-ddd/rust-ddd-example
- **ADR-016**: Patent System Extension (related aggregate design)
- **Coherence Pipeline**: `src/coherence/ddd_mapper.py`

---

## Validation Criteria

- [ ] All value objects have validation logic
- [ ] All entities have identity
- [ ] Portfolio aggregate enforces invariants
- [ ] Test coverage ≥80%
- [ ] DDD mapper detects all models
- [ ] Coherence pipeline validates ADR↔DDD alignment
- [ ] Documentation complete

---

**Decision Date**: 2026-02-13  
**Review Date**: 2026-03-13 (30 days)


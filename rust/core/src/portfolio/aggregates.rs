//! Portfolio Aggregate Root
//!
//! DoR: Value objects (PortfolioId, HoldingId, Money, Currency) defined in value_objects module
//! DoD: All invariants (no duplicate holdings, positive quantity, currency match) tested
//!
//! The Portfolio aggregate root owns holdings and enforces portfolio-level invariants.

use super::entities::*;
use super::value_objects::*;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use thiserror::Error;

// ============================================================================
// Errors
// ============================================================================

#[derive(Error, Debug)]
pub enum PortfolioError {
    #[error("Duplicate holding for asset: {0}")]
    DuplicateHolding(String),

    #[error("Holding not found: {0}")]
    HoldingNotFound(String),

    #[error("Invalid quantity: {0} (must be positive)")]
    InvalidQuantity(Decimal),

    #[error("Currency mismatch: {0}")]
    CurrencyMismatch(String),

    #[error("Market price not found for asset: {0}")]
    MarketPriceNotFound(String),
}

// ============================================================================
// Portfolio Aggregate Root
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Portfolio {
    portfolio_id: PortfolioId,
    name: String,
    holdings: Vec<Holding>,
    base_currency: Currency,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl Portfolio {
    /// Create a new portfolio
    pub fn new(name: String, base_currency: Currency) -> Self {
        let now = Utc::now();
        Self {
            portfolio_id: PortfolioId::new(),
            name,
            holdings: Vec::new(),
            base_currency,
            created_at: now,
            updated_at: now,
        }
    }

    // ========================================================================
    // Getters
    // ========================================================================

    pub fn portfolio_id(&self) -> PortfolioId {
        self.portfolio_id
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn holdings(&self) -> &[Holding] {
        &self.holdings
    }

    pub fn base_currency(&self) -> Currency {
        self.base_currency
    }

    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    // ========================================================================
    // Commands (Mutating Operations)
    // ========================================================================

    /// Add a new holding to the portfolio
    ///
    /// # Invariants
    /// - No duplicate holdings for the same asset
    /// - Quantity must be positive
    /// - Cost basis currency must match portfolio base currency
    pub fn add_holding(
        &mut self,
        asset: Asset,
        quantity: Decimal,
        cost_basis: Money,
    ) -> Result<(), PortfolioError> {
        // Validate quantity
        if quantity <= Decimal::ZERO {
            return Err(PortfolioError::InvalidQuantity(quantity));
        }

        // Validate currency
        if cost_basis.currency() != self.base_currency {
            return Err(PortfolioError::CurrencyMismatch(format!(
                "Expected {}, got {}",
                self.base_currency.code(),
                cost_basis.currency().code()
            )));
        }

        // Check for duplicate
        let asset_name = asset.display_name();
        if self.holdings.iter().any(|h| h.asset().display_name() == asset_name) {
            return Err(PortfolioError::DuplicateHolding(asset_name));
        }

        // Add holding
        let holding = Holding::new(asset, quantity, cost_basis);
        self.holdings.push(holding);
        self.updated_at = Utc::now();

        Ok(())
    }

    /// Remove a holding from the portfolio
    pub fn remove_holding(&mut self, holding_id: HoldingId) -> Result<(), PortfolioError> {
        let index = self
            .holdings
            .iter()
            .position(|h| h.holding_id() == holding_id)
            .ok_or_else(|| PortfolioError::HoldingNotFound(holding_id.to_string()))?;

        self.holdings.remove(index);
        self.updated_at = Utc::now();

        Ok(())
    }

    // ========================================================================
    // Queries (Non-Mutating Operations)
    // ========================================================================

    /// Calculate total portfolio value at current market prices
    pub fn total_value(&self, market_prices: &HashMap<String, Money>) -> Result<Money, PortfolioError> {
        let mut total = Money::zero(self.base_currency);

        for holding in &self.holdings {
            let asset_name = holding.asset().display_name();
            let market_price = market_prices
                .get(&asset_name)
                .ok_or_else(|| PortfolioError::MarketPriceNotFound(asset_name.clone()))?;

            let market_value = holding.market_value(market_price);
            total = total.add(&market_value).map_err(|e| {
                PortfolioError::CurrencyMismatch(format!("Failed to add market value: {}", e))
            })?;
        }

        Ok(total)
    }

    /// Calculate total cost basis
    pub fn total_cost_basis(&self) -> Money {
        let mut total = Money::zero(self.base_currency);

        for holding in &self.holdings {
            total = total.add(holding.cost_basis()).unwrap(); // Safe: same currency
        }

        total
    }

    /// Calculate unrealized gain/loss
    pub fn unrealized_gain(&self, market_prices: &HashMap<String, Money>) -> Result<Money, PortfolioError> {
        let total_value = self.total_value(market_prices)?;
        let total_cost = self.total_cost_basis();

        total_value.subtract(&total_cost).map_err(|e| {
            PortfolioError::CurrencyMismatch(format!("Failed to calculate gain: {}", e))
        })
    }

    /// Calculate return percentage
    pub fn return_percentage(&self, market_prices: &HashMap<String, Money>) -> Result<Decimal, PortfolioError> {
        let total_value = self.total_value(market_prices)?;
        let total_cost = self.total_cost_basis();

        let gain = total_value.amount() - total_cost.amount();
        let return_pct = (gain / total_cost.amount()) * Decimal::from_str("100.00").unwrap();

        Ok(return_pct)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::portfolio::entities::{Equity, Exchange, Sector, MarketCap};

    fn sample_asset() -> Asset {
        Asset::Equity(Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        })
    }

    fn sample_asset_2() -> Asset {
        Asset::Equity(Equity {
            ticker: "GOOG".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        })
    }

    #[test]
    fn portfolio_new_is_empty() {
        let p = Portfolio::new("Test".to_string(), Currency::USD);
        assert_eq!(p.name(), "Test");
        assert_eq!(p.base_currency(), Currency::USD);
        assert!(p.holdings().is_empty());
    }

    #[test]
    fn portfolio_add_holding_success() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(1500), Currency::USD);
        let result = p.add_holding(sample_asset(), Decimal::from(10), cost);
        assert!(result.is_ok());
        assert_eq!(p.holdings().len(), 1);
    }

    #[test]
    fn portfolio_add_holding_zero_quantity_fails() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(100), Currency::USD);
        let result = p.add_holding(sample_asset(), Decimal::ZERO, cost);
        assert!(matches!(result, Err(PortfolioError::InvalidQuantity(_))));
    }

    #[test]
    fn portfolio_add_holding_negative_quantity_fails() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(100), Currency::USD);
        let result = p.add_holding(sample_asset(), Decimal::from(-5), cost);
        assert!(matches!(result, Err(PortfolioError::InvalidQuantity(_))));
    }

    #[test]
    fn portfolio_add_holding_currency_mismatch_fails() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(100), Currency::EUR); // wrong currency
        let result = p.add_holding(sample_asset(), Decimal::from(10), cost);
        assert!(matches!(result, Err(PortfolioError::CurrencyMismatch(_))));
    }

    #[test]
    fn portfolio_add_duplicate_holding_fails() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost1 = Money::new(Decimal::from(100), Currency::USD);
        let cost2 = Money::new(Decimal::from(200), Currency::USD);
        p.add_holding(sample_asset(), Decimal::from(10), cost1).unwrap();
        let result = p.add_holding(sample_asset(), Decimal::from(5), cost2);
        assert!(matches!(result, Err(PortfolioError::DuplicateHolding(_))));
    }

    #[test]
    fn portfolio_remove_holding_success() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(100), Currency::USD);
        p.add_holding(sample_asset(), Decimal::from(10), cost).unwrap();
        let hid = p.holdings()[0].holding_id();
        assert!(p.remove_holding(hid).is_ok());
        assert!(p.holdings().is_empty());
    }

    #[test]
    fn portfolio_remove_nonexistent_holding_fails() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let result = p.remove_holding(HoldingId::new());
        assert!(matches!(result, Err(PortfolioError::HoldingNotFound(_))));
    }

    #[test]
    fn portfolio_total_value() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(1000), Currency::USD);
        p.add_holding(sample_asset(), Decimal::from(10), cost).unwrap();

        let mut prices = HashMap::new();
        prices.insert("AAPL".to_string(), Money::new(Decimal::from(150), Currency::USD));

        let total = p.total_value(&prices).unwrap();
        assert_eq!(total.amount(), Decimal::from(1500)); // 10 * 150
    }

    #[test]
    fn portfolio_total_cost_basis() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost1 = Money::new(Decimal::from(1000), Currency::USD);
        let cost2 = Money::new(Decimal::from(2000), Currency::USD);
        p.add_holding(sample_asset(), Decimal::from(10), cost1).unwrap();
        p.add_holding(sample_asset_2(), Decimal::from(5), cost2).unwrap();
        assert_eq!(p.total_cost_basis().amount(), Decimal::from(3000));
    }

    #[test]
    fn portfolio_unrealized_gain() {
        let mut p = Portfolio::new("Test".to_string(), Currency::USD);
        let cost = Money::new(Decimal::from(1000), Currency::USD);
        p.add_holding(sample_asset(), Decimal::from(10), cost).unwrap();

        let mut prices = HashMap::new();
        prices.insert("AAPL".to_string(), Money::new(Decimal::from(150), Currency::USD));

        let gain = p.unrealized_gain(&prices).unwrap();
        assert_eq!(gain.amount(), Decimal::from(500)); // 1500 - 1000
    }
}


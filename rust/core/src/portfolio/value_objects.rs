//! Portfolio Value Objects
//!
//! DoR: Currency codes and financial precision requirements defined
//! DoD: All value objects immutable, validated at construction, equality-tested
//!
//! Value objects are immutable, validated types that represent domain concepts.
//! They have no identity and are compared by value.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use thiserror::Error;
use uuid::Uuid;

// ============================================================================
// Errors
// ============================================================================

#[derive(Error, Debug, PartialEq)]
pub enum ValueObjectError {
    #[error("Invalid UUID: {0}")]
    InvalidUuid(String),
    
    #[error("Invalid currency code: {0}")]
    InvalidCurrency(String),
    
    #[error("Currency mismatch: expected {expected}, got {actual}")]
    CurrencyMismatch { expected: String, actual: String },
    
    #[error("Invalid allocation: {0}% (must be 0-100)")]
    InvalidAllocation(Decimal),
}

// ============================================================================
// PortfolioId
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PortfolioId(Uuid);

impl PortfolioId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for PortfolioId {
    fn default() -> Self {
        Self::new()
    }
}

impl FromStr for PortfolioId {
    type Err = ValueObjectError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| ValueObjectError::InvalidUuid(e.to_string()))
    }
}

impl fmt::Display for PortfolioId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ============================================================================
// HoldingId
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HoldingId(Uuid);

impl HoldingId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for HoldingId {
    fn default() -> Self {
        Self::new()
    }
}

impl FromStr for HoldingId {
    type Err = ValueObjectError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| ValueObjectError::InvalidUuid(e.to_string()))
    }
}

impl fmt::Display for HoldingId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ============================================================================
// Currency
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    JPY,
    BTC,
    ETH,
}

impl Currency {
    pub fn code(&self) -> &'static str {
        match self {
            Currency::USD => "USD",
            Currency::EUR => "EUR",
            Currency::GBP => "GBP",
            Currency::JPY => "JPY",
            Currency::BTC => "BTC",
            Currency::ETH => "ETH",
        }
    }

    pub fn symbol(&self) -> &'static str {
        match self {
            Currency::USD => "$",
            Currency::EUR => "€",
            Currency::GBP => "£",
            Currency::JPY => "¥",
            Currency::BTC => "₿",
            Currency::ETH => "Ξ",
        }
    }

    pub fn from_code(code: &str) -> Result<Self, ValueObjectError> {
        match code {
            "USD" => Ok(Currency::USD),
            "EUR" => Ok(Currency::EUR),
            "GBP" => Ok(Currency::GBP),
            "JPY" => Ok(Currency::JPY),
            "BTC" => Ok(Currency::BTC),
            "ETH" => Ok(Currency::ETH),
            _ => Err(ValueObjectError::InvalidCurrency(code.to_string())),
        }
    }
}

impl fmt::Display for Currency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.code())
    }
}

// ============================================================================
// Money
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Money {
    amount: Decimal,
    currency: Currency,
}

impl Money {
    pub fn new(amount: Decimal, currency: Currency) -> Self {
        Self { amount, currency }
    }

    pub fn zero(currency: Currency) -> Self {
        Self {
            amount: Decimal::ZERO,
            currency,
        }
    }

    pub fn amount(&self) -> Decimal {
        self.amount
    }

    pub fn currency(&self) -> Currency {
        self.currency
    }

    pub fn is_positive(&self) -> bool {
        self.amount > Decimal::ZERO
    }

    pub fn is_negative(&self) -> bool {
        self.amount < Decimal::ZERO
    }

    pub fn add(&self, other: &Money) -> Result<Money, ValueObjectError> {
        if self.currency != other.currency {
            return Err(ValueObjectError::CurrencyMismatch {
                expected: self.currency.code().to_string(),
                actual: other.currency.code().to_string(),
            });
        }
        Ok(Money::new(self.amount + other.amount, self.currency))
    }

    pub fn subtract(&self, other: &Money) -> Result<Money, ValueObjectError> {
        if self.currency != other.currency {
            return Err(ValueObjectError::CurrencyMismatch {
                expected: self.currency.code().to_string(),
                actual: other.currency.code().to_string(),
            });
        }
        Ok(Money::new(self.amount - other.amount, self.currency))
    }

    pub fn multiply(&self, factor: Decimal) -> Money {
        Money::new(self.amount * factor, self.currency)
    }
}

// ============================================================================
// Allocation
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Allocation(Decimal);

impl Allocation {
    pub fn new(percentage: Decimal) -> Result<Self, ValueObjectError> {
        if percentage < Decimal::ZERO || percentage > Decimal::from_str("100.00").unwrap() {
            return Err(ValueObjectError::InvalidAllocation(percentage));
        }
        Ok(Self(percentage))
    }

    pub fn percentage(&self) -> Decimal {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- PortfolioId ---

    #[test]
    fn portfolio_id_uniqueness() {
        let id1 = PortfolioId::new();
        let id2 = PortfolioId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn portfolio_id_from_valid_str() {
        let id = PortfolioId::new();
        let s = id.to_string();
        let parsed: PortfolioId = s.parse().unwrap();
        assert_eq!(id, parsed);
    }

    #[test]
    fn portfolio_id_from_invalid_str() {
        let result: Result<PortfolioId, _> = "not-a-uuid".parse();
        assert!(result.is_err());
    }

    #[test]
    fn portfolio_id_display() {
        let id = PortfolioId::new();
        let display = format!("{}", id);
        assert!(!display.is_empty());
        assert!(display.contains('-')); // UUID format
    }

    // --- HoldingId ---

    #[test]
    fn holding_id_uniqueness() {
        let id1 = HoldingId::new();
        let id2 = HoldingId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn holding_id_roundtrip() {
        let id = HoldingId::new();
        let s = id.to_string();
        let parsed: HoldingId = s.parse().unwrap();
        assert_eq!(id, parsed);
    }

    // --- Currency ---

    #[test]
    fn currency_codes() {
        assert_eq!(Currency::USD.code(), "USD");
        assert_eq!(Currency::EUR.code(), "EUR");
        assert_eq!(Currency::BTC.code(), "BTC");
        assert_eq!(Currency::ETH.code(), "ETH");
    }

    #[test]
    fn currency_symbols() {
        assert_eq!(Currency::USD.symbol(), "$");
        assert_eq!(Currency::EUR.symbol(), "€");
        assert_eq!(Currency::GBP.symbol(), "£");
        assert_eq!(Currency::BTC.symbol(), "₿");
    }

    #[test]
    fn currency_from_valid_code() {
        assert_eq!(Currency::from_code("USD").unwrap(), Currency::USD);
        assert_eq!(Currency::from_code("BTC").unwrap(), Currency::BTC);
    }

    #[test]
    fn currency_from_invalid_code() {
        let result = Currency::from_code("XYZ");
        assert!(matches!(result, Err(ValueObjectError::InvalidCurrency(_))));
    }

    // --- Money ---

    #[test]
    fn money_creation_and_getters() {
        let m = Money::new(Decimal::from(100), Currency::USD);
        assert_eq!(m.amount(), Decimal::from(100));
        assert_eq!(m.currency(), Currency::USD);
    }

    #[test]
    fn money_zero() {
        let m = Money::zero(Currency::EUR);
        assert_eq!(m.amount(), Decimal::ZERO);
        assert!(!m.is_positive());
        assert!(!m.is_negative());
    }

    #[test]
    fn money_positive_negative() {
        let pos = Money::new(Decimal::from(50), Currency::USD);
        assert!(pos.is_positive());
        assert!(!pos.is_negative());

        let neg = Money::new(Decimal::from(-10), Currency::USD);
        assert!(!neg.is_positive());
        assert!(neg.is_negative());
    }

    #[test]
    fn money_add_same_currency() {
        let a = Money::new(Decimal::from(100), Currency::USD);
        let b = Money::new(Decimal::from(50), Currency::USD);
        let result = a.add(&b).unwrap();
        assert_eq!(result.amount(), Decimal::from(150));
    }

    #[test]
    fn money_add_different_currency_fails() {
        let a = Money::new(Decimal::from(100), Currency::USD);
        let b = Money::new(Decimal::from(50), Currency::EUR);
        let result = a.add(&b);
        assert!(matches!(result, Err(ValueObjectError::CurrencyMismatch { .. })));
    }

    #[test]
    fn money_subtract_same_currency() {
        let a = Money::new(Decimal::from(100), Currency::USD);
        let b = Money::new(Decimal::from(30), Currency::USD);
        let result = a.subtract(&b).unwrap();
        assert_eq!(result.amount(), Decimal::from(70));
    }

    #[test]
    fn money_multiply() {
        let m = Money::new(Decimal::from(100), Currency::USD);
        let result = m.multiply(Decimal::from(3));
        assert_eq!(result.amount(), Decimal::from(300));
    }

    // --- Allocation ---

    #[test]
    fn allocation_valid_range() {
        let a = Allocation::new(Decimal::from(50)).unwrap();
        assert_eq!(a.percentage(), Decimal::from(50));
    }

    #[test]
    fn allocation_zero_valid() {
        let a = Allocation::new(Decimal::ZERO).unwrap();
        assert_eq!(a.percentage(), Decimal::ZERO);
    }

    #[test]
    fn allocation_100_valid() {
        let a = Allocation::new(Decimal::from(100)).unwrap();
        assert_eq!(a.percentage(), Decimal::from(100));
    }

    #[test]
    fn allocation_negative_invalid() {
        let result = Allocation::new(Decimal::from(-1));
        assert!(matches!(result, Err(ValueObjectError::InvalidAllocation(_))));
    }

    #[test]
    fn allocation_over_100_invalid() {
        let result = Allocation::new(Decimal::from(101));
        assert!(matches!(result, Err(ValueObjectError::InvalidAllocation(_))));
    }
}


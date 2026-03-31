//! TDD Tests for Portfolio Value Objects
//!
//! Following Test-Driven Development: Write tests FIRST, then implement.
//!
//! Test Coverage Target: ≥80%

use rust_core::portfolio::*;
use rust_decimal::Decimal;
use std::str::FromStr;

#[cfg(test)]
mod portfolio_id_tests {
    use super::*;

    #[test]
    fn test_portfolio_id_creation() {
        let id = PortfolioId::new();
        assert!(!id.to_string().is_empty());
    }

    #[test]
    fn test_portfolio_id_from_string() {
        let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
        let id = PortfolioId::from_str(uuid_str).unwrap();
        assert_eq!(id.to_string(), uuid_str);
    }

    #[test]
    fn test_portfolio_id_equality() {
        let id1 = PortfolioId::new();
        let id2 = id1.clone();
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_portfolio_id_inequality() {
        let id1 = PortfolioId::new();
        let id2 = PortfolioId::new();
        assert_ne!(id1, id2);
    }
}

#[cfg(test)]
mod holding_id_tests {
    use super::*;

    #[test]
    fn test_holding_id_creation() {
        let id = HoldingId::new();
        assert!(!id.to_string().is_empty());
    }

    #[test]
    fn test_holding_id_from_string() {
        let uuid_str = "660e8400-e29b-41d4-a716-446655440000";
        let id = HoldingId::from_str(uuid_str).unwrap();
        assert_eq!(id.to_string(), uuid_str);
    }
}

#[cfg(test)]
mod currency_tests {
    use super::*;

    #[test]
    fn test_currency_usd() {
        let currency = Currency::USD;
        assert_eq!(currency.code(), "USD");
        assert_eq!(currency.symbol(), "$");
    }

    #[test]
    fn test_currency_btc() {
        let currency = Currency::BTC;
        assert_eq!(currency.code(), "BTC");
        assert_eq!(currency.symbol(), "₿");
    }

    #[test]
    fn test_currency_from_code() {
        let currency = Currency::from_code("EUR").unwrap();
        assert_eq!(currency, Currency::EUR);
    }

    #[test]
    fn test_currency_invalid_code() {
        let result = Currency::from_code("INVALID");
        assert!(result.is_err());
    }
}

#[cfg(test)]
mod money_tests {
    use super::*;

    #[test]
    fn test_money_creation() {
        let money = Money::new(Decimal::from_str("100.50").unwrap(), Currency::USD);
        assert_eq!(money.amount(), Decimal::from_str("100.50").unwrap());
        assert_eq!(money.currency(), Currency::USD);
    }

    #[test]
    fn test_money_addition_same_currency() {
        let m1 = Money::new(Decimal::from_str("100.00").unwrap(), Currency::USD);
        let m2 = Money::new(Decimal::from_str("50.00").unwrap(), Currency::USD);
        let result = m1.add(&m2).unwrap();
        assert_eq!(result.amount(), Decimal::from_str("150.00").unwrap());
    }

    #[test]
    fn test_money_addition_different_currency_fails() {
        let m1 = Money::new(Decimal::from_str("100.00").unwrap(), Currency::USD);
        let m2 = Money::new(Decimal::from_str("50.00").unwrap(), Currency::EUR);
        let result = m1.add(&m2);
        assert!(result.is_err());
    }

    #[test]
    fn test_money_subtraction() {
        let m1 = Money::new(Decimal::from_str("100.00").unwrap(), Currency::USD);
        let m2 = Money::new(Decimal::from_str("30.00").unwrap(), Currency::USD);
        let result = m1.subtract(&m2).unwrap();
        assert_eq!(result.amount(), Decimal::from_str("70.00").unwrap());
    }

    #[test]
    fn test_money_multiply() {
        let money = Money::new(Decimal::from_str("10.00").unwrap(), Currency::USD);
        let result = money.multiply(Decimal::from_str("3.5").unwrap());
        assert_eq!(result.amount(), Decimal::from_str("35.00").unwrap());
    }

    #[test]
    fn test_money_zero() {
        let money = Money::zero(Currency::USD);
        assert_eq!(money.amount(), Decimal::ZERO);
    }

    #[test]
    fn test_money_is_positive() {
        let money = Money::new(Decimal::from_str("100.00").unwrap(), Currency::USD);
        assert!(money.is_positive());
    }

    #[test]
    fn test_money_is_negative() {
        let money = Money::new(Decimal::from_str("-50.00").unwrap(), Currency::USD);
        assert!(money.is_negative());
    }
}

#[cfg(test)]
mod allocation_tests {
    use super::*;

    #[test]
    fn test_allocation_valid() {
        let allocation = Allocation::new(Decimal::from_str("50.00").unwrap()).unwrap();
        assert_eq!(allocation.percentage(), Decimal::from_str("50.00").unwrap());
    }

    #[test]
    fn test_allocation_zero() {
        let allocation = Allocation::new(Decimal::ZERO).unwrap();
        assert_eq!(allocation.percentage(), Decimal::ZERO);
    }

    #[test]
    fn test_allocation_hundred() {
        let allocation = Allocation::new(Decimal::from_str("100.00").unwrap()).unwrap();
        assert_eq!(allocation.percentage(), Decimal::from_str("100.00").unwrap());
    }

    #[test]
    fn test_allocation_negative_fails() {
        let result = Allocation::new(Decimal::from_str("-10.00").unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_allocation_over_hundred_fails() {
        let result = Allocation::new(Decimal::from_str("101.00").unwrap());
        assert!(result.is_err());
    }
}


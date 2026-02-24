//! TDD Tests for Portfolio Aggregate Root
//!
//! Following Test-Driven Development: Write tests FIRST, then implement.
//!
//! Test Coverage Target: ≥80%

use rust_core::portfolio::*;
use rust_decimal::Decimal;
use std::str::FromStr;

#[cfg(test)]
mod portfolio_tests {
    use super::*;

    fn create_test_equity() -> Asset {
        Asset::Equity(Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        })
    }

    fn create_test_crypto() -> Asset {
        Asset::Crypto(Crypto {
            symbol: "BTC".to_string(),
            blockchain: Blockchain::Bitcoin,
            token_type: TokenType::Coin,
        })
    }

    #[test]
    fn test_portfolio_creation() {
        let portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);
        assert_eq!(portfolio.name(), "My Portfolio");
        assert_eq!(portfolio.base_currency(), Currency::USD);
        assert_eq!(portfolio.holdings().len(), 0);
    }

    #[test]
    fn test_portfolio_add_holding() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);
        let asset = create_test_equity();
        let cost_basis = Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD);

        let result = portfolio.add_holding(asset, Decimal::from_str("10.0").unwrap(), cost_basis);
        assert!(result.is_ok());
        assert_eq!(portfolio.holdings().len(), 1);
    }

    #[test]
    fn test_portfolio_add_duplicate_holding_fails() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);
        let asset = create_test_equity();
        let cost_basis = Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD);

        portfolio
            .add_holding(asset.clone(), Decimal::from_str("10.0").unwrap(), cost_basis.clone())
            .unwrap();

        let result = portfolio.add_holding(asset, Decimal::from_str("5.0").unwrap(), cost_basis);
        assert!(result.is_err());
    }

    #[test]
    fn test_portfolio_remove_holding() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);
        let asset = create_test_equity();
        let cost_basis = Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD);

        portfolio
            .add_holding(asset.clone(), Decimal::from_str("10.0").unwrap(), cost_basis)
            .unwrap();

        let holding_id = portfolio.holdings()[0].holding_id();
        let result = portfolio.remove_holding(holding_id);
        assert!(result.is_ok());
        assert_eq!(portfolio.holdings().len(), 0);
    }

    #[test]
    fn test_portfolio_total_value() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);

        // Add AAPL holding
        let aapl = create_test_equity();
        portfolio
            .add_holding(
                aapl,
                Decimal::from_str("10.0").unwrap(),
                Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
            )
            .unwrap();

        // Add BTC holding
        let btc = create_test_crypto();
        portfolio
            .add_holding(
                btc,
                Decimal::from_str("0.5").unwrap(),
                Money::new(Decimal::from_str("25000.00").unwrap(), Currency::USD),
            )
            .unwrap();

        // Calculate total value with market prices
        let mut market_prices = std::collections::HashMap::new();
        market_prices.insert(
            "AAPL".to_string(),
            Money::new(Decimal::from_str("175.00").unwrap(), Currency::USD),
        );
        market_prices.insert(
            "BTC".to_string(),
            Money::new(Decimal::from_str("60000.00").unwrap(), Currency::USD),
        );

        let total_value = portfolio.total_value(&market_prices).unwrap();
        // AAPL: 10 * 175 = 1750
        // BTC: 0.5 * 60000 = 30000
        // Total: 31750
        assert_eq!(total_value.amount(), Decimal::from_str("31750.00").unwrap());
    }

    #[test]
    fn test_portfolio_total_cost_basis() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);

        portfolio
            .add_holding(
                create_test_equity(),
                Decimal::from_str("10.0").unwrap(),
                Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
            )
            .unwrap();

        portfolio
            .add_holding(
                create_test_crypto(),
                Decimal::from_str("0.5").unwrap(),
                Money::new(Decimal::from_str("25000.00").unwrap(), Currency::USD),
            )
            .unwrap();

        let total_cost = portfolio.total_cost_basis();
        assert_eq!(total_cost.amount(), Decimal::from_str("26500.00").unwrap());
    }

    #[test]
    fn test_portfolio_unrealized_gain() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);

        portfolio
            .add_holding(
                create_test_equity(),
                Decimal::from_str("10.0").unwrap(),
                Money::new(Decimal::from_str("1000.00").unwrap(), Currency::USD),
            )
            .unwrap();

        let mut market_prices = std::collections::HashMap::new();
        market_prices.insert(
            "AAPL".to_string(),
            Money::new(Decimal::from_str("120.00").unwrap(), Currency::USD),
        );

        let gain = portfolio.unrealized_gain(&market_prices).unwrap();
        // Market: 10 * 120 = 1200
        // Cost: 1000
        // Gain: 200
        assert_eq!(gain.amount(), Decimal::from_str("200.00").unwrap());
    }

    #[test]
    fn test_portfolio_return_percentage() {
        let mut portfolio = Portfolio::new("My Portfolio".to_string(), Currency::USD);

        portfolio
            .add_holding(
                create_test_equity(),
                Decimal::from_str("10.0").unwrap(),
                Money::new(Decimal::from_str("1000.00").unwrap(), Currency::USD),
            )
            .unwrap();

        let mut market_prices = std::collections::HashMap::new();
        market_prices.insert(
            "AAPL".to_string(),
            Money::new(Decimal::from_str("120.00").unwrap(), Currency::USD),
        );

        let return_pct = portfolio.return_percentage(&market_prices).unwrap();
        // (1200 - 1000) / 1000 = 0.20 = 20%
        assert_eq!(return_pct, Decimal::from_str("20.00").unwrap());
    }
}


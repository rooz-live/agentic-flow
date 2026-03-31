//! TDD Tests for Portfolio Entities
//!
//! Following Test-Driven Development: Write tests FIRST, then implement.
//!
//! Test Coverage Target: ≥80%

use rust_core::portfolio::*;
use rust_decimal::Decimal;
use std::str::FromStr;

#[cfg(test)]
mod asset_tests {
    use super::*;

    #[test]
    fn test_equity_creation() {
        let equity = Asset::Equity(Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        });

        match equity {
            Asset::Equity(e) => {
                assert_eq!(e.ticker, "AAPL");
                assert_eq!(e.exchange, Exchange::NASDAQ);
            }
            _ => panic!("Expected Equity variant"),
        }
    }

    #[test]
    fn test_crypto_creation() {
        let crypto = Asset::Crypto(Crypto {
            symbol: "BTC".to_string(),
            blockchain: Blockchain::Bitcoin,
            token_type: TokenType::Coin,
        });

        match crypto {
            Asset::Crypto(c) => {
                assert_eq!(c.symbol, "BTC");
                assert_eq!(c.blockchain, Blockchain::Bitcoin);
            }
            _ => panic!("Expected Crypto variant"),
        }
    }

    #[test]
    fn test_fixed_income_creation() {
        let bond = Asset::FixedIncome(FixedIncome {
            isin: "US912828XG93".to_string(),
            coupon_rate: Decimal::from_str("2.5").unwrap(),
            maturity_date: chrono::Utc::now() + chrono::Duration::days(365 * 10),
            credit_rating: CreditRating::AAA,
        });

        match bond {
            Asset::FixedIncome(f) => {
                assert_eq!(f.isin, "US912828XG93");
                assert_eq!(f.credit_rating, CreditRating::AAA);
            }
            _ => panic!("Expected FixedIncome variant"),
        }
    }

    #[test]
    fn test_commodity_creation() {
        let commodity = Asset::Commodity(Commodity {
            commodity_type: CommodityType::Gold,
            unit: Unit::TroyOunce,
            exchange: Exchange::COMEX,
        });

        match commodity {
            Asset::Commodity(c) => {
                assert_eq!(c.commodity_type, CommodityType::Gold);
                assert_eq!(c.unit, Unit::TroyOunce);
            }
            _ => panic!("Expected Commodity variant"),
        }
    }

    #[test]
    fn test_asset_display_name() {
        let equity = Asset::Equity(Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        });

        assert_eq!(equity.display_name(), "AAPL");

        let crypto = Asset::Crypto(Crypto {
            symbol: "BTC".to_string(),
            blockchain: Blockchain::Bitcoin,
            token_type: TokenType::Coin,
        });

        assert_eq!(crypto.display_name(), "BTC");
    }
}

#[cfg(test)]
mod holding_tests {
    use super::*;

    fn create_test_equity() -> Asset {
        Asset::Equity(Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        })
    }

    #[test]
    fn test_holding_creation() {
        let asset = create_test_equity();
        let holding = Holding::new(
            asset,
            Decimal::from_str("10.0").unwrap(),
            Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
        );

        assert_eq!(holding.quantity(), Decimal::from_str("10.0").unwrap());
        assert_eq!(
            holding.cost_basis().amount(),
            Decimal::from_str("1500.00").unwrap()
        );
    }

    #[test]
    fn test_holding_market_value() {
        let asset = create_test_equity();
        let holding = Holding::new(
            asset,
            Decimal::from_str("10.0").unwrap(),
            Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
        );

        let market_price = Money::new(Decimal::from_str("175.00").unwrap(), Currency::USD);
        let market_value = holding.market_value(&market_price);

        assert_eq!(
            market_value.amount(),
            Decimal::from_str("1750.00").unwrap()
        );
    }

    #[test]
    fn test_holding_unrealized_gain() {
        let asset = create_test_equity();
        let holding = Holding::new(
            asset,
            Decimal::from_str("10.0").unwrap(),
            Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
        );

        let market_price = Money::new(Decimal::from_str("175.00").unwrap(), Currency::USD);
        let gain = holding.unrealized_gain(&market_price).unwrap();

        assert_eq!(gain.amount(), Decimal::from_str("250.00").unwrap());
    }

    #[test]
    fn test_holding_unrealized_loss() {
        let asset = create_test_equity();
        let holding = Holding::new(
            asset,
            Decimal::from_str("10.0").unwrap(),
            Money::new(Decimal::from_str("1500.00").unwrap(), Currency::USD),
        );

        let market_price = Money::new(Decimal::from_str("125.00").unwrap(), Currency::USD);
        let gain = holding.unrealized_gain(&market_price).unwrap();

        assert_eq!(gain.amount(), Decimal::from_str("-250.00").unwrap());
    }

    #[test]
    fn test_holding_return_percentage() {
        let asset = create_test_equity();
        let holding = Holding::new(
            asset,
            Decimal::from_str("10.0").unwrap(),
            Money::new(Decimal::from_str("1000.00").unwrap(), Currency::USD),
        );

        let market_price = Money::new(Decimal::from_str("120.00").unwrap(), Currency::USD);
        let return_pct = holding.return_percentage(&market_price);

        // (1200 - 1000) / 1000 = 0.20 = 20%
        assert_eq!(return_pct, Decimal::from_str("20.00").unwrap());
    }
}


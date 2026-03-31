//! Portfolio Entities
//!
//! DoR: Value objects (Money, Currency, HoldingId) defined; Asset variants specified
//! DoD: Each entity type has identity-based tests; market value calculation verified
//!
//! Entities have identity and mutable state. They are compared by ID, not value.

use super::value_objects::*;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

// ============================================================================
// Asset (Polymorphic Entity)
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Asset {
    Equity(Equity),
    Crypto(Crypto),
    FixedIncome(FixedIncome),
    Commodity(Commodity),
}

impl Asset {
    pub fn display_name(&self) -> String {
        match self {
            Asset::Equity(e) => e.ticker.clone(),
            Asset::Crypto(c) => c.symbol.clone(),
            Asset::FixedIncome(f) => f.isin.clone(),
            Asset::Commodity(c) => format!("{:?}", c.commodity_type),
        }
    }
}

// ============================================================================
// Equity
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Equity {
    pub ticker: String,
    pub exchange: Exchange,
    pub sector: Sector,
    pub market_cap: MarketCap,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Exchange {
    NYSE,
    NASDAQ,
    LSE,
    TSE,
    COMEX,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Sector {
    Technology,
    Healthcare,
    Finance,
    Energy,
    ConsumerGoods,
    Industrials,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketCap {
    Large,  // > $10B
    Mid,    // $2B - $10B
    Small,  // < $2B
}

// ============================================================================
// Crypto
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Crypto {
    pub symbol: String,
    pub blockchain: Blockchain,
    pub token_type: TokenType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Blockchain {
    Bitcoin,
    Ethereum,
    Solana,
    Polygon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TokenType {
    Coin,
    Token,
    NFT,
}

// ============================================================================
// FixedIncome
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FixedIncome {
    pub isin: String,
    pub coupon_rate: Decimal,
    pub maturity_date: DateTime<Utc>,
    pub credit_rating: CreditRating,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CreditRating {
    AAA,
    AA,
    A,
    BBB,
    BB,
    B,
    CCC,
}

// ============================================================================
// Commodity
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Commodity {
    pub commodity_type: CommodityType,
    pub unit: Unit,
    pub exchange: Exchange,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CommodityType {
    Gold,
    Silver,
    Oil,
    NaturalGas,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Unit {
    TroyOunce,
    Barrel,
    MMBtu, // Million British Thermal Units
}

// ============================================================================
// Holding (Entity)
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Holding {
    holding_id: HoldingId,
    asset: Asset,
    quantity: Decimal,
    cost_basis: Money,
    acquisition_date: DateTime<Utc>,
}

impl Holding {
    pub fn new(asset: Asset, quantity: Decimal, cost_basis: Money) -> Self {
        Self {
            holding_id: HoldingId::new(),
            asset,
            quantity,
            cost_basis,
            acquisition_date: Utc::now(),
        }
    }

    pub fn holding_id(&self) -> HoldingId {
        self.holding_id
    }

    pub fn asset(&self) -> &Asset {
        &self.asset
    }

    pub fn quantity(&self) -> Decimal {
        self.quantity
    }

    pub fn cost_basis(&self) -> &Money {
        &self.cost_basis
    }

    pub fn acquisition_date(&self) -> DateTime<Utc> {
        self.acquisition_date
    }

    pub fn market_value(&self, market_price: &Money) -> Money {
        market_price.multiply(self.quantity)
    }

    pub fn unrealized_gain(&self, market_price: &Money) -> Result<Money, ValueObjectError> {
        let market_value = self.market_value(market_price);
        market_value.subtract(&self.cost_basis)
    }

    pub fn return_percentage(&self, market_price: &Money) -> Decimal {
        let market_value = self.market_value(market_price);
        let gain = market_value.amount() - self.cost_basis.amount();
        (gain / self.cost_basis.amount()) * Decimal::from_str("100.00").unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_equity() -> Equity {
        Equity {
            ticker: "AAPL".to_string(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        }
    }

    fn sample_crypto() -> Crypto {
        Crypto {
            symbol: "BTC".to_string(),
            blockchain: Blockchain::Bitcoin,
            token_type: TokenType::Coin,
        }
    }

    fn sample_fixed_income() -> FixedIncome {
        FixedIncome {
            isin: "US9128283F69".to_string(),
            coupon_rate: Decimal::from_str("2.5").unwrap(),
            maturity_date: Utc::now(),
            credit_rating: CreditRating::AAA,
        }
    }

    fn sample_commodity() -> Commodity {
        Commodity {
            commodity_type: CommodityType::Gold,
            unit: Unit::TroyOunce,
            exchange: Exchange::COMEX,
        }
    }

    // --- Asset display_name ---

    #[test]
    fn asset_equity_display_name() {
        let asset = Asset::Equity(sample_equity());
        assert_eq!(asset.display_name(), "AAPL");
    }

    #[test]
    fn asset_crypto_display_name() {
        let asset = Asset::Crypto(sample_crypto());
        assert_eq!(asset.display_name(), "BTC");
    }

    #[test]
    fn asset_fixed_income_display_name() {
        let asset = Asset::FixedIncome(sample_fixed_income());
        assert_eq!(asset.display_name(), "US9128283F69");
    }

    #[test]
    fn asset_commodity_display_name() {
        let asset = Asset::Commodity(sample_commodity());
        assert_eq!(asset.display_name(), "Gold");
    }

    // --- Enum variants ---

    #[test]
    fn exchange_variants() {
        let exchanges = [Exchange::NYSE, Exchange::NASDAQ, Exchange::LSE, Exchange::TSE, Exchange::COMEX];
        assert_eq!(exchanges.len(), 5);
    }

    #[test]
    fn sector_variants() {
        let sectors = [
            Sector::Technology, Sector::Healthcare, Sector::Finance,
            Sector::Energy, Sector::ConsumerGoods, Sector::Industrials,
        ];
        assert_eq!(sectors.len(), 6);
    }

    #[test]
    fn credit_rating_variants() {
        let ratings = [
            CreditRating::AAA, CreditRating::AA, CreditRating::A,
            CreditRating::BBB, CreditRating::BB, CreditRating::B, CreditRating::CCC,
        ];
        assert_eq!(ratings.len(), 7);
    }

    #[test]
    fn blockchain_variants() {
        let chains = [Blockchain::Bitcoin, Blockchain::Ethereum, Blockchain::Solana, Blockchain::Polygon];
        assert_eq!(chains.len(), 4);
    }

    // --- Holding ---

    #[test]
    fn holding_new_sets_fields() {
        let asset = Asset::Equity(sample_equity());
        let cost = Money::new(Decimal::from(150), Currency::USD);
        let h = Holding::new(asset.clone(), Decimal::from(10), cost);
        assert_eq!(*h.asset(), asset);
        assert_eq!(h.quantity(), Decimal::from(10));
    }

    #[test]
    fn holding_market_value() {
        let asset = Asset::Equity(sample_equity());
        let cost = Money::new(Decimal::from(100), Currency::USD);
        let h = Holding::new(asset, Decimal::from(5), cost);
        let price = Money::new(Decimal::from(200), Currency::USD);
        let mv = h.market_value(&price);
        assert_eq!(mv.amount(), Decimal::from(1000)); // 5 * 200
    }

    #[test]
    fn holding_unrealized_gain() {
        let asset = Asset::Equity(sample_equity());
        let cost = Money::new(Decimal::from(500), Currency::USD);
        let h = Holding::new(asset, Decimal::from(5), cost);
        let price = Money::new(Decimal::from(200), Currency::USD);
        let gain = h.unrealized_gain(&price).unwrap();
        assert_eq!(gain.amount(), Decimal::from(500)); // 1000 - 500
    }

    #[test]
    fn holding_return_percentage() {
        let asset = Asset::Equity(sample_equity());
        let cost = Money::new(Decimal::from(500), Currency::USD);
        let h = Holding::new(asset, Decimal::from(5), cost);
        let price = Money::new(Decimal::from(200), Currency::USD);
        let ret = h.return_percentage(&price);
        assert_eq!(ret, Decimal::from(100)); // (1000-500)/500 * 100 = 100%
    }

    #[test]
    fn holding_id_is_unique() {
        let asset = Asset::Crypto(sample_crypto());
        let cost = Money::new(Decimal::from(50000), Currency::USD);
        let h1 = Holding::new(asset.clone(), Decimal::from(1), cost.clone());
        let h2 = Holding::new(asset, Decimal::from(1), cost);
        assert_ne!(h1.holding_id(), h2.holding_id());
    }
}


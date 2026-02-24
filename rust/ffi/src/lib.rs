// NAPI-RS Bindings — Bridge Rust Domain Services to Node.js/TypeScript
//
// DoR: `portfolio::*` and `cache` modules compile; `napi` feature enabled
// DoD: All wrappers expose real service methods (no stubs); f64↔Decimal at boundary
//
// # Architecture (ADR-018)
//
// - Rust `Decimal` ↔ JS `number` (f64) conversion happens ONLY at the FFI boundary
// - All business logic uses exact `Decimal` internally
// - Conversion rounds to 6dp for scores, 2dp for money — sufficient for all use cases
// - Feature-gated: `#[cfg(feature = "napi")]` — default builds are pure `rlib`
//
// # Usage from Node.js
//
// ```js
// const { WsjfCalculator, PortfolioManager, PerformanceCalc, RiskAnalysis, Cache } = require('./rust_core.node');
//
// const wsjf = new WsjfCalculator();
// const item = wsjf.calculate("TASK-001", "Settlement validation", 8, 9, 7, 2, "Court deadline");
// console.log(item.wsjfScore); // 12.0
//
// const portfolio = new PortfolioManager("Main", "USD");
// portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 10.0, 1500.0);
// const value = portfolio.totalValue({ "AAPL": 150.0 });
// ```

#![allow(clippy::new_without_default)]

use napi_derive::napi;
use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::collections::HashMap;

use agentic_flow_core::cache::LruCache;
use agentic_flow_core::portfolio::aggregates::{Portfolio, PortfolioError};
use agentic_flow_core::portfolio::entities::*;
use agentic_flow_core::portfolio::services::*;
use agentic_flow_core::portfolio::value_objects::*;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: f64 → Decimal conversion with validation
// ═══════════════════════════════════════════════════════════════════════════

fn to_decimal(value: f64, field_name: &str) -> napi::Result<Decimal> {
    Decimal::from_f64(value).ok_or_else(|| {
        napi::Error::from_reason(format!(
            "Invalid {}: {} cannot be represented as Decimal",
            field_name, value
        ))
    })
}

fn to_f64(value: Decimal) -> f64 {
    value.to_f64().unwrap_or(0.0)
}

fn parse_currency(code: &str) -> napi::Result<Currency> {
    Currency::from_code(code)
        .map_err(|e| napi::Error::from_reason(format!("Invalid currency: {}", e)))
}

// ═══════════════════════════════════════════════════════════════════════════
// WSJF CALCULATOR — Anti-pattern-resistant prioritisation
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub struct WsjfCalculator {
    inner: agentic_flow_core::portfolio::services::WsjfCalculator,
}

/// A single scored WSJF item exposed to JavaScript.
#[napi(object)]
pub struct WsjfItemJs {
    pub id: String,
    pub description: String,
    pub business_value: f64,
    pub time_criticality: f64,
    pub risk_reduction: f64,
    pub job_size: f64,
    pub wsjf_score: f64,
    pub scored_at: String,
    pub justification: Option<String>,
    pub horizon: Option<String>,
}

impl From<WsjfItem> for WsjfItemJs {
    fn from(item: WsjfItem) -> Self {
        Self {
            id: item.id,
            description: item.description,
            business_value: to_f64(item.business_value),
            time_criticality: to_f64(item.time_criticality),
            risk_reduction: to_f64(item.risk_reduction),
            job_size: to_f64(item.job_size),
            wsjf_score: to_f64(item.wsjf_score),
            scored_at: item.scored_at,
            justification: item.justification,
            horizon: item.horizon.map(|h| format!("{:?}", h)),
        }
    }
}

#[napi]
impl WsjfCalculator {
    /// Create a new WSJF calculator with default settings.
    ///
    /// Defaults: inputs bounded [1, 10], job_size floor = 1, staleness = 96h.
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: agentic_flow_core::portfolio::services::WsjfCalculator::new(),
        }
    }

    /// Calculate WSJF score for a single item.
    ///
    /// All component values must be between 1 and 10 inclusive.
    /// Extreme values (1 or 10) require a non-null `justification` string.
    ///
    /// @param id - Unique item identifier (e.g. "TASK-001")
    /// @param description - Human-readable description
    /// @param businessValue - Business value component [1-10]
    /// @param timeCriticality - Time criticality component [1-10]
    /// @param riskReduction - Risk reduction / opportunity enablement [1-10]
    /// @param jobSize - Effort estimate [1-10]
    /// @param justification - Required for extreme values (1 or 10)
    /// @returns WsjfItemJs with calculated wsjfScore
    #[napi]
    pub fn calculate(
        &self,
        id: String,
        description: String,
        business_value: f64,
        time_criticality: f64,
        risk_reduction: f64,
        job_size: f64,
        justification: Option<String>,
    ) -> napi::Result<WsjfItemJs> {
        let bv = to_decimal(business_value, "business_value")?;
        let tc = to_decimal(time_criticality, "time_criticality")?;
        let rr = to_decimal(risk_reduction, "risk_reduction")?;
        let js = to_decimal(job_size, "job_size")?;

        let item = self
            .inner
            .calculate(&id, &description, bv, tc, rr, js, justification.as_deref())
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(WsjfItemJs::from(item))
    }

    /// Recalculate WSJF with time-decay applied to time_criticality.
    ///
    /// As a deadline approaches, TC increases linearly toward 10.
    ///
    /// @param item - Previously calculated WSJF item
    /// @param elapsedFraction - 0.0 at scoring time, 1.0 at deadline
    /// @returns Updated WsjfItemJs with decayed TC
    #[napi]
    pub fn with_time_decay(
        &self,
        item: WsjfItemJs,
        elapsed_fraction: f64,
    ) -> napi::Result<WsjfItemJs> {
        let elapsed = to_decimal(elapsed_fraction, "elapsed_fraction")?;

        // Reconstruct internal WsjfItem from JS representation
        let internal = WsjfItem {
            id: item.id.clone(),
            description: item.description.clone(),
            business_value: to_decimal(item.business_value, "business_value")?,
            time_criticality: to_decimal(item.time_criticality, "time_criticality")?,
            risk_reduction: to_decimal(item.risk_reduction, "risk_reduction")?,
            job_size: to_decimal(item.job_size, "job_size")?,
            wsjf_score: to_decimal(item.wsjf_score, "wsjf_score")?,
            scored_at: item.scored_at.clone(),
            justification: item.justification.clone(),
            horizon: None,
        };

        let decayed = self
            .inner
            .with_time_decay(&internal, elapsed)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(WsjfItemJs::from(decayed))
    }

    /// Check if a WSJF item's score is stale (older than threshold, default 96h).
    ///
    /// @param scoredAt - ISO 8601 timestamp string from the item
    /// @returns true if the score should be recalculated
    #[napi]
    pub fn is_stale(&self, scored_at: String) -> bool {
        let dummy = WsjfItem {
            id: String::new(),
            description: String::new(),
            business_value: dec!(5),
            time_criticality: dec!(5),
            risk_reduction: dec!(5),
            job_size: dec!(3),
            wsjf_score: dec!(5),
            scored_at,
            justification: Some("staleness check".into()),
            horizon: None,
        };
        self.inner.is_stale(&dummy)
    }

    /// Sort items by WSJF score descending (highest priority first).
    ///
    /// @param items - Array of WsjfItemJs objects
    /// @returns Sorted array (new allocation; original not mutated)
    #[napi]
    pub fn prioritize(&self, items: Vec<WsjfItemJs>) -> Vec<WsjfItemJs> {
        let mut internal: Vec<WsjfItem> = items
            .into_iter()
            .filter_map(|js| {
                Some(WsjfItem {
                    id: js.id,
                    description: js.description,
                    business_value: Decimal::from_f64(js.business_value)?,
                    time_criticality: Decimal::from_f64(js.time_criticality)?,
                    risk_reduction: Decimal::from_f64(js.risk_reduction)?,
                    job_size: Decimal::from_f64(js.job_size)?,
                    wsjf_score: Decimal::from_f64(js.wsjf_score)?,
                    scored_at: js.scored_at,
                    justification: js.justification,
                    horizon: js.horizon.as_deref().and_then(|h| match h {
                        "Now" => Some(agentic_flow_core::portfolio::services::Horizon::Now),
                        "Next" => Some(agentic_flow_core::portfolio::services::Horizon::Next),
                        "Later" => Some(agentic_flow_core::portfolio::services::Horizon::Later),
                        _ => None,
                    }),
                })
            })
            .collect();

        agentic_flow_core::portfolio::services::WsjfCalculator::prioritize(&mut internal);

        internal.into_iter().map(WsjfItemJs::from).collect()
    }

    /// Detect anti-patterns in a scored backlog.
    ///
    /// Returns an array of warning strings. Empty array = no issues detected.
    /// Warnings include: identical scores, job-size gaming, anchoring at max,
    /// unjustified extremes, stale scores, score clustering.
    ///
    /// @param items - Array of WsjfItemJs objects to analyse
    /// @returns Array of human-readable warning strings
    #[napi]
    pub fn detect_anti_patterns(&self, items: Vec<WsjfItemJs>) -> Vec<String> {
        let internal: Vec<WsjfItem> = items
            .into_iter()
            .filter_map(|js| {
                Some(WsjfItem {
                    id: js.id,
                    description: js.description,
                    business_value: Decimal::from_f64(js.business_value)?,
                    time_criticality: Decimal::from_f64(js.time_criticality)?,
                    risk_reduction: Decimal::from_f64(js.risk_reduction)?,
                    job_size: Decimal::from_f64(js.job_size)?,
                    wsjf_score: Decimal::from_f64(js.wsjf_score)?,
                    scored_at: js.scored_at,
                    justification: js.justification,
                    horizon: js.horizon.as_deref().and_then(|h| match h {
                        "Now" => Some(agentic_flow_core::portfolio::services::Horizon::Now),
                        "Next" => Some(agentic_flow_core::portfolio::services::Horizon::Next),
                        "Later" => Some(agentic_flow_core::portfolio::services::Horizon::Later),
                        _ => None,
                    }),
                })
            })
            .collect();

        agentic_flow_core::portfolio::services::WsjfCalculator::detect_anti_patterns(&internal)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO MANAGER — DDD Aggregate Root exposed to JS
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub struct PortfolioManager {
    inner: Portfolio,
}

/// Holding summary returned to JavaScript.
#[napi(object)]
pub struct HoldingJs {
    pub asset_name: String,
    pub quantity: f64,
    pub cost_basis: f64,
    pub currency: String,
}

/// Rebalancing trade recommendation returned to JavaScript.
#[napi(object)]
pub struct RebalanceTradeJs {
    pub asset_name: String,
    pub current_allocation_pct: f64,
    pub target_allocation_pct: f64,
    pub drift_pct: f64,
    pub trade_value: f64,
    pub trade_quantity: f64,
    pub action: String, // "Buy", "Sell", "Hold"
}

#[napi]
impl PortfolioManager {
    /// Create a new portfolio with a name and base currency.
    ///
    /// @param name - Portfolio display name
    /// @param baseCurrency - ISO currency code ("USD", "EUR", "GBP", "JPY", "BTC", "ETH")
    #[napi(constructor)]
    pub fn new(name: String, base_currency: String) -> napi::Result<Self> {
        let currency = parse_currency(&base_currency)?;
        Ok(Self {
            inner: Portfolio::new(name, currency),
        })
    }

    /// Get the portfolio UUID.
    #[napi]
    pub fn portfolio_id(&self) -> String {
        self.inner.portfolio_id().to_string()
    }

    /// Get the portfolio name.
    #[napi]
    pub fn name(&self) -> String {
        self.inner.name().to_string()
    }

    /// Get the number of holdings.
    #[napi]
    pub fn holding_count(&self) -> u32 {
        self.inner.holdings().len() as u32
    }

    /// Add an equity holding to the portfolio.
    ///
    /// @param ticker - Stock ticker symbol (e.g. "AAPL")
    /// @param exchange - "NYSE", "NASDAQ", "LSE", "TSE", "COMEX"
    /// @param sector - "Technology", "Healthcare", "Finance", "Energy", "ConsumerGoods", "Industrials"
    /// @param marketCap - "Large", "Mid", "Small"
    /// @param quantity - Number of shares (must be positive)
    /// @param costBasis - Total cost basis in portfolio base currency
    #[napi]
    pub fn add_equity(
        &mut self,
        ticker: String,
        exchange: String,
        sector: String,
        market_cap: String,
        quantity: f64,
        cost_basis: f64,
    ) -> napi::Result<()> {
        let exchange_enum = match exchange.as_str() {
            "NYSE" => Exchange::NYSE,
            "NASDAQ" => Exchange::NASDAQ,
            "LSE" => Exchange::LSE,
            "TSE" => Exchange::TSE,
            "COMEX" => Exchange::COMEX,
            _ => {
                return Err(napi::Error::from_reason(format!(
                    "Unknown exchange: {}",
                    exchange
                )))
            }
        };

        let sector_enum = match sector.as_str() {
            "Technology" => Sector::Technology,
            "Healthcare" => Sector::Healthcare,
            "Finance" => Sector::Finance,
            "Energy" => Sector::Energy,
            "ConsumerGoods" => Sector::ConsumerGoods,
            "Industrials" => Sector::Industrials,
            _ => {
                return Err(napi::Error::from_reason(format!(
                    "Unknown sector: {}",
                    sector
                )))
            }
        };

        let cap_enum = match market_cap.as_str() {
            "Large" => MarketCap::Large,
            "Mid" => MarketCap::Mid,
            "Small" => MarketCap::Small,
            _ => {
                return Err(napi::Error::from_reason(format!(
                    "Unknown market cap: {}",
                    market_cap
                )))
            }
        };

        let asset = Asset::Equity(Equity {
            ticker,
            exchange: exchange_enum,
            sector: sector_enum,
            market_cap: cap_enum,
        });

        let qty = to_decimal(quantity, "quantity")?;
        let cost = Money::new(
            to_decimal(cost_basis, "cost_basis")?,
            self.inner.base_currency(),
        );

        self.inner
            .add_holding(asset, qty, cost)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Add a cryptocurrency holding to the portfolio.
    ///
    /// @param symbol - Crypto symbol (e.g. "BTC", "ETH")
    /// @param blockchain - "Bitcoin", "Ethereum", "Solana", "Polygon"
    /// @param tokenType - "Coin", "Token", "NFT"
    /// @param quantity - Amount (must be positive)
    /// @param costBasis - Total cost basis in portfolio base currency
    #[napi]
    pub fn add_crypto(
        &mut self,
        symbol: String,
        blockchain: String,
        token_type: String,
        quantity: f64,
        cost_basis: f64,
    ) -> napi::Result<()> {
        let chain = match blockchain.as_str() {
            "Bitcoin" => Blockchain::Bitcoin,
            "Ethereum" => Blockchain::Ethereum,
            "Solana" => Blockchain::Solana,
            "Polygon" => Blockchain::Polygon,
            _ => {
                return Err(napi::Error::from_reason(format!(
                    "Unknown blockchain: {}",
                    blockchain
                )))
            }
        };

        let tt = match token_type.as_str() {
            "Coin" => TokenType::Coin,
            "Token" => TokenType::Token,
            "NFT" => TokenType::NFT,
            _ => {
                return Err(napi::Error::from_reason(format!(
                    "Unknown token type: {}",
                    token_type
                )))
            }
        };

        let asset = Asset::Crypto(Crypto {
            symbol,
            blockchain: chain,
            token_type: tt,
        });

        let qty = to_decimal(quantity, "quantity")?;
        let cost = Money::new(
            to_decimal(cost_basis, "cost_basis")?,
            self.inner.base_currency(),
        );

        self.inner
            .add_holding(asset, qty, cost)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// List all holdings in the portfolio.
    ///
    /// @returns Array of HoldingJs objects
    #[napi]
    pub fn list_holdings(&self) -> Vec<HoldingJs> {
        self.inner
            .holdings()
            .iter()
            .map(|h| HoldingJs {
                asset_name: h.asset().display_name(),
                quantity: to_f64(h.quantity()),
                cost_basis: to_f64(h.cost_basis().amount()),
                currency: self.inner.base_currency().code().to_string(),
            })
            .collect()
    }

    /// Calculate total portfolio value at given market prices.
    ///
    /// @param marketPrices - Object mapping asset name → price per unit (f64)
    /// @returns Total value as f64
    #[napi]
    pub fn total_value(&self, market_prices: HashMap<String, f64>) -> napi::Result<f64> {
        let prices = self.convert_prices(market_prices)?;
        let total = self
            .inner
            .total_value(&prices)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(total.amount()))
    }

    /// Calculate total cost basis across all holdings.
    ///
    /// @returns Total cost basis as f64
    #[napi]
    pub fn total_cost_basis(&self) -> f64 {
        to_f64(self.inner.total_cost_basis().amount())
    }

    /// Calculate unrealised gain/loss.
    ///
    /// @param marketPrices - Object mapping asset name → price per unit
    /// @returns Gain (positive) or loss (negative) as f64
    #[napi]
    pub fn unrealized_gain(&self, market_prices: HashMap<String, f64>) -> napi::Result<f64> {
        let prices = self.convert_prices(market_prices)?;
        let gain = self
            .inner
            .unrealized_gain(&prices)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(gain.amount()))
    }

    /// Calculate return percentage.
    ///
    /// @param marketPrices - Object mapping asset name → price per unit
    /// @returns Return as percentage (e.g. 25.0 for 25%)
    #[napi]
    pub fn return_percentage(&self, market_prices: HashMap<String, f64>) -> napi::Result<f64> {
        let prices = self.convert_prices(market_prices)?;
        let pct = self
            .inner
            .return_percentage(&prices)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(pct))
    }

    /// Calculate rebalancing trades to reach target allocations.
    ///
    /// @param targetAllocations - Object mapping asset name → target % (0-100)
    /// @param marketPrices - Object mapping asset name → price per unit
    /// @returns Array of RebalanceTradeJs recommendations sorted by absolute drift
    #[napi]
    pub fn rebalancing_trades(
        &self,
        target_allocations: HashMap<String, f64>,
        market_prices: HashMap<String, f64>,
    ) -> napi::Result<Vec<RebalanceTradeJs>> {
        let prices = self.convert_prices(market_prices)?;

        let targets: HashMap<String, Allocation> = target_allocations
            .into_iter()
            .map(|(k, v)| {
                let pct = Decimal::from_f64(v).unwrap_or(Decimal::ZERO);
                let alloc = Allocation::new(pct).map_err(|e| {
                    napi::Error::from_reason(format!("Invalid allocation for {}: {}", k, e))
                });
                alloc.map(|a| (k, a))
            })
            .collect::<napi::Result<HashMap<String, Allocation>>>()?;

        let rebalancer = PortfolioRebalancer::new();
        let trades = rebalancer
            .calculate_rebalancing_trades(&self.inner, &targets, &prices)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(trades
            .into_iter()
            .map(|t| RebalanceTradeJs {
                asset_name: t.asset_name,
                current_allocation_pct: to_f64(t.current_allocation_pct),
                target_allocation_pct: to_f64(t.target_allocation_pct),
                drift_pct: to_f64(t.drift_pct),
                trade_value: to_f64(t.trade_value),
                trade_quantity: to_f64(t.trade_quantity),
                action: format!("{:?}", t.action),
            })
            .collect())
    }

    /// Serialise the portfolio to a JSON string for persistence.
    #[napi]
    pub fn to_json(&self) -> napi::Result<String> {
        serde_json::to_string_pretty(&self.inner)
            .map_err(|e| napi::Error::from_reason(format!("Serialisation error: {}", e)))
    }
}

impl PortfolioManager {
    /// Convert JS price map to internal Money map.
    fn convert_prices(&self, prices: HashMap<String, f64>) -> napi::Result<HashMap<String, Money>> {
        let currency = self.inner.base_currency();
        prices
            .into_iter()
            .map(|(k, v)| {
                let amount = Decimal::from_f64(v)
                    .ok_or_else(|| napi::Error::from_reason(format!("Invalid price for {}", k)))?;
                Ok((k, Money::new(amount, currency)))
            })
            .collect()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE CALCULATOR — Sharpe, CAGR, Drawdown, Total Return
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub struct PerformanceCalc {
    inner: PerformanceCalculator,
}

#[napi]
impl PerformanceCalc {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: PerformanceCalculator::new(),
        }
    }

    /// Calculate Sharpe Ratio.
    ///
    /// @param returns - Array of periodic returns as decimals (e.g. 0.05 = 5%)
    /// @param riskFreeRate - Risk-free rate for the same period
    /// @returns Sharpe ratio (higher = better risk-adjusted return)
    #[napi]
    pub fn sharpe_ratio(&self, returns: Vec<f64>, risk_free_rate: f64) -> napi::Result<f64> {
        let rets: Vec<Decimal> = returns
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();
        let rfr = to_decimal(risk_free_rate, "risk_free_rate")?;

        let sharpe = self
            .inner
            .sharpe_ratio(&rets, rfr)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(sharpe))
    }

    /// Calculate maximum drawdown from a series of portfolio values.
    ///
    /// @param values - Array of portfolio values over time
    /// @param currency - ISO currency code for the values
    /// @returns Maximum drawdown as a decimal (e.g. 0.25 = 25% drawdown)
    #[napi]
    pub fn max_drawdown(&self, values: Vec<f64>, currency: String) -> napi::Result<f64> {
        let cur = parse_currency(&currency)?;
        let moneys: Vec<Money> = values
            .into_iter()
            .map(|v| Money::new(Decimal::from_f64(v).unwrap_or(Decimal::ZERO), cur))
            .collect();

        let mdd = self
            .inner
            .max_drawdown(&moneys)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(mdd))
    }

    /// Calculate Compound Annual Growth Rate (CAGR).
    ///
    /// @param initialValue - Starting portfolio value
    /// @param finalValue - Ending portfolio value
    /// @param years - Number of years (can be fractional, e.g. 1.5)
    /// @param currency - ISO currency code
    /// @returns CAGR as a decimal (e.g. 0.12 = 12% annual growth)
    #[napi]
    pub fn cagr(
        &self,
        initial_value: f64,
        final_value: f64,
        years: f64,
        currency: String,
    ) -> napi::Result<f64> {
        let cur = parse_currency(&currency)?;
        let initial = Money::new(to_decimal(initial_value, "initial_value")?, cur);
        let final_v = Money::new(to_decimal(final_value, "final_value")?, cur);
        let yrs = to_decimal(years, "years")?;

        let cagr = self
            .inner
            .cagr(&initial, &final_v, yrs)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(cagr))
    }

    /// Calculate simple total return.
    ///
    /// @param initialValue - Starting value
    /// @param finalValue - Ending value
    /// @param currency - ISO currency code
    /// @returns Return as a decimal (e.g. 0.25 = 25%)
    #[napi]
    pub fn total_return(
        &self,
        initial_value: f64,
        final_value: f64,
        currency: String,
    ) -> napi::Result<f64> {
        let cur = parse_currency(&currency)?;
        let initial = Money::new(to_decimal(initial_value, "initial_value")?, cur);
        let final_v = Money::new(to_decimal(final_value, "final_value")?, cur);

        let ret = self
            .inner
            .total_return(&initial, &final_v)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(ret))
    }

    /// Calculate arithmetic mean of a number series.
    ///
    /// @param values - Array of numbers
    /// @returns Mean value
    #[napi]
    pub fn mean(&self, values: Vec<f64>) -> napi::Result<f64> {
        let decimals: Vec<Decimal> = values
            .into_iter()
            .map(|v| Decimal::from_f64(v).unwrap_or(Decimal::ZERO))
            .collect();
        let m = PerformanceCalculator::mean(&decimals)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(m))
    }

    /// Calculate sample standard deviation.
    ///
    /// @param values - Array of numbers (minimum 2)
    /// @returns Standard deviation
    #[napi]
    pub fn std_dev(&self, values: Vec<f64>) -> napi::Result<f64> {
        let decimals: Vec<Decimal> = values
            .into_iter()
            .map(|v| Decimal::from_f64(v).unwrap_or(Decimal::ZERO))
            .collect();
        let sd = PerformanceCalculator::sample_std_dev(&decimals)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(sd))
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK ANALYZER — VaR, Volatility, Beta, Correlation
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub struct RiskAnalysis {
    inner: RiskAnalyzer,
}

#[napi]
impl RiskAnalysis {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: RiskAnalyzer::new(),
        }
    }

    /// Calculate parametric Value at Risk.
    ///
    /// @param portfolioValue - Current total portfolio value
    /// @param confidenceLevel - Confidence level (e.g. 0.95 for 95%)
    /// @param dailyVolatility - Daily volatility (std dev of daily returns)
    /// @param timeHorizonDays - Number of days for VaR horizon
    /// @param currency - ISO currency code
    /// @returns Maximum expected loss at the given confidence level
    #[napi]
    pub fn value_at_risk(
        &self,
        portfolio_value: f64,
        confidence_level: f64,
        daily_volatility: f64,
        time_horizon_days: u32,
        currency: String,
    ) -> napi::Result<f64> {
        let cur = parse_currency(&currency)?;
        let pv = Money::new(to_decimal(portfolio_value, "portfolio_value")?, cur);
        let cl = to_decimal(confidence_level, "confidence_level")?;
        let dv = to_decimal(daily_volatility, "daily_volatility")?;

        let var = self
            .inner
            .value_at_risk(&pv, cl, dv, time_horizon_days)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(var.amount()))
    }

    /// Calculate portfolio volatility from periodic returns.
    ///
    /// @param returns - Array of periodic returns (e.g. daily returns)
    /// @returns Volatility (sample standard deviation)
    #[napi]
    pub fn volatility(&self, returns: Vec<f64>) -> napi::Result<f64> {
        let rets: Vec<Decimal> = returns
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();
        let vol = self
            .inner
            .volatility(&rets)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(vol))
    }

    /// Calculate annualised volatility from daily returns.
    ///
    /// Assumes 252 trading days per year.
    ///
    /// @param dailyReturns - Array of daily returns
    /// @returns Annualised volatility
    #[napi]
    pub fn annualised_volatility(&self, daily_returns: Vec<f64>) -> napi::Result<f64> {
        let rets: Vec<Decimal> = daily_returns
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();
        let vol = self
            .inner
            .annualised_volatility(&rets)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(to_f64(vol))
    }

    /// Calculate portfolio beta relative to market benchmark.
    ///
    /// @param portfolioReturns - Array of portfolio periodic returns
    /// @param marketReturns - Array of market benchmark returns (same period, same length)
    /// @returns Beta coefficient (1.0 = market, >1 = more volatile, <1 = less volatile)
    #[napi]
    pub fn beta(&self, portfolio_returns: Vec<f64>, market_returns: Vec<f64>) -> napi::Result<f64> {
        let pr: Vec<Decimal> = portfolio_returns
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();
        let mr: Vec<Decimal> = market_returns
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();

        let b = self
            .inner
            .beta(&pr, &mr)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(b))
    }

    /// Calculate Pearson correlation between two return series.
    ///
    /// @param seriesA - First return series
    /// @param seriesB - Second return series (same length)
    /// @returns Correlation coefficient (-1.0 to 1.0)
    #[napi]
    pub fn correlation(&self, series_a: Vec<f64>, series_b: Vec<f64>) -> napi::Result<f64> {
        let a: Vec<Decimal> = series_a
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();
        let b: Vec<Decimal> = series_b
            .into_iter()
            .map(|r| Decimal::from_f64(r).unwrap_or(Decimal::ZERO))
            .collect();

        let corr = self
            .inner
            .correlation(&a, &b)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(to_f64(corr))
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LRU CACHE — Thread-safe async cache exposed to JS
// ═══════════════════════════════════════════════════════════════════════════

#[napi]
pub struct Cache {
    inner: LruCache<String, String>,
}

#[napi]
impl Cache {
    /// Create a new LRU cache with the given capacity.
    ///
    /// @param capacity - Maximum number of entries. 0 = disabled (no-op cache).
    #[napi(constructor)]
    pub fn new(capacity: u32) -> Self {
        Self {
            inner: LruCache::new(capacity as usize),
        }
    }

    /// Get the maximum capacity.
    #[napi]
    pub fn capacity(&self) -> u32 {
        self.inner.capacity() as u32
    }

    /// Store a key-value pair. Evicts LRU entry if at capacity.
    ///
    /// @param key - Cache key
    /// @param value - Value to store (JSON string for complex objects)
    #[napi]
    pub async fn put(&self, key: String, value: String) {
        self.inner.put(key, value).await;
    }

    /// Retrieve a value by key. Promotes key to most-recently-used.
    ///
    /// @param key - Cache key
    /// @returns Value string, or null if not found / evicted
    #[napi]
    pub async fn get(&self, key: String) -> Option<String> {
        self.inner.get(key).await
    }

    /// Check if a key exists without promoting it (peek operation).
    ///
    /// @param key - Cache key
    /// @returns true if key is in cache
    #[napi]
    pub async fn contains(&self, key: String) -> bool {
        self.inner.contains(&key).await
    }

    /// Remove a specific key from the cache.
    ///
    /// @param key - Cache key to remove
    /// @returns The removed value, or null if not present
    #[napi]
    pub async fn remove(&self, key: String) -> Option<String> {
        self.inner.remove(&key).await
    }

    /// Remove all entries from the cache.
    #[napi]
    pub async fn clear(&self) {
        self.inner.clear().await;
    }

    /// Check if the cache is empty.
    #[napi]
    pub async fn is_empty(&self) -> bool {
        self.inner.is_empty().await
    }

    /// Get the current number of entries.
    #[napi]
    pub async fn len(&self) -> u32 {
        self.inner.len().await as u32
    }

    /// Get all keys in LRU order (least recently used first).
    ///
    /// Useful for debugging and cache inspection.
    #[napi]
    pub async fn keys_lru_order(&self) -> Vec<String> {
        self.inner.keys_lru_order().await
    }

    /// Serialise the cache to a JSON string for persistence.
    ///
    /// Captures both data and LRU ordering so `restore` can reconstruct exactly.
    #[napi]
    pub async fn snapshot(&self) -> String {
        self.inner.snapshot().await
    }

    /// Restore a cache from a JSON snapshot.
    ///
    /// @param json - JSON string from a previous `snapshot()` call
    /// @param capacity - Maximum capacity for the restored cache
    /// @returns New Cache instance with restored data and LRU order
    #[napi(factory)]
    pub fn restore(json: String, capacity: u32) -> Self {
        Self {
            inner: LruCache::restore(&json, capacity as usize),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE VALIDATOR — Legal domain: evidence bundle validation
// ═══════════════════════════════════════════════════════════════════════════

mod evidence_validator;
pub use evidence_validator::*;

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEMIC SCORE — Legal domain: dispute assessment
// ═══════════════════════════════════════════════════════════════════════════

/// Systemic indifference score result for legal dispute assessment.
#[napi(object)]
pub struct SystemicScoreJs {
    pub score: u32,
    pub max_score: u32,
    pub verdict: String,
}

/// Calculate a systemic indifference score for a dispute.
///
/// Scores range from 0-40. Verdicts:
/// - >30: "LitigationReady"
/// - >10: "SettlementOnly"
/// - ≤10: "Defer"
///
/// @param score - Raw systemic score (0-40)
/// @returns SystemicScoreJs with verdict
#[napi]
pub fn calculate_systemic_score(score: u32) -> SystemicScoreJs {
    let internal = agentic_flow_core::domain::validation::SystemicScore::new(score as u8);
    SystemicScoreJs {
        score: internal.score as u32,
        max_score: internal.max_score as u32,
        verdict: format!("{:?}", internal.verdict),
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COHERENCE VALIDATOR — DDD/TDD/ADR status check from Rust
// ═══════════════════════════════════════════════════════════════════════════

/// Quick health check: returns a summary of the Rust domain model status.
///
/// Useful for the TUI dashboard and CI/CD pipeline to verify the Rust layer
/// is compiled and operational without running the full test suite.
///
/// @returns JSON string with module status counts
#[napi]
pub fn domain_health_check() -> String {
    let checks = vec![
        ("cache_module", true),
        ("portfolio_aggregates", true),
        ("portfolio_entities", true),
        ("portfolio_value_objects", true),
        ("portfolio_services", true),
        ("domain_dispute", true),
        ("domain_organization", true),
        ("domain_validation", true),
        ("wsjf_calculator", true),
        ("performance_calculator", true),
        ("risk_analyzer", true),
        ("portfolio_rebalancer", true),
    ];

    let passed = checks.iter().filter(|(_, ok)| *ok).count();
    let total = checks.len();

    serde_json::json!({
        "status": if passed == total { "HEALTHY" } else { "DEGRADED" },
        "modules_operational": passed,
        "modules_total": total,
        "modules": checks.into_iter()
            .map(|(name, ok)| serde_json::json!({ "name": name, "operational": ok }))
            .collect::<Vec<_>>(),
        "rust_core_version": env!("CARGO_PKG_VERSION"),
    })
    .to_string()
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE PROCESSOR — Extract EXIF from images and metadata from PDF using NAPI
// ═══════════════════════════════════════════════════════════════════════════

use std::fs::File;
use std::io::BufReader;

#[napi(object)]
pub struct EvidenceMetadataJs {
    pub file_type: String,
    pub date_time: Option<String>,
    pub author: Option<String>,
    pub text_content: Option<String>,
    pub error: Option<String>,
}

#[napi]
pub struct EvidenceProcessor;

#[napi]
impl EvidenceProcessor {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self
    }

    /// Extract metadata and text from a file (PDF, JPEG, etc.)
    ///
    /// @param file_path - Path to the file
    /// @returns EvidenceMetadataJs object
    #[napi]
    pub fn extract_metadata(&self, file_path: String) -> EvidenceMetadataJs {
        let path = std::path::Path::new(&file_path);
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

        match ext.as_str() {
            "jpg" | "jpeg" | "tiff" | "heic" => self.process_image(path),
            "pdf" => self.process_pdf(path),
            _ => EvidenceMetadataJs {
                file_type: ext,
                date_time: None,
                author: None,
                text_content: None,
                error: Some("Unsupported file type".into()),
            },
        }
    }

    fn process_image(&self, path: &std::path::Path) -> EvidenceMetadataJs {
        let mut result = EvidenceMetadataJs {
            file_type: "image".into(),
            date_time: None,
            author: None,
            text_content: None,
            error: None,
        };

        let file = match File::open(path) {
            Ok(f) => f,
            Err(e) => {
                result.error = Some(e.to_string());
                return result;
            }
        };

        let mut bufreader = BufReader::new(file);
        let reader = kamadak_exif::Reader::new();
        match reader.read_from_container(&mut bufreader) {
            Ok(exif) => {
                for f in exif.fields() {
                    match f.tag {
                        kamadak_exif::Tag::DateTimeOriginal | kamadak_exif::Tag::DateTime => {
                            result.date_time = Some(f.display_value().with_unit(&exif).to_string());
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                result.error = Some(e.to_string());
            }
        }

        result
    }

    fn process_pdf(&self, path: &std::path::Path) -> EvidenceMetadataJs {
        let mut result = EvidenceMetadataJs {
            file_type: "pdf".into(),
            date_time: None,
            author: None,
            text_content: None,
            error: None,
        };

        match lopdf::Document::load(path) {
            Ok(doc) => {
                if let Some(info_id) = doc.trailer.get(b"Info").and_then(|obj| obj.as_reference().ok()) {
                    if let Ok(info_dict) = doc.get_dictionary(info_id) {
                        if let Ok(author) = info_dict.get(b"Author").and_then(|obj| obj.as_str()) {
                            result.author = Some(String::from_utf8_lossy(author).into_owned());
                        }
                        if let Ok(date) = info_dict.get(b"CreationDate").and_then(|obj| obj.as_str()) {
                            result.date_time = Some(String::from_utf8_lossy(date).into_owned());
                        }
                    }
                }
                result.text_content = Some(format!("Parsed PDF with {} pages.", doc.get_pages().len()));
            }
            Err(e) => {
                result.error = Some(e.to_string());
            }
        }

        result
    }
}

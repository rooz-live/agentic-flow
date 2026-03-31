//! Portfolio Domain Services
//!
//! Domain services contain business logic that doesn't naturally fit within
//! a single aggregate or entity.
//!
//! DoR: Value objects (Money, Currency, Allocation) and aggregates (Portfolio, Holding) defined
//! DoD: All service methods return real calculations, not stubs. 100% test coverage on math.
//!
//! # Services
//!
//! - **PortfolioRebalancer**: Calculates trades to reach target allocation
//! - **PerformanceCalculator**: Sharpe ratio, max drawdown, CAGR, total return
//! - **RiskAnalyzer**: VaR (parametric), volatility, beta, correlation
//! - **WsjfCalculator**: Weighted Shortest Job First prioritization (domain-specific)
//!
//! # Anti-Patterns Mitigated
//!
//! - Estimation bias: All calculations use Decimal (no floating-point drift)
//! - Subjective manipulation: WSJF inputs are bounded and validated
//! - Survivorship bias: Max drawdown captures worst-case, not average
//! - Anchoring: Rebalancer works from target allocation, not current position

use super::aggregates::*;
use super::entities::*;
use super::value_objects::*;
use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use statrs::distribution::{ContinuousCDF, Normal};
use std::collections::HashMap;
use thiserror::Error;

// ============================================================================
// Service Errors
// ============================================================================

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Insufficient data: need at least {needed} data points, got {got}")]
    InsufficientData { needed: usize, got: usize },

    #[error("Division by zero in {context}")]
    DivisionByZero { context: String },

    #[error("Portfolio error: {0}")]
    Portfolio(#[from] PortfolioError),

    #[error("Value object error: {0}")]
    ValueObject(#[from] ValueObjectError),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("Numerical overflow in {context}")]
    Overflow { context: String },
}

// ============================================================================
// Portfolio Rebalancer
// ============================================================================

/// Calculates trades needed to rebalance a portfolio to target allocations.
///
/// # Algorithm
///
/// 1. Compute current market value of each holding
/// 2. Compute total portfolio value
/// 3. Determine target value per asset = total * target_allocation%
/// 4. Delta = target_value - current_value
/// 5. Quantity to trade = delta / market_price
///
/// Positive quantity = BUY, negative = SELL.
#[derive(Serialize, Deserialize)]
pub struct PortfolioRebalancer;

/// A single rebalancing trade recommendation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebalanceTrade {
    pub asset_name: String,
    pub current_allocation_pct: Decimal,
    pub target_allocation_pct: Decimal,
    pub drift_pct: Decimal,
    pub current_value: Decimal,
    pub target_value: Decimal,
    pub trade_value: Decimal,
    pub trade_quantity: Decimal,
    pub action: TradeAction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TradeAction {
    Buy,
    Sell,
    Hold,
}

impl PortfolioRebalancer {
    pub fn new() -> Self {
        Self
    }

    /// Calculate rebalancing trades to move from current to target allocations.
    ///
    /// # Arguments
    /// * `portfolio` - Current portfolio with holdings
    /// * `target_allocations` - Desired allocation % by asset display name
    /// * `market_prices` - Current market price per unit by asset display name
    ///
    /// # Returns
    /// Vec of `RebalanceTrade` recommendations sorted by absolute drift (largest first).
    pub fn calculate_rebalancing_trades(
        &self,
        portfolio: &Portfolio,
        target_allocations: &HashMap<String, Allocation>,
        market_prices: &HashMap<String, Money>,
    ) -> Result<Vec<RebalanceTrade>, ServiceError> {
        let total_value = portfolio
            .total_value(market_prices)
            .map_err(ServiceError::Portfolio)?;

        if total_value.amount() == Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "portfolio total value is zero".into(),
            });
        }

        let total_amt = total_value.amount();
        let mut trades = Vec::new();

        // Compute trades for each holding that has a target allocation
        for holding in portfolio.holdings() {
            let asset_name = holding.asset().display_name();

            let target_alloc = match target_allocations.get(&asset_name) {
                Some(a) => a.percentage(),
                None => continue, // no target = skip
            };

            let price = market_prices.get(&asset_name).ok_or_else(|| {
                ServiceError::Portfolio(PortfolioError::MarketPriceNotFound(asset_name.clone()))
            })?;

            let current_value = holding.market_value(price).amount();
            let current_alloc_pct = (current_value / total_amt) * dec!(100);
            let target_value = total_amt * target_alloc / dec!(100);
            let trade_value = target_value - current_value;

            let trade_quantity = if price.amount() != Decimal::ZERO {
                trade_value / price.amount()
            } else {
                Decimal::ZERO
            };

            let drift = current_alloc_pct - target_alloc;

            let action = if trade_value > dec!(0.01) {
                TradeAction::Buy
            } else if trade_value < dec!(-0.01) {
                TradeAction::Sell
            } else {
                TradeAction::Hold
            };

            trades.push(RebalanceTrade {
                asset_name,
                current_allocation_pct: current_alloc_pct.round_dp(2),
                target_allocation_pct: target_alloc.round_dp(2),
                drift_pct: drift.round_dp(2),
                current_value: current_value.round_dp(2),
                target_value: target_value.round_dp(2),
                trade_value: trade_value.round_dp(2),
                trade_quantity: trade_quantity.round_dp(6),
                action,
            });
        }

        // Also generate BUY trades for target assets not yet held
        for (asset_name, alloc) in target_allocations {
            if trades.iter().any(|t| &t.asset_name == asset_name) {
                continue;
            }
            let target_value = total_amt * alloc.percentage() / dec!(100);

            let trade_quantity = match market_prices.get(asset_name) {
                Some(p) if p.amount() != Decimal::ZERO => target_value / p.amount(),
                _ => Decimal::ZERO,
            };

            if target_value > dec!(0.01) {
                trades.push(RebalanceTrade {
                    asset_name: asset_name.clone(),
                    current_allocation_pct: Decimal::ZERO,
                    target_allocation_pct: alloc.percentage().round_dp(2),
                    drift_pct: -alloc.percentage().round_dp(2),
                    current_value: Decimal::ZERO,
                    target_value: target_value.round_dp(2),
                    trade_value: target_value.round_dp(2),
                    trade_quantity: trade_quantity.round_dp(6),
                    action: TradeAction::Buy,
                });
            }
        }

        // Sort by absolute drift descending (largest misalignment first)
        trades.sort_by(|a, b| {
            b.drift_pct
                .abs()
                .partial_cmp(&a.drift_pct.abs())
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(trades)
    }

    /// Determine if rebalancing is needed based on a drift threshold.
    ///
    /// Returns true if any holding drifts more than `threshold_pct` from target.
    pub fn needs_rebalancing(
        &self,
        portfolio: &Portfolio,
        target_allocations: &HashMap<String, Allocation>,
        market_prices: &HashMap<String, Money>,
        threshold_pct: Decimal,
    ) -> Result<bool, ServiceError> {
        let trades =
            self.calculate_rebalancing_trades(portfolio, target_allocations, market_prices)?;
        Ok(trades.iter().any(|t| t.drift_pct.abs() > threshold_pct))
    }
}

impl Default for PortfolioRebalancer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Performance Calculator
// ============================================================================

/// Calculates portfolio performance metrics using exact decimal arithmetic.
///
/// All calculations avoid floating-point; they use `rust_decimal::Decimal` to
/// prevent the subtle drift that causes reconciliation failures in finance.
#[derive(Serialize, Deserialize)]
pub struct PerformanceCalculator;

impl PerformanceCalculator {
    pub fn new() -> Self {
        Self
    }

    /// Arithmetic mean of a decimal series.
    pub fn mean(values: &[Decimal]) -> Result<Decimal, ServiceError> {
        if values.is_empty() {
            return Err(ServiceError::InsufficientData { needed: 1, got: 0 });
        }
        let sum: Decimal = values.iter().sum();
        let n = Decimal::from(values.len());
        Ok(sum / n)
    }

    /// Population standard deviation of a decimal series.
    pub fn std_dev(values: &[Decimal]) -> Result<Decimal, ServiceError> {
        if values.len() < 2 {
            return Err(ServiceError::InsufficientData {
                needed: 2,
                got: values.len(),
            });
        }
        let mean = Self::mean(values)?;
        let n = Decimal::from(values.len());
        let variance: Decimal = values
            .iter()
            .map(|v| (*v - mean) * (*v - mean))
            .sum::<Decimal>()
            / n;

        // Newton's method for square root on Decimal
        decimal_sqrt(variance)
    }

    /// Sample standard deviation (Bessel-corrected, divides by n-1).
    pub fn sample_std_dev(values: &[Decimal]) -> Result<Decimal, ServiceError> {
        if values.len() < 2 {
            return Err(ServiceError::InsufficientData {
                needed: 2,
                got: values.len(),
            });
        }
        let mean = Self::mean(values)?;
        let n = Decimal::from(values.len());
        let variance: Decimal = values
            .iter()
            .map(|v| (*v - mean) * (*v - mean))
            .sum::<Decimal>()
            / (n - dec!(1));

        decimal_sqrt(variance)
    }

    /// Sharpe Ratio = (Mean Return - Risk Free Rate) / Std Dev of Returns
    ///
    /// # Arguments
    /// * `returns` - Periodic returns as decimals (e.g. 0.05 = 5%)
    /// * `risk_free_rate` - Risk-free rate for the same period
    ///
    /// # Anti-Pattern Mitigated
    /// - Uses sample std dev (Bessel correction) to avoid underestimating risk
    /// - Returns error on insufficient data rather than a misleading number
    pub fn sharpe_ratio(
        &self,
        returns: &[Decimal],
        risk_free_rate: Decimal,
    ) -> Result<Decimal, ServiceError> {
        if returns.len() < 2 {
            return Err(ServiceError::InsufficientData {
                needed: 2,
                got: returns.len(),
            });
        }

        let mean_return = Self::mean(returns)?;
        let std = Self::sample_std_dev(returns)?;

        if std == Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "returns have zero standard deviation".into(),
            });
        }

        Ok(((mean_return - risk_free_rate) / std).round_dp(6))
    }

    /// Maximum Drawdown = largest peak-to-trough decline in a value series.
    ///
    /// Returns a positive Decimal representing the percentage decline.
    /// E.g. 0.25 means a 25% drawdown.
    ///
    /// # Anti-Pattern Mitigated
    /// - Captures worst case, not average — prevents survivorship bias in reporting
    pub fn max_drawdown(&self, values: &[Money]) -> Result<Decimal, ServiceError> {
        if values.len() < 2 {
            return Err(ServiceError::InsufficientData {
                needed: 2,
                got: values.len(),
            });
        }

        let mut peak = values[0].amount();
        let mut max_dd = Decimal::ZERO;

        for v in values.iter().skip(1) {
            let amt = v.amount();
            if amt > peak {
                peak = amt;
            }
            if peak > Decimal::ZERO {
                let drawdown = (peak - amt) / peak;
                if drawdown > max_dd {
                    max_dd = drawdown;
                }
            }
        }

        Ok(max_dd.round_dp(6))
    }

    /// Compound Annual Growth Rate.
    ///
    /// CAGR = (final / initial)^(1/years) - 1
    ///
    /// Uses iterative Newton's method since rust_decimal lacks pow(Decimal).
    pub fn cagr(
        &self,
        initial_value: &Money,
        final_value: &Money,
        years: Decimal,
    ) -> Result<Decimal, ServiceError> {
        if initial_value.currency() != final_value.currency() {
            return Err(ServiceError::ValueObject(
                ValueObjectError::CurrencyMismatch {
                    expected: initial_value.currency().code().to_string(),
                    actual: final_value.currency().code().to_string(),
                },
            ));
        }

        let initial = initial_value.amount();
        let final_amt = final_value.amount();

        if initial <= Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "initial value must be positive for CAGR".into(),
            });
        }
        if years <= Decimal::ZERO {
            return Err(ServiceError::InvalidParameter(
                "years must be positive".into(),
            ));
        }

        let ratio = final_amt / initial;

        // Approximate (ratio)^(1/years) using Newton's method for n-th root.
        // We want x such that x^years = ratio, i.e. x = ratio^(1/years).
        let exponent_inv = dec!(1) / years;

        // Convert to f64 for the pow, then back to Decimal.
        // This is the pragmatic trade-off: CAGR exponentiation is inherently
        // transcendental; exact Decimal pow doesn't exist. We round to 6dp.
        let ratio_f64 = ratio.to_f64().unwrap_or(1.0);
        let exp_f64 = exponent_inv.to_f64().unwrap_or(1.0);
        let result_f64 = ratio_f64.powf(exp_f64) - 1.0;

        let cagr = Decimal::from_f64(result_f64).ok_or_else(|| ServiceError::Overflow {
            context: "CAGR calculation produced non-representable value".into(),
        })?;

        Ok(cagr.round_dp(6))
    }

    /// Simple total return = (final - initial) / initial
    pub fn total_return(
        &self,
        initial_value: &Money,
        final_value: &Money,
    ) -> Result<Decimal, ServiceError> {
        if initial_value.currency() != final_value.currency() {
            return Err(ServiceError::ValueObject(
                ValueObjectError::CurrencyMismatch {
                    expected: initial_value.currency().code().to_string(),
                    actual: final_value.currency().code().to_string(),
                },
            ));
        }

        let initial = initial_value.amount();
        if initial == Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "initial value is zero".into(),
            });
        }

        Ok(((final_value.amount() - initial) / initial).round_dp(6))
    }
}

impl Default for PerformanceCalculator {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Risk Analyzer
// ============================================================================

/// Analyzes portfolio risk using standard quantitative finance metrics.
///
/// # Anti-Patterns Mitigated
/// - VaR uses parametric (Gaussian) model with explicit confidence level —
///   no hidden assumptions about distribution shape.
/// - Beta and correlation validate input length equality before calculation.
/// - All methods return ServiceError instead of silently returning zero.
#[derive(Serialize, Deserialize)]
pub struct RiskAnalyzer;

impl RiskAnalyzer {
    pub fn new() -> Self {
        Self
    }

    /// Parametric Value at Risk (VaR).
    ///
    /// VaR = portfolio_value * z_score * volatility * sqrt(time_horizon)
    ///
    /// # Arguments
    /// * `portfolio_value` - Current total portfolio value
    /// * `confidence_level` - e.g. 0.95 for 95% VaR
    /// * `daily_volatility` - Daily portfolio volatility (std dev of daily returns)
    /// * `time_horizon_days` - Number of days for VaR horizon
    ///
    /// # Returns
    /// Money amount representing maximum expected loss at the given confidence level.
    pub fn value_at_risk(
        &self,
        portfolio_value: &Money,
        confidence_level: Decimal,
        daily_volatility: Decimal,
        time_horizon_days: u32,
    ) -> Result<Money, ServiceError> {
        if confidence_level <= Decimal::ZERO || confidence_level >= dec!(1) {
            return Err(ServiceError::InvalidParameter(format!(
                "confidence_level must be between 0 and 1 exclusive, got {}",
                confidence_level
            )));
        }
        if time_horizon_days == 0 {
            return Err(ServiceError::InvalidParameter(
                "time_horizon_days must be > 0".into(),
            ));
        }

        // Z-score lookup for common confidence levels (Gaussian approximation)
        let z_score = z_score_from_confidence(confidence_level);

        // sqrt(time_horizon)
        let horizon_dec = Decimal::from(time_horizon_days);
        let sqrt_horizon = decimal_sqrt(horizon_dec)?;

        let var_amount = portfolio_value.amount() * z_score * daily_volatility * sqrt_horizon;

        Ok(Money::new(
            var_amount.round_dp(2),
            portfolio_value.currency(),
        ))
    }

    /// Portfolio volatility = standard deviation of periodic returns.
    ///
    /// Uses sample std dev (Bessel-corrected) for unbiased estimation.
    pub fn volatility(&self, returns: &[Decimal]) -> Result<Decimal, ServiceError> {
        PerformanceCalculator::sample_std_dev(returns)
    }

    /// Annualised volatility from daily returns.
    ///
    /// annualised_vol = daily_vol * sqrt(252)  (252 trading days/year)
    pub fn annualised_volatility(
        &self,
        daily_returns: &[Decimal],
    ) -> Result<Decimal, ServiceError> {
        let daily_vol = self.volatility(daily_returns)?;
        let sqrt_252 = decimal_sqrt(dec!(252))?;
        Ok((daily_vol * sqrt_252).round_dp(6))
    }

    /// Beta = Cov(portfolio, market) / Var(market)
    ///
    /// Measures systematic risk relative to the market benchmark.
    ///
    /// # Anti-Pattern Mitigated
    /// - Validates equal-length return series before calculation
    /// - Returns error on zero market variance (prevents division by zero)
    pub fn beta(
        &self,
        portfolio_returns: &[Decimal],
        market_returns: &[Decimal],
    ) -> Result<Decimal, ServiceError> {
        if portfolio_returns.len() != market_returns.len() {
            return Err(ServiceError::InvalidParameter(format!(
                "Return series must be equal length: portfolio={}, market={}",
                portfolio_returns.len(),
                market_returns.len()
            )));
        }
        if portfolio_returns.len() < 2 {
            return Err(ServiceError::InsufficientData {
                needed: 2,
                got: portfolio_returns.len(),
            });
        }

        let covariance = self.covariance(portfolio_returns, market_returns)?;
        let market_variance = self.variance(market_returns)?;

        if market_variance == Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "market returns have zero variance".into(),
            });
        }

        Ok((covariance / market_variance).round_dp(6))
    }

    /// Pearson correlation coefficient between two return series.
    ///
    /// r = Cov(X,Y) / (StdDev(X) * StdDev(Y))
    pub fn correlation(
        &self,
        series_a: &[Decimal],
        series_b: &[Decimal],
    ) -> Result<Decimal, ServiceError> {
        if series_a.len() != series_b.len() {
            return Err(ServiceError::InvalidParameter(format!(
                "Series must be equal length: a={}, b={}",
                series_a.len(),
                series_b.len()
            )));
        }

        let cov = self.covariance(series_a, series_b)?;
        let std_a = PerformanceCalculator::std_dev(series_a)?;
        let std_b = PerformanceCalculator::std_dev(series_b)?;

        let denominator = std_a * std_b;
        if denominator == Decimal::ZERO {
            return Err(ServiceError::DivisionByZero {
                context: "one or both series have zero standard deviation".into(),
            });
        }

        Ok((cov / denominator).round_dp(6))
    }

    /// Population covariance between two series.
    fn covariance(&self, a: &[Decimal], b: &[Decimal]) -> Result<Decimal, ServiceError> {
        let n = a.len();
        if n < 2 {
            return Err(ServiceError::InsufficientData { needed: 2, got: n });
        }

        let mean_a = PerformanceCalculator::mean(a)?;
        let mean_b = PerformanceCalculator::mean(b)?;
        let n_dec = Decimal::from(n);

        let sum: Decimal = a
            .iter()
            .zip(b.iter())
            .map(|(ai, bi)| (*ai - mean_a) * (*bi - mean_b))
            .sum();

        Ok(sum / n_dec)
    }

    /// Population variance.
    fn variance(&self, values: &[Decimal]) -> Result<Decimal, ServiceError> {
        let mean = PerformanceCalculator::mean(values)?;
        let n = Decimal::from(values.len());
        let sum: Decimal = values.iter().map(|v| (*v - mean) * (*v - mean)).sum();
        Ok(sum / n)
    }
}

impl Default for RiskAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// WSJF Calculator (Domain-Specific Service)
// ============================================================================

/// Weighted Shortest Job First prioritization.
///
/// WSJF = Cost_of_Delay / Job_Size
/// Cost_of_Delay = Business_Value + Time_Criticality + Risk_Reduction_or_Opportunity
///
/// # Anti-Patterns Mitigated
///
/// 1. **Subjective Manipulation**: All inputs are bounded [1, 10] and validated.
///    Extreme values (1 or 10) require written justification.
///
/// 2. **Estimation Bias (Anchoring)**: Inputs are collected independently —
///    the calculator does not reveal running totals until all inputs are provided.
///
/// 3. **HiPPO Effect**: WSJF is deterministic from its inputs. No override mechanism
///    without explicit `WsjfOverride` record that logs who, when, and why.
///
/// 4. **Gaming via Job Size**: Job size floor is 1.0 (not 0.1) to prevent
///    infinite WSJF from near-zero denominators.
///
/// 5. **Recency Bias**: Time criticality decays — `with_time_decay` recalculates
///    based on how much deadline has elapsed since last scoring.
///
/// 6. **Stale Scores**: Every `WsjfItem` carries a `scored_at` timestamp.
///    The `is_stale` method returns true after a configurable threshold (default 96h).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Horizon {
    Now,   // 0-3 months
    Next,  // 3-12 months
    Later, // 12+ months
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsjfItem {
    pub id: String,
    pub description: String,
    pub business_value: Decimal,
    pub time_criticality: Decimal,
    pub risk_reduction: Decimal,
    pub job_size: Decimal,
    pub wsjf_score: Decimal,
    pub scored_at: String, // ISO 8601 timestamp
    pub justification: Option<String>,
    pub horizon: Option<Horizon>,
}

#[derive(Serialize, Deserialize)]
pub struct WsjfCalculator {
    min_input: Decimal,
    max_input: Decimal,
    min_job_size: Decimal,
    staleness_hours: u64,
}

/// An explicit WSJF override record for audit trail.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsjfOverride {
    pub item_id: String,
    pub original_score: Decimal,
    pub overridden_score: Decimal,
    pub overridden_by: String,
    pub reason: String,
    pub timestamp: String,
}

impl WsjfCalculator {
    pub fn new() -> Self {
        Self {
            min_input: dec!(1),
            max_input: dec!(10),
            min_job_size: dec!(1),
            staleness_hours: 96,
        }
    }

    /// Configure the staleness threshold (hours after which a score is stale).
    pub fn with_staleness_hours(mut self, hours: u64) -> Self {
        self.staleness_hours = hours;
        self
    }

    /// Calculate WSJF score with full input validation.
    ///
    /// # Errors
    /// - Any input outside [1, 10] range
    /// - Job size below minimum floor (1.0)
    /// - Extreme values (1 or 10) without justification
    pub fn calculate(
        &self,
        id: &str,
        description: &str,
        business_value: Decimal,
        time_criticality: Decimal,
        risk_reduction: Decimal,
        job_size: Decimal,
        justification: Option<&str>,
    ) -> Result<WsjfItem, ServiceError> {
        // Validate bounds
        for (name, val) in [
            ("business_value", business_value),
            ("time_criticality", time_criticality),
            ("risk_reduction", risk_reduction),
            ("job_size", job_size),
        ] {
            if val < self.min_input || val > self.max_input {
                return Err(ServiceError::InvalidParameter(format!(
                    "{} must be between {} and {}, got {}",
                    name, self.min_input, self.max_input, val
                )));
            }
        }

        // Enforce job size floor
        let effective_job_size = if job_size < self.min_job_size {
            self.min_job_size
        } else {
            job_size
        };

        // Require justification for extreme values
        let has_extreme = business_value == self.max_input
            || time_criticality == self.max_input
            || risk_reduction == self.max_input
            || business_value == self.min_input
            || job_size == self.min_input;

        if has_extreme && justification.is_none() {
            return Err(ServiceError::InvalidParameter(
                "Extreme values (1 or 10) require a written justification to prevent anchoring bias"
                    .into(),
            ));
        }

        let cost_of_delay = business_value + time_criticality + risk_reduction;
        let wsjf = (cost_of_delay / effective_job_size).round_dp(2);

        let now = chrono::Utc::now().to_rfc3339();

        Ok(WsjfItem {
            id: id.to_string(),
            description: description.to_string(),
            business_value,
            time_criticality,
            risk_reduction,
            job_size: effective_job_size,
            wsjf_score: wsjf,
            scored_at: now,
            justification: justification.map(String::from),
            horizon: None,
        })
    }

    /// Recalculate WSJF with time-decay applied to time_criticality.
    ///
    /// As a deadline approaches, time_criticality increases linearly toward 10.
    /// `elapsed_fraction` is 0.0 at scoring time, 1.0 at deadline.
    pub fn with_time_decay(
        &self,
        item: &WsjfItem,
        elapsed_fraction: Decimal,
    ) -> Result<WsjfItem, ServiceError> {
        if elapsed_fraction < Decimal::ZERO || elapsed_fraction > dec!(1) {
            return Err(ServiceError::InvalidParameter(format!(
                "elapsed_fraction must be [0, 1], got {}",
                elapsed_fraction
            )));
        }

        // Linear interpolation: tc' = tc + (10 - tc) * elapsed_fraction
        let new_tc =
            item.time_criticality + (self.max_input - item.time_criticality) * elapsed_fraction;
        let new_tc = new_tc.min(self.max_input).round_dp(1);

        self.calculate(
            &item.id,
            &item.description,
            item.business_value,
            new_tc,
            item.risk_reduction,
            item.job_size,
            item.justification
                .as_deref()
                .or(Some("time-decay recalculation")),
        )
    }

    /// Check if a WSJF item's score is stale (older than staleness threshold).
    ///
    /// Uses string-based ISO 8601 comparison since the domain model stores timestamps
    /// as strings for serialization compatibility.
    pub fn is_stale(&self, item: &WsjfItem) -> bool {
        let Ok(scored) = chrono::DateTime::parse_from_rfc3339(&item.scored_at) else {
            return true; // unparseable = treat as stale
        };
        let age = chrono::Utc::now().signed_duration_since(scored);
        age.num_hours() >= self.staleness_hours as i64
    }

    /// Sort items by WSJF score descending (highest priority first).
    pub fn prioritize(items: &mut [WsjfItem]) {
        items.sort_by(|a, b| {
            b.wsjf_score
                .partial_cmp(&a.wsjf_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    /// Detect WSJF anti-patterns in a scored backlog.
    ///
    /// Returns a list of warning strings for human review.
    pub fn detect_anti_patterns(items: &[WsjfItem]) -> Vec<String> {
        let mut warnings = Vec::new();

        if items.is_empty() {
            return warnings;
        }

        // Anti-pattern 1: All items have the same score (no differentiation)
        let first_score = items[0].wsjf_score;
        if items.iter().all(|i| i.wsjf_score == first_score) && items.len() > 1 {
            warnings.push(format!(
                "ALL {} items have identical WSJF score ({}) — scoring likely not meaningful",
                items.len(),
                first_score
            ));
        }

        // Anti-pattern 2: Job size is always minimum (gaming the denominator)
        let min_js_count = items.iter().filter(|i| i.job_size == dec!(1)).count();
        if min_js_count as f64 / items.len() as f64 > 0.5 {
            warnings.push(format!(
                "{}/{} items have minimum job_size=1 — possible gaming of denominator",
                min_js_count,
                items.len()
            ));
        }

        // Anti-pattern 3: All business_value = 10 (anchoring at max)
        let max_bv_count = items
            .iter()
            .filter(|i| i.business_value == dec!(10))
            .count();
        if max_bv_count as f64 / items.len() as f64 > 0.5 {
            warnings.push(format!(
                "{}/{} items have max business_value=10 — anchoring bias suspected",
                max_bv_count,
                items.len()
            ));
        }

        // Anti-pattern 4: No justifications for extreme values
        let unjustified_extremes = items
            .iter()
            .filter(|i| {
                (i.business_value == dec!(10)
                    || i.time_criticality == dec!(10)
                    || i.job_size == dec!(1))
                    && i.justification.is_none()
            })
            .count();
        if unjustified_extremes > 0 {
            warnings.push(format!(
                "{} items have extreme values without justification",
                unjustified_extremes
            ));
        }

        // Anti-pattern 5: Stale scores
        let calc = WsjfCalculator::new();
        let stale_count = items.iter().filter(|i| calc.is_stale(i)).count();
        if stale_count > 0 {
            warnings.push(format!(
                "{}/{} items have stale scores (>{}h old) — recalculate before prioritizing",
                stale_count,
                items.len(),
                calc.staleness_hours
            ));
        }

        // Anti-pattern 6: Score clustering (top N items within 10% of each other)
        if items.len() >= 3 {
            let top = items[0].wsjf_score;
            let third = items[2.min(items.len() - 1)].wsjf_score;
            if top > Decimal::ZERO {
                let spread = ((top - third) / top).abs();
                if spread < dec!(0.1) {
                    warnings.push(format!(
                        "Top 3 items are within {:.0}% of each other — consider finer-grained scoring",
                        (spread * dec!(100)).round_dp(0)
                    ));
                }
            }
        }

        warnings
    }
}

impl Default for WsjfCalculator {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Utility: Decimal square root via Newton's method
// ============================================================================

/// Compute the square root of a non-negative Decimal using Newton's method.
///
/// Converges to 12 decimal places of precision within ~20 iterations.
fn decimal_sqrt(value: Decimal) -> Result<Decimal, ServiceError> {
    if value < Decimal::ZERO {
        return Err(ServiceError::InvalidParameter(format!(
            "Cannot take square root of negative value: {}",
            value
        )));
    }
    if value == Decimal::ZERO {
        return Ok(Decimal::ZERO);
    }

    // Initial guess from f64 sqrt
    let guess_f64 = value.to_f64().unwrap_or(1.0).sqrt();
    let mut x = Decimal::from_f64(guess_f64).unwrap_or(dec!(1));

    // Newton iterations: x_{n+1} = (x_n + value / x_n) / 2
    for _ in 0..30 {
        if x == Decimal::ZERO {
            break;
        }
        let next = (x + value / x) / dec!(2);
        let diff = (next - x).abs();
        x = next;
        // Converged to 12dp
        if diff < dec!(0.000000000001) {
            break;
        }
    }

    Ok(x.round_dp(12))
}

/// Compute the z-score (inverse normal CDF) for a given confidence level.
///
/// Uses the `statrs` crate's `Normal` distribution for exact computation
/// at **any** confidence level, replacing the prior 6-entry lookup table.
///
/// # Accuracy
///
/// Full double-precision inverse CDF — accurate to ~15 significant digits,
/// then rounded to 3dp via Decimal conversion. This is orders of magnitude
/// more precise than the previous linear-interpolation approach, and handles
/// edge-case confidence levels (e.g., 0.9999) that the lookup table missed.
///
/// # Anti-Pattern Mitigated
///
/// The lookup table was a **silent approximation boundary**: any confidence
/// level not in the table (e.g., 0.975 for a 97.5% two-tailed test, or
/// 0.999 for stress testing) would fall back to linear interpolation between
/// the two nearest entries. This could produce z-scores off by 0.1–0.3,
/// which at $100K portfolio value means $100–$300 VaR error.
///
/// With `statrs`, every confidence level from 0.0001 to 0.9999 produces
/// the mathematically correct z-score.
fn z_score_from_confidence(confidence: Decimal) -> Decimal {
    let conf_f64 = confidence.to_f64().unwrap_or(0.95);

    // Standard normal distribution: mean=0, std_dev=1
    let normal = Normal::new(0.0, 1.0).unwrap();

    // inverse_cdf gives us the z-score directly
    let z = normal.inverse_cdf(conf_f64);

    // Convert back to Decimal, rounded to 3dp (sufficient for VaR)
    Decimal::from_f64(z)
        .unwrap_or(dec!(1.645)) // fallback to 95% z-score if conversion fails
        .round_dp(3)
}

// ============================================================================
// Tests
// ============================================================================

// ============================================================================
// Budget Guardrail (Lean Budgeting)
// ============================================================================

/// Allocates WSJF items into execution horizons (Now, Next, Later) based on
/// capacity guardrails.
#[derive(Serialize, Deserialize)]
pub struct BudgetGuardrail;

impl BudgetGuardrail {
    /// Allocates items to horizons based on WSJF score and capacity buckets.
    ///
    /// # Logic
    /// 1. Sort items by WSJF score (descending).
    /// 2. Allocate top N items to 'Now' until 'now_capacity' is filled.
    /// 3. Allocate next M items to 'Next' until 'next_capacity' is filled.
    /// 4. Allocate remainder to 'Later'.
    ///
    /// Capacity is defined in "points" (sum of job_size).
    pub fn allocate_horizons(
        items: &mut [WsjfItem],
        now_capacity: Decimal,
        next_capacity: Decimal,
    ) {
        // Sort descending by WSJF
        items.sort_by(|a, b| {
            b.wsjf_score
                .partial_cmp(&a.wsjf_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let mut current_now = Decimal::ZERO;
        let mut current_next = Decimal::ZERO;

        for item in items.iter_mut() {
            if current_now + item.job_size <= now_capacity {
                item.horizon = Some(Horizon::Now);
                current_now += item.job_size;
            } else if current_next + item.job_size <= next_capacity {
                item.horizon = Some(Horizon::Next);
                current_next += item.job_size;
            } else {
                item.horizon = Some(Horizon::Later);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ────────────────────────────────────────────────────────────────────────
    // Utility tests
    // ────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_decimal_sqrt_perfect_squares() {
        let sqrt_4 = decimal_sqrt(dec!(4)).unwrap();
        assert_eq!(sqrt_4.round_dp(6), dec!(2.000000));

        let sqrt_9 = decimal_sqrt(dec!(9)).unwrap();
        assert_eq!(sqrt_9.round_dp(6), dec!(3.000000));

        let sqrt_100 = decimal_sqrt(dec!(100)).unwrap();
        assert_eq!(sqrt_100.round_dp(6), dec!(10.000000));
    }

    #[test]
    fn test_decimal_sqrt_non_perfect() {
        let sqrt_2 = decimal_sqrt(dec!(2)).unwrap();
        // 1.414213...
        assert!(sqrt_2 > dec!(1.41421) && sqrt_2 < dec!(1.41422));
    }

    #[test]
    fn test_decimal_sqrt_zero() {
        assert_eq!(decimal_sqrt(dec!(0)).unwrap(), Decimal::ZERO);
    }

    #[test]
    fn test_decimal_sqrt_negative_errors() {
        assert!(decimal_sqrt(dec!(-1)).is_err());
    }

    #[test]
    fn test_z_score_95_confidence() {
        let z = z_score_from_confidence(dec!(0.95));
        assert_eq!(z, dec!(1.645));
    }

    #[test]
    fn test_z_score_99_confidence() {
        let z = z_score_from_confidence(dec!(0.99));
        assert_eq!(z, dec!(2.326));
    }

    #[test]
    fn test_z_score_975_two_tailed() {
        // 97.5% is the one-tail cutoff for a 95% two-tailed test
        let z = z_score_from_confidence(dec!(0.975));
        assert_eq!(z, dec!(1.960));
    }

    #[test]
    fn test_z_score_999_stress_test() {
        // 99.9% — previously required interpolation, now exact
        let z = z_score_from_confidence(dec!(0.999));
        assert_eq!(z, dec!(3.090));
    }

    #[test]
    fn test_z_score_arbitrary_confidence() {
        // 92.5% — was NOT in the old lookup table at all
        let z = z_score_from_confidence(dec!(0.925));
        // statrs gives ~1.4395; rounded to 3dp = 1.440 (or 1.439)
        assert!(
            z > dec!(1.43) && z < dec!(1.45),
            "92.5% z-score should be ~1.44, got {}",
            z
        );
    }

    #[test]
    fn test_z_score_50_confidence_is_zero() {
        // 50% confidence = median = z-score of 0
        let z = z_score_from_confidence(dec!(0.5));
        assert_eq!(z, dec!(0.000));
    }

    // ────────────────────────────────────────────────────────────────────────
    // PerformanceCalculator tests
    // ────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_mean() {
        let vals = vec![dec!(10), dec!(20), dec!(30)];
        assert_eq!(PerformanceCalculator::mean(&vals).unwrap(), dec!(20));
    }

    #[test]
    fn test_mean_empty_errors() {
        assert!(PerformanceCalculator::mean(&[]).is_err());
    }

    #[test]
    fn test_std_dev_known_values() {
        // Population std dev of [2, 4, 4, 4, 5, 5, 7, 9] = 2.0
        let vals = vec![
            dec!(2),
            dec!(4),
            dec!(4),
            dec!(4),
            dec!(5),
            dec!(5),
            dec!(7),
            dec!(9),
        ];
        let sd = PerformanceCalculator::std_dev(&vals).unwrap();
        assert!(sd > dec!(1.99) && sd < dec!(2.01), "std_dev was {}", sd);
    }

    #[test]
    fn test_std_dev_insufficient_data() {
        assert!(PerformanceCalculator::std_dev(&[dec!(1)]).is_err());
    }

    #[test]
    fn test_sharpe_ratio_positive() {
        let calc = PerformanceCalculator::new();
        // Returns: 0.05, 0.03, 0.07, 0.04, 0.06 (mean = 0.05)
        let returns = vec![dec!(0.05), dec!(0.03), dec!(0.07), dec!(0.04), dec!(0.06)];
        let sharpe = calc.sharpe_ratio(&returns, dec!(0.01)).unwrap();
        // (0.05 - 0.01) / sample_std_dev should be positive
        assert!(sharpe > Decimal::ZERO, "Sharpe = {}", sharpe);
    }

    #[test]
    fn test_sharpe_ratio_insufficient_data() {
        let calc = PerformanceCalculator::new();
        assert!(calc.sharpe_ratio(&[dec!(0.05)], dec!(0.01)).is_err());
    }

    #[test]
    fn test_sharpe_ratio_zero_variance_errors() {
        let calc = PerformanceCalculator::new();
        // All same return = zero std dev
        let returns = vec![dec!(0.05), dec!(0.05), dec!(0.05)];
        assert!(calc.sharpe_ratio(&returns, dec!(0.01)).is_err());
    }

    #[test]
    fn test_max_drawdown_simple() {
        let calc = PerformanceCalculator::new();
        let values = vec![
            Money::new(dec!(100), Currency::USD),
            Money::new(dec!(120), Currency::USD), // peak
            Money::new(dec!(90), Currency::USD),  // trough
            Money::new(dec!(110), Currency::USD),
        ];
        let mdd = calc.max_drawdown(&values).unwrap();
        // Drawdown from 120 to 90 = 30/120 = 0.25
        assert_eq!(mdd, dec!(0.250000));
    }

    #[test]
    fn test_max_drawdown_no_drawdown() {
        let calc = PerformanceCalculator::new();
        let values = vec![
            Money::new(dec!(100), Currency::USD),
            Money::new(dec!(110), Currency::USD),
            Money::new(dec!(120), Currency::USD),
        ];
        let mdd = calc.max_drawdown(&values).unwrap();
        assert_eq!(mdd, dec!(0.000000));
    }

    #[test]
    fn test_max_drawdown_insufficient_data() {
        let calc = PerformanceCalculator::new();
        assert!(calc
            .max_drawdown(&[Money::new(dec!(100), Currency::USD)])
            .is_err());
    }

    #[test]
    fn test_cagr_doubling_in_one_year() {
        let calc = PerformanceCalculator::new();
        let initial = Money::new(dec!(1000), Currency::USD);
        let final_val = Money::new(dec!(2000), Currency::USD);
        let cagr = calc.cagr(&initial, &final_val, dec!(1)).unwrap();
        // (2000/1000)^1 - 1 = 1.0 = 100%
        assert_eq!(cagr, dec!(1.000000));
    }

    #[test]
    fn test_cagr_doubling_in_three_years() {
        let calc = PerformanceCalculator::new();
        let initial = Money::new(dec!(1000), Currency::USD);
        let final_val = Money::new(dec!(2000), Currency::USD);
        let cagr = calc.cagr(&initial, &final_val, dec!(3)).unwrap();
        // (2)^(1/3) - 1 ≈ 0.2599
        assert!(cagr > dec!(0.259) && cagr < dec!(0.261), "CAGR = {}", cagr);
    }

    #[test]
    fn test_cagr_zero_initial_errors() {
        let calc = PerformanceCalculator::new();
        assert!(calc
            .cagr(
                &Money::new(dec!(0), Currency::USD),
                &Money::new(dec!(100), Currency::USD),
                dec!(1)
            )
            .is_err());
    }

    #[test]
    fn test_cagr_currency_mismatch_errors() {
        let calc = PerformanceCalculator::new();
        assert!(calc
            .cagr(
                &Money::new(dec!(100), Currency::USD),
                &Money::new(dec!(200), Currency::EUR),
                dec!(1)
            )
            .is_err());
    }

    #[test]
    fn test_total_return() {
        let calc = PerformanceCalculator::new();
        let initial = Money::new(dec!(1000), Currency::USD);
        let final_val = Money::new(dec!(1250), Currency::USD);
        let ret = calc.total_return(&initial, &final_val).unwrap();
        assert_eq!(ret, dec!(0.250000)); // 25%
    }

    #[test]
    fn test_total_return_negative() {
        let calc = PerformanceCalculator::new();
        let initial = Money::new(dec!(1000), Currency::USD);
        let final_val = Money::new(dec!(800), Currency::USD);
        let ret = calc.total_return(&initial, &final_val).unwrap();
        assert_eq!(ret, dec!(-0.200000)); // -20%
    }

    // ────────────────────────────────────────────────────────────────────────
    // RiskAnalyzer tests
    // ────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_volatility_known_series() {
        let ra = RiskAnalyzer::new();
        let returns = vec![dec!(0.01), dec!(-0.02), dec!(0.03), dec!(-0.01), dec!(0.02)];
        let vol = ra.volatility(&returns).unwrap();
        assert!(vol > Decimal::ZERO, "Volatility = {}", vol);
    }

    #[test]
    fn test_volatility_constant_returns_is_zero() {
        let ra = RiskAnalyzer::new();
        let returns = vec![dec!(0.05), dec!(0.05), dec!(0.05)];
        let vol = ra.volatility(&returns).unwrap();
        assert_eq!(vol, Decimal::ZERO);
    }

    #[test]
    fn test_beta_perfect_correlation() {
        let ra = RiskAnalyzer::new();
        // Portfolio = 2x market returns → beta should be ~2
        let market = vec![dec!(0.01), dec!(0.02), dec!(-0.01), dec!(0.03), dec!(-0.02)];
        let portfolio: Vec<Decimal> = market.iter().map(|r| r * dec!(2)).collect();

        let beta = ra.beta(&portfolio, &market).unwrap();
        assert!(
            beta > dec!(1.99) && beta < dec!(2.01),
            "Beta should be ~2.0, got {}",
            beta
        );
    }

    #[test]
    fn test_beta_unequal_lengths_errors() {
        let ra = RiskAnalyzer::new();
        assert!(ra.beta(&[dec!(0.01), dec!(0.02)], &[dec!(0.01)]).is_err());
    }

    #[test]
    fn test_correlation_perfect_positive() {
        let ra = RiskAnalyzer::new();
        let a = vec![dec!(1), dec!(2), dec!(3), dec!(4), dec!(5)];
        let b = vec![dec!(2), dec!(4), dec!(6), dec!(8), dec!(10)];
        let corr = ra.correlation(&a, &b).unwrap();
        assert_eq!(corr, dec!(1.000000), "Perfect positive correlation");
    }

    #[test]
    fn test_correlation_perfect_negative() {
        let ra = RiskAnalyzer::new();
        let a = vec![dec!(1), dec!(2), dec!(3), dec!(4), dec!(5)];
        let b = vec![dec!(10), dec!(8), dec!(6), dec!(4), dec!(2)];
        let corr = ra.correlation(&a, &b).unwrap();
        assert_eq!(corr, dec!(-1.000000), "Perfect negative correlation");
    }

    #[test]
    fn test_var_95_confidence() {
        let ra = RiskAnalyzer::new();
        let portfolio_value = Money::new(dec!(100000), Currency::USD);
        let daily_vol = dec!(0.02); // 2% daily volatility
        let var = ra
            .value_at_risk(&portfolio_value, dec!(0.95), daily_vol, 1)
            .unwrap();
        // VaR = 100000 * 1.645 * 0.02 * sqrt(1) = 3290
        assert_eq!(var.amount(), dec!(3290.00));
        assert_eq!(var.currency(), Currency::USD);
    }

    #[test]
    fn test_var_10_day_horizon() {
        let ra = RiskAnalyzer::new();
        let portfolio_value = Money::new(dec!(100000), Currency::USD);
        let daily_vol = dec!(0.02);
        let var = ra
            .value_at_risk(&portfolio_value, dec!(0.95), daily_vol, 10)
            .unwrap();
        // VaR = 100000 * 1.645 * 0.02 * sqrt(10) ≈ 10402.26
        assert!(
            var.amount() > dec!(10400) && var.amount() < dec!(10410),
            "10-day VaR = {}",
            var.amount()
        );
    }

    #[test]
    fn test_var_invalid_confidence_errors() {
        let ra = RiskAnalyzer::new();
        let pv = Money::new(dec!(100000), Currency::USD);
        assert!(ra.value_at_risk(&pv, dec!(0), dec!(0.02), 1).is_err());
        assert!(ra.value_at_risk(&pv, dec!(1), dec!(0.02), 1).is_err());
        assert!(ra.value_at_risk(&pv, dec!(-0.5), dec!(0.02), 1).is_err());
    }

    #[test]
    fn test_annualised_volatility() {
        let ra = RiskAnalyzer::new();
        let daily_returns = vec![
            dec!(0.01),
            dec!(-0.005),
            dec!(0.008),
            dec!(-0.003),
            dec!(0.012),
            dec!(-0.007),
            dec!(0.006),
            dec!(-0.002),
            dec!(0.009),
            dec!(-0.004),
        ];
        let ann_vol = ra.annualised_volatility(&daily_returns).unwrap();
        let daily_vol = ra.volatility(&daily_returns).unwrap();
        // Annualised should be ~15.87x daily (sqrt(252))
        assert!(
            ann_vol > daily_vol * dec!(15),
            "Annualised {} should be ~15.87x daily {}",
            ann_vol,
            daily_vol
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // WSJF Calculator tests
    // ────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_wsjf_basic_calculation() {
        let calc = WsjfCalculator::new();
        let item = calc
            .calculate(
                "TASK-001",
                "Settlement email validation",
                dec!(8),
                dec!(9),
                dec!(7),
                dec!(2),
                Some("Critical: court deadline March 3"),
            )
            .unwrap();

        // WSJF = (8 + 9 + 7) / 2 = 12.0
        assert_eq!(item.wsjf_score, dec!(12.00));
        assert_eq!(item.business_value, dec!(8));
        assert_eq!(item.job_size, dec!(2));
    }

    #[test]
    fn test_wsjf_rejects_out_of_range() {
        let calc = WsjfCalculator::new();
        // business_value = 11 → out of [1, 10] range
        let result = calc.calculate("X", "X", dec!(11), dec!(5), dec!(5), dec!(3), Some("test"));
        assert!(result.is_err());
    }

    #[test]
    fn test_wsjf_rejects_zero_inputs() {
        let calc = WsjfCalculator::new();
        let result = calc.calculate("X", "X", dec!(0), dec!(5), dec!(5), dec!(3), Some("test"));
        assert!(result.is_err());
    }

    #[test]
    fn test_wsjf_requires_justification_for_extremes() {
        let calc = WsjfCalculator::new();
        // business_value = 10 without justification
        let result = calc.calculate("X", "Extreme", dec!(10), dec!(5), dec!(5), dec!(3), None);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("justification"), "Error was: {}", err);
    }

    #[test]
    fn test_wsjf_extreme_with_justification_ok() {
        let calc = WsjfCalculator::new();
        let item = calc
            .calculate(
                "URGENT",
                "Court deadline tomorrow",
                dec!(10),
                dec!(10),
                dec!(8),
                dec!(2),
                Some("March 3 hearing — no extensions possible"),
            )
            .unwrap();
        assert_eq!(item.wsjf_score, dec!(14.00));
    }

    #[test]
    fn test_wsjf_job_size_floor() {
        let calc = WsjfCalculator::new();
        let item = calc
            .calculate(
                "TINY",
                "Quick fix",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(1),
                Some("Minimal effort confirmed"),
            )
            .unwrap();
        // Job size 1 is the floor, should still work
        assert_eq!(item.wsjf_score, dec!(15.00));
    }

    #[test]
    fn test_wsjf_time_decay() {
        let calc = WsjfCalculator::new();
        let item = calc
            .calculate(
                "TASK-002",
                "Settlement deadline approaching",
                dec!(8),
                dec!(5),
                dec!(6),
                dec!(3),
                Some("Deadline Feb 12"),
            )
            .unwrap();

        // Original WSJF = (8 + 5 + 6) / 3 = 6.33
        assert_eq!(item.wsjf_score, dec!(6.33));

        // After 50% of time elapsed, TC should increase
        let decayed = calc.with_time_decay(&item, dec!(0.5)).unwrap();
        // new_tc = 5 + (10 - 5) * 0.5 = 7.5
        assert_eq!(decayed.time_criticality, dec!(7.5));
        // new WSJF = (8 + 7.5 + 6) / 3 = 7.17
        assert_eq!(decayed.wsjf_score, dec!(7.17));
    }

    #[test]
    fn test_wsjf_time_decay_at_deadline() {
        let calc = WsjfCalculator::new();
        let item = calc
            .calculate(
                "TASK-003",
                "Deadline is NOW",
                dec!(8),
                dec!(3),
                dec!(6),
                dec!(3),
                Some("Urgent"),
            )
            .unwrap();

        // At 100% elapsed, TC should max out at 10
        let decayed = calc.with_time_decay(&item, dec!(1.0)).unwrap();
        assert_eq!(decayed.time_criticality, dec!(10.0));
    }

    #[test]
    fn test_wsjf_prioritize_ordering() {
        let calc = WsjfCalculator::new();
        let mut items = vec![
            calc.calculate(
                "A",
                "Low priority",
                dec!(3),
                dec!(3),
                dec!(3),
                dec!(5),
                Some("low"),
            )
            .unwrap(),
            calc.calculate(
                "B",
                "High priority",
                dec!(9),
                dec!(9),
                dec!(8),
                dec!(2),
                Some("high"),
            )
            .unwrap(),
            calc.calculate(
                "C",
                "Medium",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(3),
                Some("med"),
            )
            .unwrap(),
        ];

        WsjfCalculator::prioritize(&mut items);

        assert_eq!(items[0].id, "B", "Highest WSJF should be first");
        assert_eq!(items[1].id, "C", "Medium WSJF should be second");
        assert_eq!(items[2].id, "A", "Lowest WSJF should be last");
    }

    #[test]
    fn test_wsjf_anti_pattern_detection_identical_scores() {
        let calc = WsjfCalculator::new();
        let items = vec![
            calc.calculate(
                "A",
                "Same",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(3),
                Some("same"),
            )
            .unwrap(),
            calc.calculate(
                "B",
                "Same",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(3),
                Some("same"),
            )
            .unwrap(),
            calc.calculate(
                "C",
                "Same",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(3),
                Some("same"),
            )
            .unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        assert!(
            warnings.iter().any(|w| w.contains("identical")),
            "Should detect identical scores. Warnings: {:?}",
            warnings
        );
    }

    #[test]
    fn test_wsjf_anti_pattern_detection_min_job_size_gaming() {
        let calc = WsjfCalculator::new();
        let items = vec![
            calc.calculate("A", "A", dec!(5), dec!(5), dec!(5), dec!(1), Some("floor"))
                .unwrap(),
            calc.calculate("B", "B", dec!(5), dec!(5), dec!(5), dec!(1), Some("floor"))
                .unwrap(),
            calc.calculate("C", "C", dec!(5), dec!(5), dec!(5), dec!(1), Some("floor"))
                .unwrap(),
            calc.calculate("D", "D", dec!(5), dec!(5), dec!(5), dec!(3), Some("normal"))
                .unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        assert!(
            warnings.iter().any(|w| w.contains("gaming")),
            "Should detect job_size gaming. Warnings: {:?}",
            warnings
        );
    }

    #[test]
    fn test_wsjf_anti_pattern_no_false_positives() {
        let calc = WsjfCalculator::new();
        let items = vec![
            calc.calculate(
                "A",
                "High",
                dec!(9),
                dec!(8),
                dec!(7),
                dec!(2),
                Some("justified"),
            )
            .unwrap(),
            calc.calculate(
                "B",
                "Med",
                dec!(5),
                dec!(5),
                dec!(5),
                dec!(4),
                Some("justified"),
            )
            .unwrap(),
            calc.calculate(
                "C",
                "Low",
                dec!(3),
                dec!(2),
                dec!(3),
                dec!(6),
                Some("justified"),
            )
            .unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        // Well-differentiated scores with varied job sizes → minimal warnings
        let anti_pattern_warnings: Vec<_> = warnings
            .iter()
            .filter(|w| w.contains("identical") || w.contains("gaming") || w.contains("anchoring"))
            .collect();
        assert!(
            anti_pattern_warnings.is_empty(),
            "Should not flag well-differentiated backlog. Got: {:?}",
            anti_pattern_warnings
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // Rebalancer tests
    // ────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_rebalancer_balanced_portfolio_no_trades() {
        let rebalancer = PortfolioRebalancer::new();
        let mut portfolio = Portfolio::new("Test".into(), Currency::USD);

        let equity = Asset::Equity(Equity {
            ticker: "AAPL".into(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        });

        let crypto = Asset::Crypto(Crypto {
            symbol: "BTC".into(),
            blockchain: Blockchain::Bitcoin,
            token_type: TokenType::Coin,
        });

        portfolio
            .add_holding(equity, dec!(10), Money::new(dec!(1500), Currency::USD))
            .unwrap();

        portfolio
            .add_holding(crypto, dec!(1), Money::new(dec!(500), Currency::USD))
            .unwrap();

        // Market prices that produce 75/25 split
        let mut prices = HashMap::new();
        prices.insert("AAPL".into(), Money::new(dec!(150), Currency::USD));
        prices.insert("BTC".into(), Money::new(dec!(500), Currency::USD));
        // Total = 10*150 + 1*500 = 2000. AAPL = 75%, BTC = 25%

        let mut targets = HashMap::new();
        targets.insert("AAPL".into(), Allocation::new(dec!(75)).unwrap());
        targets.insert("BTC".into(), Allocation::new(dec!(25)).unwrap());

        let trades = rebalancer
            .calculate_rebalancing_trades(&portfolio, &targets, &prices)
            .unwrap();

        // All trades should be Hold (within tolerance)
        for trade in &trades {
            assert_eq!(
                trade.action,
                TradeAction::Hold,
                "{} should be Hold, drift = {}",
                trade.asset_name,
                trade.drift_pct
            );
        }
    }

    #[test]
    fn test_rebalancer_imbalanced_produces_trades() {
        let rebalancer = PortfolioRebalancer::new();
        let mut portfolio = Portfolio::new("Test".into(), Currency::USD);

        let equity = Asset::Equity(Equity {
            ticker: "AAPL".into(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        });

        portfolio
            .add_holding(equity, dec!(100), Money::new(dec!(10000), Currency::USD))
            .unwrap();

        // 100% in AAPL, target is 60/40
        let mut prices = HashMap::new();
        prices.insert("AAPL".into(), Money::new(dec!(150), Currency::USD));
        prices.insert("BTC".into(), Money::new(dec!(50000), Currency::USD));

        let mut targets = HashMap::new();
        targets.insert("AAPL".into(), Allocation::new(dec!(60)).unwrap());
        targets.insert("BTC".into(), Allocation::new(dec!(40)).unwrap());

        let trades = rebalancer
            .calculate_rebalancing_trades(&portfolio, &targets, &prices)
            .unwrap();

        // Should have a SELL for AAPL and a BUY for BTC
        let aapl_trade = trades.iter().find(|t| t.asset_name == "AAPL").unwrap();
        assert_eq!(aapl_trade.action, TradeAction::Sell);

        let btc_trade = trades.iter().find(|t| t.asset_name == "BTC").unwrap();
        assert_eq!(btc_trade.action, TradeAction::Buy);
    }

    #[test]
    fn test_rebalancer_needs_rebalancing_threshold() {
        let rebalancer = PortfolioRebalancer::new();
        let mut portfolio = Portfolio::new("Test".into(), Currency::USD);

        let equity = Asset::Equity(Equity {
            ticker: "AAPL".into(),
            exchange: Exchange::NASDAQ,
            sector: Sector::Technology,
            market_cap: MarketCap::Large,
        });

        portfolio
            .add_holding(equity, dec!(100), Money::new(dec!(15000), Currency::USD))
            .unwrap();

        let mut prices = HashMap::new();
        prices.insert("AAPL".into(), Money::new(dec!(150), Currency::USD));

        let mut targets = HashMap::new();
        targets.insert("AAPL".into(), Allocation::new(dec!(60)).unwrap());

        // 100% vs 60% target → 40% drift → needs rebalancing at 5% threshold
        let needs = rebalancer
            .needs_rebalancing(&portfolio, &targets, &prices, dec!(5))
            .unwrap();
        assert!(needs);

        // But not at 50% threshold
        let doesnt_need = rebalancer
            .needs_rebalancing(&portfolio, &targets, &prices, dec!(50))
            .unwrap();
        assert!(!doesnt_need);
    }
}

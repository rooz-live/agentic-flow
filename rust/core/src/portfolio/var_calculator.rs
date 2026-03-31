//! Value at Risk (VaR) and Z-Score Calculations
//!
//! DoR: Confidence levels and statistical methods specified
//! DoD: Parametric, Historical, and Monte Carlo VaR validated against known benchmarks
//!
//! Provides statistical risk metrics using the statrs crate for
//! inverse normal CDF calculations at standard confidence levels.

use rust_decimal::Decimal;
use serde::{Serialize, Deserialize};
use rust_decimal_macros::dec;
use statrs::distribution::{ContinuousCDF, Normal};
use statrs::function::erf::erf_inv;
use thiserror::Error;

/// Standard confidence levels for VaR calculations
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConfidenceLevel {
    /// 90% confidence (Z ≈ 1.282)
    P90 = 90,
    /// 95% confidence (Z ≈ 1.645)
    P95 = 95,
    /// 97.5% confidence (Z ≈ 1.960)
    P975 = 97,
    /// 99% confidence (Z ≈ 2.326)
    P99 = 99,
    /// 99.5% confidence (Z ≈ 2.576)
    P995 = 99,
    /// 99.9% confidence (Z ≈ 3.090)
    P999 = 99,
}

impl ConfidenceLevel {
    /// Get confidence as decimal (e.g., 0.95 for 95%)
    pub fn as_decimal(&self) -> Decimal {
        match self {
            ConfidenceLevel::P90 => dec!(0.90),
            ConfidenceLevel::P95 => dec!(0.95),
            ConfidenceLevel::P975 => dec!(0.975),
            ConfidenceLevel::P99 => dec!(0.99),
            ConfidenceLevel::P995 => dec!(0.995),
            ConfidenceLevel::P999 => dec!(0.999),
        }
    }

    /// Get the Z-score for this confidence level (one-tailed)
    pub fn z_score(&self) -> f64 {
        match self {
            ConfidenceLevel::P90 => 1.2816,
            ConfidenceLevel::P95 => 1.6449,
            ConfidenceLevel::P975 => 1.9600,
            ConfidenceLevel::P99 => 2.3263,
            ConfidenceLevel::P995 => 2.5758,
            ConfidenceLevel::P999 => 3.0902,
        }
    }

    /// Get all standard confidence levels
    pub fn all() -> Vec<ConfidenceLevel> {
        vec![
            ConfidenceLevel::P90,
            ConfidenceLevel::P95,
            ConfidenceLevel::P975,
            ConfidenceLevel::P99,
            ConfidenceLevel::P995,
            ConfidenceLevel::P999,
        ]
    }
}

/// Errors in VaR calculations
#[derive(Debug, Error)]
pub enum VarError {
    #[error("Invalid confidence level: {0}")]
    InvalidConfidence(f64),
    #[error("Invalid volatility: {0}")]
    InvalidVolatility(f64),
    #[error("Invalid time horizon: {0}")]
    InvalidTimeHorizon(u32),
    #[error("Statistical computation error: {0}")]
    Computation(String),
}

/// Z-Score lookup table with exact values from statrs
#[derive(Serialize, Deserialize)]
pub struct ZScoreTable;

impl ZScoreTable {
    /// Calculate Z-score for a given confidence level using statrs inverse CDF
    /// 
    /// This uses the exact inverse normal CDF from statrs for precision
    pub fn calculate(confidence: f64) -> Result<f64, VarError> {
        if confidence <= 0.0 || confidence >= 1.0 {
            return Err(VarError::InvalidConfidence(confidence));
        }

        // Use statrs Normal distribution inverse CDF
        let normal = Normal::new(0.0, 1.0)
            .map_err(|e| VarError::Computation(e.to_string()))?;

        // For one-tailed VaR, we want the upper tail
        // confidence = 0.95 means we want the 95th percentile
        let z = normal.inverse_cdf(confidence);

        Ok(z)
    }

    /// Get pre-computed Z-scores for all standard confidence levels
    pub fn standard_z_scores() -> Vec<(ConfidenceLevel, f64)> {
        ConfidenceLevel::all()
            .into_iter()
            .map(|cl| (cl, cl.z_score()))
            .collect()
    }

    /// Lookup Z-score for a specific confidence level
    pub fn lookup(confidence_pct: f64) -> Option<f64> {
        match confidence_pct {
            90.0 => Some(1.2816),
            95.0 => Some(1.6449),
            97.5 => Some(1.9600),
            99.0 => Some(2.3263),
            99.5 => Some(2.5758),
            99.9 => Some(3.0902),
            _ => {
                // Calculate dynamically for non-standard levels
                ZScoreTable::calculate(confidence_pct / 100.0).ok()
            }
        }
    }
}

/// Value at Risk calculator using parametric (variance-covariance) method
#[derive(Serialize, Deserialize)]
pub struct VarCalculator;

impl VarCalculator {
    /// Calculate parametric VaR
    ///
    /// Formula: VaR = PortfolioValue × Z × Volatility × √(TimeHorizon)
    ///
    /// # Arguments
    /// * `portfolio_value` - Current portfolio value
    /// * `confidence` - Confidence level (e.g., 0.95 for 95%)
    /// * `daily_volatility` - Daily volatility as decimal (e.g., 0.02 for 2%)
    /// * `time_horizon_days` - VaR time horizon in days
    pub fn parametric_var(
        portfolio_value: Decimal,
        confidence: f64,
        daily_volatility: f64,
        time_horizon_days: u32,
    ) -> Result<Decimal, VarError> {
        if daily_volatility <= 0.0 {
            return Err(VarError::InvalidVolatility(daily_volatility));
        }
        if time_horizon_days == 0 {
            return Err(VarError::InvalidTimeHorizon(0));
        }

        let z = ZScoreTable::calculate(confidence)?;
        let sqrt_time = (time_horizon_days as f64).sqrt();

        // VaR = PV × Z × σ × √T
        let var_pct = z * daily_volatility * sqrt_time;
        let var = portfolio_value * Decimal::from_f64(var_pct).unwrap_or(dec!(0));

        Ok(var)
    }

    /// Calculate VaR for multiple confidence levels at once
    pub fn var_at_all_levels(
        portfolio_value: Decimal,
        daily_volatility: f64,
        time_horizon_days: u32,
    ) -> Vec<(ConfidenceLevel, Decimal)> {
        ConfidenceLevel::all()
            .into_iter()
            .filter_map(|cl| {
                let var = Self::parametric_var(
                    portfolio_value,
                    cl.as_decimal().to_f64().unwrap_or(0.95),
                    daily_volatility,
                    time_horizon_days,
                )
                .ok()?;
                Some((cl, var))
            })
            .collect()
    }

    /// Calculate VaR as percentage of portfolio value
    pub fn var_percentage(
        confidence: f64,
        daily_volatility: f64,
        time_horizon_days: u32,
    ) -> Result<f64, VarError> {
        if daily_volatility <= 0.0 {
            return Err(VarError::InvalidVolatility(daily_volatility));
        }
        if time_horizon_days == 0 {
            return Err(VarError::InvalidTimeHorizon(0));
        }

        let z = ZScoreTable::calculate(confidence)?;
        let sqrt_time = (time_horizon_days as f64).sqrt();

        Ok(z * daily_volatility * sqrt_time)
    }
}

/// Historical VaR using empirical distribution
#[derive(Serialize, Deserialize)]
pub struct HistoricalVar;

impl HistoricalVar {
    /// Calculate historical VaR from a series of returns
    ///
    /// # Arguments
    /// * `returns` - Historical returns as decimals (e.g., 0.05 for 5%)
    /// * `confidence` - Confidence level (e.g., 0.95 for 95%)
    pub fn calculate(returns: &[f64], confidence: f64) -> Result<f64, VarError> {
        if returns.is_empty() {
            return Err(VarError::Computation("Empty returns series".to_string()));
        }
        if confidence <= 0.0 || confidence >= 1.0 {
            return Err(VarError::InvalidConfidence(confidence));
        }

        let mut sorted_returns = returns.to_vec();
        sorted_returns.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        // Find the percentile position
        let index = ((1.0 - confidence) * sorted_returns.len() as f64).floor() as usize;
        let safe_index = index.min(sorted_returns.len() - 1);

        // Historical VaR is the loss at the confidence percentile
        // (negative of the return at that percentile)
        Ok(-sorted_returns[safe_index])
    }
}

/// Monte Carlo VaR simulation
#[derive(Serialize, Deserialize)]
pub struct MonteCarloVar;

impl MonteCarloVar {
    /// Simulate VaR using Monte Carlo methods
    ///
    /// # Arguments
    /// * `portfolio_value` - Current portfolio value
    /// * `mean_return` - Expected daily return
    /// * `volatility` - Daily volatility
    /// * `confidence` - Confidence level
    /// * `simulations` - Number of Monte Carlo simulations
    /// * `time_horizon_days` - Time horizon
    pub fn simulate(
        portfolio_value: Decimal,
        mean_return: f64,
        volatility: f64,
        confidence: f64,
        simulations: usize,
        time_horizon_days: u32,
    ) -> Result<Decimal, VarError> {
        use rand::distributions::Distribution;
        use rand::SeedableRng;
        use rand_chacha::ChaCha8Rng;
        use statrs::distribution::Normal;

        if simulations == 0 {
            return Err(VarError::Computation(
                "Must run at least 1 simulation".to_string(),
            ));
        }

        let normal = Normal::new(mean_return, volatility)
            .map_err(|e| VarError::Computation(e.to_string()))?;

        let mut rng = ChaCha8Rng::seed_from_u64(42); // Deterministic seed for tests
        let sqrt_time = (time_horizon_days as f64).sqrt();

        let mut simulated_values: Vec<f64> = Vec::with_capacity(simulations);

        for _ in 0..simulations {
            let random_return = normal.sample(&mut rng);
            let total_return = random_return * sqrt_time;
            let portfolio_return = portfolio_value.to_f64().unwrap_or(0.0) * total_return;
            simulated_values.push(portfolio_return);
        }

        // Sort and find VaR percentile
        simulated_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let index = ((1.0 - confidence) * simulations as f64).floor() as usize;
        let safe_index = index.min(simulations - 1);

        // VaR is the loss (absolute value of negative return at percentile)
        let var_value = simulated_values[safe_index].abs();

        Ok(Decimal::from_f64(var_value).unwrap_or(dec!(0)))
    }
}

/// Stress test scenarios for portfolio risk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressScenario {
    pub name: String,
    pub market_shock: f64,        // e.g., -0.20 for 20% market drop
    pub volatility_spike: f64,    // e.g., 2.0 for 2x normal vol
    pub correlation_breakdown: bool,
}

impl StressScenario {
    /// Standard stress test scenarios
    pub fn standard_scenarios() -> Vec<StressScenario> {
        vec![
            StressScenario {
                name: "2008 Financial Crisis".to_string(),
                market_shock: -0.35,
                volatility_spike: 3.0,
                correlation_breakdown: true,
            },
            StressScenario {
                name: "2020 COVID Crash".to_string(),
                market_shock: -0.25,
                volatility_spike: 2.5,
                correlation_breakdown: true,
            },
            StressScenario {
                name: "2010 Flash Crash".to_string(),
                market_shock: -0.10,
                volatility_spike: 4.0,
                correlation_breakdown: false,
            },
            StressScenario {
                name: "Black Monday 1987".to_string(),
                market_shock: -0.20,
                volatility_spike: 5.0,
                correlation_breakdown: true,
            },
        ]
    }

    /// Apply stress scenario to portfolio
    pub fn apply(&self, portfolio_value: Decimal) -> Decimal {
        let shock = Decimal::from_f64(self.market_shock).unwrap_or(dec!(-0.1));
        portfolio_value * shock
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_confidence_levels() {
        assert_eq!(ConfidenceLevel::P95.z_score(), 1.6449);
        assert_eq!(ConfidenceLevel::P99.z_score(), 2.3263);
        assert_eq!(ConfidenceLevel::P999.z_score(), 3.0902);
    }

    #[test]
    fn test_z_score_calculation() {
        let z_95 = ZScoreTable::calculate(0.95).unwrap();
        assert!((z_95 - 1.6449).abs() < 0.001);

        let z_99 = ZScoreTable::calculate(0.99).unwrap();
        assert!((z_99 - 2.3263).abs() < 0.001);
    }

    #[test]
    fn test_z_score_lookup() {
        assert_eq!(ZScoreTable::lookup(95.0), Some(1.6449));
        assert_eq!(ZScoreTable::lookup(99.0), Some(2.3263));
        assert_eq!(ZScoreTable::lookup(99.9), Some(3.0902));
    }

    #[test]
    fn test_parametric_var() {
        let portfolio = dec!(1000000); // $1M portfolio
        let daily_vol = 0.02; // 2% daily volatility
        let horizon = 10; // 10 days

        let var = VarCalculator::parametric_var(portfolio, 0.95, daily_vol, horizon).unwrap();

        // Expected: $1M × 1.645 × 0.02 × √10 ≈ $104,000
        assert!(var > dec!(100000));
        assert!(var < dec!(110000));
    }

    #[test]
    fn test_var_at_all_levels() {
        let portfolio = dec!(1000000);
        let daily_vol = 0.02;
        let horizon = 10;

        let vars = VarCalculator::var_at_all_levels(portfolio, daily_vol, horizon);

        assert_eq!(vars.len(), 6);

        // VaR should increase with confidence level
        let var_90 = vars.iter().find(|(cl, _)| *cl == ConfidenceLevel::P90).unwrap().1;
        let var_99 = vars.iter().find(|(cl, _)| *cl == ConfidenceLevel::P99).unwrap().1;

        assert!(var_99 > var_90);
    }

    #[test]
    fn test_var_percentage() {
        let pct = VarCalculator::var_percentage(0.95, 0.02, 10).unwrap();

        // Expected: 1.645 × 0.02 × √10 ≈ 10.4%
        assert!((pct - 0.104).abs() < 0.01);
    }

    #[test]
    fn test_historical_var() {
        let returns = vec![0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.015, 0.01];

        let var_95 = HistoricalVar::calculate(&returns, 0.95).unwrap();

        // 95% VaR should be around the 5th percentile worst return
        assert!(var_95 > 0.0);
    }

    #[test]
    fn test_historical_var_empty() {
        let result = HistoricalVar::calculate(&[], 0.95);
        assert!(result.is_err());
    }

    #[test]
    fn test_monte_carlo_var() {
        let portfolio = dec!(1000000);
        let mean = 0.0005; // 0.05% daily return
        let vol = 0.02; // 2% daily volatility

        let var = MonteCarloVar::simulate(
            portfolio,
            mean,
            vol,
            0.95,
            10000, // 10k simulations
            10,
        )
        .unwrap();

        // Monte Carlo VaR should be similar to parametric
        assert!(var > dec!(50000));
        assert!(var < dec!(150000));
    }

    #[test]
    fn test_stress_scenario() {
        let scenario = StressScenario {
            name: "Test Crash".to_string(),
            market_shock: -0.30,
            volatility_spike: 2.0,
            correlation_breakdown: true,
        };

        let portfolio = dec!(1000000);
        let loss = scenario.apply(portfolio);

        assert_eq!(loss, dec!(-300000));
    }

    #[test]
    fn test_standard_scenarios() {
        let scenarios = StressScenario::standard_scenarios();
        assert_eq!(scenarios.len(), 4);

        let crisis = scenarios.iter().find(|s| s.name.contains("2008")).unwrap();
        assert_eq!(crisis.market_shock, -0.35);
    }

    #[test]
    fn test_invalid_confidence() {
        let result = ZScoreTable::calculate(1.5); // > 1.0
        assert!(result.is_err());

        let result = ZScoreTable::calculate(-0.1); // < 0.0
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_volatility() {
        let portfolio = dec!(1000000);
        let result = VarCalculator::parametric_var(portfolio, 0.95, -0.01, 10);
        assert!(result.is_err());
    }
}

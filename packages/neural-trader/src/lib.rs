//! Neural Trader v2.8 — Cross-platform WASM trading engine
//!
//! Real Kelly criterion sizing, Sharpe-based signal quality, and
//! drawdown-aware position management. Ported from wsjf-domain-bridge
//! trading_signals domain into a self-contained WASM module.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

const VERSION: &str = "2.9.0";

// ── Market condition input ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCondition {
    pub symbol: String,
    pub volatility: f64,       // annualized vol [0.05, 1.5]
    pub trend_strength: f64,   // [-1.0, 1.0] bearish to bullish
    pub mean_reversion: f64,   // [0.0, 1.0]
    pub volume_ratio: f64,     // relative to 20d avg
    pub risk_budget: f64,      // max risk per trade [0.001, 0.05]
    pub win_probability: f64,  // estimated P(win) [0.3, 0.8]
    pub payoff_ratio: f64,     // expected win/loss ratio [0.5, 4.0]
}

impl MarketCondition {
    /// Kelly fraction = p - (1-p)/b, capped at 10× risk_budget.
    pub fn kelly_fraction(&self) -> f64 {
        let f = self.win_probability
            - (1.0 - self.win_probability) / self.payoff_ratio;
        f.max(0.0).min(self.risk_budget * 10.0)
    }

    /// Expected Sharpe contribution from this asset.
    pub fn expected_sharpe(&self) -> f64 {
        let excess = self.kelly_fraction() * self.payoff_ratio * self.win_probability;
        if self.volatility > 0.0 { excess / self.volatility } else { 0.0 }
    }

    /// Signal action derived from trend strength + Kelly edge.
    fn action(&self) -> (&'static str, f64) {
        let kelly = self.kelly_fraction();
        if kelly < 0.001 {
            ("SKIP", 0.0)
        } else if self.trend_strength > 0.3 {
            ("BUY", (self.trend_strength * kelly * 100.0).min(1.0))
        } else if self.trend_strength < -0.3 {
            ("SELL", (self.trend_strength.abs() * kelly * 100.0).min(1.0))
        } else {
            ("HOLD", kelly.min(1.0))
        }
    }
}

// ── Output structures ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingSignal {
    pub symbol: String,
    pub action: String,
    pub strength: f64,
    pub kelly_fraction: f64,
    pub position_size: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub signals: Vec<TradingSignal>,
    pub portfolio_sharpe: f64,
    pub max_drawdown_estimate: f64,
    pub total_allocated: f64,
    pub confidence: f64,
    pub timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskResult {
    pub risk_score: f64,
    pub kelly_fraction: f64,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
}

// ── Agreement ROI (consulting/contract evaluation) ──────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgreementCondition {
    pub name: String,
    pub hourly_rate: f64,          // $/hr offered
    pub hours_contracted: f64,      // total hours in agreement
    pub probability_of_payment: f64,// [0.0, 1.0] — higher if dual-signed
    pub cost_per_hour: f64,         // your delivery cost (time, tools)
    pub time_to_payment_days: f64,  // net-30, net-60, etc.
    pub market_rate_low: f64,       // market floor for this service
    pub market_rate_high: f64,      // market ceiling
}

impl AgreementCondition {
    /// Gross revenue if fully paid.
    pub fn gross_revenue(&self) -> f64 {
        self.hourly_rate * self.hours_contracted
    }

    /// Total delivery cost.
    pub fn total_cost(&self) -> f64 {
        self.cost_per_hour * self.hours_contracted
    }

    /// Net profit if fully paid.
    pub fn net_profit(&self) -> f64 {
        self.gross_revenue() - self.total_cost()
    }

    /// ROI = (revenue - cost) / cost.
    pub fn roi(&self) -> f64 {
        let cost = self.total_cost();
        if cost <= 0.0 { return 0.0; }
        self.net_profit() / cost
    }

    /// Expected ROI = ROI × P(payment).
    pub fn expected_roi(&self) -> f64 {
        self.roi() * self.probability_of_payment
    }

    /// Annualized expected ROI.
    pub fn annualized_roi(&self) -> f64 {
        if self.time_to_payment_days <= 0.0 { return 0.0; }
        self.expected_roi() * (365.0 / self.time_to_payment_days)
    }

    /// Kelly fraction for capacity allocation.
    /// Treats agreement as a bet: P(win)=P(payment), payoff=profit/cost.
    pub fn kelly_fraction(&self) -> f64 {
        let cost = self.total_cost();
        if cost <= 0.0 { return 0.0; }
        let payoff = self.net_profit() / cost; // b = profit/cost
        if payoff <= 0.0 { return 0.0; }
        let p = self.probability_of_payment;
        let f = p - (1.0 - p) / payoff;
        f.max(0.0).min(1.0) // cap at 100% of capacity
    }

    /// Rate competitiveness: where does this rate sit in the market range?
    pub fn rate_percentile(&self) -> f64 {
        let range = self.market_rate_high - self.market_rate_low;
        if range <= 0.0 { return 0.5; }
        ((self.hourly_rate - self.market_rate_low) / range).clamp(0.0, 1.0)
    }

    /// Evidence strength tier: ACTUAL(100), REAL(85), PSEUDO(20).
    pub fn evidence_tier(&self) -> (&'static str, u8) {
        if self.probability_of_payment >= 0.9 {
            ("ACTUAL", 100)  // dual-signed, payment received or near-certain
        } else if self.probability_of_payment >= 0.5 {
            ("REAL", 85)     // signed contract, payment pending
        } else {
            ("PSEUDO", 20)   // unsigned, speculative
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgreementROI {
    pub name: String,
    pub gross_revenue: f64,
    pub total_cost: f64,
    pub net_profit: f64,
    pub roi_pct: f64,
    pub expected_roi_pct: f64,
    pub annualized_roi_pct: f64,
    pub kelly_fraction: f64,
    pub rate_percentile: f64,
    pub evidence_tier: String,
    pub evidence_score: u8,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub engine: String,
    pub timestamp: f64,
}

// ── JsValue conversions ─────────────────────────────────────────────

macro_rules! impl_into_jsvalue {
    ($t:ty) => {
        impl From<$t> for JsValue {
            fn from(val: $t) -> Self {
                JsValue::from_str(
                    &serde_json::to_string(&val).unwrap_or_default(),
                )
            }
        }
    };
}

impl_into_jsvalue!(AnalysisResult);
impl_into_jsvalue!(RiskResult);
impl_into_jsvalue!(HealthStatus);
impl_into_jsvalue!(AgreementROI);

// ── Core engine ─────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct NeuralTrader {
    initialized: bool,
    risk_threshold: f64,
    max_position_pct: f64,
    total_budget: f64,
}

#[wasm_bindgen]
impl NeuralTrader {
    /// Create a new NeuralTrader.
    ///
    /// Config JSON (all optional):
    /// ```json
    /// { "riskThreshold": 0.15, "maxPositionPct": 0.25, "totalBudget": 100000 }
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> NeuralTrader {
        // Parse optional config fields with sensible defaults
        let (risk_th, max_pos, budget) = config
            .as_string()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .or_else(|| serde_json::from_str::<serde_json::Value>(
                &js_sys::JSON::stringify(&config)
                    .ok()?
                    .as_string()?).ok())
            .map(|v| (
                v.get("riskThreshold").and_then(|x| x.as_f64()).unwrap_or(0.15),
                v.get("maxPositionPct").and_then(|x| x.as_f64()).unwrap_or(0.25),
                v.get("totalBudget").and_then(|x| x.as_f64()).unwrap_or(100_000.0),
            ))
            .unwrap_or((0.15, 0.25, 100_000.0));

        NeuralTrader {
            initialized: false,
            risk_threshold: risk_th,
            max_position_pct: max_pos,
            total_budget: budget,
        }
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self) {
        self.initialized = true;
    }

    /// Analyze market conditions array → trading signals with Kelly sizing.
    ///
    /// Input: JSON string of `MarketCondition[]`.
    /// Returns: JSON string of `AnalysisResult`.
    #[wasm_bindgen]
    pub fn analyze(&self, market_data: JsValue) -> JsValue {
        if !self.initialized {
            return JsValue::from_str(
                r#"{"error":"NeuralTrader not initialized"}"#,
            );
        }

        let conditions: Vec<MarketCondition> = market_data
            .as_string()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        if conditions.is_empty() {
            return JsValue::from_str(
                r#"{"error":"No market conditions provided"}"#,
            );
        }

        // Kelly-weighted allocation
        let kellys: Vec<f64> = conditions.iter().map(|c| c.kelly_fraction()).collect();
        let kelly_sum: f64 = kellys.iter().sum();
        let cap = self.total_budget * self.max_position_pct;

        let positions: Vec<f64> = kellys
            .iter()
            .map(|k| {
                let raw = if kelly_sum > 0.0 {
                    k / kelly_sum * self.total_budget
                } else {
                    0.0
                };
                raw.min(cap)
            })
            .collect();

        // Portfolio Sharpe (diversified)
        let sharpe: f64 = conditions
            .iter()
            .map(|c| c.expected_sharpe())
            .sum::<f64>()
            / (conditions.len() as f64).sqrt();

        // Max drawdown estimate
        let max_dd: f64 = conditions
            .iter()
            .map(|c| c.volatility * (1.0 - c.win_probability))
            .fold(0.0f64, f64::max);

        let total_alloc: f64 = positions.iter().sum();

        let signals: Vec<TradingSignal> = conditions
            .iter()
            .zip(kellys.iter())
            .zip(positions.iter())
            .map(|((cond, &kelly), &pos)| {
                let (action, strength) = cond.action();
                TradingSignal {
                    symbol: cond.symbol.clone(),
                    action: action.to_string(),
                    strength,
                    kelly_fraction: kelly,
                    position_size: pos,
                    reason: format!(
                        "Kelly={:.4} Sharpe={:.2} Vol={:.2}",
                        kelly,
                        cond.expected_sharpe(),
                        cond.volatility,
                    ),
                }
            })
            .collect();

        let confidence = if sharpe > 1.0 {
            0.9
        } else if sharpe > 0.5 {
            0.7
        } else {
            0.5
        };

        let result = AnalysisResult {
            signals,
            portfolio_sharpe: sharpe,
            max_drawdown_estimate: max_dd,
            total_allocated: total_alloc,
            confidence,
            timestamp: js_sys::Date::now(),
        };

        result.into()
    }

    /// Calculate risk for a single position.
    ///
    /// Input: JSON string of a single `MarketCondition`.
    /// Returns: JSON string of `RiskResult`.
    #[wasm_bindgen]
    pub fn calculate_risk(&self, position_data: JsValue) -> JsValue {
        let cond: MarketCondition = position_data
            .as_string()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(MarketCondition {
                symbol: "UNKNOWN".into(),
                volatility: 0.3,
                trend_strength: 0.0,
                mean_reversion: 0.5,
                volume_ratio: 1.0,
                risk_budget: 0.02,
                win_probability: 0.5,
                payoff_ratio: 1.0,
            });

        let kelly = cond.kelly_fraction();
        let sharpe = cond.expected_sharpe();
        let max_dd = cond.volatility * (1.0 - cond.win_probability);

        // Risk score: higher vol + lower win_prob + lower payoff = higher risk
        let risk_score = (cond.volatility * 0.4
            + (1.0 - cond.win_probability) * 0.3
            + (1.0 / cond.payoff_ratio.max(0.01)) * 0.3)
            .min(1.0);

        let result = RiskResult {
            risk_score,
            kelly_fraction: kelly,
            max_drawdown: max_dd,
            sharpe_ratio: sharpe,
        };

        result.into()
    }

    /// Evaluate a consulting/service agreement for ROI and evidence strength.
    ///
    /// Input: JSON string of `AgreementCondition`.
    /// Returns: JSON string of `AgreementROI`.
    #[wasm_bindgen]
    pub fn evaluate_agreement(&self, agreement_data: JsValue) -> JsValue {
        let cond: AgreementCondition = agreement_data
            .as_string()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(AgreementCondition {
                name: "unknown".into(),
                hourly_rate: 0.0,
                hours_contracted: 0.0,
                probability_of_payment: 0.0,
                cost_per_hour: 0.0,
                time_to_payment_days: 30.0,
                market_rate_low: 0.0,
                market_rate_high: 0.0,
            });

        let (tier_name, tier_score) = cond.evidence_tier();
        let kelly = cond.kelly_fraction();

        let recommendation = if kelly >= 0.5 && tier_score >= 85 {
            "STRONG: High ROI + verified evidence. Prioritize.".to_string()
        } else if kelly >= 0.3 {
            "MODERATE: Positive ROI. Get signature to upgrade evidence tier.".to_string()
        } else if cond.net_profit() > 0.0 {
            "WEAK: Marginal ROI. Consider raising rate or reducing scope.".to_string()
        } else {
            "SKIP: Negative ROI or speculative. Do not allocate capacity.".to_string()
        };

        let result = AgreementROI {
            name: cond.name.clone(),
            gross_revenue: cond.gross_revenue(),
            total_cost: cond.total_cost(),
            net_profit: cond.net_profit(),
            roi_pct: cond.roi() * 100.0,
            expected_roi_pct: cond.expected_roi() * 100.0,
            annualized_roi_pct: cond.annualized_roi() * 100.0,
            kelly_fraction: kelly,
            rate_percentile: cond.rate_percentile(),
            evidence_tier: tier_name.to_string(),
            evidence_score: tier_score,
            recommendation,
        };

        result.into()
    }

    #[wasm_bindgen]
    pub fn get_health(&self) -> JsValue {
        let health = HealthStatus {
            status: if self.initialized { "healthy" } else { "uninitialized" }.to_string(),
            version: VERSION.to_string(),
            engine: "kelly-sharpe-v1".to_string(),
            timestamp: js_sys::Date::now(),
        };

        health.into()
    }
}

// Utility function for console logging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    log(&format!("Hello, {}! NeuralTrader WASM v{} loaded.", name, VERSION));
}

#[wasm_bindgen(start)]
pub fn main() {
    log(&format!("NeuralTrader WASM v{} — Kelly/Sharpe engine ready", VERSION));
}

// ── Tests (native only) ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn btc_condition() -> MarketCondition {
        MarketCondition {
            symbol: "BTC".into(),
            volatility: 0.5,
            trend_strength: 0.6,
            mean_reversion: 0.2,
            volume_ratio: 1.5,
            risk_budget: 0.02,
            win_probability: 0.6,
            payoff_ratio: 2.0,
        }
    }

    #[test]
    fn kelly_fraction_positive_edge() {
        let c = btc_condition();
        let k = c.kelly_fraction();
        // p=0.6, b=2.0 → f = 0.6 - 0.4/2.0 = 0.4
        // capped at 10×0.02 = 0.2
        assert!((k - 0.2).abs() < 1e-9, "kelly={}", k);
    }

    #[test]
    fn kelly_fraction_no_edge() {
        let c = MarketCondition {
            symbol: "X".into(),
            volatility: 0.3,
            trend_strength: 0.0,
            mean_reversion: 0.5,
            volume_ratio: 1.0,
            risk_budget: 0.02,
            win_probability: 0.3,
            payoff_ratio: 1.0,
        };
        // f = 0.3 - 0.7/1.0 = -0.4 → capped at 0
        assert_eq!(c.kelly_fraction(), 0.0);
    }

    #[test]
    fn sharpe_scales_with_edge() {
        let good = btc_condition();
        let bad = MarketCondition {
            win_probability: 0.35,
            payoff_ratio: 0.8,
            ..good.clone()
        };
        assert!(good.expected_sharpe() > bad.expected_sharpe());
    }

    #[test]
    fn action_buy_on_bullish_with_edge() {
        let c = btc_condition();
        let (action, strength) = c.action();
        assert_eq!(action, "BUY");
        assert!(strength > 0.0);
    }

    #[test]
    fn action_skip_on_no_edge() {
        let c = MarketCondition {
            symbol: "X".into(),
            volatility: 0.3,
            trend_strength: 0.8,
            mean_reversion: 0.5,
            volume_ratio: 1.0,
            risk_budget: 0.02,
            win_probability: 0.3,
            payoff_ratio: 1.0,
        };
        let (action, _) = c.action();
        assert_eq!(action, "SKIP");
    }

    // ── Agreement ROI tests ──────────────────────────────────────────

    fn coaching_agreement() -> AgreementCondition {
        AgreementCondition {
            name: "Agentics coaching (intro)".into(),
            hourly_rate: 75.0,
            hours_contracted: 10.0,
            probability_of_payment: 0.85,  // signed contract
            cost_per_hour: 15.0,           // time + tools
            time_to_payment_days: 30.0,
            market_rate_low: 150.0,
            market_rate_high: 350.0,
        }
    }

    #[test]
    fn agreement_gross_revenue() {
        let a = coaching_agreement();
        assert!((a.gross_revenue() - 750.0).abs() < 1e-9);
    }

    #[test]
    fn agreement_net_profit() {
        let a = coaching_agreement();
        // 750 - 150 = 600
        assert!((a.net_profit() - 600.0).abs() < 1e-9);
    }

    #[test]
    fn agreement_roi_positive() {
        let a = coaching_agreement();
        // ROI = 600/150 = 4.0 (400%)
        assert!((a.roi() - 4.0).abs() < 1e-9, "roi={}", a.roi());
    }

    #[test]
    fn agreement_expected_roi() {
        let a = coaching_agreement();
        // Expected = 4.0 × 0.85 = 3.4
        assert!((a.expected_roi() - 3.4).abs() < 1e-9);
    }

    #[test]
    fn agreement_annualized_roi() {
        let a = coaching_agreement();
        // Annualized = 3.4 × (365/30) = 41.37
        let ann = a.annualized_roi();
        assert!(ann > 40.0 && ann < 42.0, "annualized={}", ann);
    }

    #[test]
    fn agreement_kelly_allocates_capacity() {
        let a = coaching_agreement();
        let k = a.kelly_fraction();
        // p=0.85, b=4.0 → f = 0.85 - 0.15/4.0 = 0.8125
        assert!((k - 0.8125).abs() < 1e-9, "kelly={}", k);
    }

    #[test]
    fn agreement_rate_below_market() {
        let a = coaching_agreement();
        // $75 is below market [$150, $350] → percentile 0.0 (clamped)
        assert!((a.rate_percentile() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn agreement_evidence_tier_real() {
        let a = coaching_agreement();
        let (tier, score) = a.evidence_tier();
        assert_eq!(tier, "REAL");
        assert_eq!(score, 85);
    }

    #[test]
    fn agreement_evidence_tier_actual() {
        let a = AgreementCondition {
            probability_of_payment: 0.95,
            ..coaching_agreement()
        };
        let (tier, _) = a.evidence_tier();
        assert_eq!(tier, "ACTUAL");
    }

    #[test]
    fn agreement_evidence_tier_pseudo() {
        let a = AgreementCondition {
            probability_of_payment: 0.3,
            ..coaching_agreement()
        };
        let (tier, score) = a.evidence_tier();
        assert_eq!(tier, "PSEUDO");
        assert_eq!(score, 20);
    }

    #[test]
    fn agreement_zero_cost_safe() {
        let a = AgreementCondition {
            cost_per_hour: 0.0,
            ..coaching_agreement()
        };
        assert_eq!(a.roi(), 0.0);
        assert_eq!(a.kelly_fraction(), 0.0);
    }

    #[test]
    fn agreement_negative_profit_skips() {
        let a = AgreementCondition {
            hourly_rate: 10.0,
            cost_per_hour: 50.0,
            ..coaching_agreement()
        };
        assert!(a.net_profit() < 0.0);
        assert_eq!(a.kelly_fraction(), 0.0);
    }
}

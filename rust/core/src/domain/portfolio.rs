//! Portfolio Domain Aggregate — owner's collection of financial and legal holdings.
//!
//! @business-context WSJF-PORTFOLIO: Top-level aggregate that owns financial
//!   and legal holdings. Health calculation filters to legal holdings only,
//!   computing litigation-readiness as percentage of LitigationReady disputes.
//!   This drives the dashboard's portfolio wholeness metric.
//! @constraint DDD-PORTFOLIO: Depends on holding, validation, and portfolio
//!   value objects. Does NOT import dispute directly — accesses dispute status
//!   through holding's HoldingType::Legal variant.
//!
//! DoR: Holding, PortfolioId, and WholenessMetric types importable
//! DoD: Holdings keyed by ID; health calculation covers legal-only subset;
//!      unique PortfolioId per instance

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::domain::holding::Holding;
use crate::portfolio::value_objects::PortfolioId;
use crate::domain::validation::WholenessMetric;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Portfolio {
    pub id: PortfolioId,
    pub owner: String, // e.g. "User"
    pub holdings: HashMap<String, Holding>, // Keyed by HoldingId.to_string()
    pub health: Option<WholenessMetric>,
}

impl Portfolio {
    pub fn new(owner: &str) -> Self {
        Self {
            id: PortfolioId::new(),
            owner: owner.to_string(),
            holdings: HashMap::new(),
            health: None,
        }
    }

    pub fn add_holding(&mut self, holding: Holding) {
        self.holdings.insert(holding.id.to_string(), holding);
    }

    pub fn calculate_health(&mut self) {
        // Filter for legal holdings to calculate advocacy health
        let legal_holdings: Vec<&Holding> = self.holdings.values()
            .filter(|h| matches!(h.holding_type, crate::domain::holding::HoldingType::Legal(_)))
            .collect();

        let total = legal_holdings.len();
        if total == 0 {
            self.health = Some(WholenessMetric {
                score: 100.0,
                passed_roles: 0,
                total_roles: 0,
            });
            return;
        }

        let litigation_ready = legal_holdings.iter()
            .filter(|h| {
                if let crate::domain::holding::HoldingType::Legal(d) = &h.holding_type {
                    matches!(d.status(), crate::domain::dispute::DisputeStatus::LitigationReady)
                } else {
                    false
                }
            })
            .count();

        let score = (litigation_ready as f32 / total as f32) * 100.0;

        self.health = Some(WholenessMetric {
            score,
            passed_roles: litigation_ready as u8,
            total_roles: total as u8,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::portfolio::value_objects::{Currency, Money};
    use rust_decimal::Decimal;

    #[test]
    fn portfolio_new_empty() {
        let p = Portfolio::new("SB");
        assert_eq!(p.owner, "SB");
        assert!(p.holdings.is_empty());
        assert!(p.health.is_none());
    }

    #[test]
    fn portfolio_add_financial_holding() {
        let mut p = Portfolio::new("SB");
        let money = Money::new(Decimal::from(10000), Currency::USD);
        let h = crate::domain::holding::Holding::new_financial("AAPL", money);
        p.add_holding(h);
        assert_eq!(p.holdings.len(), 1);
    }

    #[test]
    fn portfolio_calculate_health_no_legal() {
        let mut p = Portfolio::new("SB");
        let money = Money::new(Decimal::from(500), Currency::USD);
        let h = crate::domain::holding::Holding::new_financial("ETH", money);
        p.add_holding(h);
        p.calculate_health();
        assert!(p.health.is_some());
        assert_eq!(p.health.unwrap().score, 100.0); // no legal = 100%
    }

    #[test]
    fn portfolio_calculate_health_empty() {
        let mut p = Portfolio::new("SB");
        p.calculate_health();
        assert!(p.health.is_some());
        assert_eq!(p.health.unwrap().score, 100.0);
    }

    #[test]
    fn portfolio_id_unique() {
        let p1 = Portfolio::new("A");
        let p2 = Portfolio::new("B");
        assert_ne!(p1.id.to_string(), p2.id.to_string());
    }

    /// Throughput: adding N holdings completes without panic.
    #[test]
    fn portfolio_throughput_bulk_holdings() {
        let mut p = Portfolio::new("SB");
        let money = Money::new(Decimal::from(100), Currency::USD);
        for i in 0..50 {
            let h = crate::domain::holding::Holding::new_financial(
                &format!("SYM{i}"),
                money.clone(),
            );
            p.add_holding(h);
        }
        assert_eq!(p.holdings.len(), 50);
    }
}

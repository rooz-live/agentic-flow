//! Holding Domain Entity — financial or legal asset within a portfolio.
//!
//! @business-context WSJF-HOLDING: Bridge entity connecting financial assets
//!   and legal disputes under a single portfolio. HoldingType enum ensures
//!   exhaustive matching — every holding is explicitly financial or legal.
//!   new_legal() auto-generates name/description from dispute metadata.
//! @constraint DDD-HOLDING: Imports from dispute (legal variant) and portfolio
//!   value objects (Money, HoldingId, Allocation). Acts as the shared kernel
//!   between financial and legal bounded contexts.
//!
//! DoR: Dispute and value object types (Money, HoldingId, Allocation) importable
//! DoD: HoldingType variants exhaustive; constructors enforce name/description invariants;
//!      all fields testable via unit tests

use crate::domain::dispute::Dispute;
use crate::portfolio::value_objects::{Allocation, HoldingId, Money};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HoldingType {
    Financial(Money),
    Legal(Dispute),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Holding {
    pub id: HoldingId,
    pub name: String,
    pub description: Option<String>,
    pub holding_type: HoldingType,
    pub allocation: Option<Allocation>,
}

impl Holding {
    pub fn new_financial(name: &str, money: Money) -> Self {
        Self {
            id: HoldingId::new(),
            name: name.to_string(),
            description: None,
            holding_type: HoldingType::Financial(money),
            allocation: None,
        }
    }

    pub fn new_legal(dispute: Dispute) -> Self {
        let name = format!("Dispute: {}", dispute.case_id());
        let desc = format!("Legal action against {}", dispute.organization().name());
        Self {
            id: HoldingId::new(),
            name,
            description: Some(desc),
            holding_type: HoldingType::Legal(dispute),
            allocation: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::portfolio::value_objects::Currency;
    use rust_decimal::Decimal;

    #[test]
    fn new_financial_holding() {
        let money = Money::new(Decimal::from(50000), Currency::USD);
        let h = Holding::new_financial("BTC Investment", money);
        assert_eq!(h.name, "BTC Investment");
        assert!(h.description.is_none());
        assert!(matches!(h.holding_type, HoldingType::Financial(_)));
        assert!(h.allocation.is_none());
    }

    #[test]
    fn new_legal_holding() {
        let org = crate::domain::organization::Organization::new("MAA", 4);
        let dispute = Dispute::new("26CV005596", org);
        let h = Holding::new_legal(dispute);
        assert!(h.name.contains("26CV005596"));
        assert!(h.description.is_some());
        assert!(h.description.unwrap().contains("MAA"));
        assert!(matches!(h.holding_type, HoldingType::Legal(_)));
    }

    #[test]
    fn holding_type_financial_equality() {
        let m1 = Money::new(Decimal::from(100), Currency::USD);
        let m2 = Money::new(Decimal::from(100), Currency::USD);
        assert_eq!(HoldingType::Financial(m1), HoldingType::Financial(m2));
    }

    #[test]
    fn holding_ids_are_unique() {
        let money = Money::new(Decimal::from(100), Currency::USD);
        let h1 = Holding::new_financial("A", money.clone());
        let h2 = Holding::new_financial("B", money);
        assert_ne!(h1.id, h2.id);
    }
}

import unittest
from beads_finance.openbadges_demand_bead import evaluate_openbadges_demand_bead, EconomicTelemetry

class TestOpenbadgesDemandBead(unittest.TestCase):
    
    def test_authorizes_upgrade_when_market_demand_proven(self):
        # High conversion rate (50%), low infrastructure cost
        telemetry = EconomicTelemetry(
            active_pipelines=10,
            successful_conversions=5,
            target_conversion_rate=0.30,
            infrastructure_cost=50.0
        )
        
        decision = evaluate_openbadges_demand_bead(telemetry)
        
        self.assertTrue(decision.is_authorized)
        self.assertEqual(decision.action, "AUTHORIZE_OPENBADGES_DEPLOY")
        self.assertGreater(decision.wsjf_score, 2.0)
        
    def test_rejects_upgrade_when_conversion_theater(self):
        # Low conversion rate (10%), high cost
        telemetry = EconomicTelemetry(
            active_pipelines=100,
            successful_conversions=10,
            target_conversion_rate=0.30,
            infrastructure_cost=150.0
        )
        
        decision = evaluate_openbadges_demand_bead(telemetry)
        
        self.assertFalse(decision.is_authorized)
        self.assertEqual(decision.action, "REJECT_OPENBADGES_DEPLOY")
        # Ensure penalty drops WSJF below 2.0
        self.assertLess(decision.wsjf_score, 2.0)

if __name__ == '__main__':
    unittest.main()

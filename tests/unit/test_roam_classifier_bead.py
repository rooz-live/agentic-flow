import unittest
from beads_email.roam_classifier_bead import analyze_doug_non_response_bead, RiskType, ROAMCategory

class TestRoamClassifierBead(unittest.TestCase):
    
    def test_situational_risk_when_zero_non_responses(self):
        # Clean room test: 5 sent, 5 received -> 0 non-response
        risk = analyze_doug_non_response_bead(5, 5, 48.0, "Update")
        self.assertEqual(risk.risk_type, RiskType.SITUATIONAL)
        self.assertEqual(risk.roam_category, ROAMCategory.OWNED)
        self.assertEqual(risk.wsjf_mitigation_score, 18.0) # (8+10)/1
        
    def test_strategic_risk_when_close_to_deadline(self):
        # 3 sent, 1 received -> 2 non-responses. 12 hours left.
        risk = analyze_doug_non_response_bead(3, 1, 12.0, "Urgent Docs")
        self.assertEqual(risk.risk_type, RiskType.STRATEGIC)
        self.assertEqual(risk.roam_category, ROAMCategory.MITIGATED)
        self.assertEqual(risk.wsjf_mitigation_score, 9.5) # (9+10)/2

    def test_systemic_risk_when_ignoring_repeatedly(self):
        # 5 sent, 1 received -> 4 non-responses. 
        risk = analyze_doug_non_response_bead(5, 1, 48.0, "Final Notice")
        self.assertEqual(risk.risk_type, RiskType.SYSTEMIC)
        self.assertEqual(risk.roam_category, ROAMCategory.ACCEPTED)
        self.assertEqual(risk.wsjf_mitigation_score, 2.6) # (7+6)/5

if __name__ == '__main__':
    unittest.main()

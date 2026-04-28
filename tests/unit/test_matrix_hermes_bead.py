import unittest
import json
from beads_email.matrix_hermes_bead import evaluate_matrix_contract_bead

class TestMatrixHermesBead(unittest.TestCase):
    
    def test_authorizes_execution_when_wsjf_exceeds_threshold(self):
        # Hermes sees a contract with WSJF 18.0
        contract = {
            "wholeness_metadata": {
                "wsjf_score": 18.0,
                "risk_type": "SITUATIONAL"
            }
        }
        event = {"body": json.dumps(contract)}
        
        action = evaluate_matrix_contract_bead(event, wsjf_threshold=15.0)
        
        self.assertTrue(action.should_execute)
        self.assertEqual(action.target_bead, "mailjet_sender_bead")
        self.assertIn("18.0 >= Threshold 15.0", action.reason)
        
    def test_rejects_execution_when_wsjf_below_threshold(self):
        # Hermes sees a contract with WSJF 2.5 (low value)
        contract = {
            "wholeness_metadata": {
                "wsjf_score": 2.5,
                "risk_type": "SYSTEMIC"
            }
        }
        event = {"body": json.dumps(contract)}
        
        action = evaluate_matrix_contract_bead(event, wsjf_threshold=15.0)
        
        self.assertFalse(action.should_execute)
        self.assertEqual(action.target_bead, "archive_bead")
        self.assertIn("2.5 < Threshold 15.0", action.reason)
        
    def test_rejects_non_json_chatter(self):
        # Standard human chat in the Matrix room
        event = {"body": "Hey, did Doug reply yet?"}
        action = evaluate_matrix_contract_bead(event)
        self.assertFalse(action.should_execute)
        self.assertEqual(action.reason, "Not a JSON contract")

if __name__ == '__main__':
    unittest.main()

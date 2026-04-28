import unittest
from beads_infra.state_embedder_bead import generate_infra_embedding_bead

class TestStateEmbedderBead(unittest.TestCase):
    
    def test_generates_sovereign_embedding(self):
        manifest = {
            "systemic_state": "GREEN",
            "factors": {
                "cpanel": {"status": "GREEN", "temporal_age_minutes": 120},
                "hivelocity": {"status": "GREEN", "temporal_age_minutes": 500}
            }
        }
        
        embedding = generate_infra_embedding_bead(manifest)
        
        self.assertEqual(embedding.systemic_state, "SOVEREIGN")
        self.assertEqual(len(embedding.healing_targets), 0)
        # 620 mins / 20160 max tolerance = 0.03
        self.assertAlmostEqual(embedding.drift_score, 0.03, places=2)
        
    def test_generates_compromised_embedding(self):
        manifest = {
            "systemic_state": "GREEN",
            "factors": {
                "gitlab": {"status": "RED", "temporal_age_minutes": 2000}
            }
        }
        
        embedding = generate_infra_embedding_bead(manifest)
        
        self.assertEqual(embedding.systemic_state, "COMPROMISED")
        self.assertIn("gitlab", embedding.healing_targets)
        self.assertGreater(embedding.drift_score, 0.1)

if __name__ == '__main__':
    unittest.main()

import unittest
import sys
import os
import importlib.util
from unittest.mock import patch, MagicMock
from pathlib import Path

# Load hostbill-sync-agent.py dynamically
file_path = Path(__file__).parent.parent / "scripts" / "ci" / "hostbill-sync-agent.py"
spec = importlib.util.spec_from_file_location("hostbill_sync_agent", file_path)
hostbill_sync_agent = importlib.util.module_from_spec(spec)
sys.modules["hostbill_sync_agent"] = hostbill_sync_agent
spec.loader.exec_module(hostbill_sync_agent)

class TestHostBillSyncAgent(unittest.TestCase):
    def test_compute_dynamic_mrr_enterprise_tier_1(self):
        """
        [TDD Contract: TRUTH] Verifies that precise extraction of STX power wattage mathematically matches
        the ENTERPRISE_TIER_1 USD synthetic footprint limits exactly bounded to $###.##
        """
        watts = 120.0
        with patch.dict(os.environ, {"HOSTBILL_TIER": "ENTERPRISE_TIER_1"}):
            mrr = hostbill_sync_agent.compute_dynamic_mrr(watts)
            self.assertEqual(mrr, 125.38, "MRR footprint mathematically diverged from exact bounds.")

    @patch("subprocess.run")
    def test_extract_live_stx_telemetry_with_chassis_status(self, mock_run):
        """
        [TDD Contract: LIVE] Interrogates the extension where `ipmitool chassis status` combined with `sensor list`
        bounds the STX baseline natively.
        """
        # We expect two subprocess calls now: one for sensor list, one for chassis status
        # We mock both
        mock_sensor = MagicMock()
        mock_sensor.returncode = 0
        mock_sensor.stdout = "PSU1_Input_Powr  | 135.000    | Watts      | ok    | 0.000     | 0.000     | 0.000     | 1000.000  | 1100.000  | 1200.000"
        
        mock_chassis = MagicMock()
        mock_chassis.returncode = 0
        mock_chassis.stdout = "System Power          : on\nPower Overload        : false"
        
        # side_effect allows us to return differing mock responses per subprocess call
        mock_run.side_effect = [mock_chassis, mock_sensor]
        
        watts = hostbill_sync_agent.extract_live_stx_telemetry()
        
        # Should exact 135.0 from sensor list and assert chassis call happened
        self.assertEqual(watts, 135.0, "Did not extract the correct wattage from the raw STX mock output.")
        self.assertEqual(mock_run.call_count, 2, "Expected exactly two ipmitool commands, chassis status first.")

if __name__ == '__main__':
    unittest.main()

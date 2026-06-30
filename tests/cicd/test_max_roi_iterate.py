#!/usr/bin/env python3
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "metrics"))
sys.path.insert(0, str(ROOT / "scripts" / "cicd" / "lib"))
os.environ["AF_SKIP_DISK_STEWARD"] = "1"
os.environ["AF_SKIP_NETWORK"] = "1"
import max_roi_cycles as mrc
import roi_iterate as ri


class MaxRoiIterateTest(unittest.TestCase):
    def test_ceremony_in_idle_zero_overhead(self):
        os.environ["CEREMONY_IN_IDLE"] = "1"
        p = mrc.compute(ROOT)
        self.assertEqual(p["ceremony_overhead_minutes"], 0.0)
        self.assertTrue(p["ceremony_in_idle"])

    def test_next_step_has_actions(self):
        plan = ri.next_step(ROOT)
        self.assertEqual(plan["schema"], "roi_iterate.v1")
        self.assertIn("next_actions", plan)

    def test_iterate_writes_evidence(self):
        ri.iterate(ROOT, run_cycle=False)
        ev = ROOT / ".goalie" / "evidence" / "roi_iterate_latest.json"
        self.assertTrue(ev.is_file())


if __name__ == "__main__":
    raise SystemExit(unittest.main())

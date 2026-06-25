#!/usr/bin/env python3
"""Contract tests for ceremony_engine bounded units."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "cicd" / "lib"))
import ceremony_engine as ce


class CeremonyEngineTest(unittest.TestCase):
    def test_light_standup_fast(self):
        os.environ["CEREMONY_MODE"] = "light"
        payload = ce.tick_ceremony(ROOT, tick_count=99)
        self.assertEqual(payload["schema"], "ceremony_unit.v1")
        self.assertIn("standup", payload["ceremonies_due"])
        self.assertIn("bounded_slice", payload)
        self.assertIn("current", payload["bounded_slice"])

    def test_bootstrap_no_day_one_burst(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / ".goalie").mkdir(parents=True)
            (root / ".goalie" / "cron_state").mkdir()
            state = {"tick_count": 0, "ceremonies": {}}
            out = ce.bootstrap_state(state)
            self.assertTrue(out["ceremonies"].get("bootstrapped"))

    def test_evidence_written(self):
        os.environ["CEREMONY_MODE"] = "light"
        ce.tick_ceremony(ROOT, tick_count=100)
        ev = ROOT / ".goalie" / "evidence" / "ceremony_unit_latest.json"
        self.assertTrue(ev.is_file())
        doc = json.loads(ev.read_text())
        self.assertEqual(doc["schema"], "ceremony_unit.v1")


if __name__ == "__main__":
    raise SystemExit(unittest.main())

"""Contract tests against committed .goalie/LNNNL.yaml (live ledger shape)."""
from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
LNNNL_PATH = ROOT / ".goalie" / "LNNNL.yaml"


def _load_lnnnl() -> dict:
    assert LNNNL_PATH.is_file(), f"missing canonical ledger: {LNNNL_PATH}"
    return yaml.safe_load(LNNNL_PATH.read_text(encoding="utf-8")) or {}


def test_lnnnl_version_and_dual_lanes():
    doc = _load_lnnnl()
    version = str(doc.get("version", ""))
    assert version.startswith("1."), f"expected LNNNL v1.x, got {version!r}"
    lanes = doc.get("lanes") or {}
    for lane in ("shippable", "blockers"):
        assert lane in lanes, f"lanes.{lane} missing"
        assert str(lanes[lane].get("now") or "").strip(), f"lanes.{lane}.now empty"


def test_shippable_head_is_p1_work():
    doc = _load_lnnnl()
    ship_now = str((doc.get("lanes") or {}).get("shippable", {}).get("now") or "")
    assert "P1-" in ship_now, f"shippable.now must head with P1 work, got {ship_now!r}"


def test_schedule_mirrors_shippable_lane():
    doc = _load_lnnnl()
    schedule = doc.get("schedule") or {}
    ship = (doc.get("lanes") or {}).get("shippable") or {}
    assert schedule.get("shippable_now") == ship.get("now")
    assert schedule.get("now") == ship.get("now") or schedule.get("now") == "No pending task."


def test_blockers_not_in_shippable_now():
    doc = _load_lnnnl()
    ship_now = str((doc.get("lanes") or {}).get("shippable", {}).get("now") or "")
    block_now = str((doc.get("lanes") or {}).get("blockers", {}).get("now") or "")
    if block_now and ship_now:
        assert ship_now != block_now
        assert not ship_now.startswith("[R-"), "risk tail must not own shippable lane"


def test_pace_from_live_lnnnl_at_least_deferrable():
    import json
    import subprocess

    proc = subprocess.run(
        ["python3", str(ROOT / "scripts/metrics/pace_from_lnnnl.py"), "--json", "--from-lnnnl"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    bundle = json.loads(proc.stdout.strip())
    assert bundle.get("pace_source") == "live"
    assert float(bundle.get("pace_cod_weight") or 0) >= 0.5

"""Contract test: WSJF (update_lnnnl) must run before upstream engine in tick_post_hooks."""
from pathlib import Path


def test_wsjf_runs_before_upstream_in_tick_post_hooks():
    repo = Path(__file__).resolve().parents[2]
    script = repo / "scripts/cicd/tick_post_hooks.sh"
    assert script.is_file(), "tick_post_hooks.sh must exist"

    lines = script.read_text(encoding="utf-8").splitlines()
    wsjf_idx = None
    upstream_idx = None
    for i, line in enumerate(lines):
        if "update_lnnnl.py" in line:
            wsjf_idx = i
        if "upstream_upgrade_engine.py" in line:
            upstream_idx = i

    assert wsjf_idx is not None, "update_lnnnl.py invocation not found in tick_post_hooks"
    assert upstream_idx is not None, "upstream_upgrade_engine.py invocation not found in tick_post_hooks"
    assert wsjf_idx < upstream_idx, "WSJF must run before upstream engine in tick_post_hooks"

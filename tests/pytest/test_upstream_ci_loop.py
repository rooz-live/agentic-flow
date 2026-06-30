"""Tests: upstream engine wiring into CI loop (tick_post_hooks.sh).

Verifies the AF_UPSTREAM_FULL / AF_UPSTREAM_PARALLEL feature-flag contract:
  - tick_post_hooks.sh contains the flag guard
  - dry-run fallback is present and documented
  - one.sh cycle --upstream-full passes the flag through
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TICK_POST = REPO_ROOT / "scripts" / "cicd" / "tick_post_hooks.sh"
ONE_SH = REPO_ROOT / "scripts" / "one.sh"
CYCLE_SH = REPO_ROOT / "scripts" / "one-sh.d" / "cycle.sh"


def _tick_post_text() -> str:
    return TICK_POST.read_text(encoding="utf-8")


def _one_sh_text() -> str:
    return ONE_SH.read_text(encoding="utf-8")


def _cycle_sh_text() -> str:
    return CYCLE_SH.read_text(encoding="utf-8")


def test_tick_post_has_upstream_full_guard():
    """tick_post_hooks.sh must have the AF_UPSTREAM_FULL guard."""
    text = _tick_post_text()
    assert "AF_UPSTREAM_FULL" in text, (
        "tick_post_hooks.sh missing AF_UPSTREAM_FULL guard — "
        "upstream engine will always run in dry-run mode with no opt-in path"
    )


def test_tick_post_upstream_dry_run_fallback():
    """dry-run fallback must be present in tick_post_hooks.sh."""
    text = _tick_post_text()
    assert "--dry-run" in text, (
        "tick_post_hooks.sh missing --dry-run fallback — "
        "CI loop would run full upstream upgrade unconditionally"
    )


def test_tick_post_upstream_full_uses_print_receipt():
    """Full upstream upgrade must emit a receipt (--print-receipt flag)."""
    text = _tick_post_text()
    assert "--print-receipt" in text, (
        "tick_post_hooks.sh full upstream path missing --print-receipt — "
        "CI loop would not emit a receipt for the upstream upgrade"
    )


def test_tick_post_upstream_parallel_flag():
    """AF_UPSTREAM_PARALLEL=1 must be wired into tick_post_hooks.sh."""
    text = _tick_post_text()
    assert "AF_UPSTREAM_PARALLEL" in text, (
        "tick_post_hooks.sh missing AF_UPSTREAM_PARALLEL — "
        "parallel upstream execution not available from CI loop"
    )


def test_one_sh_cycle_upstream_full_flag():
    """one.sh cycle --upstream-full must export AF_UPSTREAM_FULL=1."""
    text = _cycle_sh_text()
    assert "--upstream-full" in text, (
        "one.sh cycle missing --upstream-full flag — "
        "cannot opt into full upstream upgrade from cycle subcommand"
    )
    assert "AF_UPSTREAM_FULL=1" in text, (
        "one.sh cycle --upstream-full does not set AF_UPSTREAM_FULL=1"
    )


def test_one_sh_cycle_upstream_parallel_flag():
    """one.sh cycle --upstream-parallel must export AF_UPSTREAM_PARALLEL=1."""
    text = _cycle_sh_text()
    assert "--upstream-parallel" in text, (
        "one.sh cycle missing --upstream-parallel flag"
    )
    assert "AF_UPSTREAM_PARALLEL=1" in text, (
        "one.sh cycle --upstream-parallel does not set AF_UPSTREAM_PARALLEL=1"
    )


# ─── run_all.sh tier split ────────────────────────────────────────────────────

RUN_ALL = REPO_ROOT / "scripts" / "cicd" / "run_all.sh"


def _run_all_text() -> str:
    return RUN_ALL.read_text(encoding="utf-8")


def test_run_all_sh_exists():
    """run_all.sh must exist at scripts/cicd/run_all.sh."""
    assert RUN_ALL.is_file(), "scripts/cicd/run_all.sh missing"


def test_run_all_fast_tier_present():
    """run_all.sh must define a FAST TIER with coherence + scorecard + pytest."""
    text = _run_all_text()
    assert "FAST TIER" in text
    assert "coherence" in text
    assert "scorecard" in text
    assert "pytest" in text


def test_run_all_slow_tier_present():
    """run_all.sh must define a SLOW TIER with upstream + edge-sync + deploy."""
    text = _run_all_text()
    assert "SLOW TIER" in text
    assert "upstream" in text
    assert "edge gateway sync" in text
    assert "deploy" in text


def test_run_all_fast_is_default():
    """run_all.sh default must be fast tier only (SLOW=0 initially)."""
    text = _run_all_text()
    assert "SLOW=0" in text, "SLOW tier must default to 0 (opt-in only)"


def test_run_all_wired_into_one_sh():
    """one.sh must expose 'run-all' subcommand delegating to run_all.sh."""
    text = _one_sh_text()
    assert "run-all" in text
    assert "run_all.sh" in text

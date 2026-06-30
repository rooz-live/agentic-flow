"""Unit tests for scripts.cicd.update_lnnnl dual-lane model."""
from pathlib import Path
from scripts.cicd.update_lnnnl import (
    _extract_shippable_items,
    _format_item,
    build_lane_schedules,
    is_blocker_item,
    load_shippable_queue,
    SHIPPABLE_ID_RE,
    _item_verification_anchor,
    reconcile_wsjf_dependency_links,
)


def test_extract_shippable_items_buckets_p1_and_nnear():
    data = {
        "wsjf_now_items": [
            {"id": "P1-INDEX-01", "prompt": "Index batch"},
            {"id": "NNEAR-01", "prompt": "Near work"},
            {"id": "CVT-004", "prompt": "Backlog"},
        ],
        "wsjf_near_items": [
            {"id": "P1-ADB-01", "prompt": "ADB work"},
            {"id": "NNEAR-02", "prompt": "Next work"},
        ],
    }
    lanes = _extract_shippable_items(data)
    assert lanes["now"] == [{"id": "P1-INDEX-01", "prompt": "Index batch"}]
    assert lanes["near"] == [{"id": "NNEAR-01", "prompt": "Near work"}, {"id": "P1-ADB-01", "prompt": "ADB work"}]
    assert lanes["next"] == [{"id": "NNEAR-02", "prompt": "Next work"}]


def test_extract_shippable_items_returns_empty_when_no_prompts():
    assert _extract_shippable_items({}) == {"now": [], "near": [], "next": []}


def test_format_item_truncates_long_prompt():
    item = {"id": "P1-TEST-01", "prompt": "x" * 200}
    out = _format_item(item)
    assert out.startswith("[P1-TEST-01]")
    assert "..." in out
    assert len(out) <= 120


def test_nnear_is_shippable():
    assert SHIPPABLE_ID_RE.match("NNEAR-01")
    assert SHIPPABLE_ID_RE.match("P1-INDEX-01")
    assert not SHIPPABLE_ID_RE.match("CVT-004")
    assert not SHIPPABLE_ID_RE.match("DEP-001")


def test_is_blocker_item_treats_nnear_as_shippable():
    assert not is_blocker_item("NNEAR-01", "shippable")
    assert is_blocker_item("DEP-001", "dependency")
    assert not is_blocker_item("P1-INDEX-01", "shippable")


def test_build_lane_schedules_keeps_nnear_in_shippable_lane():
    sorted_items = [
        {"item": {"id": "P1-INDEX-01", "title": "Index batch", "type": "shippable"}},
        {"item": {"id": "NNEAR-01", "title": "Near work", "type": "shippable"}},
        {"item": {"id": "DEP-001", "title": "Missing key", "type": "blocker"}},
    ]
    shippable, blockers = build_lane_schedules(sorted_items, [])
    assert "P1-INDEX-01" in shippable["now"]
    assert "NNEAR-01" in shippable["near"]
    assert "DEP-001" in blockers["now"]
    assert "No pending task." not in [shippable["now"], shippable["near"]]


def test_build_lane_schedules_blockers_are_not_in_shippable():
    sorted_items = [
        {"item": {"id": "DEP-001", "title": "Missing key", "type": "blocker"}},
    ]
    shippable, blockers = build_lane_schedules(sorted_items, [])
    assert shippable["now"] == "No pending task."
    assert "DEP-001" in blockers["now"]


def test_load_shippable_queue_includes_nnear(tmp_path):
    prompts = tmp_path / "config" / "cicd" / "loop_prompts.yaml"
    prompts.parent.mkdir(parents=True)
    prompts.write_text(
        "wsjf_now_items:\n"
        "  - id: P1-INDEX-01\n"
        "  - id: NNEAR-01\n"
        "  - id: CVT-004\n"
        "wsjf_near_items:\n"
        "  - id: P1-ADB-01\n"
        "  - id: NNEAR-02\n"
    )
    queue = load_shippable_queue(str(tmp_path))
    ids = [q["id"] for q in queue]
    assert "P1-INDEX-01" in ids
    assert "NNEAR-01" in ids
    assert "P1-ADB-01" in ids
    assert "NNEAR-02" in ids
    assert "CVT-004" not in ids


def test_item_verification_anchor_prioritizes_last_verified():
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)

    # Both present -> last_verified wins (post-remediation freshness)
    item_both = {"discovered": "2026-06-20", "last_verified": "2026-06-25"}
    anchor = _item_verification_anchor(item_both, now_utc)
    assert anchor is not None
    assert anchor.year == 2026 and anchor.month == 6 and anchor.day == 25

    item_only_verified = {"last_verified": "2026-06-25"}
    anchor = _item_verification_anchor(item_only_verified, now_utc)
    assert anchor is not None
    assert anchor.year == 2026 and anchor.month == 6 and anchor.day == 25

    assert _item_verification_anchor({}, now_utc) is None


def test_load_shippable_queue_excludes_done_items(tmp_path):
    prompts = tmp_path / "config" / "cicd" / "loop_prompts.yaml"
    prompts.parent.mkdir(parents=True)
    prompts.write_text(
        "wsjf_now_items:\n"
        "  - id: P1-INDEX-02\n"
        "  - id: P1-CICD-01\n"
        "wsjf_done_items:\n"
        "  - id: P1-INDEX-01\n"
        "    status: done\n"
    )
    queue = load_shippable_queue(str(tmp_path))
    ids = [q["id"] for q in queue]
    assert ids == ["P1-INDEX-02", "P1-CICD-01"]
    assert "P1-INDEX-01" not in ids


def test_reconcile_wsjf_dependency_links_updates_wsjf_integration():
    tracker_data = {
        "dependencies": [
            {"id": "DEP-001", "status": "RESOLVED"},
            {"id": "DEP-002", "status": "active"},
        ],
        "blockers": [
            {"id": "BLOCKER-001", "roam_status": "RESOLVED"},
            {"id": "BLOCKER-002", "roam_status": "OWNED"},
        ],
        "risks": [
            {"id": "RISK-001", "status": "MITIGATED"},
            {"id": "RISK-002", "status": "active"},
        ],
        "wsjf_integration": {
            "dependency_links": [
                {"wsjf_id": "BUILD-001", "depends_on": ["DEP-001", "BLOCKER-001"], "status": "READY"},
                {"wsjf_id": "BUILD-002", "depends_on": ["DEP-002", "BLOCKER-001"], "status": "READY"},
                {"wsjf_id": "BUILD-003", "depends_on": ["RISK-001"], "status": "READY"},
                {"wsjf_id": "BUILD-004", "depends_on": ["RISK-002"], "status": "READY"},
            ]
        }
    }

    changed = reconcile_wsjf_dependency_links(tracker_data)
    assert changed is True

    links = tracker_data["wsjf_integration"]["dependency_links"]
    # BUILD-001: DEP-001 (RESOLVED) + BLOCKER-001 (RESOLVED) -> RESOLVED
    assert links[0]["status"] == "RESOLVED"
    # BUILD-002: DEP-002 (active) -> not resolved
    assert links[1]["status"] == "READY"
    # BUILD-003: RISK-001 (MITIGATED) -> RESOLVED
    assert links[2]["status"] == "RESOLVED"
    # BUILD-004: RISK-002 (active) -> not resolved
    assert links[3]["status"] == "READY"


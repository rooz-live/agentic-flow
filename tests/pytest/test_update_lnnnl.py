"""Unit tests for scripts.cicd.update_lnnnl dual-lane model."""
from pathlib import Path
from scripts.cicd.update_lnnnl import (
    _extract_shippable_items,
    _format_item,
    build_lane_schedules,
    is_blocker_item,
    load_shippable_queue,
    SHIPPABLE_ID_RE,
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

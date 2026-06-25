"""Unit tests for scripts.cicd.update_lnnnl shippable-lane extraction."""
from scripts.cicd.update_lnnnl import _extract_shippable_items, _format_item


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

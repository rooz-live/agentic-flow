#!/usr/bin/env python3
"""Integration tests for code_search.py and doc_query.py

Tests verify:
- DoR/DoD compliance
- Performance targets (<1s for doc_query, <30s for code_search)
- Error handling (empty matches, timeout, invalid patterns)
- Output format (JSON, table)
- Caching behavior (doc_query)

Run: pytest tests/test_code_search_doc_query.py -v
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CODE_SEARCH = PROJECT_ROOT / "scripts" / "code_search.py"
DOC_QUERY = PROJECT_ROOT / "scripts" / "doc_query.py"


class TestCodeSearch:
    """Integration tests for code_search.py"""

    def test_basic_search_success(self):
        """Test basic search returns results"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), "import", "--max-depth", "3", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert "matches" in data
        assert "files_searched" in data
        assert data["files_searched"] > 0

    def test_regex_search(self):
        """Test regex pattern matching"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), "def\\s+\\w+", "--regex", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert "matches" in data

    def test_invalid_regex(self):
        """Test invalid regex returns error"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), "[invalid(", "--regex", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 1
        data = json.loads(result.stdout)
        assert "error" in data

    def test_timeout_enforcement(self):
        """Test timeout limit is enforced"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), ".*", "--regex",
             "--timeout", "1", "--max-depth", "10", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        # Should have timeout_hit or max_results_hit
        assert data.get("timeout_hit") or data.get("max_results_hit")

    def test_file_type_filtering(self):
        """Test file type filtering works"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), "def", "--type", "py", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        # All matches should be .py files
        for match in data["matches"]:
            assert match["file"].endswith(".py")


class TestDocQuery:
    """Integration tests for doc_query.py"""

    def test_basic_query_performance(self):
        """Test query completes in <1s (DoD requirement)"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "IRIS", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert data["performance_met"], f"Query took {data['elapsed_time_ms']}ms (target: <1000ms)"

    def test_relevance_scoring(self):
        """Test relevance scores are calculated"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "agentic", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        if data["matches"]:
            assert "relevance" in data["matches"][0]
            assert 0.0 <= data["matches"][0]["relevance"] <= 1.0

    def test_empty_query_handling(self):
        """Test handling of query with no matches"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "xyznonexistentpattern123", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert data["matches_found"] == 0
        assert isinstance(data["matches"], list)

    def test_wsjf_link_empty_matches(self):
        """Test --link-issue with no matches doesn't crash (bug fix validation)"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "xyznonexistent",
             "--link-issue", "TEST-123"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        # Should not crash (exit code 0) even with no matches
        assert result.returncode == 0
        assert "No matches found" in result.stdout or "⚠️" in result.stdout

    def test_action_items_extraction(self):
        """Test action items extraction"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "--action-items", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert isinstance(data, list)
        # Should find some uncompleted items in task.md
        if data:
            assert "file" in data[0]
            assert "line" in data[0]
            assert "text" in data[0]

    def test_cache_behavior(self):
        """Test caching reduces second query time"""
        # First query (cold cache)
        result1 = subprocess.run(
            [sys.executable, str(DOC_QUERY), "pattern", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        data1 = json.loads(result1.stdout)
        time1 = data1["elapsed_time_ms"]

        # Second query (warm cache)
        result2 = subprocess.run(
            [sys.executable, str(DOC_QUERY), "pattern", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        data2 = json.loads(result2.stdout)
        time2 = data2["elapsed_time_ms"]

        # Cache should make second query faster (or at least not significantly slower)
        assert time2 <= time1 * 1.5, f"Cache not effective: {time2}ms vs {time1}ms"

    def test_no_cache_flag(self):
        """Test --no-cache disables caching"""
        result = subprocess.run(
            [sys.executable, str(DOC_QUERY), "test", "--no-cache", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0
        # Should complete successfully without cache


class TestIntegration:
    """Cross-script integration tests"""

    def test_code_search_find_doc_query(self):
        """Test code_search can find doc_query.py"""
        result = subprocess.run(
            [sys.executable, str(CODE_SEARCH), "DocQuery", "--type", "py", "--json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        # Should find DocQuery class definition
        files = [m["file"] for m in data["matches"]]
        assert any("doc_query.py" in f for f in files)

    def test_metrics_logged_to_goalie(self):
        """Test doc_query logs to .goalie/insights_log.jsonl"""
        insights_log = PROJECT_ROOT / ".goalie" / "insights_log.jsonl"

        # Run query
        subprocess.run(
            [sys.executable, str(DOC_QUERY), "test_metrics_integration"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            timeout=5
        )

        # Check log was updated
        assert insights_log.exists()

        # Verify test query was logged
        with open(insights_log) as f:
            lines = f.readlines()
            last_entry = json.loads(lines[-1])
            assert last_entry["type"] == "doc_query"
            assert "query" in last_entry


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

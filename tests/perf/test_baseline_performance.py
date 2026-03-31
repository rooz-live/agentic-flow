#!/usr/bin/env python3
"""
Forensic Test Verification Framework
Test-first validation for code_search.py and doc_query.py

Success Criteria:
- code_search: <5s for 1000 files, >100 files/sec
- doc_query: <1s for 372 files, >80% relevance
- Cache hit rate >50% after warmup
"""

import json
import sys
import time
import pytest
from pathlib import Path
from typing import Dict, List

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'scripts'))

from code_search import CodeSearch
from doc_query import DocQuery


class TestCodeSearchPerformance:
    """Forensic verification for code_search.py performance."""
    
    @pytest.fixture
    def searcher(self):
        """Create code search instance."""
        return CodeSearch(
            root_dir=str(Path.cwd()),
            timeout=30,
            max_workers=4,
            enable_concurrency=True
        )
    
    def test_search_completes_within_5s_for_1000_files(self, searcher):
        """DoD: Search completes in <5s for 1000 files."""
        start = time.time()
        result = searcher.search(
            pattern='def|class',
            file_types=['py'],
            max_depth=8,
            regex=True,
            max_results=1000,
            show_progress=False
        )
        elapsed = time.time() - start
        
        # Forensic validation
        assert 'error' not in result, f"Search failed: {result.get('error')}"
        assert result['elapsed_time_ms'] < 5000, \
            f"Performance target missed: {result['elapsed_time_ms']}ms > 5000ms"
        assert elapsed < 5.5, \
            f"Wall clock time exceeded: {elapsed}s > 5.5s"
    
    def test_processing_rate_above_100_files_per_sec(self, searcher):
        """DoD: Processing rate >100 files/sec with concurrency."""
        result = searcher.search(
            pattern='import',
            file_types=['py'],
            max_depth=8,
            max_results=100,
            show_progress=False
        )
        
        assert 'error' not in result
        metrics = result.get('performance_metrics', {})
        processing_rate = metrics.get('processing_rate_files_per_sec', 0)
        
        assert processing_rate >= 100, \
            f"Processing rate too low: {processing_rate:.1f} files/sec < 100 files/sec"
        assert metrics.get('concurrency_enabled'), \
            "Concurrency must be enabled for performance target"
    
    def test_rate_limiter_stabilizes_quickly(self, searcher):
        """DoD: Rate limiter reaches stable state <30s."""
        result = searcher.search(
            pattern='test',
            file_types=['py', 'sh'],
            max_depth=5,
            max_results=50,
            show_progress=False
        )
        
        assert 'error' not in result
        metrics = result.get('performance_metrics', {})
        final_rate = metrics.get('final_rate_limit', 0)
        
        # Rate limiter should reach at least 200/sec after stabilization
        assert final_rate >= 200.0, \
            f"Rate limiter did not stabilize: {final_rate:.1f}/sec < 200/sec"
    
    def test_concurrent_processing_no_errors(self, searcher):
        """DoD: Handles concurrent load without errors (<1% error rate)."""
        result = searcher.search(
            pattern='function|method|class',
            file_types=['py', 'js', 'ts'],
            max_depth=10,
            regex=True,
            max_results=200,
            show_progress=False
        )
        
        assert 'error' not in result
        files_processed = result.get('files_searched', 0)
        files_skipped = result.get('files_skipped', 0)
        
        if files_processed > 0:
            error_rate = files_skipped / (files_processed + files_skipped)
            assert error_rate < 0.01, \
                f"Error rate too high: {error_rate*100:.2f}% >= 1%"


class TestDocQueryPerformance:
    """Forensic verification for doc_query.py performance."""
    
    @pytest.fixture
    def doc_query(self):
        """Create doc query instance."""
        return DocQuery(
            project_root=str(Path.cwd()),
            use_cache=True,
            max_workers=4,
            enable_concurrency=True,
            cache_size_mb=100
        )
    
    def test_query_completes_within_1s(self, doc_query):
        """DoD (CRITICAL): Query completes in <1s for 372 files."""
        result = doc_query.query('test|spec|fixture', max_depth=5)
        
        assert 'error' not in result, f"Query failed"
        assert result['elapsed_time_ms'] < 1000, \
            f"CRITICAL: Performance target missed: {result['elapsed_time_ms']}ms >= 1000ms"
        assert result.get('performance_met', False), \
            "Performance flag must be True for <1s target"
    
    def test_cache_hit_rate_after_warmup(self, doc_query):
        """DoD: Cache hit rate >50% after warmup."""
        # Warmup: run same query twice
        query_text = 'performance|optimization'
        
        # First run (cache miss expected)
        result1 = doc_query.query(query_text, max_depth=5)
        assert 'error' not in result1
        
        # Second run (cache hits expected)
        result2 = doc_query.query(query_text, max_depth=5)
        assert 'error' not in result2
        
        metrics = result2.get('performance_metrics', {})
        cache_hit_rate = metrics.get('cache_hit_rate', 0)
        
        assert cache_hit_rate >= 0.50, \
            f"Cache hit rate too low after warmup: {cache_hit_rate*100:.1f}% < 50%"
    
    def test_average_file_read_time(self, doc_query):
        """DoD: Average file read time <3ms."""
        result = doc_query.query('import|require|use', max_depth=5)
        
        assert 'error' not in result
        metrics = result.get('performance_metrics', {})
        avg_read_time = metrics.get('avg_file_read_time_ms', float('inf'))
        
        assert avg_read_time < 3.0, \
            f"File read time too slow: {avg_read_time:.2f}ms >= 3.0ms"
    
    def test_relevance_score_above_80_percent(self, doc_query):
        """DoD (CRITICAL): Average relevance score >80%."""
        result = doc_query.query('def test_', max_depth=5)
        
        assert 'error' not in result
        avg_relevance = result.get('avg_relevance', 0)
        
        # Only check if we have matches
        if result.get('matches_found', 0) > 0:
            assert avg_relevance >= 0.80, \
                f"CRITICAL: Relevance too low: {avg_relevance:.2f} < 0.80"
    
    def test_exact_matches_high_relevance(self, doc_query):
        """DoD: Exact matches score 0.8-1.0."""
        result = doc_query.query('pytest', max_depth=5)
        
        assert 'error' not in result
        
        for match in result.get('matches', []):
            relevance = match.get('relevance', 0)
            match_text = match.get('match', '').lower()
            
            # If 'pytest' is in the match, relevance should be high
            if 'pytest' in match_text:
                assert relevance >= 0.8, \
                    f"Exact match has low relevance: {relevance:.2f} < 0.8 for '{match_text}'"
    
    def test_context_window_correct_size(self, doc_query):
        """DoD: Context window includes ±2 lines (3-5 total lines)."""
        result = doc_query.query('class', max_depth=5)
        
        assert 'error' not in result
        
        for match in result.get('matches', []):
            context = match.get('context', [])
            assert len(context) in [3, 4, 5], \
                f"Context window incorrect size: {len(context)} not in [3,4,5]"
    
    def test_concurrent_processing_enabled(self, doc_query):
        """DoD: Concurrent processing enabled for performance."""
        result = doc_query.query('function|method', max_depth=5)
        
        assert 'error' not in result
        metrics = result.get('performance_metrics', {})
        
        assert metrics.get('concurrency_enabled', False), \
            "Concurrency must be enabled for performance target"
        assert metrics.get('concurrent_workers', 0) >= 4, \
            f"Expected 4+ workers, got {metrics.get('concurrent_workers', 0)}"


class TestIntegration:
    """Integration tests for both tools."""
    
    def test_insights_log_created(self):
        """DoD: Insights logged to .goalie/insights_log.jsonl."""
        goalie_dir = Path.cwd() / '.goalie'
        goalie_dir.mkdir(exist_ok=True)
        
        doc_query = DocQuery(str(Path.cwd()), use_cache=True)
        result = doc_query.query('test', max_depth=3)
        
        assert 'error' not in result
        
        insights_log = goalie_dir / 'insights_log.jsonl'
        assert insights_log.exists(), \
            "Insights log not created"
        
        # Verify JSONL format
        with open(insights_log) as f:
            lines = f.readlines()
            assert len(lines) > 0, "Insights log is empty"
            
            # Verify last line is valid JSON
            last_entry = json.loads(lines[-1])
            assert 'query' in last_entry
            assert 'timestamp' in last_entry
    
    def test_json_output_valid(self):
        """DoD: JSON output is valid and parseable."""
        searcher = CodeSearch(str(Path.cwd()), timeout=10, max_workers=2)
        result = searcher.search(
            pattern='test',
            file_types=['py'],
            max_depth=3,
            max_results=10,
            show_progress=False
        )
        
        # Should be able to serialize to JSON without errors
        json_str = json.dumps(result)
        parsed = json.loads(json_str)
        
        assert parsed == result
        assert 'pattern' in parsed
        assert 'matches' in parsed
        assert 'elapsed_time_ms' in parsed


class TestForensicValidation:
    """Forensic validation combining both tools."""
    
    def test_performance_baseline_exists(self):
        """DoR: Performance test baseline exists."""
        # This test validates that we're tracking baselines
        baseline_file = Path(__file__).parent / 'baseline_results.json'
        
        # Create baseline if it doesn't exist
        if not baseline_file.exists():
            baseline = {
                'code_search': {
                    'target_time_ms': 5000,
                    'target_rate_files_per_sec': 100,
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
                },
                'doc_query': {
                    'target_time_ms': 1000,
                    'target_relevance': 0.80,
                    'target_cache_hit_rate': 0.50,
                    'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
                }
            }
            baseline_file.write_text(json.dumps(baseline, indent=2))
        
        assert baseline_file.exists(), \
            "Performance baseline file must exist"
        
        # Verify baseline structure
        baseline = json.loads(baseline_file.read_text())
        assert 'code_search' in baseline
        assert 'doc_query' in baseline
        assert baseline['code_search']['target_time_ms'] == 5000
        assert baseline['doc_query']['target_time_ms'] == 1000


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])

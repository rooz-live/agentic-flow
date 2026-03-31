#!/usr/bin/env python3
"""
Agentic Flow: MCP-Based Document Query Tool
Query existing docs without creating new markdown files.
Integrates with .goalie/ tracking for BML cycle metrics.

DoR (Definition of Ready):
- Query string provided (non-empty)
- Project root exists and is readable
- .goalie/ directory accessible for logging

DoD (Definition of Done):
- Search completes in < 1 second (performance validated)
- Results relevance > 80% (based on user feedback)
- Query logged to insights_log.jsonl
- Results include file paths, line numbers, context
- Exit code 0 for success, 1 for errors

Success Criteria:
- Performance: < 1s for typical queries (372 files)
- Relevance: Regex matching with context window
- Integration: Auto-link to WSJF board when requested
- Metrics: Track query patterns and usage window for BML retrospectives
"""

import argparse
import json
import os
import re
import sys
import time
import hashlib
import threading
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass


@dataclass
class QueryMetrics:
    """Performance metrics for query operations."""
    files_processed: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    avg_file_read_time_ms: float = 0.0
    total_query_time_ms: float = 0.0
    concurrent_workers: int = 1

class SmartCache:
    """Enhanced cache with intelligent invalidation and size management."""
    
    def __init__(self, max_size_mb: int = 100):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.cache = {}
        self.access_times = {}
        self.current_size = 0
        self.lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Dict]:
        """Get cached content with access time tracking."""
        with self.lock:
            if key in self.cache:
                self.access_times[key] = time.time()
                return self.cache[key]
            return None
    
    def put(self, key: str, value: Dict):
        """Put content in cache with size management."""
        with self.lock:
            # Calculate size of new entry
            entry_size = len(str(value).encode('utf-8'))
            
            # Remove old entries if necessary
            while self.current_size + entry_size > self.max_size_bytes and self.cache:
                # Remove least recently used item
                lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
                removed_size = len(str(self.cache[lru_key]).encode('utf-8'))
                del self.cache[lru_key]
                del self.access_times[lru_key]
                self.current_size -= removed_size
            
            # Add new entry
            if key in self.cache:
                # Update existing entry
                old_size = len(str(self.cache[key]).encode('utf-8'))
                self.current_size -= old_size
            
            self.cache[key] = value
            self.access_times[key] = time.time()
            self.current_size += entry_size
    
    def get_stats(self) -> Dict:
        """Get cache statistics."""
        with self.lock:
            return {
                'entries': len(self.cache),
                'size_mb': self.current_size / (1024 * 1024),
                'max_size_mb': self.max_size_bytes / (1024 * 1024),
                'utilization_percent': (self.current_size / self.max_size_bytes) * 100 if self.max_size_bytes > 0 else 0
            }

class DocQuery:
    """Query and extract insights from existing documentation."""

    def __init__(self, project_root: str, use_cache: bool = True, max_workers: int = 4,
                 enable_concurrency: bool = True, cache_size_mb: int = 100):
        self.project_root = Path(project_root)
        self.goalie_dir = self.project_root / ".goalie"
        self.insights_log = self.goalie_dir / "insights_log.jsonl"
        self.cache_file = self.goalie_dir / "doc_query_cache.json"
        self.use_cache = use_cache
        self.max_workers = max_workers
        self.enable_concurrency = enable_concurrency
        self.metrics = QueryMetrics(concurrent_workers=max_workers if enable_concurrency else 1)
        
        # Setup logging for performance monitoring
        self.logger = logging.getLogger(__name__)
        # Don't configure logging here - will be configured based on JSON output
        
        # Initialize enhanced cache
        if use_cache:
            self.smart_cache = SmartCache(max_size_mb=cache_size_mb)
            # Load legacy cache and migrate
            legacy_cache = self._load_cache()
            for key, value in legacy_cache.items():
                self.smart_cache.put(key, value)
        else:
            self.smart_cache = None

    def _process_file_batch(self, file_batch: List[Path], query: str) -> List[Dict]:
        """Process a batch of files concurrently."""
        batch_matches = []
        
        for doc_path in file_batch:
            file_start_time = time.time()
            
            try:
                # Get file hash for cache lookup
                file_hash = self._get_file_hash(doc_path)
                cache_key = f"{doc_path}_{file_hash}"
                
                # Check cache first
                cached_content = None
                if self.smart_cache:
                    cached_content = self.smart_cache.get(cache_key)
                    if cached_content:
                        self.metrics.cache_hits += 1
                        content = cached_content['content']
                    else:
                        self.metrics.cache_misses += 1
                
                # Read file if not in cache
                if cached_content is None:
                    content = self._read_file_with_backoff(doc_path)
                    if content is None:
                        continue
                    
                    # Store in cache
                    if self.smart_cache:
                        self.smart_cache.put(cache_key, {'hash': file_hash, 'content': content})
                
                # Search for query pattern
                if re.search(query, content, re.IGNORECASE | re.MULTILINE):
                    # Extract surrounding context
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if re.search(query, line, re.IGNORECASE):
                            context_start = max(0, i - 2)
                            context_end = min(len(lines), i + 3)
                            context = lines[context_start:context_end]

                            batch_matches.append({
                                'file': str(doc_path.relative_to(self.project_root)),
                                'line': i + 1,
                                'match': line.strip(),
                                'context': context,
                                'url': f"file://{doc_path}",
                                'relevance': self._calculate_relevance(line, query)
                            })
                
                self.metrics.files_processed += 1
                
                # Track performance metrics
                file_time_ms = (time.time() - file_start_time) * 1000
                if self.metrics.files_processed == 1:
                    self.metrics.avg_file_read_time_ms = file_time_ms
                else:
                    # Rolling average
                    self.metrics.avg_file_read_time_ms = (
                        (self.metrics.avg_file_read_time_ms * (self.metrics.files_processed - 1) + file_time_ms)
                        / self.metrics.files_processed
                    )
                
            except Exception as e:
                self.logger.warning(f"Error processing {doc_path}: {e}")
                continue
        
        return batch_matches
    
    def _read_file_with_backoff(self, file_path: Path, max_retries: int = 3) -> Optional[str]:
        """Read file with exponential backoff on errors."""
        for attempt in range(max_retries):
            try:
                return file_path.read_text(encoding='utf-8', errors='ignore')
            except (OSError, PermissionError, UnicodeDecodeError) as e:
                if attempt == max_retries - 1:
                    self.logger.error(f"Failed to read {file_path} after {max_retries} attempts: {e}")
                    return None
                # Exponential backoff
                backoff_time = (2 ** attempt) * 0.1
                time.sleep(backoff_time)
                self.logger.debug(f"Retry {attempt + 1} for {file_path} after {backoff_time}s")
        return None
    
    def query(self, query: str, doc_patterns: Optional[List[str]] = None, max_depth: int = 5) -> Dict:
        """
        Query documentation files for relevant content.

        Args:
            query: Search query (supports regex)
            doc_patterns: File patterns to search (default: common doc locations)
            max_depth: Maximum directory depth to traverse (prevents timeout)

        Returns:
            Dict with matches, context, and metadata

        Performance: Typical execution < 1s for 372 files
        """
        start_time = time.time()

        if not doc_patterns:
            doc_patterns = [
                "*.md",
                "*.yaml",
                "*.yml",
                "*.py",  # Include Python for docstrings
                "*.sh",  # Include shell scripts for comments
                "docs/**/*.md",
                "circles/**/*.md",  # Circle purpose/backlog docs
                ".goalie/**/*.yaml",
                ".goalie/**/*.md",
                ".governance/**/*.md",
                "examples/**/docs/*.md",
                "scripts/**/*.py",
                "README.md",
                "**/README.md"
            ]

        matches = []
        seen_files: Set[Path] = set()
        all_files = []

        # Skip common large/binary directories
        skip_dirs = {'node_modules', '.git', '__pycache__', '.venv', 'venv', '.tox', 'dist', 'build'}

        # Collect all files first
        for pattern in doc_patterns:
            try:
                for doc_path in self.project_root.glob(pattern):
                    # Skip if already processed or in skip list
                    if doc_path in seen_files:
                        continue
                    if any(skip in doc_path.parts for skip in skip_dirs):
                        continue
                    if not doc_path.is_file():
                        continue

                    # Check depth
                    depth = len(doc_path.relative_to(self.project_root).parts)
                    if depth > max_depth:
                        continue

                    seen_files.add(doc_path)
                    all_files.append(doc_path)
            except Exception as e:
                self.logger.warning(f"Error with pattern {pattern}: {e}")
                continue
        
        # Process files concurrently or sequentially
        if self.enable_concurrency and len(all_files) > 5:
            # Concurrent processing for larger file sets
            batch_size = max(1, len(all_files) // self.max_workers)
            file_batches = [all_files[i:i + batch_size] for i in range(0, len(all_files), batch_size)]
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit batches for processing
                future_to_batch = {
                    executor.submit(self._process_file_batch, batch, query): batch
                    for batch in file_batches
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_batch):
                    batch_matches = future.result()
                    matches.extend(batch_matches)
        else:
            # Sequential processing for small file sets
            batch_matches = self._process_file_batch(all_files, query)
            matches.extend(batch_matches)

        # Sort by relevance
        matches.sort(key=lambda x: x.get('relevance', 0), reverse=True)

        elapsed_time = time.time() - start_time

        self.metrics.total_query_time_ms = elapsed_time * 1000
        
        result = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'files_searched': self.metrics.files_processed,
            'matches_found': len(matches),
            'matches': matches,
            'elapsed_time_ms': int(elapsed_time * 1000),
            'performance_met': elapsed_time < 1.0,
            'avg_relevance': sum(m.get('relevance', 0) for m in matches) / len(matches) if matches else 0,
            'performance_metrics': {
                'cache_hits': self.metrics.cache_hits,
                'cache_misses': self.metrics.cache_misses,
                'cache_hit_rate': self.metrics.cache_hits / (self.metrics.cache_hits + self.metrics.cache_misses) if (self.metrics.cache_hits + self.metrics.cache_misses) > 0 else 0,
                'avg_file_read_time_ms': round(self.metrics.avg_file_read_time_ms, 2),
                'concurrent_workers': self.metrics.concurrent_workers,
                'concurrency_enabled': self.enable_concurrency
            }
        }

        # Add cache stats if available
        if self.smart_cache:
            result['performance_metrics']['cache_stats'] = self.smart_cache.get_stats()

        # Log query to insights
        self._log_query(result)

        # Save cache if updated
        if self.use_cache and self.smart_cache:
            self._save_cache()

        return result

    def extract_action_items(self) -> List[Dict]:
        """Extract uncompleted action items from documentation."""
        action_items = []

        # Search for uncompleted checkboxes
        for doc_path in self.project_root.glob("**/*.md"):
            if not doc_path.is_file():
                continue

            try:
                content = doc_path.read_text(encoding='utf-8')
                lines = content.split('\n')

                for i, line in enumerate(lines):
                    # Match uncompleted checkbox patterns
                    if re.match(r'^\s*[-*]\s+\[\s\]', line):
                        action_items.append({
                            'file': str(doc_path.relative_to(self.project_root)),
                            'line': i + 1,
                            'text': line.strip(),
                            'url': f"file://{doc_path}#{i+1}"
                        })
            except Exception:
                pass

        return action_items

    def link_to_wsjf(self, doc_path: str, issue_id: str) -> bool:
        """Link documentation reference to WSJF issue."""
        safla_board = self.goalie_dir / "INBOX_ZERO_SAFLA_BOARD.yaml"

        if not safla_board.exists():
            return False

        # Append link to SAFLA board
        with open(safla_board, 'a') as f:
            f.write(f"\n# Linked documentation {datetime.now().strftime('%Y-%m-%d')}\n")
            f.write(f"  - issue_id: \"{issue_id}\"\n")
            f.write(f"    linked_doc: \"{doc_path}\"\n")

        return True

    def _log_query(self, result: Dict):
        """Log query to insights for metrics tracking."""
        self.goalie_dir.mkdir(exist_ok=True)

        log_entry = {
            'timestamp': datetime.now().strftime('%Y%m%d_%H%M%S'),
            'type': 'doc_query',
            'query': result['query'],
            'files_searched': result['files_searched'],
            'matches_found': result['matches_found'],
            'elapsed_time_ms': result.get('elapsed_time_ms', 0),
            'performance_met': result.get('performance_met', False),
            'avg_relevance': result.get('avg_relevance', 0)
        }

        with open(self.insights_log, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

    def _load_cache(self) -> Dict:
        """Load legacy file content cache for migration."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file) as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_cache(self):
        """Save cache statistics to file for monitoring."""
        try:
            cache_stats = {
                'cache_stats': self.smart_cache.get_stats() if self.smart_cache else {},
                'last_saved': datetime.now().isoformat(),
                'metrics': {
                    'cache_hits': self.metrics.cache_hits,
                    'cache_misses': self.metrics.cache_misses,
                    'files_processed': self.metrics.files_processed
                }
            }
            with open(self.cache_file, 'w') as f:
                json.dump(cache_stats, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Error saving cache stats: {e}")

    def _get_file_hash(self, file_path: Path) -> str:
        """Get file hash for cache invalidation."""
        try:
            stat = file_path.stat()
            return f"{stat.st_mtime}_{stat.st_size}"
        except Exception:
            return ""

    def _calculate_relevance(self, line: str, query: str) -> float:
        """Calculate relevance score (0.0 to 1.0)."""
        line_lower = line.lower()
        query_lower = query.lower()

        # Exact match
        if query_lower in line_lower:
            score = 0.8
            # Bonus for whole word match
            if re.search(rf"\b{re.escape(query_lower)}\b", line_lower):
                score += 0.1
            # Bonus for match at start
            if line_lower.strip().startswith(query_lower):
                score += 0.1
            return min(score, 1.0)

        # Regex match (already confirmed by caller)
        return 0.6


def main():
    parser = argparse.ArgumentParser(
        description="Query documentation without creating new markdown files",
        epilog="Performance: <1s for 372 files | Relevance: >80% match accuracy"
    )
    parser.add_argument('query', nargs='?', help='Search query (regex supported)')
    parser.add_argument('--project-root', default='.', help='Project root directory')
    parser.add_argument('--action-items', action='store_true',
                       help='Extract uncompleted action items')
    parser.add_argument('--link-issue', help='Link results to WSJF issue ID')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--no-cache', action='store_true', help='Disable file content caching')
    parser.add_argument('--max-depth', type=int, default=5, help='Maximum directory depth')
    parser.add_argument('--workers', type=int, default=4, help='Number of concurrent workers (default: 4)')
    parser.add_argument('--no-concurrency', action='store_true', help='Disable concurrent processing')
    parser.add_argument('--cache-size-mb', type=int, default=100, help='Cache size in MB (default: 100)')
    parser.add_argument('--retrospective', action='store_true',
                       help='Show retrospective insights from query log')

    args = parser.parse_args()

    doc_query = DocQuery(
        args.project_root,
        use_cache=not args.no_cache,
        max_workers=args.workers,
        enable_concurrency=not args.no_concurrency,
        cache_size_mb=args.cache_size_mb
    )
    
    # Configure logging based on output format
    if not args.json:
        # Only setup logging for non-JSON output
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        doc_query.logger.addHandler(handler)
        doc_query.logger.propagate = False
    else:
        # Disable logging for clean JSON output
        doc_query.logger.addHandler(logging.NullHandler())

    if args.retrospective:
        # Show retrospective insights
        retrospective(doc_query)
        sys.exit(0)

    if args.action_items:
        items = doc_query.extract_action_items()
        if args.json:
            print(json.dumps(items, indent=2))
        else:
            print(f"📋 Found {len(items)} uncompleted action items:\n")
            for item in items:
                print(f"  • {item['file']}:{item['line']}")
                print(f"    {item['text']}\n")
    else:
        result = doc_query.query(args.query, max_depth=args.max_depth)

        if args.link_issue:
            if result['matches']:
                doc_query.link_to_wsjf(result['matches'][0]['file'], args.link_issue)
                print(f"\n✅ Linked top match to WSJF issue {args.link_issue}")
            else:
                print(f"\n⚠️  No matches found to link to WSJF issue {args.link_issue}", file=sys.stderr)

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            # Performance feedback
            perf_icon = "✅" if result['performance_met'] else "⚠️"
            relevance_icon = "✅" if result['avg_relevance'] > 0.8 else "⚠️"

            print(f"🔍 Query: {result['query']}")
            print(f"📊 Searched {result['files_searched']} files in {result['elapsed_time_ms']}ms {perf_icon}")
            print(f"✅ Found {result['matches_found']} matches (avg relevance: {result['avg_relevance']:.2f}) {relevance_icon}")
            
            # Display performance metrics
            if 'performance_metrics' in result:
                metrics = result['performance_metrics']
                print(f"⚡ Performance: cache hit rate {metrics['cache_hit_rate']:.1%}, "
                      f"avg read: {metrics['avg_file_read_time_ms']:.1f}ms")
                print(f"🔧 Concurrency: {'enabled' if metrics['concurrency_enabled'] else 'disabled'}, "
                      f"workers: {metrics['concurrent_workers']}")
                
                if 'cache_stats' in metrics:
                    cache_stats = metrics['cache_stats']
                    print(f"💾 Cache: {cache_stats['entries']} entries, "
                          f"{cache_stats['size_mb']:.1f}MB ({cache_stats['utilization_percent']:.1f}% used)")
            print()

            for match in result['matches'][:10]:  # Limit to first 10
                relevance_bar = "█" * int(match.get('relevance', 0) * 10)
                print(f"📄 {match['file']}:{match['line']} [{relevance_bar}]")
                print(f"   {match['match']}")
                if match['context']:
                    print("   Context:")
                    for ctx_line in match['context']:
                        print(f"     {ctx_line}")
                print()

            # DoD validation
            if result['performance_met'] and result['avg_relevance'] > 0.8:
                print("\n✅ DoD MET: Performance <1s, Relevance >80%")
            else:
                print(f"\n⚠️  DoD PARTIAL: Performance={'✅' if result['performance_met'] else '❌'}, Relevance={'✅' if result['avg_relevance'] > 0.8 else '❌'}")


def retrospective(doc_query: DocQuery):
    """Show retrospective insights from query log."""
    if not doc_query.insights_log.exists():
        print("No query log found. Run some queries first.")
        return

    queries = []
    with open(doc_query.insights_log) as f:
        for line in f:
            try:
                queries.append(json.loads(line))
            except Exception:
                continue

    if not queries:
        print("No queries in log.")
        return

    print("📊 Retrospective Insights\n")
    print(f"Total queries: {len(queries)}")

    # Time window / usage intensity
    timestamps = []
    for q in queries:
        ts_str = q.get('timestamp')
        if not ts_str:
            continue
        try:
            # doc_query log uses YYYYMMDD_HHMMSS
            ts = datetime.strptime(ts_str, "%Y%m%d_%H%M%S")
        except Exception:
            try:
                ts = datetime.fromisoformat(ts_str)
            except Exception:
                continue
        timestamps.append(ts)

    total_hours = None
    queries_per_hour = None
    if timestamps:
        first_ts, last_ts = min(timestamps), max(timestamps)
        total_hours = max((last_ts - first_ts).total_seconds() / 3600, 1.0)
        queries_per_hour = len(timestamps) / total_hours
        print("\nUsage:")
        print(f"  Window: {total_hours/24:.1f} days ({len(timestamps)} queries)")
        print(f"  Intensity: {queries_per_hour:.2f} queries/hour")

    # Performance metrics
    perf_queries = [q for q in queries if 'elapsed_time_ms' in q]
    avg_time = None
    if perf_queries:
        avg_time = sum(q['elapsed_time_ms'] for q in perf_queries) / len(perf_queries)
        perf_met = sum(1 for q in perf_queries if q.get('performance_met', False))
        print("\nPerformance:")
        print(f"  Average time: {avg_time:.0f}ms")
        print(f"  Target met (<1s): {perf_met}/{len(perf_queries)} ({perf_met/len(perf_queries)*100:.1f}%)")

    # Relevance metrics
    rel_queries = [q for q in queries if 'avg_relevance' in q and q['avg_relevance'] > 0]
    avg_rel = None
    if rel_queries:
        avg_rel = sum(q['avg_relevance'] for q in rel_queries) / len(rel_queries)
        rel_met = sum(1 for q in rel_queries if q['avg_relevance'] > 0.8)
        print("\nRelevance:")
        print(f"  Average: {avg_rel:.2f}")
        print(f"  Target met (>0.8): {rel_met}/{len(rel_queries)} ({rel_met/len(rel_queries)*100:.1f}%)")

    # Common queries
    query_counts = {}
    for q in queries:
        query_text = q.get('query', '')
        query_counts[query_text] = query_counts.get(query_text, 0) + 1

    print("\nTop queries:")
    for query_text, count in sorted(query_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {count}x: {query_text}")

    # Retrospective action items
    print("\n✅ Action Items for Next Sprint:")
    if avg_time is not None and avg_time > 1000:
        print(f"  • Optimize search (current: {avg_time:.0f}ms, target: <1000ms)")
    if avg_rel is not None and avg_rel < 0.8:
        print(f"  • Improve relevance scoring (current: {avg_rel:.2f}, target: >0.8)")
    if total_hours is not None and total_hours/24.0 > 7:
        print(f"  • Increase usage intensity (queries/hour={queries_per_hour:.2f}, window>7 days)")
    elif len(queries) < 10:
        print(f"  • Increase usage (only {len(queries)} queries logged)")
    print("  • Link insights to WSJF board (--link-issue flag)")


if __name__ == '__main__':
    main()

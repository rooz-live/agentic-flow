#!/usr/bin/env python3
"""
Code Search: Cross-Repository Search Tool
Search across entire /code directory for Symfony/Oro/any pattern

Usage:
    python3 scripts/code_search.py "symfony" --max-depth 10
    python3 scripts/code_search.py "oro" --type py,sh,md
    python3 scripts/code_search.py "wordpress|flarum" --regex

Guardrails:
    - Respects skip_dirs for heavy/binary paths
    - Use --max-depth and --type to keep queries cheap
    - Pair with doc_query.py + `af cpu` / `af governor-health` for BML-friendly forensics
"""

import argparse
import json
import re
import sys
import time
import signal
import threading
import logging
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

class TimeoutError(Exception):
    pass

@dataclass
class SearchMetrics:
    """Performance metrics for search operations."""
    files_processed: int = 0
    files_skipped: int = 0
    matches_found: int = 0
    avg_file_read_time_ms: float = 0.0
    peak_memory_mb: float = 0.0
    cpu_usage_percent: float = 0.0

class RateLimiter:
    """Dynamic rate limiter with exponential backoff."""
    
    def __init__(self, initial_rate: float = 100.0, max_rate: float = 1000.0):
        self.current_rate = initial_rate
        self.max_rate = max_rate
        self.min_rate = 10.0
        self.last_adjustment = time.time()
        self.error_count = 0
        self.success_count = 0
        self.lock = threading.Lock()
    
    def wait(self) -> float:
        """Wait appropriate time based on current rate."""
        with self.lock:
            delay = 1.0 / self.current_rate
            time.sleep(delay)
            return delay
    
    def record_success(self):
        """Record successful operation."""
        with self.lock:
            self.success_count += 1
            # Gradually increase rate on success
            if self.success_count % 10 == 0 and self.current_rate < self.max_rate:
                self.current_rate = min(self.current_rate * 1.1, self.max_rate)
    
    def record_error(self):
        """Record failed operation and apply backoff."""
        with self.lock:
            self.error_count += 1
            # Exponential backoff on errors
            if self.error_count >= 3:
                self.current_rate = max(self.current_rate * 0.5, self.min_rate)
                self.error_count = 0

class ProcessMapper:
    """Maps and optimizes file processing strategy before execution."""
    
    def __init__(self):
        self.file_sizes = {}
        self.file_extensions = {}
    
    def map_files(self, file_paths: List[Path], max_workers: int = 4) -> Tuple[List[Path], Dict]:
        """Map files and optimize processing order."""
        # Sort by size for better memory efficiency
        files_with_size = []
        for path in file_paths:
            try:
                size = path.stat().st_size
                self.file_sizes[str(path)] = size
                ext = path.suffix
                self.file_extensions[ext] = self.file_extensions.get(ext, 0) + 1
                files_with_size.append((path, size))
            except (OSError, PermissionError):
                continue
        
        # Sort by size (small files first for faster initial results)
        files_with_size.sort(key=lambda x: x[1])
        
        # Group files for batch processing
        batch_size = max(1, len(files_with_size) // max_workers)
        batches = []
        for i in range(0, len(files_with_size), batch_size):
            batch = [f[0] for f in files_with_size[i:i + batch_size]]
            batches.append(batch)
        
        # Flatten batches while preserving order
        optimized_files = []
        for batch in batches:
            optimized_files.extend(batch)
        
        stats = {
            'total_files': len(file_paths),
            'processed_files': len(optimized_files),
            'avg_file_size': sum(self.file_sizes.values()) / len(self.file_sizes) if self.file_sizes else 0,
            'extension_distribution': self.file_extensions
        }
        
        return optimized_files, stats

class CodeSearch:
    """Fast cross-repository search with depth control."""

    def __init__(self, root_dir: str = "/Users/shahroozbhopti/Documents/code", timeout: int = 30,
                 max_workers: int = 4, enable_concurrency: bool = True):
        self.root_dir = Path(root_dir)
        self.timeout = timeout
        self.start_time = None
        self.max_workers = max_workers
        self.enable_concurrency = enable_concurrency
        self.metrics = SearchMetrics()
        
        # Performance optimization components
        self.rate_limiter = RateLimiter(initial_rate=50.0, max_rate=500.0)
        self.process_mapper = ProcessMapper()
        
        # Setup logging for performance monitoring
        self.logger = logging.getLogger(__name__)
        # Don't configure logging here - will be configured based on JSON output
        
        # Skip these directories entirely
        self.skip_dirs = {
            'node_modules', '.git', '__pycache__', '.venv', 'venv',
            '.tox', 'dist', 'build', '.next', '.cache', 'vendor',
            '.idea', '.vscode', 'coverage', '.pytest_cache'
        }

    def _search_file_batch(self, file_batch: List[Path], pattern_re, max_results: int) -> List[Dict]:
        """Search a batch of files with rate limiting and error handling."""
        batch_matches = []
        
        for file_path in file_batch:
            # Apply rate limiting
            self.rate_limiter.wait()
            
            file_start_time = time.time()
            try:
                # Read file with exponential backoff on errors
                content = self._read_file_with_backoff(file_path)
                if content is None:
                    self.metrics.files_skipped += 1
                    self.rate_limiter.record_error()
                    continue
                
                # Search for pattern
                for i, line in enumerate(content.split('\n'), 1):
                    if pattern_re.search(line):
                        rel_path = file_path.relative_to(self.root_dir)
                        
                        batch_matches.append({
                            'file': str(rel_path),
                            'line': i,
                            'content': line.strip()[:200],  # Limit line length
                            'path': str(file_path)
                        })
                        
                        if len(batch_matches) >= max_results:
                            break
                
                self.metrics.files_processed += 1
                self.rate_limiter.record_success()
                
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
                self.logger.warning(f"Error processing {file_path}: {e}")
                self.metrics.files_skipped += 1
                self.rate_limiter.record_error()
                continue
            
            if len(batch_matches) >= max_results:
                break
        
        return batch_matches
    
    def _read_file_with_backoff(self, file_path: Path, max_retries: int = 3) -> Optional[str]:
        """Read file with exponential backoff on errors."""
        for attempt in range(max_retries):
            try:
                return file_path.read_text(encoding='utf-8', errors='ignore')
            except (OSError, PermissionError, UnicodeDecodeError) as e:
                if attempt == max_retries - 1:
                    raise
                # Exponential backoff
                backoff_time = (2 ** attempt) * 0.1
                time.sleep(backoff_time)
                self.logger.debug(f"Retry {attempt + 1} for {file_path} after {backoff_time}s")
        return None
    
    def search(self, pattern: str, file_types: List[str] = None,
               max_depth: int = 10, regex: bool = False, max_results: int = 100,
               show_progress: bool = True) -> Dict:
        """
        Search code directory.

        Args:
            pattern: Search pattern (literal or regex)
            file_types: List of extensions (e.g., ['py', 'md', 'sh'])
            max_depth: Maximum directory depth
            regex: Treat pattern as regex
            max_results: Maximum results to return
            show_progress: Show progress meter
        """
        self.start_time = time.time()
        last_progress = self.start_time

        if not file_types:
            file_types = ['py', 'sh', 'md', 'yaml', 'yml', 'json', 'txt', 'php', 'js', 'ts']

        matches = []
        
        # Compile regex pattern
        if regex:
            try:
                pattern_re = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
            except re.error as e:
                return {'error': f"Invalid regex: {e}"}
        else:
            pattern_re = re.compile(re.escape(pattern), re.IGNORECASE | re.MULTILINE)

        # Configure logging based on output format
        if show_progress:
            # Only setup logging for non-JSON output
            logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
            handler = logging.StreamHandler(sys.stderr)
            handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(handler)
            self.logger.propagate = False
        else:
            # Disable logging for clean JSON output
            self.logger.addHandler(logging.NullHandler())
        
        # Walk directory tree and collect files
        if show_progress:
            print(f"🔍 Mapping files in {self.root_dir} (max depth: {max_depth})...", file=sys.stderr)
        all_files = []
        for path in self._walk_with_depth(self.root_dir, max_depth):
            if path.suffix.lstrip('.') in file_types:
                all_files.append(path)
        
        # Use process mapper to optimize file processing
        optimized_files, mapping_stats = self.process_mapper.map_files(all_files, self.max_workers)
        self.logger.info(f"File mapping complete: {mapping_stats}")
        
        print(f"📊 Processing {len(optimized_files)} files with {self.max_workers} workers...", file=sys.stderr)
        
        try:
            if self.enable_concurrency and len(optimized_files) > 10:
                # Concurrent processing for large file sets
                batch_size = max(1, len(optimized_files) // self.max_workers)
                file_batches = [optimized_files[i:i + batch_size] for i in range(0, len(optimized_files), batch_size)]
                
                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    # Submit batches for processing
                    future_to_batch = {
                        executor.submit(self._search_file_batch, batch, pattern_re, max_results): batch
                        for batch in file_batches
                    }
                    
                    # Collect results as they complete
                    for future in as_completed(future_to_batch):
                        if self._check_timeout():
                            print("\n⏱️  Timeout reached, returning partial results")
                            break
                            
                        batch_matches = future.result()
                        matches.extend(batch_matches)
                        
                        # Show progress
                        if show_progress and (time.time() - last_progress) > 1.0:
                            print(f"\r📊 Progress: {self.metrics.files_processed} files processed, {len(matches)} matches...",
                                  end='', flush=True)
                            last_progress = time.time()
                        
                        if len(matches) >= max_results:
                            break
            else:
                # Sequential processing for small file sets
                for file_path in optimized_files:
                    if self._check_timeout():
                        print("\n⏱️  Timeout reached, returning partial results")
                        break
                    
                    batch_matches = self._search_file_batch([file_path], pattern_re, max_results)
                    matches.extend(batch_matches)
                    
                    # Show progress
                    if show_progress and (time.time() - last_progress) > 1.0:
                        print(f"\r📊 Progress: {self.metrics.files_processed} files processed, {len(matches)} matches...",
                              end='', flush=True)
                        last_progress = time.time()
                    
                    if len(matches) >= max_results:
                        break
                        
        except KeyboardInterrupt:
            print("\n⚠️  Search interrupted by user")
        except Exception as e:
            self.logger.error(f"Search error: {e}")
            return {'error': f"Search failed: {e}"}

        if show_progress:
            print("\r" + " " * 80 + "\r", end='')  # Clear progress line

        elapsed_time = time.time() - self.start_time

        return {
            'pattern': pattern,
            'matches': matches[:max_results],  # Ensure we don't exceed max_results
            'files_searched': self.metrics.files_processed,
            'files_skipped': self.metrics.files_skipped,
            'elapsed_time_ms': int(elapsed_time * 1000),
            'max_results_hit': len(matches) >= max_results,
            'timeout_hit': self._check_timeout(),
            'performance_metrics': {
                'avg_file_read_time_ms': round(self.metrics.avg_file_read_time_ms, 2),
                'processing_rate_files_per_sec': round(self.metrics.files_processed / elapsed_time, 2) if elapsed_time > 0 else 0,
                'concurrency_enabled': self.enable_concurrency,
                'workers_used': self.max_workers if self.enable_concurrency else 1,
                'final_rate_limit': round(self.rate_limiter.current_rate, 2)
            }
        }

    def _check_timeout(self) -> bool:
        """Check if timeout reached."""
        if self.start_time is None:
            return False
        return (time.time() - self.start_time) > self.timeout

    def _walk_with_depth(self, root: Path, max_depth: int):
        """Walk directory tree with depth limit."""
        for path in root.rglob('*'):
            # Check timeout periodically
            if self._check_timeout():
                return

            # Skip directories in skip list
            if any(skip in path.parts for skip in self.skip_dirs):
                continue

            # Check depth
            try:
                depth = len(path.relative_to(root).parts)
                if depth > max_depth:
                    continue
            except ValueError:
                continue

            # Only yield files
            try:
                if path.is_file():
                    yield path
            except (OSError, PermissionError):
                # Skip files we can't stat
                continue


def main():
    parser = argparse.ArgumentParser(
        description="Search entire /code directory for patterns",
        epilog="Example: python3 scripts/code_search.py 'symfony' --max-depth 8"
    )
    parser.add_argument('pattern', help='Search pattern (regex if --regex)')
    parser.add_argument('--root', default='/Users/shahroozbhopti/Documents/code',
                       help='Root directory to search')
    parser.add_argument('--max-depth', type=int, default=8,
                       help='Maximum directory depth (default: 8)')
    parser.add_argument('--type', dest='file_types',
                       help='Comma-separated file types (e.g., py,sh,md)')
    parser.add_argument('--regex', action='store_true',
                       help='Treat pattern as regex')
    parser.add_argument('--max-results', type=int, default=100,
                       help='Maximum results to return')
    parser.add_argument('--timeout', type=int, default=30,
                       help='Search timeout in seconds (default: 30)')
    parser.add_argument('--no-progress', action='store_true',
                       help='Disable progress meter')
    parser.add_argument('--json', action='store_true',
                       help='Output as JSON')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of concurrent workers (default: 4)')
    parser.add_argument('--no-concurrency', action='store_true',
                       help='Disable concurrent processing')

    args = parser.parse_args()

    # Parse file types
    file_types = None
    if args.file_types:
        file_types = [ft.strip() for ft in args.file_types.split(',')]

    # Search
    searcher = CodeSearch(
        args.root,
        timeout=args.timeout,
        max_workers=args.workers,
        enable_concurrency=not args.no_concurrency
    )
    
    # Configure logging based on output format
    if not args.json:
        # Only setup logging for non-JSON output
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        searcher.logger.addHandler(handler)
        searcher.logger.propagate = False
    else:
        # Disable logging for clean JSON output
        searcher.logger.addHandler(logging.NullHandler())
    result = searcher.search(
        args.pattern,
        file_types=file_types,
        max_depth=args.max_depth,
        regex=args.regex,
        max_results=args.max_results,
        show_progress=not args.no_progress
    )

    if 'error' in result:
        print(f"❌ Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Output
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"🔍 Pattern: {result['pattern']}")
        print(f"📊 Searched {result['files_searched']} files (skipped {result['files_skipped']}) in {result['elapsed_time_ms']}ms")
        print(f"✅ Found {len(result['matches'])} matches")

        if result['max_results_hit']:
            print(f"⚠️  Hit max results limit ({args.max_results})")

        if result.get('timeout_hit'):
            print(f"⏱️  Hit timeout ({args.timeout}s) - partial results")
        
        # Display performance metrics
        if 'performance_metrics' in result:
            metrics = result['performance_metrics']
            print(f"⚡ Performance: {metrics['processing_rate_files_per_sec']:.1f} files/sec, "
                  f"avg read: {metrics['avg_file_read_time_ms']:.1f}ms")
            print(f"🔧 Concurrency: {'enabled' if metrics['concurrency_enabled'] else 'disabled'}, "
                  f"workers: {metrics['workers_used']}, rate limit: {metrics['final_rate_limit']:.1f}/sec")

        print()

        # Group by file
        by_file = {}
        for match in result['matches']:
            file_path = match['file']
            if file_path not in by_file:
                by_file[file_path] = []
            by_file[file_path].append(match)

        # Display grouped results
        for file_path, file_matches in list(by_file.items())[:20]:  # Limit to 20 files
            print(f"📄 {file_path} ({len(file_matches)} matches)")
            for match in file_matches[:3]:  # Show first 3 matches per file
                print(f"   Line {match['line']}: {match['content']}")
            if len(file_matches) > 3:
                print(f"   ... {len(file_matches) - 3} more matches")
            print()

        if len(by_file) > 20:
            print(f"... {len(by_file) - 20} more files")


if __name__ == '__main__':
    main()

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
from pathlib import Path
from typing import List, Dict, Set, Optional

class TimeoutError(Exception):
    pass

class CodeSearch:
    """Fast cross-repository search with depth control."""

    def __init__(self, root_dir: str = "/Users/shahroozbhopti/Documents/code", timeout: int = 30):
        self.root_dir = Path(root_dir)
        self.timeout = timeout
        self.start_time = None
        # Skip these directories entirely
        self.skip_dirs = {
            'node_modules', '.git', '__pycache__', '.venv', 'venv',
            '.tox', 'dist', 'build', '.next', '.cache', 'vendor',
            '.idea', '.vscode', 'coverage', '.pytest_cache'
        }

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
        files_searched = 0
        files_skipped = 0

        # Compile regex pattern
        if regex:
            try:
                pattern_re = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
            except re.error as e:
                return {'error': f"Invalid regex: {e}"}
        else:
            pattern_re = re.compile(re.escape(pattern), re.IGNORECASE | re.MULTILINE)

        # Walk directory tree
        print(f"🔍 Searching {self.root_dir} (max depth: {max_depth}, timeout: {self.timeout}s)...")

        try:
            for path in self._walk_with_depth(self.root_dir, max_depth):
                # Check timeout
                if self._check_timeout():
                    print("\n⏱️  Timeout reached, returning partial results")
                    break

                # Show progress every 2 seconds
                now = time.time()
                if show_progress and (now - last_progress) > 2.0:
                    print(f"\r📊 Progress: {files_searched} files searched, {len(matches)} matches...", end='', flush=True)
                    last_progress = now

                # Check file type
                if path.suffix.lstrip('.') not in file_types:
                    files_skipped += 1
                    continue

                files_searched += 1

                # Read and search file
                try:
                    content = path.read_text(encoding='utf-8', errors='ignore')

                    # Search for pattern
                    for i, line in enumerate(content.split('\n'), 1):
                        if pattern_re.search(line):
                            rel_path = path.relative_to(self.root_dir)

                            matches.append({
                                'file': str(rel_path),
                                'line': i,
                                'content': line.strip()[:200],  # Limit line length
                                'path': str(path)
                            })

                            if len(matches) >= max_results:
                                break
                except Exception as e:
                    # Silently skip unreadable files
                    files_skipped += 1
                    continue

                if len(matches) >= max_results:
                    print("\n✅ Max results reached, stopping search")
                    break
        except KeyboardInterrupt:
            print("\n⚠️  Search interrupted by user")

        if show_progress:
            print("\r" + " " * 80 + "\r", end='')  # Clear progress line

        elapsed_time = time.time() - self.start_time

        return {
            'pattern': pattern,
            'matches': matches,
            'files_searched': files_searched,
            'files_skipped': files_skipped,
            'elapsed_time_ms': int(elapsed_time * 1000),
            'max_results_hit': len(matches) >= max_results,
            'timeout_hit': self._check_timeout()
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

    args = parser.parse_args()

    # Parse file types
    file_types = None
    if args.file_types:
        file_types = [ft.strip() for ft in args.file_types.split(',')]

    # Search
    searcher = CodeSearch(args.root, timeout=args.timeout)
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

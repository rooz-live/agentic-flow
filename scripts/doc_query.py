#!/usr/bin/env python3
"""
Agentic Flow: MCP-Based Document Query Tool
Query existing docs without creating new markdown files.
Integrates with .goalie/ tracking for BML cycle metrics.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional


class DocQuery:
    """Query and extract insights from existing documentation."""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.goalie_dir = self.project_root / ".goalie"
        self.insights_log = self.goalie_dir / "insights_log.jsonl"
        
    def query(self, query: str, doc_patterns: Optional[List[str]] = None) -> Dict:
        """
        Query documentation files for relevant content.
        
        Args:
            query: Search query (supports regex)
            doc_patterns: File patterns to search (default: common doc locations)
        
        Returns:
            Dict with matches, context, and metadata
        """
        if not doc_patterns:
            doc_patterns = [
                "*.md",
                "docs/**/*.md",
                ".goalie/**/*.yaml",
                ".goalie/**/*.md",
                "examples/**/docs/*.md"
            ]
        
        matches = []
        file_count = 0
        
        for pattern in doc_patterns:
            for doc_path in self.project_root.glob(pattern):
                if not doc_path.is_file():
                    continue
                    
                file_count += 1
                try:
                    content = doc_path.read_text(encoding='utf-8')
                    
                    # Search for query pattern
                    if re.search(query, content, re.IGNORECASE | re.MULTILINE):
                        # Extract surrounding context
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if re.search(query, line, re.IGNORECASE):
                                context_start = max(0, i - 2)
                                context_end = min(len(lines), i + 3)
                                context = lines[context_start:context_end]
                                
                                matches.append({
                                    'file': str(doc_path.relative_to(self.project_root)),
                                    'line': i + 1,
                                    'match': line.strip(),
                                    'context': context,
                                    'url': f"file://{doc_path}"
                                })
                except Exception as e:
                    print(f"⚠️  Error reading {doc_path}: {e}", file=sys.stderr)
        
        result = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'files_searched': file_count,
            'matches_found': len(matches),
            'matches': matches
        }
        
        # Log query to insights
        self._log_query(result)
        
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
            'matches_found': result['matches_found']
        }
        
        with open(self.insights_log, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')


def main():
    parser = argparse.ArgumentParser(
        description="Query documentation without creating new markdown files"
    )
    parser.add_argument('query', nargs='?', help='Search query (regex supported)')
    parser.add_argument('--project-root', default='.', help='Project root directory')
    parser.add_argument('--action-items', action='store_true', 
                       help='Extract uncompleted action items')
    parser.add_argument('--link-issue', help='Link results to WSJF issue ID')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    doc_query = DocQuery(args.project_root)
    
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
        result = doc_query.query(args.query)
        
        if args.link_issue:
            doc_query.link_to_wsjf(result['matches'][0]['file'] if result['matches'] else '', 
                                   args.link_issue)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"🔍 Query: {result['query']}")
            print(f"📊 Searched {result['files_searched']} files")
            print(f"✅ Found {result['matches_found']} matches\n")
            
            for match in result['matches'][:10]:  # Limit to first 10
                print(f"📄 {match['file']}:{match['line']}")
                print(f"   {match['match']}")
                if match['context']:
                    print("   Context:")
                    for ctx_line in match['context']:
                        print(f"     {ctx_line}")
                print()


if __name__ == '__main__':
    main()

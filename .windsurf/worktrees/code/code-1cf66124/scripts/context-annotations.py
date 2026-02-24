#!/usr/bin/env python3
"""
Context Annotation System
=========================

Parses and validates @adr, @business-context, @constraint annotations
in source code files to maintain traceability between:
- ADR (Architecture Decision Records)
- Business context and requirements
- Technical constraints

Annotations:
  @adr <adr-id> [<description>]    - Link to architecture decision
  @business-context <context>       - Business justification
  @constraint <type>: <details>     - Technical/business constraint
  @invariant <condition>            - Code invariants that must hold
  @wsjf <priority>                  - WSJF priority annotation

Usage:
  python scripts/context-annotations.py scan [path]
  python scripts/context-annotations.py validate
  python scripts/context-annotations.py report
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class Annotation:
    """Single annotation instance."""
    type: str  # adr, business-context, constraint, invariant, wsjf
    value: str
    file_path: str
    line_number: int
    context: str = ""  # Surrounding code context


@dataclass
class AnnotationReport:
    """Report of all annotations found."""
    generated_at: str
    project_root: str
    annotations: List[Annotation] = field(default_factory=list)
    by_type: Dict[str, List[Annotation]] = field(default_factory=lambda: defaultdict(list))
    by_file: Dict[str, List[Annotation]] = field(default_factory=lambda: defaultdict(list))
    orphan_adrs: List[str] = field(default_factory=list)
    
    def add_annotation(self, ann: Annotation):
        self.annotations.append(ann)
        self.by_type[ann.type].append(ann)
        self.by_file[ann.file_path].append(ann)


# Annotation patterns
ANNOTATION_PATTERNS = {
    "adr": re.compile(
        r'@adr\s+([A-Z]+-\d+)\s*(?:\{([^}]+)\})?',
        re.IGNORECASE
    ),
    "business-context": re.compile(
        r'@business-context\s+(?:\{([^}]+)\}|"([^"]+)"|\'([^\']+)\'|(\S+))',
        re.IGNORECASE
    ),
    "constraint": re.compile(
        r'@constraint\s+(?:\{([^}]+)\}|"([^"]+)"|\'([^\']+)\'|(\S+))',
        re.IGNORECASE
    ),
    "invariant": re.compile(
        r'@invariant\s+(?:\{([^}]+)\}|"([^"]+)"|\'([^\']+)\'|(\S+))',
        re.IGNORECASE
    ),
    "wsjf": re.compile(
        r'@wsjf\s+(A|B|C|D|CRITICAL|HIGH|MEDIUM|LOW)',
        re.IGNORECASE
    ),
}


def find_source_files(root: Path, max_files: int = 1000) -> List[Path]:
    """Find source files that might contain annotations."""
    extensions = {".py", ".rs", ".ts", ".js", ".tsx", ".jsx", ".md", ".sh"}
    found: Set[Path] = set()
    
    for pattern in ["**/*"]:
        for p in root.glob(pattern):
            if p.is_file() and p.suffix in extensions and len(found) < max_files:
                # Skip common directories
                skip_dirs = {
                    "node_modules", "__pycache__", ".venv", "venv", "target",
                    ".git", ".cache", "dist", ".pytest_cache"
                }
                if any(part in skip_dirs for part in p.parts):
                    continue
                found.add(p)
    
    return sorted(found)


def parse_annotations(filepath: Path, project_root: Path) -> List[Annotation]:
    """Parse annotations from a single file."""
    annotations: List[Annotation] = []
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
    except (OSError, UnicodeError):
        return annotations
    
    rel_path = str(filepath.relative_to(project_root))
    
    for line_num, line in enumerate(lines, 1):
        # Skip lines that are likely URLs or imports
        if line.strip().startswith(("http", "import", "from", "#")):
            # But still check comments for annotations
            pass
        
        for ann_type, pattern in ANNOTATION_PATTERNS.items():
            for match in pattern.finditer(line):
                # Get the matched groups (some may be None depending on pattern)
                value = next((g for g in match.groups() if g is not None), "")
                
                # Get surrounding context (previous and next line)
                context_start = max(0, line_num - 2)
                context_end = min(len(lines), line_num + 1)
                context = "".join(lines[context_start:context_end]).strip()
                
                ann = Annotation(
                    type=ann_type,
                    value=value.strip(),
                    file_path=rel_path,
                    line_number=line_num,
                    context=context[:200]  # Limit context length
                )
                annotations.append(ann)
    
    return annotations


def scan_project(project_root: Path) -> AnnotationReport:
    """Scan entire project for annotations."""
    report = AnnotationReport(
        generated_at=datetime.now().isoformat(),
        project_root=str(project_root)
    )
    
    files = find_source_files(project_root)
    
    for filepath in files:
        annotations = parse_annotations(filepath, project_root)
        for ann in annotations:
            report.add_annotation(ann)
    
    # Check for orphaned ADR references
    adr_files = list(project_root.glob("docs/adr/**/*.md"))
    adr_ids = set()
    for adr_file in adr_files:
        match = re.search(r'(ADR-\d+)', adr_file.name, re.IGNORECASE)
        if match:
            adr_ids.add(match.group(1).upper())
    
    # Find referenced ADRs that don't exist
    referenced_adrs = set(
        ann.value.upper() for ann in report.by_type.get("adr", [])
    )
    report.orphan_adrs = list(referenced_adrs - adr_ids)
    
    return report


def format_report(report: AnnotationReport) -> str:
    """Format report as markdown."""
    lines = []
    lines.append("# Context Annotation Report")
    lines.append(f"**Generated:** {report.generated_at}")
    lines.append(f"**Project:** {report.project_root}")
    lines.append("")
    
    # Summary
    total = len(report.annotations)
    lines.append(f"## Summary")
    lines.append(f"- **Total Annotations:** {total}")
    lines.append("")
    
    # By type
    if report.by_type:
        lines.append("## By Type")
        for ann_type, anns in sorted(report.by_type.items()):
            lines.append(f"- **@{ann_type}:** {len(anns)} annotations")
        lines.append("")
    
    # Detailed listings
    for ann_type in sorted(report.by_type.keys()):
        anns = report.by_type[ann_type]
        lines.append(f"## @{ann_type} Annotations")
        lines.append("")
        
        for ann in anns[:20]:  # Limit to first 20
            lines.append(f"### {ann.file_path}:{ann.line_number}")
            lines.append(f"```")
            lines.append(f"Value: {ann.value}")
            lines.append(f"Context: {ann.context[:100]}...")
            lines.append(f"```")
            lines.append("")
        
        if len(anns) > 20:
            lines.append(f"*... and {len(anns) - 20} more*")
            lines.append("")
    
    # Orphaned ADRs
    if report.orphan_adrs:
        lines.append("## ⚠️ Orphaned ADR References")
        lines.append("These ADRs are referenced but files don't exist:")
        for adr_id in sorted(report.orphan_adrs):
            lines.append(f"- {adr_id}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Context Annotation System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s scan                    # Scan current directory
  %(prog)s scan --path /project    # Scan specific path
  %(prog)s validate                # Validate annotations
  %(prog)s report --output annotations.md
        """,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan for annotations")
    scan_parser.add_argument("--path", default=".", help="Project root path")
    scan_parser.add_argument("--output", "-o", help="Output file")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate annotations")
    validate_parser.add_argument("--path", default=".", help="Project root path")
    
    # Report command
    report_parser = subparsers.add_parser("report", help="Generate report")
    report_parser.add_argument("--path", default=".", help="Project root path")
    report_parser.add_argument("--output", "-o", help="Output file")
    report_parser.add_argument("--json", action="store_true", help="JSON output")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    project_root = Path(args.path).resolve()
    
    if args.command == "scan":
        report = scan_project(project_root)
        output = format_report(report)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Report saved to {args.output}")
        else:
            print(output)
        
        print(f"\nFound {len(report.annotations)} annotations in {len(report.by_file)} files")
        
    elif args.command == "validate":
        report = scan_project(project_root)
        
        errors = []
        if report.orphan_adrs:
            errors.append(f"Orphaned ADR references: {report.orphan_adrs}")
        
        if errors:
            print("VALIDATION FAILED:")
            for err in errors:
                print(f"  - {err}")
            sys.exit(1)
        else:
            print("✓ All annotations valid")
            sys.exit(0)
    
    elif args.command == "report":
        report = scan_project(project_root)
        
        if args.json:
            output = json.dumps({
                "generated_at": report.generated_at,
                "project_root": report.project_root,
                "total_annotations": len(report.annotations),
                "by_type": {k: [{"file": a.file_path, "line": a.line_number, "value": a.value} 
                               for a in v] for k, v in report.by_type.items()},
                "orphan_adrs": report.orphan_adrs
            }, indent=2)
        else:
            output = format_report(report)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Report saved to {args.output}")
        else:
            print(output)


if __name__ == "__main__":
    main()

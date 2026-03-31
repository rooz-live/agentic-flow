#!/usr/bin/env python3
"""
GitHub Issue Automation - Retro insights → GitHub issues

Integrates with doc_query.py and .goalie/ artifacts to automatically create
GitHub issues from retrospective insights with WSJF labels and metadata.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

# CPU Governor Guard (matches bash implementation)
def check_cpu_guard(threshold: int = 50) -> bool:
    """Check if CPU idle is above threshold. Returns True if safe to proceed."""
    try:
        import platform
        if platform.system() == "Darwin":
            # macOS: parse top output
            output = subprocess.check_output(
                ["top", "-l", "1", "-n", "0"],
                text=True,
                timeout=5
            )
            for line in output.split("\n"):
                if "CPU usage:" in line:
                    match = re.search(r"(\d+\.\d+)% idle", line)
                    if match:
                        idle_pct = float(match.group(1))
                        if idle_pct < threshold:
                            print(f"⚠️  CPU idle {idle_pct:.1f}% < {threshold}% threshold - operation blocked", file=sys.stderr)
                            print(f"Hint: Wait for system load to decrease or override with AF_CPU_IDLE_MIN=0", file=sys.stderr)
                            return False
                        return True
        
        # Linux: use load average heuristic
        load_avg = os.getloadavg()[0]
        cpu_count = os.cpu_count() or 1
        load_pct = (load_avg / cpu_count) * 100
        idle_est = 100 - load_pct
        
        if idle_est < threshold:
            print(f"⚠️  Estimated CPU idle {idle_est:.1f}% < {threshold}% threshold - operation blocked", file=sys.stderr)
            print(f"Hint: Wait for system load to decrease or override with AF_CPU_IDLE_MIN=0", file=sys.stderr)
            return False
        
        return True
    
    except Exception as e:
        print(f"Warning: CPU guard check failed: {e}", file=sys.stderr)
        return True  # Fail open


def parse_quick_wins_items(doc_path: Path) -> List[Dict]:
    """Extract uncompleted HIGH priority items from QUICK_WINS.md"""
    items = []
    
    if not doc_path.exists():
        print(f"Warning: {doc_path} not found", file=sys.stderr)
        return items
    
    content = doc_path.read_text()
    lines = content.split("\n")
    
    for i, line in enumerate(lines, start=1):
        # Match uncompleted HIGH priority items: - [ ] ... (HIGH|priority:high)
        if re.match(r"^- \[ \].*", line) and re.search(r"(HIGH|priority:\s*high)", line, re.IGNORECASE):
            # Extract title
            title_match = re.search(r"\[ \]\s*\*\*(.+?)\*\*|" + r"\[ \]\s*(.+?)(?:\s*\(|\s*\[|\s*@|$)", line)
            
            # Extract WSJF if present
            wsjf_match = re.search(r"\[?WSJF:\s*([\d.]+)\]?", line, re.IGNORECASE)
            
            # Extract priority
            priority_match = re.search(r"priority:\s*(\w+)", line, re.IGNORECASE)
            
            if title_match:
                title = (title_match.group(1) or title_match.group(2) or "").strip()
                
                # Skip if title is empty
                if not title:
                    continue
                
                item = {
                    "title": title,
                    "description": "",
                    "wsjf": float(wsjf_match.group(1)) if wsjf_match else 0.0,
                    "priority": (priority_match.group(1) if priority_match else "HIGH").upper(),
                    "source_file": str(doc_path),
                    "line_number": i,
                }
                
                # Extract description from subsequent indented lines
                desc_lines = []
                for j in range(i, min(i + 10, len(lines))):
                    next_line = lines[j].strip()
                    # Stop at next checkbox or empty line after content
                    if j > i and next_line.startswith("- "):
                        break
                    if next_line and not next_line.startswith("-"):
                        desc_lines.append(next_line)
                
                item["description"] = "\n".join(desc_lines[:5]) if desc_lines else title
                items.append(item)
    
    return items


def parse_consolidated_actions(yaml_path: Path) -> List[Dict]:
    """Extract uncompleted high-priority actions from CONSOLIDATED_ACTIONS.yaml"""
    items = []
    
    if not yaml_path.exists():
        return items
    
    try:
        content = yaml_path.read_text()
        
        # Simple YAML parsing (best-effort, no external deps)
        current_item = None
        for line in content.split("\n"):
            if line.strip().startswith("- id:"):
                if current_item and current_item.get("status", "").upper() != "COMPLETE":
                    if current_item.get("priority", "").upper() in ["HIGH", "CRITICAL", "URGENT"]:
                        items.append(current_item)
                
                current_item = {
                    "id": line.split(":", 1)[-1].strip().strip('"'),
                    "status": "PENDING"
                }
            
            elif current_item:
                if "title:" in line:
                    current_item["title"] = line.split(":", 1)[-1].strip().strip('"')
                elif "priority:" in line:
                    current_item["priority"] = line.split(":", 1)[-1].strip().upper()
                elif "status:" in line:
                    current_item["status"] = line.split(":", 1)[-1].strip().upper()
                elif "wsjf_score:" in line or "wsjf:" in line:
                    try:
                        current_item["wsjf"] = float(line.split(":", 1)[-1].strip())
                    except ValueError:
                        pass
        
        # Add last item if valid
        if current_item and current_item.get("status", "").upper() != "COMPLETE":
            if current_item.get("priority", "").upper() in ["HIGH", "CRITICAL", "URGENT"]:
                items.append(current_item)
    
    except Exception as e:
        print(f"Warning: Failed to parse {yaml_path}: {e}", file=sys.stderr)
    
    return items


def parse_insights_log(insights_path: Path, limit: int = 20) -> List[Dict]:
    """Extract recent insights from insights_log.jsonl"""
    items = []
    
    if not insights_path.exists():
        return items
    
    try:
        with insights_path.open() as f:
            # Read last N lines (most recent insights)
            lines = f.readlines()
            for line in lines[-limit:]:
                try:
                    event = json.loads(line.strip())
                    if event.get("type") == "retro_insight":
                        items.append({
                            "title": event.get("text", "")[:100],  # Truncate long insights
                            "description": event.get("text", ""),
                            "wsjf": 0.0,  # Default, can be enriched later
                            "priority": "MEDIUM",
                            "source_file": str(insights_path),
                            "timestamp": event.get("timestamp", "")
                        })
                except json.JSONDecodeError:
                    continue
    
    except Exception as e:
        print(f"Warning: Failed to parse {insights_path}: {e}", file=sys.stderr)
    
    return items


def create_github_issue(item: Dict, repo: str, dry_run: bool = False, 
                        additional_labels: Optional[List[str]] = None,
                        assignee: Optional[str] = None,
                        milestone: Optional[str] = None) -> str:
    """Create GitHub issue via gh CLI with retro metadata"""
    
    title = f"[Retro] {item.get('title', 'Untitled Action')}"
    
    # Build issue body with metadata
    wsjf = item.get("wsjf", 0.0)
    priority = item.get("priority", "HIGH")
    source = f"{item.get('source_file', 'unknown')}:{item.get('line_number', 0)}"
    
    body_parts = [
        "## Context",
        item.get("description", item.get("title", "No description")),
        "",
        "## WSJF Score",
        f"{wsjf}",
        "",
        "## Priority",
        f"{priority}",
        "",
        "## Source",
        f"Retro item from {source}",
        "",
        "## Metadata",
        f"- **Created by**: af github issue automation",
        f"- **Timestamp**: {datetime.now(timezone.utc).isoformat()}",
        f"- **Automation**: GitHub issue automation v1.0"
    ]
    
    body = "\n".join(body_parts)
    
    # Build labels list
    labels = additional_labels or []
    labels.append("retro-item")
    labels.append(f"priority:{priority.lower()}")
    labels.append("source:retro")
    
    # WSJF labels
    if wsjf > 0:
        labels.append(f"wsjf:{wsjf:.1f}")
        
        # WSJF bucketing (Now/Next/Later)
        if wsjf >= 10.0:
            labels.append("WSJF:Now")
        elif wsjf >= 5.0:
            labels.append("WSJF:Next")
        else:
            labels.append("WSJF:Later")
    
    # Build gh CLI command
    cmd = [
        "gh", "issue", "create",
        "--title", title,
        "--body", body,
        "--repo", repo,
        "--label", ",".join(labels)
    ]
    
    if assignee:
        cmd.extend(["--assignee", assignee])
    
    if milestone:
        cmd.extend(["--milestone", milestone])
    
    if dry_run:
        print("\n[DRY RUN] Would create GitHub issue:")
        print(f"  Title: {title}")
        print(f"  Labels: {', '.join(labels)}")
        if assignee:
            print(f"  Assignee: {assignee}")
        if milestone:
            print(f"  Milestone: {milestone}")
        print(f"  Command: {' '.join(cmd)}")
        print("")
        return f"[DRY RUN] {title}"
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            issue_url = result.stdout.strip()
            print(f"✅ Created: {issue_url}")
            return issue_url
        else:
            print(f"❌ Failed to create issue: {result.stderr}", file=sys.stderr)
            return ""
    
    except subprocess.TimeoutExpired:
        print("❌ Issue creation timed out", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"❌ Issue creation error: {e}", file=sys.stderr)
        return ""


def log_issue_event(item: Dict, issue_url: str, insights_path: Path):
    """Append issue creation event to insights_log.jsonl"""
    
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "github_issue_created",
        "id": item.get("id", ""),
        "title": item.get("title", ""),
        "wsjf": item.get("wsjf", 0.0),
        "priority": item.get("priority", "HIGH"),
        "labels": ["retro-item", f"priority:{item.get('priority', 'high').lower()}"],
        "created": bool(issue_url),
        "issue_url": issue_url
    }
    
    insights_path.parent.mkdir(parents=True, exist_ok=True)
    with insights_path.open("a") as f:
        f.write(json.dumps(event) + "\n")


def update_consolidated_actions_yaml(item: Dict, issue_url: str, yaml_path: Path):
    """Append issue link to CONSOLIDATED_ACTIONS.yaml (best-effort)"""
    
    if not yaml_path.exists():
        return
    
    try:
        # Check if issue_links section already exists
        content = yaml_path.read_text()
        
        if "# af-sync: do not edit above line" not in content:
            # Add separator and issue_links section
            with yaml_path.open("a") as f:
                f.write("\n# af-sync: do not edit above line\n")
                f.write("issue_links:\n")
        
        # Append issue link
        with yaml_path.open("a") as f:
            f.write(f"  - id: {item.get('id', 'unknown')}\n")
            f.write(f"    github_issue_url: {issue_url}\n")
            f.write(f"    wsjf: {item.get('wsjf', 0.0)}\n")
            f.write(f"    created_at: {datetime.now(timezone.utc).isoformat()}\n")
    
    except Exception as e:
        print(f"Warning: Failed to update {yaml_path}: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description="Automate GitHub issue creation from retrospective insights",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry-run (no changes)
  python3 scripts/github_issue_automation.py --from insights --dry-run --repo owner/repo
  
  # Create issues from QUICK_WINS.md
  python3 scripts/github_issue_automation.py --from quick-wins --repo owner/repo
  
  # Create issues from CONSOLIDATED_ACTIONS.yaml
  python3 scripts/github_issue_automation.py --from yaml --repo owner/repo
  
  # Create issues with assignee and milestone
  python3 scripts/github_issue_automation.py --from insights --repo owner/repo --assignee user --milestone v1.0
        """
    )
    
    parser.add_argument("--from", dest="source", choices=["insights", "quick-wins", "yaml"],
                        default="quick-wins",
                        help="Source for action items (default: quick-wins)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print commands without executing")
    parser.add_argument("--repo", required=False,
                        help="GitHub repository (owner/name) - can also use AF_GITHUB_REPO")
    parser.add_argument("--labels", nargs="+",
                        help="Additional GitHub labels")
    parser.add_argument("--assignee",
                        help="GitHub issue assignee")
    parser.add_argument("--milestone",
                        help="GitHub milestone")
    parser.add_argument("--cpu-threshold", type=int, default=None,
                        help="Override CPU idle threshold (default: from AF_CPU_IDLE_MIN or 50)")
    parser.add_argument("--limit", type=int, default=10,
                        help="Maximum number of issues to create (default: 10)")
    
    args = parser.parse_args()
    
    # Determine repo
    repo = args.repo or os.environ.get("AF_GITHUB_REPO", "")
    if not args.dry_run and not repo:
        print("Error: --repo required or set AF_GITHUB_REPO environment variable", file=sys.stderr)
        return 1
    
    # CPU governor guard
    cpu_threshold = args.cpu_threshold if args.cpu_threshold is not None else int(os.environ.get("AF_CPU_IDLE_MIN", "50"))
    if cpu_threshold > 0 and not check_cpu_guard(cpu_threshold):
        return 1
    
    # Determine project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    goalie_dir = project_root / ".goalie"
    
    # Parse action items based on source
    items = []
    if args.source == "quick-wins":
        doc_path = project_root / "docs" / "QUICK_WINS.md"
        items = parse_quick_wins_items(doc_path)
        print(f"\n📊 Found {len(items)} incomplete HIGH priority items in QUICK_WINS.md")
    
    elif args.source == "yaml":
        yaml_path = goalie_dir / "CONSOLIDATED_ACTIONS.yaml"
        items = parse_consolidated_actions(yaml_path)
        print(f"\n📊 Found {len(items)} incomplete high-priority actions in CONSOLIDATED_ACTIONS.yaml")
    
    elif args.source == "insights":
        insights_path = goalie_dir / "insights_log.jsonl"
        items = parse_insights_log(insights_path, limit=args.limit)
        print(f"\n📊 Found {len(items)} recent insights in insights_log.jsonl")
    
    if not items:
        print("No action items found to process")
        return 0
    
    # Limit number of issues
    items = items[:args.limit]
    
    # Create GitHub issues
    created_count = 0
    insights_path = goalie_dir / "insights_log.jsonl"
    yaml_path = goalie_dir / "CONSOLIDATED_ACTIONS.yaml"
    
    for item in items:
        issue_url = create_github_issue(
            item, repo, args.dry_run, args.labels, args.assignee, args.milestone
        )
        
        if issue_url and not args.dry_run:
            created_count += 1
            log_issue_event(item, issue_url, insights_path)
            
            if yaml_path.exists() and item.get("id"):
                update_consolidated_actions_yaml(item, issue_url, yaml_path)
    
    print(f"\n✅ Created {created_count} GitHub issues")
    return 0


if __name__ == "__main__":
    sys.exit(main())

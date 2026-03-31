#!/usr/bin/env python3
"""
Unified Dashboard for Agentic Flow
Aggregates metrics from .goalie/ and logs/ into single-pane view

Usage:
  python scripts/af_dashboard.py [--watch] [--json] [--since ISO8601]
  
Or via af CLI:
  ./scripts/af dashboard [--watch] [--json] [--since ISO8601]
"""

import argparse
import json
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import yaml
except ImportError:
    print("Warning: PyYAML not installed. Install with: pip install PyYAML")
    yaml = None

ROOT = Path(__file__).resolve().parents[1]
GOALIE = ROOT / ".goalie"
LOGS = ROOT / "logs"

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"

# ANSI color codes for rich terminal output
COLORS = {
    "RED": "\033[0;31m",
    "GREEN": "\033[0;32m",
    "YELLOW": "\033[1;33m",
    "BLUE": "\033[0;34m",
    "MAGENTA": "\033[0;35m",
    "CYAN": "\033[0;36m",
    "WHITE": "\033[1;37m",
    "BOLD": "\033[1m",
    "RESET": "\033[0m"
}


def parse_time(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO8601 timestamp to naive UTC datetime"""
    if not value:
        return None
    try:
        txt = value.strip()
        if "T" not in txt:
            dt = datetime.fromisoformat(txt)
        else:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        # Convert to naive UTC
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def within_range(ts: Optional[str], since: Optional[datetime]) -> bool:
    """Check if timestamp is within specified range"""
    if not ts:
        return True
    dt = parse_time(ts)
    if dt is None:
        return True
    if since and dt < since:
        return False
    return True


def read_jsonl(path: Path, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """Read JSONL file with optional time filtering"""
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            ts = obj.get("timestamp")
            if within_range(ts, since):
                out.append(obj)
    return out


def read_yaml_file(path: Path) -> Dict[str, Any]:
    """Read YAML file"""
    if not path.exists() or yaml is None:
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Failed to read {path}: {e}")
        return {}


def colorize(text: str, color: str, bold: bool = False) -> str:
    """Apply ANSI color codes to text"""
    prefix = f"{COLORS.get('BOLD', '')}" if bold else ""
    color_code = COLORS.get(color, "")
    reset = COLORS.get("RESET", "")
    return f"{prefix}{color_code}{text}{reset}"


def format_percentage(value: float, good_threshold: float = 0.7, bad_threshold: float = 0.5) -> str:
    """Format percentage with color coding"""
    pct = f"{value*100:.1f}%"
    if value >= good_threshold:
        return colorize(pct, "GREEN")
    elif value <= bad_threshold:
        return colorize(pct, "RED")
    else:
        return colorize(pct, "YELLOW")


def format_count(value: int, label: str) -> str:
    """Format count with label"""
    return f"{colorize(str(value), 'CYAN', bold=True)} {label}"


class DashboardData:
    """Aggregate dashboard data from multiple sources"""
    
    def __init__(self, since: Optional[datetime] = None):
        self.since = since
        self.kanban = self.load_kanban()
        self.pattern_metrics = self.load_pattern_metrics()
        self.governor_incidents = self.load_governor_incidents()
        self.learning_events = self.load_learning_events()
        self.metrics_log = self.load_metrics_log()
    
    def load_kanban(self) -> Dict[str, Any]:
        """Load Kanban board from .goalie/KANBAN_BOARD.yaml"""
        data = read_yaml_file(GOALIE / "KANBAN_BOARD.yaml")
        # Normalize columns format (handle both list and dict)
        columns = data.get("columns", {})
        if isinstance(columns, list):
            # Convert list format to dict format
            columns_dict = {}
            for col in columns:
                if isinstance(col, dict) and "name" in col:
                    columns_dict[col["name"]] = col
            data["columns"] = columns_dict
        return data
    
    def load_pattern_metrics(self) -> List[Dict[str, Any]]:
        """Load pattern metrics from .goalie/pattern_metrics_append.jsonl"""
        return read_jsonl(GOALIE / "pattern_metrics_append.jsonl", self.since)
    
    def load_governor_incidents(self) -> List[Dict[str, Any]]:
        """Load governor incidents from logs/governor_incidents.jsonl"""
        return read_jsonl(LOGS / "governor_incidents.jsonl", self.since)
    
    def load_learning_events(self) -> List[Dict[str, Any]]:
        """Load learning events from logs/learning/events.jsonl"""
        learning_dir = LOGS / "learning"
        if learning_dir.exists():
            return read_jsonl(learning_dir / "events.jsonl", self.since)
        return []
    
    def load_metrics_log(self) -> List[Dict[str, Any]]:
        """Load metrics log from .goalie/metrics_log.jsonl"""
        return read_jsonl(GOALIE / "metrics_log.jsonl", self.since)


class DashboardRenderer:
    """Render dashboard sections with rich terminal formatting"""
    
    def __init__(self, data: DashboardData):
        self.data = data
    
    def render_header(self):
        """Render dashboard header"""
        print("\n" + "=" * 80)
        print(colorize("🚀 Agentic Flow Unified Dashboard", "CYAN", bold=True))
        print(colorize(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "WHITE"))
        if self.data.since:
            print(colorize(f"📊 Since: {self.data.since.strftime(ISO_FMT)}", "WHITE"))
        print("=" * 80 + "\n")
    
    def render_kanban_section(self):
        """Render Kanban board section"""
        print(colorize("📋 Active Work (Kanban)", "BLUE", bold=True))
        print("-" * 80)
        
        kanban = self.data.kanban
        columns = kanban.get("columns", {})
        
        # NOW column
        now_items = columns.get("NOW", {}).get("items", [])
        now_limit = columns.get("NOW", {}).get("wip_limit", 3)
        print(f"\n  {colorize('NOW', 'GREEN', bold=True)} (WIP: {len(now_items)}/{now_limit})")
        
        if now_items:
            for item in now_items[:5]:  # Show max 5 items
                title = item.get("title", "Untitled")
                wsjf = item.get("wsjf_score", 0)
                priority = item.get("priority", "").upper()
                print(f"    • [{colorize(priority, 'YELLOW')}] {title} (WSJF: {colorize(str(wsjf), 'CYAN')})")
        else:
            print(colorize("    ✅ No active work - NOW column empty!", "GREEN"))
        
        # NEXT column
        next_items = columns.get("NEXT", {}).get("items", [])
        next_limit = columns.get("NEXT", {}).get("wip_limit", 5)
        print(f"\n  {colorize('NEXT', 'YELLOW', bold=True)} (Queued: {len(next_items)}/{next_limit})")
        
        if next_items:
            for item in next_items[:3]:  # Show max 3 items
                title = item.get("title", "Untitled")
                wsjf = item.get("wsjf_score", 0)
                print(f"    • {title} (WSJF: {colorize(str(wsjf), 'CYAN')})")
        else:
            print("    ℹ️  No queued work")
        
        # DONE column (recent completions)
        done_items = columns.get("DONE", {}).get("items", [])
        print(f"\n  {colorize('DONE', 'GREEN', bold=True)} (Recently Completed: {len(done_items)})")
        
        if done_items:
            recent = [item for item in done_items[:3]]  # Show last 3
            for item in recent:
                title = item.get("title", "Untitled")
                completed_at = item.get("completed_at", "")
                print(f"    ✓ {title} ({colorize(completed_at, 'WHITE')})")
        
        print()
    
    def render_system_health_section(self):
        """Render system health metrics"""
        print(colorize("💚 System Health", "BLUE", bold=True))
        print("-" * 80)
        
        metrics = self.data.metrics_log
        if metrics:
            latest = metrics[-1]
            cpu_load = latest.get("cpu", {}).get("load_pct", 0)
            memory_pct = latest.get("memory", {}).get("used_pct", 0)
            
            # CPU status
            cpu_status = "HEALTHY" if cpu_load < 80 else "CRITICAL"
            cpu_color = "GREEN" if cpu_load < 80 else "RED"
            print(f"\n  CPU Load: {colorize(f'{cpu_load:.1f}%', cpu_color)} ({colorize(cpu_status, cpu_color)})")
            
            # Memory status
            mem_status = "HEALTHY" if memory_pct < 90 else "WARNING"
            mem_color = "GREEN" if memory_pct < 90 else "YELLOW"
            print(f"  Memory: {colorize(f'{memory_pct:.1f}%', mem_color)} ({colorize(mem_status, mem_color)})")
        else:
            print(colorize("\n  ⚠️  No system metrics available", "YELLOW"))
        
        print()
    
    def render_governor_section(self):
        """Render Process Governor metrics"""
        print(colorize("⚙️  Process Governor", "BLUE", bold=True))
        print("-" * 80)
        
        incidents = self.data.governor_incidents
        
        if incidents:
            # Count incident types
            incident_types = Counter(inc.get("type", "unknown") for inc in incidents)
            
            print(f"\n  Total Incidents: {format_count(len(incidents), 'events')}")
            print(f"  Rate Limited: {format_count(incident_types.get('rate_limited', 0), 'events')}")
            print(f"  Backoff Applied: {format_count(incident_types.get('backoff', 0), 'events')}")
            print(f"  WIP Violations: {format_count(incident_types.get('wip_violation', 0), 'events')}")
            
            # Show latest incident
            if incidents:
                latest = incidents[-1]
                inc_type = latest.get("type", "unknown")
                timestamp = latest.get("timestamp", "")
                print(f"\n  Latest: {colorize(inc_type, 'YELLOW')} at {timestamp}")
        else:
            print(colorize("\n  ✅ No governor incidents - system running smoothly", "GREEN"))
        
        print()
    
    def render_learning_section(self):
        """Render learning capture metrics"""
        print(colorize("🧠 Learning Metrics", "BLUE", bold=True))
        print("-" * 80)
        
        events = self.data.learning_events
        
        if events:
            # Calculate capture ratio
            command_count = len([e for e in events if e.get("type") == "command"])
            learning_count = len([e for e in events if e.get("type") == "learning_capture"])
            
            capture_ratio = command_count / learning_count if learning_count > 0 else float('inf')
            ratio_status = "EXCELLENT" if capture_ratio < 10 else "GOOD" if capture_ratio < 100 else "NEEDS IMPROVEMENT"
            ratio_color = "GREEN" if capture_ratio < 10 else "YELLOW" if capture_ratio < 100 else "RED"
            
            print(f"\n  Total Events: {format_count(len(events), 'events')}")
            print(f"  Commands: {format_count(command_count, 'commands')}")
            print(f"  Captures: {format_count(learning_count, 'captures')}")
            print(f"  Ratio: {colorize(f'{capture_ratio:.1f}:1', ratio_color)} ({colorize(ratio_status, ratio_color)})")
        else:
            print(colorize("\n  ⚠️  No learning events captured yet", "YELLOW"))
        
        print()
    
    def render_risk_indicators(self):
        """Render risk indicators and alerts"""
        print(colorize("⚠️  Risk Indicators", "BLUE", bold=True))
        print("-" * 80)
        
        alerts = []
        
        # Check NOW column WIP
        kanban = self.data.kanban
        columns = kanban.get("columns", {})
        now_items = columns.get("NOW", {}).get("items", [])
        now_limit = columns.get("NOW", {}).get("wip_limit", 3)
        
        if len(now_items) > now_limit:
            alerts.append(colorize(f"  🔴 WIP violation: {len(now_items)}/{now_limit} items in NOW", "RED"))
        
        # Check high WSJF items in LATER
        later_items = columns.get("LATER", {}).get("items", [])
        high_wsjf = [item for item in later_items if item.get("wsjf_score", 0) > 15]
        if high_wsjf:
            alerts.append(colorize(f"  🟡 {len(high_wsjf)} high-priority items stuck in LATER", "YELLOW"))
        
        # Check blocked items
        blocked_items = [item for item in now_items if item.get("status") == "BLOCKED"]
        if blocked_items:
            alerts.append(colorize(f"  🔴 {len(blocked_items)} items BLOCKED in NOW", "RED"))
        
        # Check CPU load
        metrics = self.data.metrics_log
        if metrics:
            latest = metrics[-1]
            cpu_load = latest.get("cpu", {}).get("load_pct", 0)
            if cpu_load > 100:
                alerts.append(colorize(f"  🔴 CPU overload: {cpu_load:.1f}%", "RED"))
        
        # Check learning capture ratio
        events = self.data.learning_events
        if events:
            command_count = len([e for e in events if e.get("type") == "command"])
            learning_count = len([e for e in events if e.get("type") == "learning_capture"])
            capture_ratio = command_count / learning_count if learning_count > 0 else float('inf')
            
            if capture_ratio > 100:
                alerts.append(colorize(f"  🟡 Learning capture ratio high: {capture_ratio:.1f}:1", "YELLOW"))
        
        if alerts:
            print()
            for alert in alerts:
                print(alert)
        else:
            print(colorize("\n  ✅ No critical risks detected", "GREEN"))
        
        print()
    
    def render_summary_footer(self):
        """Render summary footer"""
        print("=" * 80)
        print(colorize("💡 Quick Actions:", "WHITE", bold=True))
        print("  • Run daily standup: ./scripts/af standup")
        print("  • Trigger retrospective: ./scripts/af retro")
        print("  • Refresh metrics: ./scripts/af dashboard --watch")
        print("=" * 80 + "\n")
    
    def render_full_dashboard(self):
        """Render complete dashboard"""
        self.render_header()
        self.render_kanban_section()
        self.render_system_health_section()
        self.render_governor_section()
        self.render_learning_section()
        self.render_risk_indicators()
        self.render_summary_footer()


def render_json_dashboard(data: DashboardData) -> Dict[str, Any]:
    """Render dashboard as JSON"""
    kanban = data.kanban
    columns = kanban.get("columns", {})
    
    # Calculate metrics
    now_items = columns.get("NOW", {}).get("items", [])
    next_items = columns.get("NEXT", {}).get("items", [])
    done_items = columns.get("DONE", {}).get("items", [])
    
    # Learning metrics
    events = data.learning_events
    command_count = len([e for e in events if e.get("type") == "command"])
    learning_count = len([e for e in events if e.get("type") == "learning_capture"])
    capture_ratio = command_count / learning_count if learning_count > 0 else None
    
    # Governor incidents
    incidents = data.governor_incidents
    incident_types = Counter(inc.get("type", "unknown") for inc in incidents)
    
    # System health
    metrics = data.metrics_log
    latest_metrics = metrics[-1] if metrics else {}
    
    return {
        "timestamp": datetime.now().isoformat(),
        "since": data.since.isoformat() if data.since else None,
        "kanban": {
            "now": {
                "count": len(now_items),
                "limit": columns.get("NOW", {}).get("wip_limit", 3),
                "items": [{"title": i.get("title"), "wsjf": i.get("wsjf_score")} for i in now_items[:5]]
            },
            "next": {
                "count": len(next_items),
                "limit": columns.get("NEXT", {}).get("wip_limit", 5),
                "items": [{"title": i.get("title"), "wsjf": i.get("wsjf_score")} for i in next_items[:3]]
            },
            "done": {
                "count": len(done_items),
                "recent": [{"title": i.get("title"), "completed_at": i.get("completed_at")} for i in done_items[:3]]
            }
        },
        "system_health": {
            "cpu_load_pct": latest_metrics.get("cpu", {}).get("load_pct"),
            "memory_pct": latest_metrics.get("memory", {}).get("used_pct"),
            "status": "healthy" if latest_metrics.get("cpu", {}).get("load_pct", 0) < 80 else "critical"
        },
        "governor": {
            "total_incidents": len(incidents),
            "rate_limited": incident_types.get("rate_limited", 0),
            "backoff": incident_types.get("backoff", 0),
            "wip_violations": incident_types.get("wip_violation", 0)
        },
        "learning": {
            "total_events": len(events),
            "commands": command_count,
            "captures": learning_count,
            "ratio": capture_ratio
        },
        "alerts": []
    }


def main():
    parser = argparse.ArgumentParser(description="Unified Dashboard for Agentic Flow")
    parser.add_argument("--watch", action="store_true", help="Watch mode - refresh every 5 seconds")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--since", type=str, help="Filter events since ISO8601 timestamp")
    parser.add_argument("--interval", type=int, default=5, help="Watch mode refresh interval (seconds)")
    
    args = parser.parse_args()
    
    # Parse since timestamp
    since = parse_time(args.since) if args.since else None
    
    if args.watch and args.json:
        print("Error: --watch and --json are mutually exclusive", file=sys.stderr)
        sys.exit(1)
    
    if args.watch:
        # Watch mode - refresh dashboard periodically
        try:
            while True:
                # Clear screen (works on Unix and Windows)
                print("\033[2J\033[H", end="")
                
                data = DashboardData(since=since)
                renderer = DashboardRenderer(data)
                renderer.render_full_dashboard()
                
                print(f"🔄 Refreshing in {args.interval}s... (Ctrl+C to exit)")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n👋 Dashboard exited")
            sys.exit(0)
    elif args.json:
        # JSON output
        data = DashboardData(since=since)
        output = render_json_dashboard(data)
        print(json.dumps(output, indent=2))
    else:
        # Single render
        data = DashboardData(since=since)
        renderer = DashboardRenderer(data)
        renderer.render_full_dashboard()


if __name__ == "__main__":
    main()

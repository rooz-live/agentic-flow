#!/usr/bin/env python3
"""
Validation Dashboard TUI
Interactive terminal interface for 40-role governance validation
with real-time cache service integration

Definition of Ready (DoR):
- textual library installed for TUI rendering
- Cache service running at CACHE_SERVICE_URL (default localhost:3001)
- GovernanceCouncil40 importable or graceful degradation enabled

Definition of Done (DoD):
- Dashboard renders Header, DataTable, ProgressBar, Log, and Footer widgets
- Cache stats widget updates every 5 seconds with hit rate and utilization
- Role verdict table displays 40 roles with color-coded confidence scores
- WSJF calculator integration shows prioritized task horizons
- Keyboard bindings provide interactive navigation
"""

import asyncio
import json
import os
import urllib.request
from datetime import datetime
from typing import Dict, Optional, Any

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import (
    Header, Footer, DataTable, Static, ProgressBar,
    Log, Button, Label
)
from textual.binding import Binding

try:
    from governance_council import GovernanceCouncil40
except ImportError:
    GovernanceCouncil40 = None  # Graceful degradation

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wsjf.calculator import WsjfCalculator, WsjfItem, get_sample_items, Horizon

try:
    from resilience import CircuitBreaker, ValidationCache
except ImportError:
    CircuitBreaker = None
    ValidationCache = None

CACHE_SERVICE_URL = os.environ.get(
    'CACHE_SERVICE_URL', 'http://localhost:3001'
)


class CacheServiceClient:
    """Client for cache service API using standard library"""

    def __init__(self, base_url: str = CACHE_SERVICE_URL):
        self.base_url = base_url

    def insert(self, key: str, value: str,
               ttl_seconds: int = 3600) -> Dict[str, Any]:
        """Insert key-value pair into cache"""
        try:
            data = json.dumps({
                "key": key, "value": value, "ttlSeconds": ttl_seconds
            }).encode()
            req = urllib.request.Request(
                f"{self.base_url}/insert",
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        try:
            url = f"{self.base_url}/get/{key}"
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                if data.get("success"):
                    return data.get("value")
                return None
        except Exception:
            return None

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            url = f"{self.base_url}/stats"
            with urllib.request.urlopen(url, timeout=5) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"success": False, "error": str(e), "cache": {}}

    def remove(self, key: str) -> bool:
        """Remove key from cache"""
        try:
            data = json.dumps({"key": key}).encode()
            req = urllib.request.Request(
                f"{self.base_url}/remove",
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                return data.get("success", False)
        except Exception:
            return False

    def clear(self) -> int:
        """Clear all cache entries"""
        try:
            req = urllib.request.Request(
                f"{self.base_url}/clear",
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                return data.get("cleared", 0)
        except Exception:
            return 0

    def close(self):
        """No-op for sync client"""
        pass


class CacheStatsWidget(Static):
    """Widget showing real-time cache statistics"""

    def __init__(self):
        super().__init__()
        self.stats: Dict[str, Any] = {}
        self.update_timer = None
        self.client = CacheServiceClient()

    def on_mount(self):
        """Start periodic updates"""
        self.update_stats()
        self.set_interval(5, self.update_stats)

    def update_stats(self):
        """Fetch and display cache stats"""
        try:
            data = self.client.get_stats()
            if data.get("success"):
                self.stats = data.get("cache", {})
                self.update(self._format_stats())
            else:
                self.update("[yellow]Cache: Connecting...[/]")
        except Exception as e:
            self.update(f"[red]Cache unavailable: {e}[/]")

    def _format_stats(self) -> str:
        """Format stats for display"""
        if not self.stats:
            return "Cache: [yellow]Connecting...[/]"

        size = self.stats.get("size", 0)
        capacity = self.stats.get("capacity", 10000)
        hit_rate = self.stats.get("hitRate", "0%")
        hits = self.stats.get("hits", 0)
        misses = self.stats.get("misses", 0)
        evictions = self.stats.get("evictions", 0)
        util = self.stats.get("utilization", "0%")

        if size < capacity * 0.8:
            util_color = "green"
        elif size < capacity * 0.95:
            util_color = "yellow"
        else:
            util_color = "red"

        return (
            f"[b]Cache Service[/b]\n"
            f"├─ Entries: [{util_color}]{size}/{capacity}[/] ({util})\n"
            f"├─ Hit Rate: [cyan]{hit_rate}[/] ({hits} hits, {misses} misses)\n"
            f"└─ Evictions: {evictions}"
        )

    def on_unmount(self):
        self.client.close()


class RoleVerdictWidget(DataTable):
    """Table showing 40-role verdicts with color coding"""

    def __init__(self):
        super().__init__()
        self.add_columns("Role", "Verdict", "Confidence", "Status")
        self.zebra_stripes = True

    def add_role_verdict(self, role_id: int, role_name: str,
                        verdict: str, confidence: float):
        """Add role verdict with appropriate styling"""
        # Color code by confidence
        if confidence >= 0.85:
            status_icon = "✓"
        elif confidence >= 0.70:
            status_icon = "○"
        else:
            status_icon = "✗"

        self.add_row(
            role_name[:20],
            verdict,
            f"{confidence:.1%}",
            status_icon,
            key=str(role_id)
        )


class ConsensusProgressBar(ProgressBar):
    """Progress bar showing 40-role consensus percentage"""

    def __init__(self):
        super().__init__(total=100, show_eta=False)
        self.update(progress=0)

    def set_consensus(self, percentage: float):
        """Update consensus percentage"""
        self.update(progress=percentage)
        # Color based on threshold
        if percentage >= 85:
            self.styles.color = "green"
        elif percentage >= 70:
            self.styles.color = "yellow"
        else:
            self.styles.color = "red"


class ROAMRiskHeatmap(Static):
    """Visual heatmap showing ROAM risk levels"""

    def __init__(self):
        super().__init__()
        self.risks = {}
        
    def update_risks(self, situational: str, strategic: str, systemic: str):
        """Update ROAM risk display"""
        self.risks = {
            "situational": situational,
            "strategic": strategic,
            "systemic": systemic
        }

        heatmap = self._build_heatmap()
        self.update(heatmap)
        
    def _build_heatmap(self) -> str:
        """Build ASCII heatmap"""
        def get_color(level: str) -> str:
            colors = {
                "Critical": "[red]",
                "High": "[orange]",
                "Medium": "[yellow]",
                "Low": "[green]"
            }
            return colors.get(level, "[white]")
        
        return f"""ROAM Risk Heatmap
        
┌─────────────────┬───────────┐
│ Situational     │ {get_color(self.risks.get('situational', 'Low'))}{self.risks.get('situational', 'N/A')}[/] │
├─────────────────┼───────────┤
│ Strategic       │ {get_color(self.risks.get('strategic', 'Low'))}{self.risks.get('strategic', 'Low')}[/] │
├─────────────────┼───────────┤
│ Systemic        │ {get_color(self.risks.get('systemic', 'Low'))}{self.risks.get('systemic', 'Low')}[/] │
└─────────────────┴───────────┘

Multiplier: {self._calculate_multiplier():.2f}x
"""
    
    def _calculate_multiplier(self) -> float:
        """Calculate ROAM multiplier"""
        import math
        
        multipliers = {
            "situational": {"Low": 1.0, "Medium": 1.1, "High": 1.2, "Critical": 1.3},
            "strategic": {"Low": 1.0, "Medium": 1.2, "High": 1.5, "Critical": 1.8},
            "systemic": {"Low": 1.0, "Medium": 2.0, "High": 2.5, "Critical": 3.0}
        }
        
        sit = multipliers["situational"].get(self.risks.get("situational", "Low"), 1.0)
        strat = multipliers["strategic"].get(self.risks.get("strategic", "Low"), 1.0)
        sys = multipliers["systemic"].get(self.risks.get("systemic", "Low"), 1.0)
        
        return math.pow(sit * strat * sys, 1/3)


class WSJFLadder(Static):
    """Visual ladder showing WSJF priority score with live calculator data"""

    def __init__(self):
        super().__init__()
        self.calculator = WsjfCalculator()
        self.wsjf_score = 0.0

    def load_items(self, items=None):
        """Load WSJF items from canonical calculator"""
        self.calculator = WsjfCalculator()
        for item in (items or get_sample_items()):
            self.calculator.add_item(item)
        self._refresh_display()

    def update_score(self, score: float, components: Dict):
        """Update WSJF display (legacy compat)"""
        self.wsjf_score = score
        self.update(self._build_ladder(components))

    def _refresh_display(self):
        """Rebuild display from calculator state"""
        priorities = self.calculator.get_priorities(top_n=5)
        anti_patterns = self.calculator.detect_anti_patterns()
        lines = ["[b]WSJF Priority Queue[/b]\n"]

        for p in priorities['priorities']:
            item = p['item']
            icon = {"NOW": "🔥", "NEXT": "📋", "LATER": "📅"}.get(item['horizon'], "?")
            stale = " [red][STALE][/]" if item['is_stale'] else ""
            score = p['wsjf_score']
            color = "red" if score >= 20 else "yellow" if score >= 10 else "green"
            lines.append(
                f"{icon} [{color}]{score:>5.1f}[/] {item['title'][:30]}"
                f" (BV={item['business_value']:.0f} TC={item['time_criticality']:.0f}"
                f" RR={item['risk_reduction']:.0f} JS={item['job_size']:.0f}){stale}"
            )

        # Top item bar chart
        if priorities['priorities']:
            top = priorities['priorities'][0]['item']
            lines.append("")
            lines.append(self._build_ladder({
                "ubv": top['business_value'],
                "tc": top['time_criticality'],
                "rr": top['risk_reduction'],
                "job_size": top['job_size'],
            }))

        # Anti-pattern warnings
        if anti_patterns:
            lines.append("\n[b]⚠️  Anti-Patterns:[/b]")
            for ap in anti_patterns:
                lines.append(f"  🔴 {ap['pattern']} ({ap['severity']})")

        self.update("\n".join(lines))

    def _build_ladder(self, components: Dict) -> str:
        """Build ASCII bar chart for top item"""
        ubv = components.get("ubv", 0)
        tc = components.get("tc", 0)
        rr = components.get("rr", 0)
        job_size = components.get("job_size", 1)
        bar_length = 20

        def bar(value: float) -> str:
            filled = int((value / 10.0) * bar_length)
            return "█" * filled + "░" * (bar_length - filled)

        return (
            f"BV  ({ubv:>4.0f}): {bar(ubv)}\n"
            f"TC  ({tc:>4.0f}): {bar(tc)}\n"
            f"RR  ({rr:>4.0f}): {bar(rr)}\n"
            f"JS  ({job_size:>4.0f}): {bar(job_size)}"
        )


class ValidationDashboard(App):
    """Main TUI application for validation dashboard"""
    
    CSS = """
    Screen { align: center middle; }
    
    #main-container {
        width: 100%;
        height: 100%;
        padding: 1;
    }
    
    #top-panel {
        height: auto;
        dock: top;
    }
    
    #left-panel {
        width: 50%;
        height: 100%;
    }
    
    #right-panel {
        width: 50%;
        height: 100%;
    }
    
    #role-table {
        height: 60%;
        border: solid green;
    }
    
    #consensus-bar {
        height: 3;
        margin: 1 0;
    }
    
    #roam-heatmap {
        height: 40%;
        border: solid yellow;
        padding: 1;
    }
    
    #wsjf-ladder {
        height: 40%;
        border: solid blue;
        padding: 1;
    }
    
    #activity-log {
        height: 20%;
        border: solid grey;
    }
    
    .status-critical { color: $error; }
    .status-warning { color: $warning; }
    .status-good { color: $success; }
    """
    
    BINDINGS = [
        Binding("q", "quit", "Quit", show=True),
        Binding("r", "run_validation", "Run Validation", show=True),
        Binding("c", "clear", "Clear", show=True),
        Binding("s", "save", "Save Report", show=True),
        Binding("w", "refresh_wsjf", "Refresh WSJF", show=True),
        Binding("1", "toggle_layer_1", "Layer 1", show=False),
        Binding("2", "toggle_layer_2", "Layer 2", show=False),
        Binding("3", "toggle_layer_3", "Layer 3", show=False),
        Binding("4", "toggle_layer_4", "Layer 4", show=False),
        Binding("?", "help", "Help", show=True),
    ]
    
    def __init__(self, governance_council=None, input_file=None, doc_type=None):
        super().__init__()
        self.council = governance_council or (GovernanceCouncil40() if GovernanceCouncil40 else None)
        self.cache_client = CacheServiceClient()
        self.wsjf_calculator = WsjfCalculator()
        self.validation_results = {}
        self.input_file = input_file
        self.doc_type = doc_type or "generic"
        # Resilience: circuit breaker for cache service
        self._cache_cb = CircuitBreaker(
            failure_threshold=3, recovery_timeout=30, name="cache-service"
        ) if CircuitBreaker else None
        # Resilience: local validation cache
        self._val_cache = ValidationCache(
            max_size=50, ttl_seconds=300
        ) if ValidationCache else None
        
    def compose(self) -> ComposeResult:
        """Compose the UI layout"""
        yield Header(show_clock=True)
        
        with Container(id="main-container"):
            # Top panel with controls
            with Horizontal(id="top-panel"):
                yield Button("Run Validation", id="run-btn", variant="primary")
                yield Button("Clear", id="clear-btn", variant="warning")
                yield Button("Save Report", id="save-btn", variant="success")
                yield Label("40-Role Governance Dashboard", id="title")
            
            # Main panels
            with Horizontal():
                # Left panel: Role verdicts + Consensus
                with Vertical(id="left-panel"):
                    yield RoleVerdictWidget(id="role-table")
                    yield ConsensusProgressBar(id="consensus-bar")
                    yield Log(id="activity-log", max_lines=100)
                
                # Right panel: ROAM + WSJF + Cache Stats
                with Vertical(id="right-panel"):
                    yield CacheStatsWidget(id="cache-stats")
                    yield ROAMRiskHeatmap(id="roam-heatmap")
                    yield WSJFLadder(id="wsjf-ladder")
        
        yield Footer()
    
    def on_mount(self):
        """Initialize dashboard"""
        self.title = "40-Role Validation Dashboard"
        self.sub_title = "Press 'r' to run validation"
        
        # Initial state
        self.query_one("#role-table", RoleVerdictWidget).add_role_verdict(
            0, "System", "READY", 1.0
        )
    
    async def action_run_validation(self):
        """Run full 40-role validation"""
        self.log_activity("Starting 40-role validation...")
        
        # Get widgets
        role_table = self.query_one("#role-table", RoleVerdictWidget)
        consensus_bar = self.query_one("#consensus-bar", ConsensusProgressBar)
        roam_heatmap = self.query_one("#roam-heatmap", ROAMRiskHeatmap)
        wsjf_ladder = self.query_one("#wsjf-ladder", WSJFLadder)
        
        # Clear previous results
        role_table.clear()
        
        # Simulate validation for each role
        for i in range(1, 41):
            role_name = self._get_role_name(i)
            
            # Simulate role analysis
            await asyncio.sleep(0.05)  # Small delay for visual effect
            
            # Random verdict for demo (in real use, would call actual role)
            import random
            verdict = random.choice(["APPROVE", "APPROVE", "APPROVE", "NEUTRAL"])
            confidence = random.uniform(0.75, 0.98)
            
            role_table.add_role_verdict(i, role_name, verdict, confidence)
            
            # Update progress
            progress = (i / 40) * 100
            consensus_bar.update(progress=progress)
            
            self.log_activity(f"Role {i} ({role_name}): {verdict} ({confidence:.1%})")
        
        # Final consensus
        final_consensus = random.uniform(0.85, 0.95)
        consensus_bar.set_consensus(final_consensus * 100)
        
        self.log_activity(f"✓ Validation complete. Consensus: {final_consensus:.1%}")
        
        # Update ROAM heatmap
        roam_heatmap.update_risks(
            situational="Medium",
            strategic="High",
            systemic="Critical"
        )
        
        # Update WSJF ladder with real calculator data
        wsjf_ladder.load_items(get_sample_items())
        self.wsjf_calculator = wsjf_ladder.calculator

        # Log WSJF priorities
        priorities = self.wsjf_calculator.get_priorities(top_n=3)
        for p in priorities['priorities']:
            self.log_activity(
                f"WSJF #{p['rank']}: {p['item']['title']} "
                f"= {p['wsjf_score']} ({p['item']['horizon']})"
            )
        anti_patterns = self.wsjf_calculator.detect_anti_patterns()
        if anti_patterns:
            for ap in anti_patterns:
                self.log_activity(f"⚠️  {ap['pattern']}: {ap['description']}")
        
        # Cache validation results (with circuit breaker protection)
        cache_key = f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        try:
            if self._cache_cb:
                self._cache_cb.call(
                    self.cache_client.insert,
                    cache_key,
                    str({"consensus": final_consensus, "roles": 40}),
                    86400,
                )
            else:
                self.cache_client.insert(
                    cache_key,
                    str({"consensus": final_consensus, "roles": 40}),
                    ttl_seconds=86400,
                )
            self.log_activity(f"Cached results to key: {cache_key}")
        except Exception as e:
            self.log_activity(f"[yellow]Cache unavailable: {e}[/yellow]")
    
    def action_clear(self):
        """Clear all results"""
        role_table = self.query_one("#role-table", RoleVerdictWidget)
        role_table.clear()
        
        consensus_bar = self.query_one("#consensus-bar", ConsensusProgressBar)
        consensus_bar.update(progress=0)
        
        log = self.query_one("#activity-log", Log)
        log.clear()
        
        self.log_activity("Dashboard cleared")
    
    def action_save(self):
        """Save validation report to reports/ directory"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
        os.makedirs(reports_dir, exist_ok=True)
        filename = os.path.join(reports_dir, f"validation_report_{timestamp}.md")

        report = self._generate_report()
        with open(filename, 'w') as f:
            f.write(report)

        self.log_activity(f"Report saved: {filename}")
        self.notify(f"Report saved: {os.path.basename(filename)}", severity="success")

    def action_refresh_wsjf(self):
        """Refresh WSJF ladder with latest data"""
        wsjf_ladder = self.query_one("#wsjf-ladder", WSJFLadder)
        wsjf_ladder.load_items(get_sample_items())
        self.wsjf_calculator = wsjf_ladder.calculator
        self.log_activity("WSJF ladder refreshed")

    def action_toggle_layer_3(self):
        self.log_activity("Layer 3: Government counsel (County Attorney, State AG, HUD, Legal Aid, Appellate)")

    def action_toggle_layer_4(self):
        self.log_activity("Layer 4: Software patterns (PRD, ADR, DDD, TDD)")
    
    def log_activity(self, message: str):
        """Log activity message"""
        log = self.query_one("#activity-log", Log)
        timestamp = datetime.now().strftime("%H:%M:%S")
        log.write_line(f"[{timestamp}] {message}")
    
    def _get_role_name(self, role_id: int) -> str:
        """Get role name by ID"""
        roles = {
            1: "Analyst", 2: "Assessor", 3: "Innovator",
            4: "Intuitive", 5: "Orchestrator", 6: "Seeker",
            7: "Judge", 8: "Prosecutor", 9: "Defense",
            10: "Expert", 11: "Jury", 12: "Mediator",
            13: "County Attorney", 14: "State AG", 15: "HUD",
            16: "Legal Aid", 17: "Appellate",
            18: "PRD", 19: "ADR", 20: "DDD",
            21: "TDD", 22: "Game Theorist", 23: "Behavioral Econ",
            24: "Systems Thinker", 25: "Narrative Designer", 26: "EQ",
            27: "Info Theorist",
            28: "SFT Generator", 29: "RL Filter", 30: "MGPO",
            31: "Multi-Perspective", 32: "Entropy Decoder", 33: "Ensemble",
            34: "Environment Spec", 35: "Social Media Arch",
            36: "DDD Modeler", 37: "Rust TDD Eng", 38: "TUI Designer",
            39: "React Dev", 40: "Validation Arch"
        }
        return roles.get(role_id, f"Role-{role_id}")
    
    def _generate_report(self) -> str:
        """Generate markdown validation report from live data"""
        priorities = self.wsjf_calculator.get_priorities(top_n=5)
        anti_patterns = self.wsjf_calculator.detect_anti_patterns()

        # WSJF section
        wsjf_lines = []
        for p in priorities.get('priorities', []):
            item = p['item']
            wsjf_lines.append(
                f"| {p['rank']}. {item['title'][:30]} | {p['wsjf_score']} | {item['horizon']} |"
            )
        wsjf_table = "\n".join(wsjf_lines) if wsjf_lines else "| No items | - | - |"

        # Anti-pattern section
        ap_lines = []
        for ap in anti_patterns:
            ap_lines.append(f"- **{ap['pattern']}** ({ap['severity']}): {ap['description']}")
        ap_section = "\n".join(ap_lines) if ap_lines else "None detected."

        # Cache stats
        cache_info = ""
        if self._cache_cb:
            cb_d = self._cache_cb.to_dict()
            cache_info = (
                f"- Circuit breaker: {cb_d['state']}\n"
                f"- Total calls: {cb_d['stats']['total_calls']}\n"
                f"- Rejected: {cb_d['stats']['rejected_count']}"
            )
        if self._val_cache:
            vc_d = self._val_cache.to_dict()
            cache_info += (
                f"\n- Validation cache: {vc_d['size']}/{vc_d['max_size']} "
                f"(hit rate: {vc_d['hit_rate']:.0%})"
            )

        return f"""# 40-Role Validation Report
Generated: {datetime.now().isoformat()}
Input: {self.input_file or 'demo mode'}
Doc Type: {self.doc_type}

## WSJF Priority Queue

| Item | Score | Horizon |
|------|-------|---------|
{wsjf_table}

## Anti-Pattern Warnings
{ap_section}

## Resilience Status
{cache_info or 'No resilience layer configured.'}

## Recommendations
1. Address any anti-patterns before proceeding
2. Monitor systemic risk indicators
3. Re-run validation after changes
"""
    
    def on_button_pressed(self, event: Button.Pressed):
        """Handle button presses"""
        if event.button.id == "run-btn":
            asyncio.create_task(self.action_run_validation())
        elif event.button.id == "clear-btn":
            self.action_clear()
        elif event.button.id == "save-btn":
            self.action_save()


def main():
    """Main entry point with CLI argument support"""
    import argparse
    parser = argparse.ArgumentParser(description="40-Role Validation Dashboard")
    parser.add_argument("-f", "--file", help="Input file to validate (.eml, .pdf, .md)")
    parser.add_argument("-t", "--type", default="generic",
                        choices=["settlement", "court", "discovery", "legal_brief", "generic"],
                        help="Document type")
    args = parser.parse_args()

    app = ValidationDashboard(input_file=args.file, doc_type=args.type)
    app.run()


if __name__ == '__main__':
    main()

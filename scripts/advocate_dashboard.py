#!/usr/bin/env python3
"""
Advocate Validation Dashboard (Real-Time)
Visualizes 21-role consensus, Wholeness checks, Software Patterns (PRD/DDD), and Advanced Strategy.
"""

import sys
import os
import time
from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, DataTable, ProgressBar, Static, Button, TabbedContent, TabPane, Markdown, Label, LoadingIndicator
from textual.containers import Container, Horizontal, VerticalScroll
from textual.reactive import reactive

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from vibesthinker.governance_council import GovernanceCouncil
    from scripts.systemic_indifference_analyzer import analyze_systemic_patterns
except ImportError:
    # Mock for dev
    class GovernanceCouncil:
        def __init__(self, path): pass
        def run_full_validation(self, content, type): return {}
    def analyze_systemic_patterns(): return "# Mock Systemic Report"

class RiskHeatmap(Static):
    risk_level = reactive("SITUATIONAL")
    def render(self) -> str:
        color = "green" if self.risk_level == "SITUATIONAL" else "red"
        return f"ROAM: [{color}]{self.risk_level}[/{color}]"

class SystemicScore(Static):
    score = reactive("0/40")
    def render(self) -> str:
        return f"Systemic Score: [bold magenta]{self.score}[/bold magenta] (MAA)"

class ValidationDashboard(App):
    CSS = """
    Screen { layout: vertical; }
    .box { height: 100%; border: solid green; }
    Horizontal { height: auto; align: center middle; margin-bottom: 1; }
    DataTable { height: 100%; }
    Markdown { padding: 1; }
    """

    BINDINGS = [("q", "quit", "Quit"), ("r", "refresh", "Force Refresh")]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Static("Advocacy Validation System (Real-Time Watcher)", classes="header"),
            ProgressBar(id="consensus_bar", total=100, show_eta=False),
            Horizontal(
                RiskHeatmap(id="roam"),
                SystemicScore(id="systemic_score"),
                Button("Force Refresh", id="refresh_btn")
            ),
            TabbedContent(
                TabPane("Roles & Consensus", DataTable(id="role_table")),
                TabPane("Software Patterns", DataTable(id="pattern_table")),
                TabPane("Advanced Strategy", DataTable(id="advanced_table")), # New Tab
                TabPane("Systemic Report", VerticalScroll(Markdown(id="systemic_md"))),
                TabPane("FLM Analysis", VerticalScroll(Markdown(id="flm_md"))),
                TabPane("Geo Intelligence", VerticalScroll(Markdown(id="geo_md")))
            ),
            classes="box"
        )
        yield Footer()

    def on_mount(self) -> None:
        # Defaults
        default_file = "/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/TIER-5-DIGITAL/Email/Templates/CREATIVE-SETTLEMENT-PROPOSAL.eml"
        self.target_file = sys.argv[1] if len(sys.argv) > 1 else default_file
        self.last_mtime = 0

        # Init Logic
        try:
            self.council = GovernanceCouncil(self.target_file)
        except Exception as e:
            self.notify(f"Init Error: {e}", severity="error")

        # Setup Tables
        self.query_one("#role_table").add_columns("Level", "Role", "Verdict", "Confidence", "Reasoning")
        self.query_one("#pattern_table").add_columns("Pattern", "Status", "Message") # Simplified for now
        self.query_one("#advanced_table").add_columns("Role", "Status", "Score/Message")

        # Start Watcher
        self.set_interval(2.0, self.check_file_update)
        self.run_validation() # Initial run

    def check_file_update(self) -> None:
        if os.path.exists(self.target_file):
            mtime = os.path.getmtime(self.target_file)
            if mtime > self.last_mtime:
                self.last_mtime = mtime
                self.run_validation()
                self.notify("File updated. Refreshing analysis...")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "refresh_btn":
            self.run_validation()

    def load_report(self, filename, widget_id):
        """Helper to load markdown report into widget"""
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), filename)
        widget = self.query_one(f"#{widget_id}")
        if os.path.exists(path):
            with open(path, 'r') as f:
                widget.update(f.read())
        else:
            widget.update(f"Report not found: {filename}")

    def run_validation(self) -> None:
        if not os.path.exists(self.target_file):
            self.notify(f"File not found: {self.target_file}", severity="warning")
            return

        with open(self.target_file, 'r') as f:
            content = f.read()

        # Generate Systemic Report on fly
        sys_report = analyze_systemic_patterns()
        with open("SYSTEMIC-INDIFFERENCE-REPORT.md", "w") as f:
            f.write(sys_report)

        # 1. Run Full Validation
        try:
            report = self.council.run_full_validation(content, "settlement")

            # 2. Update Role Table
            table = self.query_one("#role_table")
            table.clear()

            # Circles (Layer 1)
            for name, data in report.get("circles", {}).items():
                pass_rate = data.get("pass_rate", 0)
                color = "green" if pass_rate == 100 else "yellow" if pass_rate > 50 else "red"
                table.add_row("Circle", name, f"[{color}]{pass_rate}%[/{color}]", "-", data.get("purpose", ""))

            # Legal Roles (Layer 2)
            for name, data in report.get("roles", {}).items():
                verdict = data.get("verdict", "PENDING")
                color = "green" if verdict == "APPROVE" else "red"
                table.add_row("Legal", name, f"[{color}]{verdict}[/{color}]", str(data.get("confidence", 0)), data.get("reasoning", ""))

            # Government Counsels (Layer 3)
            for name, data in report.get("counsels", {}).items():
                passed = data.get("checks_passed", 0)
                total = data.get("checks_total", 1)
                table.add_row("Gov", name, f"{passed}/{total}", "-", data.get("focus", ""))

            # 3. Update Patterns Table (Layer 4)
            ptable = self.query_one("#pattern_table")
            ptable.clear()

            for name, data in report.get("patterns", {}).items():
                passed = data.get("passed", False)
                color = "green" if passed else "red"
                ptable.add_row(
                    name,
                    f"[{color}]{'PASS' if passed else 'FAIL'}[/{color}]",
                    data.get("message", "")
                )

            # 4. Update Advanced Strategy Table (Layer 5)
            atable = self.query_one("#advanced_table")
            atable.clear()

            for name, data in report.get("advanced", {}).items():
                passed = data.get("passed", False)
                color = "magenta" if passed else "grey"
                atable.add_row(
                    name,
                    f"[{color}]{'ACTIVE' if passed else 'INACTIVE'}[/{color}]",
                    data.get("message", "")
                )

            # 5. Update Stats
            overall = report.get("overall", {})
            self.query_one(ProgressBar).update(progress=overall.get("wholeness_score", 0))
            self.query_one("#systemic_score").score = "40/40" # Mock/Extracted from report if parsed

            # 6. Load Reports
            self.load_report("SYSTEMIC-INDIFFERENCE-REPORT.md", "systemic_md")
            self.load_report("FLM_BARRIER_ANALYSIS.md", "flm_md")
            self.load_report("GEO_INTEL_REPORT.md", "geo_md")

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.notify(f"Validation Error: {e}", severity="error")

if __name__ == "__main__":
    app = ValidationDashboard()
    app.run()

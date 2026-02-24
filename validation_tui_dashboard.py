#!/usr/bin/env python3
"""
Textual TUI Dashboard for Settlement Email Validation
Real-time monitoring of 41-role consensus + ROAM + WSJF + Timestamp Integrity
"""

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer, Static, DataTable, ProgressBar, Label
from textual.reactive import reactive
from rich.table import Table
from rich.text import Text
import json
import sys


class RoleVerdictTable(Static):
    """41-role consensus table with color-coded verdicts"""
    
    def __init__(self, validation_results: dict):
        super().__init__()
        self.validation_results = validation_results
    
    def on_mount(self) -> None:
        # Create Rich table
        table = Table(title="🎯 41-Role Validation Consensus", expand=True)
        table.add_column("Role", style="cyan", width=25)
        table.add_column("Verdict", width=15)
        table.add_column("Confidence", justify="right", width=12)
        table.add_column("Key Concerns", style="dim", width=40)
        
        # Layer 1: 12 Circles
        table.add_row("", "", "", "", style="bold blue")
        table.add_row("LAYER 1: CIRCLES (12)", "", "", "", style="bold blue")
        
        circles = [
            "Analyst", "Assessor", "Innovator", "Intuitive", 
            "Orchestrator", "Seeker", "Connector", "Strategist",
            "Validator", "Synthesizer", "Observer", "Catalyst"
        ]
        
        for circle in circles:
            verdict = self._get_verdict(circle)
            confidence = self._get_confidence(circle)
            concerns = self._get_concerns(circle)
            
            style = self._get_style(verdict)
            table.add_row(f"  {circle}", verdict, f"{confidence:.1f}%", concerns, style=style)
        
        # Layer 2: 12 Legal Roles
        table.add_row("", "", "", "", style="bold green")
        table.add_row("LAYER 2: LEGAL (12)", "", "", "", style="bold green")
        
        legal_roles = [
            "Judge", "Prosecutor", "Defense", "Expert", "Jury", "Mediator",
            "Plaintiff-Attorney", "Corporate-Defense", "Arbitrator", 
            "Law-Clerk", "Paralegal", "Expert-Witness"
        ]
        
        for role in legal_roles:
            verdict = self._get_verdict(role)
            confidence = self._get_confidence(role)
            concerns = self._get_concerns(role)
            
            style = self._get_style(verdict)
            table.add_row(f"  {role}", verdict, f"{confidence:.1f}%", concerns, style=style)
        
        # Layer 3: 10 Government Counsel
        table.add_row("", "", "", "", style="bold yellow")
        table.add_row("LAYER 3: GOV COUNSEL (10)", "", "", "", style="bold yellow")
        
        gov_counsel = [
            "County Attorney", "State AG", "HUD", "Legal Aid", "Appellate",
            "Fair-Housing", "Consumer-Protection", "AG-Civil-Rights",
            "Municipal-Housing", "Federal-Ombudsman"
        ]
        
        for counsel in gov_counsel:
            verdict = self._get_verdict(counsel)
            confidence = self._get_confidence(counsel)
            concerns = self._get_concerns(counsel)
            
            style = self._get_style(verdict)
            table.add_row(f"  {counsel}", verdict, f"{confidence:.1f}%", concerns, style=style)
        
        # Layer 4: 7 Software Patterns
        table.add_row("", "", "", "", style="bold magenta")
        table.add_row("LAYER 4: SW PATTERNS (7)", "", "", "", style="bold magenta")
        
        sw_patterns = ["PRD", "ADR", "DDD", "TDD", "BDD", "Event-Sourcing", "CQRS"]
        
        for pattern in sw_patterns:
            verdict = self._get_verdict(pattern)
            confidence = self._get_confidence(pattern)
            concerns = self._get_concerns(pattern)
            
            style = self._get_style(verdict)
            table.add_row(f"  {pattern}", verdict, f"{confidence:.1f}%", concerns, style=style)
        
        self.update(table)
    
    def _get_verdict(self, role: str) -> str:
        """Get verdict for role from validation results"""
        # Placeholder - integrate with actual validator
        if role in ["Analyst", "Judge", "PRD"]:
            return "APPROVE ✅"
        elif role in ["Assessor"]:
            return "REVISION 🔄"
        else:
            return "APPROVE ✅"
    
    def _get_confidence(self, role: str) -> float:
        """Get confidence score for role"""
        # Placeholder
        if role in ["Analyst", "Judge", "PRD"]:
            return 98.5
        elif role in ["Assessor"]:
            return 85.0
        else:
            return 95.0
    
    def _get_concerns(self, role: str) -> str:
        """Get key concerns for role"""
        # Placeholder
        if role == "Assessor":
            return "Timestamp needs final verification"
        else:
            return "None"
    
    def _get_style(self, verdict: str) -> str:
        """Get color style based on verdict"""
        if "APPROVE" in verdict:
            return "green"
        elif "REVISION" in verdict:
            return "yellow"
        else:
            return "red"


class ConsensusProgress(Static):
    """Progress bar for overall consensus"""
    
    consensus_pct = reactive(0.0)
    
    def __init__(self, consensus: float):
        super().__init__()
        self.consensus_pct = consensus
    
    def on_mount(self) -> None:
        self.update(self._render_progress())
    
    def _render_progress(self) -> str:
        filled = int(self.consensus_pct / 2)  # 50 chars for 100%
        bar = "█" * filled + "░" * (50 - filled)
        
        color = "green" if self.consensus_pct >= 95 else "yellow" if self.consensus_pct >= 85 else "red"
        
        return f"[{color}]Consensus: {bar} {self.consensus_pct:.1f}%[/{color}]"


class ROAMRiskHeatmap(Static):
    """ROAM risk visualization"""
    
    def __init__(self, roam_analysis: dict):
        super().__init__()
        self.roam_analysis = roam_analysis
    
    def on_mount(self) -> None:
        risk_type = self.roam_analysis.get('risk_type', 'UNKNOWN')
        confidence = self.roam_analysis.get('confidence', 0)
        level = self.roam_analysis.get('level', 0)
        action = self.roam_analysis.get('action', 'Unknown')
        
        color = "green" if risk_type == "SITUATIONAL" else "yellow" if risk_type == "STRATEGIC" else "red"
        
        content = f"""
[bold {color}]ROAM RISK CLASSIFICATION[/bold {color}]

Risk Type: [{color}]{risk_type}[/{color}]
Confidence: {confidence:.1f}%
Escalation Level: {level}/3
Recommended Action: {action}

[dim]Legend:
  SITUATIONAL = Good faith (busy/needs approval)
  STRATEGIC = Deliberate delay tactic
  SYSTEMIC = Organizational policy to ignore[/dim]
        """
        
        self.update(content.strip())


class WsjfPriorityLadder(Static):
    """WSJF priority visualization"""
    
    def __init__(self, wsjf_analysis: dict):
        super().__init__()
        self.wsjf_analysis = wsjf_analysis
    
    def on_mount(self) -> None:
        wsjf_score = self.wsjf_analysis.get('wsjf_score', 0)
        business_value = self.wsjf_analysis.get('business_value', 0)
        time_criticality = self.wsjf_analysis.get('time_criticality', 0)
        risk_reduction = self.wsjf_analysis.get('risk_reduction', 0)
        job_size = self.wsjf_analysis.get('job_size', 0)
        send_timing = self.wsjf_analysis.get('send_timing', 'Unknown')
        
        color = "green" if wsjf_score >= 6 else "yellow" if wsjf_score >= 4 else "red"
        
        content = f"""
[bold {color}]WSJF PRIORITY SCORE[/bold {color}]

WSJF: [{color}]{wsjf_score:.1f}[/{color}]
Business Value: {business_value}/10
Time Criticality: {time_criticality}/10
Risk Reduction: {risk_reduction}/10
Job Size: {job_size}/10

Send Timing: [bold]{send_timing}[/bold]

[dim]Formula: (BV + TC + RR) / JS[/dim]
        """
        
        self.update(content.strip())


class TimestampIntegrity(Static):
    """Timestamp integrity monitor"""
    
    def __init__(self, timestamp_validation: dict):
        super().__init__()
        self.timestamp_validation = timestamp_validation
    
    def on_mount(self) -> None:
        is_valid = self.timestamp_validation.get('valid', False)
        current_time = self.timestamp_validation.get('current_time', 'Unknown')
        email_time = self.timestamp_validation.get('email_time', 'Unknown')
        delta_minutes = self.timestamp_validation.get('delta_minutes', 0)
        
        color = "green" if is_valid else "red"
        icon = "✅" if is_valid else "❌"
        
        content = f"""
[bold {color}]TIMESTAMP INTEGRITY {icon}[/bold {color}]

Email Timestamp: {email_time}
Current Time: {current_time}
Time Delta: {abs(delta_minutes):.1f} minutes

Status: [{color}]{'VALID' if is_valid else 'INVALID'}[/{color}]

[dim]Truth-NOW Validation: Within 5-minute tolerance[/dim]
        """
        
        self.update(content.strip())


class ValidationDashboard(App):
    """Main Textual TUI Dashboard"""
    
    CSS = """
    Screen {
        layout: grid;
        grid-size: 2 3;
        grid-gutter: 1;
    }
    
    #role_table {
        column-span: 2;
        row-span: 2;
    }
    
    #consensus {
        column-span: 2;
    }
    
    .metric {
        border: solid $accent;
        padding: 1;
    }
    """
    
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
    ]
    
    def __init__(self, validation_data: dict):
        super().__init__()
        self.validation_data = validation_data
    
    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        
        yield RoleVerdictTable(self.validation_data.get('role_verdicts', {}))
        
        yield ConsensusProgress(self.validation_data.get('consensus_pct', 0))
        
        yield ROAMRiskHeatmap(self.validation_data.get('roam_analysis', {}))
        
        yield WsjfPriorityLadder(self.validation_data.get('wsjf_analysis', {}))
        
        yield TimestampIntegrity(self.validation_data.get('timestamp_validation', {}))
        
        yield Footer()
    
    def action_refresh(self) -> None:
        """Refresh all widgets"""
        self.refresh()


def main():
    if len(sys.argv) < 2:
        print("Usage: validation_tui_dashboard.py <validation_results.json>")
        sys.exit(1)
    
    validation_file = sys.argv[1]
    
    with open(validation_file, 'r') as f:
        validation_data = json.load(f)
    
    app = ValidationDashboard(validation_data)
    app.run()


if __name__ == '__main__':
    main()

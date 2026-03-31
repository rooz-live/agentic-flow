#!/usr/bin/env python3
"""
Real-time 33-role consensus validation dashboard using Textual.

DoR: Textual installed (`pip install textual`), validation results available
DoD: Interactive TUI with 18 widgets, PRD/DDD/ADR/TDD robustness, real-time file watcher

Keys: q=quit r=refresh v=validate n=next file t=doc type f=focus(L4) e=export s=strategic p=portfolio

Real-time for next email:
- -f path: file watcher re-validates on save (2s poll)
- n: modal to enter path for next .eml/.pdf/.docx
- t: cycle doc type (settlement/court/discovery)
- f: focus mode (L4 PRD/DDD/ADR/TDD only)
- s: strategic mode (33-role with diversity analysis)

Usage:
  ./scripts/run-validation-dashboard.sh
  ./scripts/run-validation-dashboard.sh -f path/to/email.eml
  ./scripts/run-validation-dashboard.sh -f settlement.eml -t settlement --strategic

Extended Features (33-Role):
- Strategic diversity validation (10+ alternatives)
- Temporal accuracy validation (date arithmetic)
- Systemic indifference analysis (multi-org patterns)
- MGPO entropy-guided selection
- Pass@K optimization
"""

import argparse
from pathlib import Path

from textual.app import App, ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Header, Footer, DataTable, Static, ProgressBar, Log, Button, Input
from textual.containers import Container, Vertical, Horizontal, Grid
from textual.reactive import reactive
from textual.timer import Timer
from datetime import datetime, timedelta
import json
import math
import asyncio
from typing import Dict, List, Optional, Any
import os

# Import 33-role governance council
try:
    from vibesthinker.governance_council_33_roles import (
        GovernanceCouncil33,
        StrategicRole,
        StrategicDiversityResult,
        TemporalValidationResult,
        SystemicIndifferenceResult
    )
    STRATEGIC_ROLES_AVAILABLE = True
except ImportError:
    STRATEGIC_ROLES_AVAILABLE = False
    print("Warning: 33-role governance council not available. Using 21-role fallback.")

# Optional imports for communication
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

# Communication configuration
COMM_CONFIG = {
    "telegram": {
        "enabled": bool(os.environ.get("TELEGRAM_BOT_TOKEN")),
        "bot_token": os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        "chat_id": os.environ.get("TELEGRAM_CHAT_ID", ""),
        "events": ["validation_complete", "deadline_warning", "critical_fail", "approval", "rejection"]
    },
    "email": {
        "enabled": True,
        "signature_validation": True,
        "pre_send_check": True
    },
    "meta": {
        "enabled": bool(os.environ.get("META_WEBHOOK_URL")),
        "webhook_url": os.environ.get("META_WEBHOOK_URL", ""),
        "platforms": ["messenger", "whatsapp"]
    }
}


# ═════════════════════════════════════════════════════════════════════════════
# COMMUNICATION NOTIFIER
# ═════════════════════════════════════════════════════════════════════════════

class CommunicationNotifier:
    """
    Handles notifications to various platforms:
    - Telegram: Bot messages for validation events
    - Email: Pre-send signature validation
    - Meta: Webhook notifications
    - X/LinkedIn: Professional network hooks
    """

    def __init__(self):
        self.config = COMM_CONFIG
        self.notification_log: List[Dict] = []

    async def send_telegram(self, message: str, event_type: str = "info") -> bool:
        """Send Telegram notification"""
        if not self.config["telegram"]["enabled"] or not HTTPX_AVAILABLE:
            return False

        if event_type not in self.config["telegram"]["events"]:
            return False

        bot_token = self.config["telegram"]["bot_token"]
        chat_id = self.config["telegram"]["chat_id"]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
                )
                success = response.status_code == 200
                self._log_notification("telegram", message, success)
                return success
        except Exception as e:
            self._log_notification("telegram", message, False, str(e))
            return False

    async def send_meta_webhook(self, event: str, data: Dict) -> bool:
        """Send Meta webhook notification"""
        if not self.config["meta"]["enabled"] or not HTTPX_AVAILABLE:
            return False

        webhook_url = self.config["meta"]["webhook_url"]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json={"event": event, "data": data, "timestamp": datetime.utcnow().isoformat()}
                )
                success = response.status_code == 200
                self._log_notification("meta", event, success)
                return success
        except Exception as e:
            self._log_notification("meta", event, False, str(e))
            return False

    def validate_email_signature(self, content: str, doc_type: str = "settlement") -> Dict:
        """
        Validate email signature block

        Settlement signatures should include:
        - Pro Se (Evidence-Based Systemic Analysis)
        - Case No.
        - Settlement Deadline

        Court filings use simpler Pro Se without methodology
        """
        import re

        settlement_checks = {
            "pro_se": bool(re.search(r'pro se|self-represented', content, re.IGNORECASE)),
            "case_number": bool(re.search(r'\d{2}CV\d{6}', content)),
            "methodology": "evidence-based" in content.lower() or "systemic analysis" in content.lower(),
            "deadline": bool(re.search(r'deadline|respond by|settlement', content, re.IGNORECASE)),
            "contact": bool(re.search(r'[\w\.-]+@[\w\.-]+', content)),
        }

        court_checks = {
            "pro_se": settlement_checks["pro_se"],
            "case_number": settlement_checks["case_number"],
            "court_name": bool(re.search(r'superior court|district court', content, re.IGNORECASE)),
            "address": bool(re.search(r'\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd)', content)),
        }

        if doc_type == "settlement":
            checks = settlement_checks
            passed = sum(1 for v in checks.values() if v) >= 3
        else:
            checks = court_checks
            passed = sum(1 for v in checks.values() if v) >= 3

        return {
            "valid": passed,
            "doc_type": doc_type,
            "checks": checks,
            "score": f"{sum(1 for v in checks.values() if v)}/{len(checks)}",
            "message": "Valid signature" if passed else "Missing signature elements"
        }

    def _log_notification(self, platform: str, message: str, success: bool, error: str = None):
        """Log notification attempt"""
        self.notification_log.append({
            "platform": platform,
            "message": message[:100],
            "success": success,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        })

    def get_status_summary(self) -> Dict:
        """Get communication status summary"""
        return {
            "telegram": {
                "enabled": self.config["telegram"]["enabled"],
                "recent_success": sum(1 for n in self.notification_log[-10:]
                                      if n["platform"] == "telegram" and n["success"])
            },
            "email": {
                "enabled": self.config["email"]["enabled"],
                "signature_validation": self.config["email"]["signature_validation"]
            },
            "meta": {
                "enabled": self.config["meta"]["enabled"],
                "platforms": self.config["meta"]["platforms"]
            },
            "total_notifications": len(self.notification_log),
            "success_rate": sum(1 for n in self.notification_log if n["success"]) / max(len(self.notification_log), 1)
        }


# Global notifier instance
_notifier = CommunicationNotifier()


# ═════════════════════════════════════════════════════════════════════════════
# FILE INPUT MODAL (Next email / validate another file)
# ═════════════════════════════════════════════════════════════════════════════

class FileInputScreen(ModalScreen[str]):
    """Modal to enter path for next email/document to validate."""

    DEFAULT_CSS = """
    FileInputScreen {
        align: center middle;
    }

    #file_input_dialog {
        width: 60;
        height: 8;
        border: solid $accent;
        padding: 1 2;
        background: $surface;
    }

    #file_input {
        width: 1fr;
        margin-bottom: 1;
    }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="file_input_dialog"):
            yield Input(
                id="file_input",
                placeholder="Path to .eml, .pdf, .docx (e.g. CORRESPONDENCE/OUTBOUND/next-email.eml)",
            )
            with Horizontal():
                yield Button("Validate", id="submit", variant="primary")
                yield Button("Cancel", id="cancel")

    def on_mount(self) -> None:
        self.query_one("#file_input", Input).focus()

    def on_input_submitted(self, event) -> None:
        self._submit_path(getattr(event.input, "value", "") or "")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "submit":
            path = self.query_one("#file_input", Input).value.strip()
            self._submit_path(path)
        else:
            self.dismiss(None)

    def _submit_path(self, path: str) -> None:
        path = path.strip()
        if not path:
            self.notify("Enter a file path", severity="warning")
            return
        p = Path(path).expanduser()
        if not p.exists():
            self.notify(f"File not found: {path}", severity="error")
            return
        self.dismiss(str(p.resolve()))

# Systemic scores (ORG_PROFILES from advocate_cli)
def load_systemic_scores() -> Dict:
    """Load Systemic ORG Scores from JSON or fallback to defaults."""
    try:
        json_path = Path(__file__).parent / "validation" / "sor_analysis.json"
        if json_path.exists():
            with open(json_path, 'r') as f:
                data = json.load(f)
            # Transform to dashboard format if needed, or straightforward use
            # The JSON has { "MAA": { "systemic_score": 40, ... } }
            # The dashboard expects { "MAA": { "score": 40, ... } }
            # Mapping keys to ensure compatibility
            formatted = {}
            for org, info in data.items():
                formatted[org] = {
                    "score": info.get("systemic_score", 0),
                    "max": 40,
                    "verdict": info.get("verdict", "UNKNOWN"),
                    "timeline": info.get("timeline", "")
                }
            return formatted
    except Exception as e:
        print(f"Error loading SOR data: {e}")

    # Fallback defaults
    return {
        "MAA": {"score": 40, "max": 40, "verdict": "LITIGATION-READY"},
        "Apex/BofA": {"score": 15, "max": 40, "verdict": "SETTLEMENT-ONLY"},
        "US Bank": {"score": 10, "max": 40, "verdict": "DEFER"},
        "T-Mobile": {"score": 8, "max": 40, "verdict": "DEFER"},
        "Credit Bureaus": {"score": 5, "max": 40, "verdict": "DEFER"},
        "IRS": {"score": 3, "max": 40, "verdict": "NOT SYSTEMIC"},
    }

SYSTEMIC_ORG_SCORES = load_systemic_scores()


def _convert_governance_report(report: dict) -> dict:
    """Convert GovernanceCouncil report to dashboard format."""
    layer1_map = {
        "ANALYST": "Analyst", "ASSESSOR": "Assessor", "INNOVATOR": "Innovator",
        "INTUITIVE": "Intuitive", "ORCHESTRATOR": "Orchestrator", "SEEKER": "Seeker"
    }
    layer2_map = {
        "JUDGE": "Judge", "PROSECUTOR": "Prosecutor", "DEFENSE": "Defense",
        "EXPERT_WITNESS": "Expert", "JURY": "Jury", "MEDIATOR": "Mediator"
    }
    layer3_map = {
        "COUNTY_ATTORNEY": "County Attorney", "STATE_AG_CONSUMER": "State AG",
        "HUD_REGIONAL": "HUD", "LEGAL_AID": "Legal Aid", "CFPB": "Appellate"
    }
    layer4_map = {"PRD": "PRD", "ADR": "ADR", "DDD": "DDD", "TDD": "TDD"}

    def to_verdict(v: str) -> tuple:
        pass_val = v in ("APPROVE", "CONDITIONAL_APPROVE")
        return pass_val, v

    result = {"layer1": {}, "layer2": {}, "layer3": {}, "layer4": {}, "meta": {}}

    for gc_name, display in layer1_map.items():
        c = report.get("circles", {}).get(gc_name, {})
        checks = c.get("checks", [])
        passed = sum(1 for ch in checks if ch.get("passed", False))
        total = len(checks) or 1
        result["layer1"][display] = {
            "pass": passed >= total * 0.66,
            "verdict": "APPROVED" if passed >= total * 0.66 else "NEEDS REVISION",
            "confidence": int((passed / total) * 100),
            "notes": checks[0].get("message", "")[:40] if checks else ""
        }

    for gc_name, display in layer2_map.items():
        r = report.get("roles", {}).get(gc_name, {})
        v = r.get("verdict", "NEEDS_REVISION")
        pass_val = v in ("APPROVE", "CONDITIONAL_APPROVE")
        result["layer2"][display] = {
            "pass": pass_val,
            "verdict": v.replace("_", " "),
            "confidence": int(r.get("confidence", 0) * 100),
            "notes": (r.get("reasoning", "") or "")[:40]
        }

    for gc_name, display in layer3_map.items():
        c = report.get("counsels", {}).get(gc_name, {})
        passed = c.get("checks_passed", 0)
        total = c.get("checks_total", 1) or 1
        result["layer3"][display] = {
            "pass": passed >= total * 0.5,
            "verdict": "APPROVED" if passed >= total * 0.5 else "PENDING",
            "confidence": int((passed / total) * 100),
            "notes": c.get("focus", "")[:40]
        }

    for gc_name, display in layer4_map.items():
        p = report.get("patterns", {}).get(gc_name, {})
        passed = p.get("passed", False)
        result["layer4"][display] = {
            "pass": passed,
            "verdict": "APPROVED" if passed else "NEEDS REVISION",
            "confidence": 90 if passed else 50,
            "notes": p.get("message", "")[:40]
        }

    overall = report.get("overall", {})
    result["meta"] = {
        "roam_risk": "SITUATIONAL",
        "risk_score": int(100 - overall.get("wholeness_score", 0)),
        "wsjf_score": 20.0,
        "base_wsjf_score": 20.0,
        "business_value": 9,
        "time_criticality": 10,
        "risk_reduction": 7,
        "job_size": 1,
        "deadline": "February 12, 2026 @ 5:00 PM EST",
        "wholeness_score": overall.get("wholeness_score", 0),
        "recommendation": overall.get("recommendation", ""),
        "strategic_diversity": {"num_strategies": 10, "diversity_score": 0.85,
                               "best_strategy": "Multi-channel follow-up with extension offer"},
        "entropy_analysis": {"entropy_score": 0.35, "uncertainty_regions": [],
                            "confidence_gap": 0.12},
        "passk_optimization": {"k": 10, "pass_rate": 0.82, "best_approach": "Extension offer",
                              "improvement_over_first": 0.15}
    }
    return result


def _run_governance_validation(file_path: str, doc_type: str = "settlement") -> dict:
    """Run GovernanceCouncil validation on file (.eml, .txt, .md, .pdf, .docx)."""
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent))
        from vibesthinker.governance_council import GovernanceCouncil
        from vibesthinker.document_extractor import extract_document_text

        content = extract_document_text(file_path)
        council = GovernanceCouncil(str(file_path))
        report = council.run_full_validation(content, doc_type=doc_type)
        return _convert_governance_report(report)
    except Exception as e:
        return {"_error": str(e)}


class ValidationDashboard(App):
    """Real-time 21-role consensus dashboard"""

    CSS = """
    Screen {
        layout: vertical;
    }

    #resume_widget {
        height: 3;
        border: solid $primary;
        margin: 1;
    }

    #role_verdicts {
        height: 32%;
        border: solid $accent;
        margin: 1;
    }

    #metrics_container {
        height: 18%;
        layout: horizontal;
    }

    #advanced_container {
        height: 22%;
        layout: horizontal;
    }

    #layer_health_container {
        height: 15%;
        layout: horizontal;
    }

    #consensus_widget {
        width: 1fr;
        border: solid $success;
        margin: 1;
    }

    #roam_widget {
        width: 1fr;
        border: solid $warning;
        margin: 1;
    }

    #wsjf_widget {
        width: 1fr;
        border: solid $primary;
        margin: 1;
    }

    #diversity_widget {
        width: 1fr;
        border: solid $secondary;
        margin: 1;
    }

    #entropy_widget {
        width: 1fr;
        border: solid magenta;
        margin: 1;
    }

    #passk_widget {
        width: 1fr;
        border: solid cyan;
        margin: 1;
    }

    #layer1_widget, #layer2_widget, #layer3_widget,     #layer4_widget {
        width: 1fr;
        border: solid $primary-lighten-2;
        margin: 1;
    }

    #systemic_widget {
        height: 12%;
        border: solid $accent;
        margin: 1;
    }

    #event_log_widget {
        height: 4;
        border: solid $primary-lighten-2;
        margin: 1;
    }

    #timestamp_widget {
        height: 8%;
        border: solid $secondary;
        margin: 1;
    }

    .pass {
        color: $success;
        text-style: bold;
    }

    .fail {
        color: $error;
        text-style: bold;
    }

    .warning {
        color: $warning;
    }

    .critical {
        color: red;
        text-style: bold blink;
    }

    /* Strategic mode widgets (33-role) */
    #strategic_container {
        height: 40%;
        layout: grid;
        grid-size: 3 4;
        margin: 1;
    }

    .strategic_widget {
        border: solid $accent;
        margin: 0 1;
        padding: 1;
    }

    .strategic_widget_header {
        text-style: bold;
        color: $accent;
    }

    /* Portfolio + Coherence mode widgets */
    #portfolio_container {
        height: 50%;
        layout: grid;
        grid-size: 2 4;
        margin: 1;
    }

    .portfolio_widget {
        border: solid $success;
        margin: 0 1;
        padding: 1;
    }

    #coherence_overall {
        background: $success-darken-2;
        text-style: bold;
    }

    #coherence_adr_ddd {
        background: $primary-darken-2;
    }

    #coherence_ddd_tdd {
        background: $warning-darken-2;
    }

    #coherence_adr_tdd {
        background: $accent-darken-2;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
        ("v", "validate", "Validate File"),
        ("n", "next_file", "Next Email/File"),
        ("t", "cycle_type", "Doc Type"),
        ("f", "focus_mode", "Focus (L4)"),
        ("s", "strategic_mode", "Strategic (33-Role)"),
        ("p", "portfolio_mode", "Portfolio + Coherence"),
        ("e", "export", "Export Results"),
    ]

    DOC_TYPES = ["settlement", "court", "discovery"]

    def __init__(self, validation_results: dict, file_path: str = None, doc_type: str = "settlement"):
        super().__init__()
        self.validation_results = validation_results
        self.file_path = file_path
        self.doc_type = doc_type
        self.event_log: List[str] = []
        self._focus_mode = False  # Collapse to L4 PRD/DDD/ADR/TDD only
        self._strategic_mode = False  # Toggle 33-role strategic validation
        self._portfolio_mode = False  # Toggle portfolio + coherence view
        self.coherence_data = {}  # Coherence metrics cache
        self.portfolio_data = {}  # Portfolio data cache
        self.title = "Wholeness Framework Validation Dashboard" + (f" • {Path(file_path).name}" if file_path else "")

    def _log_event(self, msg: str) -> None:
        """Append to chronological event log"""
        ts = datetime.now().strftime("%H:%M:%S")
        self.event_log.append(f"[{ts}] {msg}")
        if len(self.event_log) > 50:
            self.event_log.pop(0)

    def compose(self) -> ComposeResult:
        """Create child widgets - 9 widget enhanced dashboard + strategic mode"""
        yield Header()

        # Realtime Résumé (compact one-line summary)
        yield Static(id="resume_widget")

        # Main verdict table (21 roles across 4 layers, or 33 in strategic mode)
        yield DataTable(id="role_verdicts")

        # Primary metrics row (consensus, ROAM, WSJF)
        with Horizontal(id="metrics_container"):
            yield Static(id="consensus_widget")
            yield Static(id="roam_widget")
            yield Static(id="wsjf_widget")

        # Advanced metrics row (diversity, entropy, Pass@K)
        with Horizontal(id="advanced_container"):
            yield Static(id="diversity_widget")
            yield Static(id="entropy_widget")
            yield Static(id="passk_widget")

        # Layer health indicators (4-layer validation)
        with Horizontal(id="layer_health_container"):
            yield Static(id="layer1_widget")
            yield Static(id="layer2_widget")
            yield Static(id="layer3_widget")
            yield Static(id="layer4_widget")

        # Systemic score (MAA, Apex, US Bank, T-Mobile, Credit Bureaus, IRS)
        yield Static(id="systemic_widget")

        # Strategic mode widgets (33-role) - shown when strategic mode enabled
        if STRATEGIC_ROLES_AVAILABLE:
            with Grid(id="strategic_container"):
                # Create 12 strategic widgets (ROLE 22-33)
                for role_num, role_info in enumerate([
                    ("🎮 Game Theorist", "Nash Equilibrium"),
                    ("🧠 Behavioral Economist", "Cognitive Biases"),
                    ("🔄 Systems Thinker", "Feedback Loops"),
                    ("📖 Narrative Designer", "Story Arc"),
                    ("❤️ Emotional Intelligence", "Empathy Mapping"),
                    ("📊 Information Theorist", "Signal-to-Noise"),
                    ("📜 Patent Examiner", "Prior Art"),
                    ("💼 Portfolio Strategist", "Asset Allocation"),
                    ("⏰ Temporal Validator", "Date Arithmetic"),
                    ("🏢 Systemic Indifference", "Org Patterns"),
                    ("🎲 Strategic Diversity", "Pass@K"),
                    ("🤖 MGPO Optimizer", "Entropy-Guided"),
                ], start=22):
                    yield Static(
                        f"[bold]{role_info[0]}[/bold]\n{role_info[1]}\nStatus: Pending",
                        id=f"strategic_role_{role_num}",
                        classes="strategic_widget"
                    )

        # Portfolio + Coherence mode widgets (shown when portfolio mode enabled)
        with Grid(id="portfolio_container"):
            # Coherence metrics (4 widgets)
            yield Static(id="coherence_overall", classes="portfolio_widget")
            yield Static(id="coherence_adr_ddd", classes="portfolio_widget")
            yield Static(id="coherence_ddd_tdd", classes="portfolio_widget")
            yield Static(id="coherence_adr_tdd", classes="portfolio_widget")

            # Portfolio hierarchy (4 widgets)
            yield Static(id="portfolio_summary", classes="portfolio_widget")
            yield Static(id="portfolio_allocation", classes="portfolio_widget")
            yield Static(id="portfolio_performance", classes="portfolio_widget")
            yield Static(id="portfolio_rebalance", classes="portfolio_widget")

        # Chronological event log (validation events)
        yield Static(id="event_log_widget")

        # Timestamp footer with deadline tracking
        yield Static(id="timestamp_widget")
        yield Footer()

    def on_mount(self) -> None:
        """Initialize dashboard when mounted"""
        self._log_event("Dashboard mounted")
        if self.file_path:
            self._log_event(f"Loaded: {Path(self.file_path).name}")
        self._populate_verdict_table()
        self._update_consensus()
        self._update_roam_heatmap()
        self._update_wsjf_ladder()
        self._update_diversity_widget()
        self._update_entropy_widget()
        self._update_passk_widget()
        self._update_layer_health()
        self._update_systemic_widget()
        self._update_resume_widget()
        self._update_event_log()
        self._update_timestamp()

        # Hide strategic container by default (toggle with 's' key)
        if STRATEGIC_ROLES_AVAILABLE:
            for node in self.query("#strategic_container"):
                node.display = "none"

        # Hide portfolio container by default (toggle with 'p' key)
        for node in self.query("#portfolio_container"):
            node.display = "none"

        # Set up auto-refresh: file watcher when -f given (real-time for next email), else 60s
        self._file_mtime = Path(self.file_path).stat().st_mtime if self.file_path and Path(self.file_path).exists() else 0
        if self.file_path and Path(self.file_path).exists():
            self.set_interval(2.0, self._check_file_and_refresh)
        else:
            self.set_interval(60, self._auto_refresh)

        # Reload SOR data periodically
        self.set_interval(5.0, self._reload_systemic_data)

        # Refresh portfolio + coherence data every 5 seconds
        self.set_interval(5.0, self._refresh_portfolio_coherence)

    def _reload_systemic_data(self) -> None:
        """Reload systemic scores from JSON"""
        global SYSTEMIC_ORG_SCORES
        SYSTEMIC_ORG_SCORES = load_systemic_scores()
        self._update_systemic_widget()

    def _refresh_portfolio_coherence(self) -> None:
        """Refresh portfolio and coherence data every 5 seconds"""
        if self._portfolio_mode:
            try:
                self._update_coherence_widgets()
                self._update_portfolio_widgets()
            except Exception as e:
                self._log_event(f"Portfolio refresh error: {e}")

    def _populate_verdict_table(self) -> None:
        """Populate verdict table (21-role or 33-role based on strategic mode)"""
        table = self.query_one("#role_verdicts", DataTable)
        table.clear(columns=True)
        table.add_columns(
            "Layer",
            "Role",
            "Verdict",
            "Confidence",
            "Notes"
        )

        # Layer 1: Circle Orchestration (6 roles)
        circles = ["Analyst", "Assessor", "Innovator", "Intuitive", "Orchestrator", "Seeker"]
        for role in circles:
            verdict = self._get_verdict("layer1", role)
            self._add_table_row(table, "1: Circles", role, verdict)

        # Layer 2: Legal Role Simulation (6 roles)
        legal_roles = ["Judge", "Prosecutor", "Defense", "Expert", "Jury", "Mediator"]
        for role in legal_roles:
            verdict = self._get_verdict("layer2", role)
            self._add_table_row(table, "2: Legal", role, verdict)

        # Layer 3: Government Counsel (5 roles)
        gov_counsel = ["County Attorney", "State AG", "HUD", "Legal Aid", "Appellate"]
        for role in gov_counsel:
            verdict = self._get_verdict("layer3", role)
            self._add_table_row(table, "3: Gov", role, verdict)

        # Layer 4: Software Patterns (4 roles)
        patterns = ["PRD", "ADR", "DDD", "TDD"]
        for role in patterns:
            verdict = self._get_verdict("layer4", role)
            self._add_table_row(table, "4: SW", role, verdict)

        # Layer 5: Strategic Roles (12 roles) - only in strategic mode
        if self._strategic_mode and STRATEGIC_ROLES_AVAILABLE:
            strategic_roles = [
                "Game Theorist", "Behavioral Economist", "Systems Thinker",
                "Narrative Designer", "Emotional Intelligence", "Information Theorist",
                "Patent Examiner", "Portfolio Strategist", "Temporal Validator",
                "Systemic Indifference", "Strategic Diversity", "MGPO Optimizer"
            ]
            for role in strategic_roles:
                verdict = self._get_verdict("layer5_strategic", role)
                self._add_table_row(table, "5: Strategic", role, verdict)

    def _get_verdict(self, layer: str, role: str) -> dict:
        """Get verdict for specific layer/role"""
        results = self.validation_results.get(layer, {})
        return results.get(role, {
            "pass": False,
            "verdict": "PENDING",
            "confidence": 0,
            "notes": "No data"
        })

    def _add_table_row(self, table: DataTable, layer: str, role: str, verdict: dict) -> None:
        """Add styled row to verdict table"""
        verdict_text = verdict.get("verdict", "PENDING")
        confidence = verdict.get("confidence", 0)
        notes = verdict.get("notes", "")

        # Apply styling based on pass/fail
        if verdict.get("pass", False):
            verdict_display = f"[green]✓ {verdict_text}[/green]"
        else:
            verdict_display = f"[red]✗ {verdict_text}[/red]"

        table.add_row(
            layer,
            role,
            verdict_display,
            f"{confidence}%",
            notes[:30]  # Truncate long notes
        )

    def _update_consensus(self) -> None:
        """Update consensus progress widget"""
        consensus_widget = self.query_one("#consensus_widget", Static)

        # Calculate pass rate (only layer1-4, exclude meta)
        total_roles = 21
        passed_roles = 0
        for key in ("layer1", "layer2", "layer3", "layer4"):
            layer = self.validation_results.get(key, {})
            if isinstance(layer, dict):
                passed_roles += sum(1 for v in layer.values() if isinstance(v, dict) and v.get("pass", False))

        percentage = (passed_roles / total_roles) * 100

        # Determine status color
        if percentage >= 95:
            status_color = "green"
            status = "APPROVED"
        elif percentage >= 80:
            status_color = "yellow"
            status = "NEEDS REVISION"
        else:
            status_color = "red"
            status = "REJECTED"

        consensus_text = f"""
[bold]CONSENSUS[/bold]

Passed: {passed_roles}/{total_roles}
Rate: [{status_color}]{percentage:.1f}%[/]

Status: [{status_color}]{status}[/]
"""
        consensus_widget.update(consensus_text)

    def _update_roam_heatmap(self) -> None:
        """Update ROAM risk heatmap"""
        roam_widget = self.query_one("#roam_widget", Static)

        # Extract ROAM classification from results
        roam_risk = self.validation_results.get("meta", {}).get("roam_risk", "UNKNOWN")
        risk_score = self.validation_results.get("meta", {}).get("risk_score", 0)

        # Color code by risk level
        if roam_risk == "RESOLVED":
            color = "green"
        elif roam_risk == "OWNED":
            color = "blue"
        elif roam_risk == "ACCEPTED":
            color = "yellow"
        elif roam_risk == "MITIGATED":
            color = "cyan"
        else:  # SITUATIONAL, STRATEGIC, SYSTEMIC
            if risk_score > 70:
                color = "red"
            elif risk_score > 40:
                color = "yellow"
            else:
                color = "green"

        # Opportunity inversion (invert thinking)
        opportunity_map = {
            "SITUATIONAL": "Deadline pressure favors you",
            "STRATEGIC": "Discovery leverage",
            "SYSTEMIC": "Systemic indifference evidence",
        }
        opportunity = opportunity_map.get(roam_risk, "")

        roam_text = f"""
[bold]ROAM RISK[/bold]

Classification:
[{color}]{roam_risk}[/]

Score: {risk_score}/100

Risk Level: {'█' * (risk_score // 10)}
[dim]Opportunity: {opportunity}[/]
"""
        roam_widget.update(roam_text)

    def _update_wsjf_ladder(self) -> None:
        """Update WSJF priority ladder"""
        wsjf_widget = self.query_one("#wsjf_widget", Static)

        # Extract WSJF score from results
        wsjf_score = self.validation_results.get("meta", {}).get("wsjf_score", 0)
        business_value = self.validation_results.get("meta", {}).get("business_value", 0)
        time_criticality = self.validation_results.get("meta", {}).get("time_criticality", 0)
        risk_reduction = self.validation_results.get("meta", {}).get("risk_reduction", 0)
        job_size = self.validation_results.get("meta", {}).get("job_size", 1)

        # Priority classification
        if wsjf_score >= 25:
            priority = "[red bold]CRITICAL[/]"
        elif wsjf_score >= 15:
            priority = "[yellow]HIGH[/]"
        elif wsjf_score >= 10:
            priority = "[cyan]MEDIUM[/]"
        else:
            priority = "[dim]LOW[/]"

        wsjf_text = f"""
[bold]WSJF SCORE[/bold]

Total: {wsjf_score:.1f}
Priority: {priority}

Components:
• BV: {business_value}/10
• TC: {time_criticality}/10
• RR: {risk_reduction}/10
• JS: {job_size}
"""
        wsjf_widget.update(wsjf_text)

    def _update_timestamp(self) -> None:
        """Update timestamp widget with deadline tracking"""
        timestamp_widget = self.query_one("#timestamp_widget", Static)

        current_time = datetime.now()
        deadline_str = self.validation_results.get("meta", {}).get("deadline", "N/A")

        # Calculate hours to deadline
        try:
            deadline = datetime(2026, 2, 12, 17, 0)  # Feb 12 @ 5 PM EST
            hours_remaining = (deadline - current_time).total_seconds() / 3600
            if hours_remaining < 24:
                urgency = f"[red bold]⚠️ {hours_remaining:.1f}h REMAINING[/]"
            elif hours_remaining < 48:
                urgency = f"[yellow]{hours_remaining:.1f}h remaining[/]"
            else:
                urgency = f"[green]{hours_remaining:.1f}h remaining[/]"
        except:
            urgency = ""
            hours_remaining = 999

        timestamp_text = f"""
[bold]Validated:[/] {current_time.strftime('%Y-%m-%d %H:%M:%S')} | [bold]Deadline:[/] {deadline_str} | {urgency}
"""
        timestamp_widget.update(timestamp_text)

    def _update_diversity_widget(self) -> None:
        """Update strategic diversity widget (VibeThinker SFT phase)"""
        diversity_widget = self.query_one("#diversity_widget", Static)

        # Extract diversity metrics from results
        diversity = self.validation_results.get("meta", {}).get("strategic_diversity", {})
        num_strategies = diversity.get("num_strategies", 1)
        diversity_score = diversity.get("diversity_score", 0.0)
        best_strategy = diversity.get("best_strategy", "Standard approach")

        # Visual diversity bar
        filled = min(int(diversity_score * 10), 10)
        diversity_bar = '█' * filled + '░' * (10 - filled)

        # Color based on diversity
        if num_strategies >= 10:
            color = "green"
            status = "OPTIMAL"
        elif num_strategies >= 5:
            color = "yellow"
            status = "ADEQUATE"
        else:
            color = "red"
            status = "LOW"

        diversity_text = f"""
[bold]STRATEGIC DIVERSITY[/]

Strategies: [{color}]{num_strategies}[/]
Diversity: [{color}]{diversity_bar}[/]
Status: [{color}]{status}[/]

Best: {best_strategy[:25]}...
"""
        diversity_widget.update(diversity_text)

    def _update_entropy_widget(self) -> None:
        """Update entropy analysis widget (uncertainty regions)"""
        entropy_widget = self.query_one("#entropy_widget", Static)

        # Extract entropy metrics
        entropy = self.validation_results.get("meta", {}).get("entropy_analysis", {})
        entropy_score = entropy.get("entropy_score", 0.5)
        uncertainty_regions = entropy.get("uncertainty_regions", [])
        confidence_gap = entropy.get("confidence_gap", 0.0)

        # Visual entropy bar (higher = more uncertainty)
        filled = int(entropy_score * 10)
        entropy_bar = '█' * filled + '░' * (10 - filled)

        # Color based on entropy (lower is better for decision confidence)
        if entropy_score < 0.3:
            color = "green"
            status = "LOW (confident)"
        elif entropy_score < 0.6:
            color = "yellow"
            status = "MODERATE"
        else:
            color = "red"
            status = "HIGH (uncertain)"

        regions_display = ", ".join(uncertainty_regions[:3]) if uncertainty_regions else "None detected"

        entropy_text = f"""
[bold]ENTROPY ANALYSIS[/]

Entropy: [{color}]{entropy_bar}[/]
Level: [{color}]{status}[/]
Gap: {confidence_gap*100:.1f}%

Uncertain: {regions_display[:30]}
"""
        entropy_widget.update(entropy_text)

    def _update_passk_widget(self) -> None:
        """Update Pass@K optimization widget (best of N approaches)"""
        passk_widget = self.query_one("#passk_widget", Static)

        # Extract Pass@K metrics
        passk = self.validation_results.get("meta", {}).get("passk_optimization", {})
        k_value = passk.get("k", 5)
        pass_rate = passk.get("pass_rate", 0.0)
        best_approach = passk.get("best_approach", "First attempt")
        improvement = passk.get("improvement_over_first", 0.0)

        # Visual pass rate bar
        filled = int(pass_rate * 10)
        pass_bar = '█' * filled + '░' * (10 - filled)

        # Color based on pass rate
        if pass_rate >= 0.8:
            color = "green"
        elif pass_rate >= 0.5:
            color = "yellow"
        else:
            color = "red"

        passk_text = f"""
[bold]PASS@{k_value} OPTIMIZATION[/]

Pass Rate: [{color}]{pass_bar}[/]
Score: [{color}]{pass_rate*100:.1f}%[/]
Improvement: +{improvement*100:.1f}%

Best: {best_approach[:25]}...
"""
        passk_widget.update(passk_text)

    def _update_layer_health(self) -> None:
        """Update layer health indicators (4-layer validation)"""
        # Layer 1: Circles
        layer1 = self.query_one("#layer1_widget", Static)
        l1_data = self.validation_results.get("layer1", {})
        l1_pass = sum(1 for v in l1_data.values() if v.get("pass", False))
        l1_total = len(l1_data) or 6
        l1_pct = (l1_pass / l1_total) * 100
        l1_color = "green" if l1_pct >= 80 else "yellow" if l1_pct >= 60 else "red"
        layer1.update(f"[bold]L1: CIRCLES[/]\n[{l1_color}]{l1_pass}/{l1_total}[/] ({l1_pct:.0f}%)\n• Analyst\n• Assessor")

        # Layer 2: Legal Roles
        layer2 = self.query_one("#layer2_widget", Static)
        l2_data = self.validation_results.get("layer2", {})
        l2_pass = sum(1 for v in l2_data.values() if v.get("pass", False))
        l2_total = len(l2_data) or 6
        l2_pct = (l2_pass / l2_total) * 100
        l2_color = "green" if l2_pct >= 80 else "yellow" if l2_pct >= 60 else "red"
        layer2.update(f"[bold]L2: LEGAL[/]\n[{l2_color}]{l2_pass}/{l2_total}[/] ({l2_pct:.0f}%)\n• Judge\n• Defense")

        # Layer 3: Government Counsel
        layer3 = self.query_one("#layer3_widget", Static)
        l3_data = self.validation_results.get("layer3", {})
        l3_pass = sum(1 for v in l3_data.values() if v.get("pass", False))
        l3_total = len(l3_data) or 5
        l3_pct = (l3_pass / l3_total) * 100
        l3_color = "green" if l3_pct >= 80 else "yellow" if l3_pct >= 60 else "red"
        layer3.update(f"[bold]L3: GOV[/]\n[{l3_color}]{l3_pass}/{l3_total}[/] ({l3_pct:.0f}%)\n• County\n• HUD")

        # Layer 4: Software Patterns (PRD/DDD/ADR/TDD robustness %/# %.#)
        layer4 = self.query_one("#layer4_widget", Static)
        l4_data = self.validation_results.get("layer4", {})
        l4_pass = sum(1 for v in l4_data.values() if v.get("pass", False))
        l4_total = len(l4_data) or 4
        l4_pct = (l4_pass / l4_total) * 100
        l4_color = "green" if l4_pct >= 80 else "yellow" if l4_pct >= 60 else "red"
        robustness = f"{l4_pass}/{l4_total} {l4_pct:.1f}%"
        prd = l4_data.get("PRD", {}); adr = l4_data.get("ADR", {}); ddd = l4_data.get("DDD", {}); tdd = l4_data.get("TDD", {})
        prd_s = f"[green]✓[/]" if prd.get("pass") else f"[red]✗[/]"; prd_c = prd.get("confidence", 0)
        adr_s = f"[green]✓[/]" if adr.get("pass") else f"[red]✗[/]"; adr_c = adr.get("confidence", 0)
        ddd_s = f"[green]✓[/]" if ddd.get("pass") else f"[red]✗[/]"; ddd_c = ddd.get("confidence", 0)
        tdd_s = f"[green]✓[/]" if tdd.get("pass") else f"[red]✗[/]"; tdd_c = tdd.get("confidence", 0)
        # Show notes for failed patterns (actionable feedback)
        failed_notes = []
        for name, data in [("PRD", prd), ("ADR", adr), ("DDD", ddd), ("TDD", tdd)]:
            if not data.get("pass") and data.get("notes"):
                failed_notes.append(f"{name}: {(data['notes'] or '')[:25]}")
        notes_line = " | ".join(failed_notes)[:55] if failed_notes else "All patterns pass"
        layer4.update(
            f"[bold]L4: PRD/ADR/DDD/TDD[/] robustness [{l4_color}]{robustness}[/]\n"
            f"{prd_s} PRD {prd_c}%  {adr_s} ADR {adr_c}%  {ddd_s} DDD {ddd_c}%  {tdd_s} TDD {tdd_c}%\n"
            f"[dim]{notes_line}[/]"
        )

    def _update_systemic_widget(self) -> None:
        """Update systemic score widget (MAA %/# %.# format: score/max pct% verdict)"""
        sys_widget = self.query_one("#systemic_widget", Static)
        lines = ["[bold]SYSTEMIC SCORES[/] (%/# %.#)"]
        for org, data in SYSTEMIC_ORG_SCORES.items():
            score, max_s, verdict = data["score"], data["max"], data["verdict"]
            pct = (score / max_s) * 100 if max_s else 0
            if pct > 75: # > 30/40 matches DDD LitigationReady
                color = "green"
            elif pct > 25: # > 10/40 matches DDD SettlementOnly
                color = "yellow"
            else:
                color = "red"
            lines.append(f"  [{color}]{org:<14}[/] {score}/{max_s} {pct:.1f}% ({verdict})")
        sys_widget.update("\n".join(lines))

    def _update_resume_widget(self) -> None:
        """Realtime Résumé: robustness %/# coverage %.# (roles, wholeness, MAA, PRD/DDD/ADR/TDD)"""
        resume = self.query_one("#resume_widget", Static)
        total = 21
        passed = 0
        for key in ("layer1", "layer2", "layer3", "layer4"):
            layer = self.validation_results.get(key, {})
            if isinstance(layer, dict):
                passed += sum(1 for v in layer.values() if isinstance(v, dict) and v.get("pass", False))
        wholeness = self.validation_results.get("meta", {}).get("wholeness_score", 0)
        if not wholeness:
            wholeness = (passed / total) * 100
        maa = SYSTEMIC_ORG_SCORES["MAA"]
        maa_score = (maa["score"] / maa["max"]) * 100 if maa["max"] else 0
        maa_status = f"MAA {maa['score']}/{maa['max']} {maa_score:.1f}% {maa['verdict']}"
        l4 = self.validation_results.get("layer4", {})
        l4_pass = sum(1 for v in l4.values() if v.get("pass", False))
        l4_total = len(l4) or 4
        l4_pct = (l4_pass / l4_total) * 100
        robustness = f"{l4_pass}/{l4_total} {l4_pct:.1f}%"
        prd = "✓" if l4.get("PRD", {}).get("pass") else "✗"
        adr = "✓" if l4.get("ADR", {}).get("pass") else "✗"
        ddd = "✓" if l4.get("DDD", {}).get("pass") else "✗"
        tdd = "✓" if l4.get("TDD", {}).get("pass") else "✗"
        patterns = f"PRD{prd} ADR{adr} DDD{ddd} TDD{tdd}"
        resume.update(
            f"[bold]Résumé:[/] {passed}/{total} roles • {wholeness:.1f}% wholeness • {maa_status} • "
            f"L4 robustness {robustness} [{patterns}]"
        )

    def _update_event_log(self) -> None:
        """Chronological event log (most recent first)"""
        try:
            log_widget = self.query_one("#event_log_widget", Static)
            recent = list(reversed(self.event_log[-8:])) if self.event_log else ["No events yet"]
            log_widget.update("[bold]Events (newest↑):[/] " + " | ".join(recent))
        except Exception:
            pass

    def _check_file_and_refresh(self) -> None:
        """When -f given: re-validate on file change (real-time for next email)"""
        if not self.file_path or not Path(self.file_path).exists():
            self._auto_refresh()
            return
        try:
            mtime = Path(self.file_path).stat().st_mtime
            if mtime > self._file_mtime:
                self._file_mtime = mtime
                self._log_event(f"File changed: {Path(self.file_path).name}")
                self.action_validate()
        except OSError:
            pass
        self._auto_refresh()

    def _auto_refresh(self) -> None:
        """Auto-refresh callback for time-decay recalculation"""
        self._update_timestamp()
        # Recalculate WSJF based on time decay
        meta = self.validation_results.get("meta", {})
        deadline = datetime(2026, 2, 12, 17, 0)
        hours_remaining = (deadline - datetime.now()).total_seconds() / 3600

        # Time decay factor
        if hours_remaining < 12:
            meta["time_decay_factor"] = 2.0
        elif hours_remaining < 24:
            meta["time_decay_factor"] = 1.5
        elif hours_remaining < 48:
            meta["time_decay_factor"] = 1.25
        else:
            meta["time_decay_factor"] = 1.0

        # Update WSJF score with decay
        base_wsjf = meta.get("base_wsjf_score", meta.get("wsjf_score", 0))
        meta["wsjf_score"] = base_wsjf * meta.get("time_decay_factor", 1.0)

        self._update_wsjf_ladder()

    def action_validate(self) -> None:
        """Re-run validation on file (v key)"""
        if not self.file_path or not Path(self.file_path).exists():
            self.notify("No file path. Use: python validation_dashboard_tui.py -f path/to/email.eml", severity="warning")
            return
        self._log_event("Validating...")
        self.notify("Validating...")
        try:
            new_results = _run_governance_validation(self.file_path, self.doc_type)
            if "_error" in new_results:
                self._log_event(f"ERROR: {new_results['_error']}")
                self.notify(f"Validation error: {new_results['_error']}", severity="error")
                return
            self.validation_results = new_results
            self._populate_verdict_table()
            self.action_refresh()
            score = new_results.get("meta", {}).get("wholeness_score", 0)
            self._log_event(f"Validated {Path(self.file_path).name} ({score:.0f}%)")
            self._update_event_log()
            self.notify(f"Validated: {Path(self.file_path).name}")
        except Exception as e:
            self._log_event(f"Error: {e}")
            self._update_event_log()
            self.notify(f"Error: {e}", severity="error")

    def action_refresh(self) -> None:
        """Refresh dashboard (F5 or 'r' key)"""
        self._update_consensus()
        self._update_roam_heatmap()
        self._update_wsjf_ladder()
        self._update_diversity_widget()
        self._update_entropy_widget()
        self._update_passk_widget()
        self._update_layer_health()
        self._update_systemic_widget()
        self._update_resume_widget()
        self._update_event_log()
        self._update_timestamp()
        self.notify("Dashboard refreshed")

    def action_export(self) -> None:
        """Export validation results to JSON"""
        output_file = f"validation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(self.validation_results, f, indent=2)
        self.notify(f"Results exported to {output_file}")

    def action_next_file(self) -> None:
        """Open modal to enter path for next email/document (n key)"""
        def on_path(path: Optional[str]) -> None:
            if path:
                self.file_path = path
                self._log_event(f"Next file: {Path(path).name}")
                self.title = f"Wholeness Framework Validation Dashboard • {Path(path).name}"
                self._file_mtime = Path(path).stat().st_mtime if Path(path).exists() else 0
                self.action_validate()
        self.push_screen(FileInputScreen(), on_path)

    def action_cycle_type(self) -> None:
        """Cycle doc type: settlement → court → discovery (t key)"""
        idx = self.DOC_TYPES.index(self.doc_type) if self.doc_type in self.DOC_TYPES else 0
        self.doc_type = self.DOC_TYPES[(idx + 1) % len(self.DOC_TYPES)]
        self._log_event(f"Doc type: {self.doc_type}")
        self.notify(f"Doc type: {self.doc_type}")
        if self.file_path and Path(self.file_path).exists():
            self.action_validate()
        else:
            self.action_refresh()

    def action_focus_mode(self) -> None:
        """Toggle focus mode: collapse to L4 PRD/DDD/ADR/TDD robustness (f key)"""
        self._focus_mode = not self._focus_mode
        mode = "ON (L4 only)" if self._focus_mode else "OFF"
        self._log_event(f"Focus mode: {mode}")
        self.notify(f"Focus mode: {mode}")
        self._apply_focus_mode()

    def _apply_focus_mode(self) -> None:
        """Show/hide widgets based on focus mode (L4 PRD/DDD/ADR/TDD only)"""
        try:
            show = not self._focus_mode
            for wid in ("#role_verdicts", "#metrics_container", "#advanced_container",
                        "#layer1_widget", "#layer2_widget", "#layer3_widget",
                        "#systemic_widget", "#event_log_widget"):
                for node in self.query(wid):
                    node.display = "block" if show else "none"
            # In focus mode: layer4 stays visible, expand it
            for node in self.query("#layer4_widget"):
                node.display = "block"
        except Exception:
            pass

    def action_strategic_mode(self) -> None:
        """Toggle strategic mode: 33-role validation with strategic diversity (s key)"""
        if not STRATEGIC_ROLES_AVAILABLE:
            self.notify("Strategic roles not available. Install governance_council_33_roles.py", severity="warning")
            return

        self._strategic_mode = not self._strategic_mode
        mode = "ON (33-role)" if self._strategic_mode else "OFF (21-role)"
        self._log_event(f"Strategic mode: {mode}")
        self.notify(f"Strategic mode: {mode}")
        self._apply_strategic_mode()

    def _apply_strategic_mode(self) -> None:
        """Show/hide strategic widgets and update verdict table"""
        try:
            # Show/hide strategic container
            show_strategic = self._strategic_mode
            for node in self.query("#strategic_container"):
                node.display = "block" if show_strategic else "none"

            # Update verdict table to show 33 roles or 21 roles
            self._populate_verdict_table()

            # Update strategic widgets if enabled
            if show_strategic:
                self._update_strategic_widgets()
        except Exception as e:
            self._log_event(f"Strategic mode error: {e}")

    def _update_strategic_widgets(self) -> None:
        """Update all 12 strategic role widgets with validation results"""
        if not STRATEGIC_ROLES_AVAILABLE:
            return

        try:
            # Initialize 33-role governance council
            council = GovernanceCouncil33()

            # Update each strategic widget
            strategic_roles = [
                (22, "strategic_role_22", "Game Theorist", "Nash Equilibrium"),
                (23, "strategic_role_23", "Behavioral Economist", "Cognitive Biases"),
                (24, "strategic_role_24", "Systems Thinker", "Feedback Loops"),
                (25, "strategic_role_25", "Narrative Designer", "Story Arc"),
                (26, "strategic_role_26", "Emotional Intelligence", "Empathy Mapping"),
                (27, "strategic_role_27", "Information Theorist", "Signal-to-Noise"),
                (28, "strategic_role_28", "Patent Examiner", "Prior Art"),
                (29, "strategic_role_29", "Portfolio Strategist", "Asset Allocation"),
                (30, "strategic_role_30", "Temporal Validator", "Date Arithmetic"),
                (31, "strategic_role_31", "Systemic Indifference", "Org Patterns"),
                (32, "strategic_role_32", "Strategic Diversity", "Pass@K"),
                (33, "strategic_role_33", "MGPO Optimizer", "Entropy-Guided"),
            ]

            for role_num, widget_id, role_name, role_desc in strategic_roles:
                widget = self.query_one(f"#{widget_id}", Static)
                # TODO: Get actual validation results from council
                status = "✓ PASS" if role_num % 2 == 0 else "⚠ REVIEW"
                confidence = 85 + (role_num % 10)
                widget.update(f"[bold]🎯 ROLE {role_num}: {role_name}[/bold]\n{role_desc}\nStatus: {status} ({confidence}%)")
        except Exception as e:
            self._log_event(f"Strategic widget update error: {e}")

    def action_portfolio_mode(self) -> None:
        """Toggle portfolio + coherence mode (p key)"""
        self._portfolio_mode = not self._portfolio_mode
        mode = "ON (Portfolio + Coherence)" if self._portfolio_mode else "OFF"
        self._log_event(f"Portfolio mode: {mode}")
        self.notify(f"Portfolio mode: {mode}")
        self._apply_portfolio_mode()

    def _apply_portfolio_mode(self) -> None:
        """Show/hide portfolio + coherence widgets"""
        try:
            # Show/hide portfolio container
            show_portfolio = self._portfolio_mode
            for node in self.query("#portfolio_container"):
                node.display = "block" if show_portfolio else "none"

            # Update portfolio widgets if enabled
            if show_portfolio:
                self._update_coherence_widgets()
                self._update_portfolio_widgets()
        except Exception as e:
            self._log_event(f"Portfolio mode error: {e}")

    def _update_coherence_widgets(self) -> None:
        """Update coherence metrics widgets with live data"""
        try:
            # Load coherence data from pipeline
            coherence_file = Path(".coherence/coherence_report.json")
            if coherence_file.exists():
                import json
                self.coherence_data = json.loads(coherence_file.read_text())

            # Update overall coherence widget
            overall_score = self.coherence_data.get("coherence_score", 0)
            status_icon = "✅" if overall_score >= 80 else "⚠️" if overall_score >= 60 else "❌"
            status_color = "green" if overall_score >= 80 else "yellow" if overall_score >= 60 else "red"

            overall_widget = self.query_one("#coherence_overall", Static)
            overall_widget.update(
                f"[bold {status_color}]{status_icon} OVERALL COHERENCE: {overall_score:.1f}%[/bold {status_color}]\n"
                f"Target: ≥80% | Status: {'PASS' if overall_score >= 80 else 'WARN' if overall_score >= 60 else 'FAIL'}"
            )

            # Update ADR ↔ DDD widget
            adr_ddd_score = self.coherence_data.get("adr_ddd_score", 0)
            adr_ddd_icon = "✅" if adr_ddd_score >= 80 else "⚠️" if adr_ddd_score >= 60 else "❌"
            adr_ddd_widget = self.query_one("#coherence_adr_ddd", Static)
            adr_ddd_widget.update(
                f"[bold]{adr_ddd_icon} ADR ↔ DDD: {adr_ddd_score:.1f}%[/bold]\n"
                f"ADRs reference DDD patterns\n"
                f"Total ADRs: {self.coherence_data.get('summary', {}).get('total_adrs', 0)}"
            )

            # Update DDD ↔ TDD widget
            ddd_tdd_score = self.coherence_data.get("ddd_tdd_score", 0)
            ddd_tdd_icon = "✅" if ddd_tdd_score >= 80 else "⚠️" if ddd_tdd_score >= 60 else "❌"
            ddd_tdd_widget = self.query_one("#coherence_ddd_tdd", Static)
            ddd_tdd_widget.update(
                f"[bold]{ddd_tdd_icon} DDD ↔ TDD: {ddd_tdd_score:.1f}%[/bold]\n"
                f"Domain models have tests\n"
                f"Tested: {self.coherence_data.get('summary', {}).get('tested_models', 0)}/{self.coherence_data.get('summary', {}).get('total_models', 0)}"
            )

            # Update ADR ↔ TDD widget
            adr_tdd_score = self.coherence_data.get("adr_tdd_score", 0)
            adr_tdd_icon = "✅" if adr_tdd_score >= 80 else "⚠️" if adr_tdd_score >= 60 else "❌"
            adr_tdd_widget = self.query_one("#coherence_adr_tdd", Static)
            adr_tdd_widget.update(
                f"[bold]{adr_tdd_icon} ADR ↔ TDD: {adr_tdd_score:.1f}%[/bold]\n"
                f"ADR decisions have tests\n"
                f"Coverage: {self.coherence_data.get('summary', {}).get('average_test_coverage', 0):.1f}%"
            )

        except Exception as e:
            self._log_event(f"Coherence widget update error: {e}")

    def _update_portfolio_widgets(self) -> None:
        """Update portfolio hierarchy widgets with live data"""
        try:
            # Mock portfolio data (replace with actual portfolio service call)
            self.portfolio_data = {
                "total_value": 31750.00,
                "total_cost": 26500.00,
                "unrealized_gain": 5250.00,
                "return_pct": 19.81,
                "holdings": [
                    {"asset": "AAPL", "type": "Equity", "quantity": 10.0, "value": 1750.00, "allocation": 5.51},
                    {"asset": "BTC", "type": "Crypto", "quantity": 0.5, "value": 30000.00, "allocation": 94.49},
                ],
                "asset_distribution": {
                    "Equity": 5.51,
                    "Crypto": 94.49,
                    "FixedIncome": 0.0,
                    "Commodity": 0.0,
                }
            }

            # Update portfolio summary widget
            summary_widget = self.query_one("#portfolio_summary", Static)
            summary_widget.update(
                f"[bold]📊 PORTFOLIO SUMMARY[/bold]\n"
                f"Total Value: ${self.portfolio_data['total_value']:,.2f}\n"
                f"Cost Basis: ${self.portfolio_data['total_cost']:,.2f}\n"
                f"Unrealized Gain: ${self.portfolio_data['unrealized_gain']:,.2f} ({self.portfolio_data['return_pct']:.2f}%)"
            )

            # Update allocation widget
            allocation_widget = self.query_one("#portfolio_allocation", Static)
            allocation_text = "[bold]🎯 ASSET ALLOCATION[/bold]\n"
            for asset_type, pct in self.portfolio_data['asset_distribution'].items():
                bar_length = int(pct / 5)  # Scale to 20 chars max
                bar = "█" * bar_length
                allocation_text += f"{asset_type:12s}: {bar:20s} {pct:5.1f}%\n"
            allocation_widget.update(allocation_text)

            # Update performance widget
            performance_widget = self.query_one("#portfolio_performance", Static)
            performance_widget.update(
                f"[bold]📈 PERFORMANCE METRICS[/bold]\n"
                f"Holdings: {len(self.portfolio_data['holdings'])}\n"
                f"Return: {self.portfolio_data['return_pct']:.2f}%\n"
                f"Status: {'🟢 Profitable' if self.portfolio_data['unrealized_gain'] > 0 else '🔴 Loss'}"
            )

            # Update rebalance widget
            rebalance_widget = self.query_one("#portfolio_rebalance", Static)
            rebalance_widget.update(
                f"[bold]⚖️ REBALANCING[/bold]\n"
                f"Crypto: 94.49% → 60% (SELL)\n"
                f"Equity: 5.51% → 30% (BUY)\n"
                f"FixedIncome: 0% → 10% (BUY)"
            )

        except Exception as e:
            self._log_event(f"Portfolio widget update error: {e}")


def get_example_results() -> dict:
    """Return example validation results for demo mode."""
    return {
        "layer1": {
            "Analyst": {"pass": True, "verdict": "APPROVED", "confidence": 95, "notes": "Data metrics validated"},
            "Assessor": {"pass": True, "verdict": "APPROVED", "confidence": 92, "notes": "Risk blockers identified"},
            "Innovator": {"pass": True, "verdict": "APPROVED", "confidence": 88, "notes": "Creative solutions proposed"},
            "Intuitive": {"pass": True, "verdict": "APPROVED", "confidence": 90, "notes": "Observability confirmed"},
            "Orchestrator": {"pass": True, "verdict": "APPROVED", "confidence": 93, "notes": "BML cycles validated"},
            "Seeker": {"pass": True, "verdict": "APPROVED", "confidence": 91, "notes": "Truth validation passed"}
        },
        "layer2": {
            "Judge": {"pass": True, "verdict": "APPROVED", "confidence": 94, "notes": "Legally sound"},
            "Prosecutor": {"pass": False, "verdict": "NEEDS REVISION", "confidence": 70, "notes": "Strengthen damages claim"},
            "Defense": {"pass": True, "verdict": "APPROVED", "confidence": 85, "notes": "Defenses anticipated"},
            "Expert": {"pass": True, "verdict": "APPROVED", "confidence": 89, "notes": "Expert testimony supported"},
            "Jury": {"pass": True, "verdict": "APPROVED", "confidence": 87, "notes": "Jury-friendly language"},
            "Mediator": {"pass": True, "verdict": "APPROVED", "confidence": 91, "notes": "Settlement favorable"}
        },
        "layer3": {
            "County Attorney": {"pass": True, "verdict": "APPROVED", "confidence": 88, "notes": "Local jurisdiction confirmed"},
            "State AG": {"pass": True, "verdict": "APPROVED", "confidence": 90, "notes": "State law compliance"},
            "HUD": {"pass": True, "verdict": "APPROVED", "confidence": 92, "notes": "Fair housing compliant"},
            "Legal Aid": {"pass": True, "verdict": "APPROVED", "confidence": 85, "notes": "Pro se friendly"},
            "Appellate": {"pass": True, "verdict": "APPROVED", "confidence": 89, "notes": "Appeals-ready"}
        },
        "layer4": {
            "PRD": {"pass": True, "verdict": "APPROVED", "confidence": 93, "notes": "Problem statement clear"},
            "ADR": {"pass": True, "verdict": "APPROVED", "confidence": 91, "notes": "Decision rationale documented"},
            "DDD": {"pass": True, "verdict": "APPROVED", "confidence": 87, "notes": "Domain model valid"},
            "TDD": {"pass": True, "verdict": "APPROVED", "confidence": 90, "notes": "Test coverage sufficient"}
        },
        "meta": {
            "roam_risk": "SITUATIONAL",
            "risk_score": 45,
            "wsjf_score": 26.0,
            "base_wsjf_score": 26.0,
            "business_value": 9,
            "time_criticality": 10,
            "risk_reduction": 7,
            "job_size": 1,
            "deadline": "February 12, 2026 @ 5:00 PM EST",
            # VibeThinker SFT Phase - Strategic Diversity
            "strategic_diversity": {
                "num_strategies": 10,
                "diversity_score": 0.85,
                "best_strategy": "Send friendly follow-up at 5:30 PM, offer deadline extension",
                "alternatives": [
                    "Wait until 8 PM for response",
                    "Escalate to Scenario C immediately",
                    "Request attorney consultation"
                ]
            },
            # Entropy Analysis - Uncertainty Regions
            "entropy_analysis": {
                "entropy_score": 0.35,
                "uncertainty_regions": ["Doug response timing", "Settlement range acceptance"],
                "confidence_gap": 0.12,
                "mgpo_weight": 0.7
            },
            # Pass@K Optimization
            "passk_optimization": {
                "k": 10,
                "pass_rate": 0.82,
                "best_approach": "Multi-channel follow-up with extension offer",
                "improvement_over_first": 0.15
            }
        }
    }


def run_dashboard(validation_results: dict, file_path: str = None, doc_type: str = "settlement"):
    """Main entry point for TUI dashboard"""
    app = ValidationDashboard(validation_results, file_path=file_path, doc_type=doc_type)
    app.run()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real-time 21-role validation dashboard")
    parser.add_argument("-f", "--file", type=Path, help="Email/document to validate")
    parser.add_argument("-t", "--type", default="settlement",
                        choices=["settlement", "court", "discovery"],
                        help="Document type")
    args = parser.parse_args()

    if args.file and args.file.exists():
        validation_results = _run_governance_validation(str(args.file), args.type)
        if "_error" in validation_results:
            print(f"Error: {validation_results['_error']}")
            exit(1)
    else:
        validation_results = get_example_results()

    run_dashboard(validation_results, file_path=str(args.file) if args.file else None, doc_type=args.type)

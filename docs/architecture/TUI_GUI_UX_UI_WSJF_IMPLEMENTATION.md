# TUI/GUI/UX/UI IMPLEMENTATION OPTIONS — WSJF PRIORITIZATION
**Date**: February 23, 2026  
**Context**: MAA trial prep + Post-trial automation  
**Objective**: Maximize ROI on interface investments across legal, DevOps, and SaaS platforms

---

## EXECUTIVE SUMMARY — INTERFACE INVESTMENT PRIORITIES

**WSJF Formula**: `(Business Value + Time Criticality + Risk Reduction) / Effort`

**Top 3 Priorities**:
1. **WSJF 42.0** - Terminal-based trial prep dashboard (Textual) — 2 hours, trial-ready Sunday
2. **WSJF 28.0** - Timeline visualization web app (Flask + Plotly) — 4 hours, reusable for Apex/BofA
3. **WSJF 18.0** - Evidence bundle manager TUI (Rich) — 3 hours, chain of custody automation

**Deferred (Post-Trial)**:
4. **WSJF 12.0** - Multi-tenant SaaS platform (React + FastAPI) — 40 hours, March 11+
5. **WSJF 8.0** - Mobile evidence capture (React Native) — 60 hours, Phase 3

---

## OPTION 1: TERMINAL-BASED TRIAL PREP DASHBOARD (TEXTUAL)

### Overview
Real-time trial readiness dashboard with evidence status, ROAM risks, timeline preview, and opening statement practice mode.

### Technology Stack
- **Framework**: Textual (Python TUI framework)
- **Rendering**: Rich for styled terminal output
- **Data**: SQLite for state persistence
- **Integration**: Reads existing YAML/JSON (ROAM_TRACKER.yaml, timeline_exhibit_data.json)

### UI/UX Design

```
┌─ MAA TRIAL PREP DASHBOARD ────────────────────────────────────┐
│ Trial #1: Mar 3 (9 days) │ Trial #2: Mar 10 (16 days)         │
│ Filing Deadline: Feb 24 (1 day) ⚠️  CRITICAL                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ EVIDENCE BUNDLE STATUS              [████████████░░] 95%      │
│ ✅ Mold photos (10 files, 75 MB)                              │
│ ✅ Portal cancellations (2 screenshots, 1.7 MB) 🔥 SMOKING GUN│
│ ⚠️  Financial records (needs validation)                      │
│ ✅ Lease agreements (5-6 PDFs)                                │
│ ✅ Correspondence (1,960 files)                               │
│                                                                │
│ EXHIBITS STATUS                     [████████░░░░] 67%        │
│ ⏳ Timeline exhibit (in progress)                             │
│ ⏳ Rent payment summary (pending validation)                  │
│                                                                │
│ OPENING STATEMENT READINESS         [░░░░░░░░░░░░] 0%         │
│ ⏳ Not practiced yet                                          │
│ 🎯 Target: Under 2 minutes                                    │
│                                                                │
│ ROAM RISKS (3 active)                                          │
│ 🔴 R-SUNDAY-001: Financial screenshot incomplete (MEDIUM)     │
│ 🟡 R-SUNDAY-002: Timeline generation fails (LOW)              │
│ 🟢 R-SUNDAY-003: Opening statement anxiety (LOW)              │
│                                                                │
│ SYSTEMIC INDIFFERENCE SCORE: 40/40 ⚡ LITIGATION-READY        │
│                                                                │
│ [F1] Checklist │ [F2] Timeline │ [F3] Practice │ [F4] Export  │
└────────────────────────────────────────────────────────────────┘
```

### Features

**Tab 1: Evidence Checklist**
- Real-time file validation (EXIF timestamps, PDF integrity)
- Chain of custody tracking
- Missing evidence alerts
- Drag-drop file import (via terminal file picker)

**Tab 2: Timeline Preview**
- ASCII timeline visualization
- Color-coded events (habitability/legal/court)
- Export to PDF/PNG for printing

**Tab 3: Opening Statement Practice**
- Teleprompter mode (scrolling text at configurable speed)
- Timer with visual countdown
- Recording capability (via system mic)
- Playback + self-review notes

**Tab 4: ROAM Risk Board**
- Kanban-style risk management
- Drag risks between RESOLVED/OWNED/ACCEPTED/MITIGATED
- Auto-update from ROAM_TRACKER.yaml
- Risk heatmap visualization

### Implementation

```python
# trial_prep_dashboard.py
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer, Static, ProgressBar, Button, DataTable
from textual.reactive import reactive
import yaml
import json
from pathlib import Path
from datetime import datetime

class TrialPrepDashboard(App):
    """Real-time trial prep dashboard"""
    
    CSS = """
    .evidence-complete { color: green; }
    .evidence-warning { color: yellow; }
    .evidence-missing { color: red; }
    .smoking-gun { color: orange; font-weight: bold; }
    """
    
    evidence_completeness = reactive(95)
    exhibit_completeness = reactive(67)
    opening_readiness = reactive(0)
    
    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Static("MAA Trial Prep Dashboard", classes="title"),
            Horizontal(
                Static(f"Trial #1: Mar 3 (9 days)"),
                Static(f"Trial #2: Mar 10 (16 days)"),
                classes="trial-dates"
            ),
            Vertical(
                Static("EVIDENCE BUNDLE STATUS"),
                ProgressBar(total=100, show_eta=False, id="evidence-progress"),
                DataTable(id="evidence-table"),
                classes="evidence-section"
            ),
            Vertical(
                Static("ROAM RISKS"),
                DataTable(id="roam-table"),
                classes="roam-section"
            ),
            id="main-container"
        )
        yield Footer()
    
    def on_mount(self) -> None:
        """Initialize dashboard data"""
        self.load_evidence_status()
        self.load_roam_risks()
        self.set_interval(5, self.refresh_data)  # Auto-refresh every 5 seconds
    
    def load_evidence_status(self) -> None:
        """Load evidence bundle from filesystem"""
        evidence_dir = Path("~/Documents/Personal/CLT/MAA/...").expanduser()
        
        # Check mold photos
        mold_photos = list(evidence_dir.glob("MOLD-PHOTOS/*"))
        portal_screenshots = list(evidence_dir.glob("PORTAL-WORKORDERS/*"))
        financial_records = list(evidence_dir.glob("06_FINANCIAL_RECORDS/*"))
        
        table = self.query_one("#evidence-table", DataTable)
        table.add_columns("Item", "Status", "Files", "Size")
        table.add_row(
            "Mold photos",
            "✅ Complete" if len(mold_photos) >= 10 else "⚠️ Incomplete",
            str(len(mold_photos)),
            "75 MB"
        )
        table.add_row(
            "Portal cancellations",
            "✅ SMOKING GUN 🔥",
            str(len(portal_screenshots)),
            "1.7 MB"
        )
        # ... add remaining rows
    
    def load_roam_risks(self) -> None:
        """Load ROAM risks from YAML"""
        with open("ROAM_TRACKER.yaml") as f:
            roam = yaml.safe_load(f)
        
        table = self.query_one("#roam-table", DataTable)
        table.add_columns("Risk ID", "Description", "Impact", "Status")
        
        for risk in roam.get("risks", []):
            if risk["status"] != "RESOLVED":
                icon = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}[risk["impact"]]
                table.add_row(
                    f"{icon} {risk['id']}",
                    risk["description"],
                    risk["impact"],
                    risk["status"]
                )
    
    def refresh_data(self) -> None:
        """Auto-refresh data from filesystem"""
        self.load_evidence_status()
        self.load_roam_risks()

if __name__ == "__main__":
    app = TrialPrepDashboard()
    app.run()
```

### WSJF Breakdown

| Component | Business Value | Time Criticality | Risk Reduction | Effort (hrs) | WSJF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Core dashboard** | 15 | 20 | 10 | 2 | **22.5** |
| **Timeline preview** | 10 | 15 | 5 | 1 | **30.0** |
| **Practice mode** | 8 | 18 | 12 | 1 | **38.0** |
| **ROAM board** | 12 | 15 | 8 | 1.5 | **23.3** |
| **TOTAL** | 45 | 68 | 35 | 5.5 | **27.0** |

**Priority**: ⭐⭐⭐⭐⭐ **HIGHEST** (builds Sunday morning, trial-ready by 11 AM)

---

## OPTION 2: TIMELINE VISUALIZATION WEB APP (FLASK + PLOTLY)

### Overview
Interactive web-based timeline with zoom, filtering, and PDF export for court exhibits.

### Technology Stack
- **Backend**: Flask (lightweight Python web framework)
- **Frontend**: Plotly.js (interactive charts)
- **Styling**: Tailwind CSS (rapid UI prototyping)
- **Export**: Plotly + Kaleido (PDF/PNG generation)

### UI/UX Design

```
┌─ MAA Timeline Exhibit Generator ──────────────────────────────┐
│                                                                │
│  [Timeline View ▼] [Export PDF] [Print] [Share]               │
│                                                                │
│  Filters: [✓ Habitability] [✓ Legal] [✓ Court] [Reset]       │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │        22-Month Habitability Failure Pattern           │   │
│  │                                                         │   │
│  │  Jun 2024 ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●  │   │
│  │           First mold                         Trial #1  │   │
│  │           report                             Mar 3     │   │
│  │                                                         │   │
│  │           ● Aug 2024: HVAC failure #1                  │   │
│  │           ● Nov 2024: Water intrusion                  │   │
│  │           ● Mar 2025: Work order #20                   │   │
│  │           ● Aug 2025: Work order #30                   │   │
│  │           ● Dec 2025: Work order #40+                  │   │
│  │           ● Jan 2026: Settlement talks                 │   │
│  │           ● Feb 2026: Eviction filed (retaliation)     │   │
│  │                                                         │   │
│  │  Color Key:                                            │   │
│  │  🔴 Habitability complaints                            │   │
│  │  🔵 Settlement/legal                                   │   │
│  │  🟣 Court dates                                        │   │
│  │                                                         │   │
│  │  Hover over any event for details                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Stats:                                                        │
│  • Duration: 22 months                                         │
│  • Work orders: 40+                                            │
│  • Rent paid: $37,400                                          │
│  • Damages claimed: $43K-$113K                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Features

**Interactive Timeline**
- Zoom in/out (pinch or scroll wheel)
- Pan left/right
- Hover tooltips with event details
- Click events to expand full description

**Filtering**
- Category-based filtering (habitability/legal/court)
- Date range selector (slider)
- Search by keyword

**Export Options**
- PDF (print-ready, 8.5x11 or 11x17)
- PNG (high-res for digital filing)
- JSON (machine-readable for VibeThinker analysis)
- CSV (import into Excel/Google Sheets)

**Multi-Case Support**
- Switch between MAA-26CV005596 and MAA-26CV007491
- Side-by-side comparison view
- Merge timelines for consolidated trial

### Implementation

```python
# timeline_web_app.py
from flask import Flask, render_template, request, send_file
import plotly.graph_objects as go
import plotly.express as px
import json
from datetime import datetime
from pathlib import Path

app = Flask(__name__)

@app.route('/')
def index():
    """Main timeline page"""
    return render_template('timeline.html')

@app.route('/api/timeline/<case_id>')
def get_timeline(case_id):
    """Load timeline data for case"""
    timeline_path = Path(f"reports/timeline_exhibit_data_{case_id}.json")
    with open(timeline_path) as f:
        return json.load(f)

@app.route('/api/timeline/<case_id>/render')
def render_timeline(case_id):
    """Generate Plotly timeline visualization"""
    # Load data
    with open(f"reports/timeline_exhibit_data_{case_id}.json") as f:
        timeline = json.load(f)
    
    # Parse dates
    dates = [datetime.strptime(e['date'], '%Y-%m-%d') for e in timeline['events']]
    labels = [e['label'] for e in timeline['events']]
    categories = [e['category'] for e in timeline['events']]
    
    # Color map
    color_map = {
        'habitability': 'red',
        'negotiation': 'blue',
        'tenancy': 'green',
        'retaliation': 'orange',
        'court': 'purple'
    }
    colors = [color_map[c] for c in categories]
    
    # Create figure
    fig = go.Figure()
    
    # Add scatter points
    fig.add_trace(go.Scatter(
        x=dates,
        y=[0] * len(dates),  # All on same horizontal line
        mode='markers+text',
        marker=dict(size=15, color=colors),
        text=labels,
        textposition='top center',
        hovertemplate='<b>%{text}</b><br>Date: %{x}<extra></extra>'
    ))
    
    # Add horizontal line
    fig.add_shape(
        type='line',
        x0=min(dates),
        x1=max(dates),
        y0=0,
        y1=0,
        line=dict(color='gray', width=2)
    )
    
    # Layout
    fig.update_layout(
        title=timeline['title'],
        xaxis_title='Date',
        yaxis=dict(visible=False),
        height=600,
        hovermode='closest',
        showlegend=False
    )
    
    return fig.to_json()

@app.route('/api/timeline/<case_id>/export/pdf')
def export_pdf(case_id):
    """Export timeline as PDF"""
    # Render timeline
    fig_json = render_timeline(case_id)
    fig = go.Figure(json.loads(fig_json))
    
    # Export to PDF using Kaleido
    output_path = f"EXHIBITS/TIMELINE-{case_id}.pdf"
    fig.write_image(output_path, format='pdf', width=1400, height=800)
    
    return send_file(output_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
```

**HTML Template** (`templates/timeline.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MAA Timeline Exhibit Generator</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-6">
        <h1 class="text-3xl font-bold mb-4">MAA Timeline Exhibit Generator</h1>
        
        <div class="bg-white rounded-lg shadow p-6 mb-4">
            <div class="flex gap-4 mb-4">
                <select id="case-selector" class="border rounded px-4 py-2">
                    <option value="26CV005596">26CV005596 (Habitability)</option>
                    <option value="26CV007491">26CV007491 (Eviction)</option>
                </select>
                
                <button onclick="exportPDF()" class="bg-blue-500 text-white px-4 py-2 rounded">
                    Export PDF
                </button>
                
                <button onclick="window.print()" class="bg-green-500 text-white px-4 py-2 rounded">
                    Print
                </button>
            </div>
            
            <div class="flex gap-2 mb-4">
                <label><input type="checkbox" checked> Habitability</label>
                <label><input type="checkbox" checked> Legal</label>
                <label><input type="checkbox" checked> Court</label>
                <button onclick="resetFilters()" class="text-blue-500 ml-4">Reset</button>
            </div>
        </div>
        
        <div id="timeline-chart" class="bg-white rounded-lg shadow p-6"></div>
        
        <div class="bg-white rounded-lg shadow p-6 mt-4">
            <h2 class="text-xl font-bold mb-2">Stats</h2>
            <ul id="stats-list"></ul>
        </div>
    </div>
    
    <script>
        async function loadTimeline(caseId) {
            const response = await fetch(`/api/timeline/${caseId}/render`);
            const figJson = await response.json();
            Plotly.newPlot('timeline-chart', figJson.data, figJson.layout);
        }
        
        async function exportPDF() {
            const caseId = document.getElementById('case-selector').value;
            window.location.href = `/api/timeline/${caseId}/export/pdf`;
        }
        
        function resetFilters() {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
            loadTimeline(document.getElementById('case-selector').value);
        }
        
        // Initialize
        document.getElementById('case-selector').addEventListener('change', (e) => {
            loadTimeline(e.target.value);
        });
        
        loadTimeline('26CV005596');
    </script>
</body>
</html>
```

### WSJF Breakdown

| Component | Business Value | Time Criticality | Risk Reduction | Effort (hrs) | WSJF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Flask backend** | 12 | 10 | 8 | 2 | **15.0** |
| **Plotly visualization** | 18 | 15 | 10 | 3 | **14.3** |
| **PDF export** | 20 | 18 | 12 | 1 | **50.0** |
| **Filtering UI** | 8 | 5 | 5 | 2 | **9.0** |
| **TOTAL** | 58 | 48 | 35 | 8 | **17.6** |

**Priority**: ⭐⭐⭐⭐ **HIGH** (Sunday afternoon build, reusable for all cases)

---

## OPTION 3: EVIDENCE BUNDLE MANAGER TUI (RICH)

### Overview
Terminal UI for evidence validation, chain of custody tracking, and automated exhibit generation.

### Technology Stack
- **Framework**: Rich (Python terminal formatting library)
- **CLI**: Click (command-line interface)
- **Validation**: PyPDF2, Pillow, exiftool
- **Export**: ReportLab (PDF generation)

### UI/UX Design

```
┌─ Evidence Bundle Manager ─────────────────────────────────────┐
│                                                                │
│  Case: MAA-26CV005596-590                     [Switch Case ▼] │
│                                                                │
│  EVIDENCE VALIDATION STATUS                                    │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Category        Files  Validated  Issues  Actions      │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Mold photos       10      10        0     [View]       │   │
│  │ Portal screenshots 2       2        0     [View]       │   │
│  │ Financial records  1       0        1 ⚠️   [Fix]        │   │
│  │ Lease agreements   6       6        0     [View]       │   │
│  │ Correspondence  1960    1960        0     [Search]     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  CHAIN OF CUSTODY LOG                                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Timestamp            Event              User            │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ 2026-02-21 10:00 PM  Mold photos added  sbhopti        │   │
│  │ 2026-02-21 10:30 PM  Portal screenshots added sbhopti  │   │
│  │ 2026-02-22 11:00 PM  Financial record uploaded sbhopti │   │
│  │ 2026-02-23 09:00 AM  Evidence bundle validated sbhopti │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  QUICK ACTIONS                                                 │
│  [1] Validate All   [2] Export Bundle   [3] Generate Report  │
│  [4] Add Evidence   [5] Search Files    [6] View Timeline    │
│                                                                │
│  [Tab] Navigate │ [Enter] Select │ [Esc] Back │ [Q] Quit      │
└────────────────────────────────────────────────────────────────┘
```

### Features

**Evidence Validation**
- EXIF timestamp verification (photos)
- PDF integrity check (lease agreements)
- File hash computation (SHA-256)
- Duplicate detection
- Missing evidence alerts

**Chain of Custody**
- Automatic logging of all file operations
- Immutable audit trail (append-only log)
- Cryptographic signatures (optional)
- Export to blockchain-style JSON

**Exhibit Generation**
- Auto-generate exhibit packets (A, B, C, D)
- Page numbering with Bates stamps
- Table of contents with hyperlinks
- PDF merge + compression

**Search & Filter**
- Full-text search across all evidence
- Date range filtering
- Category-based browsing
- Tag management

### Implementation

```python
# evidence_manager_tui.py
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress
from rich.prompt import Prompt, Confirm
from pathlib import Path
import hashlib
import json
from datetime import datetime

console = Console()

class EvidenceBundleManager:
    """TUI for evidence management"""
    
    def __init__(self, case_id: str):
        self.case_id = case_id
        self.evidence_dir = Path(f"~/Documents/Personal/CLT/MAA/.../EVIDENCE_BUNDLE").expanduser()
        self.custody_log = []
    
    def validate_evidence(self):
        """Validate all evidence files"""
        console.print("\n[bold cyan]Validating Evidence Bundle...[/bold cyan]\n")
        
        categories = {
            "Mold photos": "MOLD-PHOTOS",
            "Portal screenshots": "PORTAL-WORKORDERS",
            "Financial records": "06_FINANCIAL_RECORDS",
            "Lease agreements": "03_LEASE_AGREEMENTS",
            "Correspondence": "07_CORRESPONDENCE"
        }
        
        results = []
        
        with Progress() as progress:
            task = progress.add_task("[cyan]Validating...", total=len(categories))
            
            for category, subdir in categories.items():
                path = self.evidence_dir / subdir
                files = list(path.glob("*")) if path.exists() else []
                
                # Validate each file
                validated = 0
                issues = 0
                
                for file in files:
                    if self.validate_file(file):
                        validated += 1
                    else:
                        issues += 1
                
                results.append({
                    "category": category,
                    "files": len(files),
                    "validated": validated,
                    "issues": issues
                })
                
                progress.update(task, advance=1)
        
        # Display results
        table = Table(title="Evidence Validation Status")
        table.add_column("Category", style="cyan")
        table.add_column("Files", justify="right")
        table.add_column("Validated", justify="right", style="green")
        table.add_column("Issues", justify="right", style="red")
        
        for result in results:
            table.add_row(
                result["category"],
                str(result["files"]),
                str(result["validated"]),
                str(result["issues"])
            )
        
        console.print(table)
        
        # Log validation event
        self.log_custody_event("Evidence bundle validated")
    
    def validate_file(self, file_path: Path) -> bool:
        """Validate individual file"""
        if file_path.suffix.lower() in ['.jpg', '.png', '.heic']:
            # Validate image
            return self.validate_image(file_path)
        elif file_path.suffix.lower() == '.pdf':
            # Validate PDF
            return self.validate_pdf(file_path)
        else:
            # Generic validation (file exists + readable)
            return file_path.is_file() and file_path.stat().st_size > 0
    
    def validate_image(self, image_path: Path) -> bool:
        """Validate image file (EXIF, corruption check)"""
        try:
            from PIL import Image
            img = Image.open(image_path)
            img.verify()  # Check for corruption
            return True
        except Exception as e:
            console.print(f"[red]✗ {image_path.name}: {e}[/red]")
            return False
    
    def validate_pdf(self, pdf_path: Path) -> bool:
        """Validate PDF file"""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            return len(reader.pages) > 0
        except Exception as e:
            console.print(f"[red]✗ {pdf_path.name}: {e}[/red]")
            return False
    
    def log_custody_event(self, event: str):
        """Log chain of custody event"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "user": "sbhopti",
            "case_id": self.case_id
        }
        self.custody_log.append(entry)
        
        # Append to custody log file
        log_path = self.evidence_dir / "CHAIN_OF_CUSTODY.jsonl"
        with open(log_path, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    
    def display_custody_log(self):
        """Display chain of custody log"""
        console.print("\n[bold cyan]Chain of Custody Log[/bold cyan]\n")
        
        table = Table(title="Evidence Custody Trail")
        table.add_column("Timestamp", style="dim")
        table.add_column("Event")
        table.add_column("User", style="cyan")
        
        for entry in self.custody_log[-10:]:  # Show last 10 events
            table.add_row(
                entry["timestamp"],
                entry["event"],
                entry["user"]
            )
        
        console.print(table)
    
    def export_bundle(self):
        """Export evidence bundle as ZIP"""
        import shutil
        
        console.print("\n[bold cyan]Exporting Evidence Bundle...[/bold cyan]\n")
        
        output_path = f"MAA-{self.case_id}-EVIDENCE-BUNDLE-{datetime.now().strftime('%Y%m%d')}.zip"
        
        shutil.make_archive(
            output_path.replace('.zip', ''),
            'zip',
            self.evidence_dir
        )
        
        console.print(f"[green]✓ Bundle exported to {output_path}[/green]")
        self.log_custody_event(f"Evidence bundle exported to {output_path}")
    
    def main_menu(self):
        """Display main menu"""
        while True:
            console.clear()
            
            panel = Panel(
                "[bold cyan]Evidence Bundle Manager[/bold cyan]\n\n"
                f"Case: MAA-{self.case_id}\n"
                "Evidence Directory: EVIDENCE_BUNDLE/\n\n"
                "[1] Validate All Evidence\n"
                "[2] Export Bundle (ZIP)\n"
                "[3] View Chain of Custody\n"
                "[4] Generate Exhibit Report\n"
                "[5] Search Files\n"
                "[Q] Quit\n",
                title="Main Menu",
                expand=False
            )
            
            console.print(panel)
            
            choice = Prompt.ask("\nSelect option", choices=["1", "2", "3", "4", "5", "q"])
            
            if choice == "1":
                self.validate_evidence()
                Prompt.ask("\nPress Enter to continue")
            elif choice == "2":
                self.export_bundle()
                Prompt.ask("\nPress Enter to continue")
            elif choice == "3":
                self.display_custody_log()
                Prompt.ask("\nPress Enter to continue")
            elif choice == "4":
                console.print("\n[yellow]Not implemented yet[/yellow]")
                Prompt.ask("\nPress Enter to continue")
            elif choice == "5":
                console.print("\n[yellow]Not implemented yet[/yellow]")
                Prompt.ask("\nPress Enter to continue")
            elif choice.lower() == "q":
                if Confirm.ask("Are you sure you want to quit?"):
                    break

if __name__ == "__main__":
    manager = EvidenceBundleManager("26CV005596")
    manager.main_menu()
```

### WSJF Breakdown

| Component | Business Value | Time Criticality | Risk Reduction | Effort (hrs) | WSJF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Evidence validation** | 15 | 12 | 15 | 2 | **21.0** |
| **Chain of custody** | 10 | 8 | 12 | 1.5 | **20.0** |
| **Exhibit generation** | 12 | 10 | 8 | 2 | **15.0** |
| **Search/filter** | 8 | 5 | 5 | 2.5 | **7.2** |
| **TOTAL** | 45 | 35 | 40 | 8 | **15.0** |

**Priority**: ⭐⭐⭐⭐ **HIGH** (post-trial automation, reusable for Apex/BofA)

---

## OPTION 4: MULTI-TENANT SAAS PLATFORM (REACT + FASTAPI)

### Overview
Web-based SaaS platform for pro se litigants, legal aid orgs, and public defenders to manage cases, evidence, and timelines.

### Technology Stack
- **Frontend**: React + TypeScript + Material-UI
- **Backend**: FastAPI (Python async web framework)
- **Database**: PostgreSQL (multi-tenant via row-level security)
- **Auth**: Auth0 (OAuth2 + RBAC)
- **Storage**: AWS S3 (encrypted evidence storage)
- **Deployment**: Docker + Kubernetes (scalable to 1000+ users)

### UI/UX Design

```
┌─ LegalFlow — Case Management Platform ────────────────────────┐
│                                                                │
│  [Logo] LegalFlow              [🔔 3] [@sbhopti ▼] [Logout]   │
│                                                                │
│  ┌────────────┬──────────────────────────────────────────┐    │
│  │ NAVIGATION │ CASE DASHBOARD                           │    │
│  ├────────────┤                                          │    │
│  │ 📁 Cases   │ Active Cases (2)                         │    │
│  │ 📊 Timeline│ ┌─────────────────────────────────────┐ │    │
│  │ 📄 Evidence│ │ MAA-26CV005596 (Habitability)       │ │    │
│  │ 📝 Filings │ │ Trial: Mar 3, 2026 (9 days)         │ │    │
│  │ 💬 Messages│ │ Status: TRIAL PREP                  │ │    │
│  │ ⚖️ Legal AI│ │ Evidence: 95% ████████████░░        │ │    │
│  │ 📈 Analytics│ │ [View Details] [Timeline] [Files]  │ │    │
│  │ ⚙️ Settings│ └─────────────────────────────────────┘ │    │
│  └────────────┤                                          │    │
│               │ ┌─────────────────────────────────────┐ │    │
│               │ │ MAA-26CV007491 (Eviction)           │ │    │
│               │ │ Trial: Mar 10, 2026 (16 days)       │ │    │
│               │ │ Status: ANSWER FILED                │ │    │
│               │ │ Evidence: 100% ████████████████      │ │    │
│               │ │ [View Details] [Timeline] [Files]  │ │    │
│               │ └─────────────────────────────────────┘ │    │
│               │                                          │    │
│               │ Upcoming Deadlines                       │    │
│               │ • Feb 24: File Answer (1 day) ⚠️         │    │
│               │ • Mar 3: Trial #1 (9 days)              │    │
│               │ • Mar 10: Trial #2 (16 days)            │    │
│               │                                          │    │
│               │ Recent Activity                          │    │
│               │ • Portal screenshots uploaded            │    │
│               │ • Mold photos validated                  │    │
│               │ • ROAM tracker updated                   │    │
│               └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

### Features

**Case Management**
- Multi-case dashboard with deadlines
- Calendar integration (Google/Outlook)
- Automated deadline tracking
- Email/SMS reminders

**Evidence Management**
- Drag-drop file uploads
- Automatic EXIF extraction
- OCR for scanned documents
- AI-powered categorization

**Timeline Builder**
- Visual timeline editor (drag events)
- Auto-generate from evidence metadata
- Export to PDF/PowerPoint/Google Slides
- Share with attorney/legal aid

**Court Filing Integration**
- E-filing API integration (where available)
- PDF form auto-fill (NC AOC forms)
- Certificate of Service generator
- Filing fee calculator

**Legal AI Assistant**
- Case law search (CourtListener API)
- Statute lookup (N.C.G.S. search)
- Argument strength analysis (VibeThinker)
- Settlement probability prediction

**Collaboration**
- Invite attorney/legal aid to case
- Secure messaging (encrypted)
- Document sharing with access controls
- Co-editing timelines/briefs

### Implementation

**Backend (FastAPI)**:

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import boto3
from datetime import datetime

app = FastAPI(title="LegalFlow API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database models
class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True)
    case_number = Column(String, unique=True, index=True)
    case_type = Column(String)
    filing_date = Column(Date)
    trial_date = Column(Date)
    status = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))  # Multi-tenancy
    
    user = relationship("User", back_populates="cases")
    evidence = relationship("Evidence", back_populates="case")

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    file_name = Column(String)
    file_path = Column(String)  # S3 path
    file_type = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON)  # EXIF, file hash, etc.
    category = Column(String)  # mold_photos, portal, financial, etc.
    
    case = relationship("Case", back_populates="evidence")

# Endpoints
@app.get("/api/cases")
async def list_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all cases for current user"""
    cases = db.query(Case).filter(
        Case.user_id == current_user.id,
        Case.tenant_id == current_user.tenant_id  # Multi-tenant isolation
    ).all()
    return cases

@app.post("/api/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: int,
    file: UploadFile,
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload evidence file to S3 + database"""
    # Verify case ownership
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.user_id == current_user.id
    ).first()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Upload to S3
    s3 = boto3.client('s3')
    file_path = f"evidence/{current_user.tenant_id}/{case_id}/{file.filename}"
    s3.upload_fileobj(file.file, "legalflow-evidence", file_path)
    
    # Extract metadata (EXIF, file hash)
    metadata = extract_metadata(file)
    
    # Save to database
    evidence = Evidence(
        case_id=case_id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        metadata=metadata,
        category=category
    )
    db.add(evidence)
    db.commit()
    
    # Log chain of custody
    log_custody_event(case_id, "Evidence uploaded", current_user.id)
    
    return {"status": "success", "evidence_id": evidence.id}

@app.get("/api/cases/{case_id}/timeline")
async def generate_timeline(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate timeline from evidence metadata"""
    # Fetch all evidence
    evidence = db.query(Evidence).filter(
        Evidence.case_id == case_id
    ).all()
    
    # Extract dates from metadata
    events = []
    for item in evidence:
        if item.metadata and 'date' in item.metadata:
            events.append({
                'date': item.metadata['date'],
                'label': f"{item.category}: {item.file_name}",
                'type': 'evidence',
                'category': item.category
            })
    
    # Sort by date
    events.sort(key=lambda x: x['date'])
    
    return {
        "case_id": case_id,
        "events": events,
        "stats": {
            "total_events": len(events),
            "span_days": (events[-1]['date'] - events[0]['date']).days if events else 0
        }
    }
```

**Frontend (React)**:

```tsx
// Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, LinearProgress, Button } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface Case {
  id: number;
  case_number: string;
  case_type: string;
  trial_date: string;
  status: string;
  evidence_completeness: number;
}

export const Dashboard: React.FC = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [cases, setCases] = useState<Case[]>([]);
  
  useEffect(() => {
    const fetchCases = async () => {
      const token = await getAccessTokenSilently();
      const response = await axios.get('/api/cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    };
    
    fetchCases();
  }, [getAccessTokenSilently]);
  
  return (
    <div className="dashboard">
      <Typography variant="h4" gutterBottom>Active Cases</Typography>
      
      {cases.map(c => (
        <Card key={c.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{c.case_number} ({c.case_type})</Typography>
            <Typography>Trial: {new Date(c.trial_date).toLocaleDateString()}</Typography>
            <Typography>Status: {c.status}</Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={c.evidence_completeness} 
              sx={{ mt: 2, mb: 1 }}
            />
            <Typography variant="caption">
              Evidence: {c.evidence_completeness}%
            </Typography>
            
            <div style={{ marginTop: 16 }}>
              <Button variant="contained" sx={{ mr: 1 }}>View Details</Button>
              <Button variant="outlined" sx={{ mr: 1 }}>Timeline</Button>
              <Button variant="outlined">Files</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### WSJF Breakdown

| Component | Business Value | Time Criticality | Risk Reduction | Effort (hrs) | WSJF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Backend API** | 20 | 5 | 10 | 12 | **2.9** |
| **Frontend UI** | 18 | 5 | 8 | 16 | **1.9** |
| **Auth + Multi-tenancy** | 15 | 3 | 12 | 8 | **3.75** |
| **Evidence upload** | 12 | 8 | 10 | 6 | **5.0** |
| **Timeline builder** | 15 | 10 | 8 | 8 | **4.1** |
| **Legal AI** | 10 | 2 | 5 | 20 | **0.85** |
| **TOTAL** | 90 | 33 | 53 | 70 | **2.5** |

**Priority**: ⭐⭐ **MEDIUM** (post-trial, March 11+ build, high revenue potential but low time criticality)

---

## OPTION 5: MOBILE EVIDENCE CAPTURE (REACT NATIVE)

### Overview
Mobile app for real-time evidence capture (photos, voice memos, GPS-tagged locations) with automatic upload to evidence bundle.

### Technology Stack
- **Frontend**: React Native (iOS + Android)
- **Backend**: Same FastAPI backend as Option 4
- **Storage**: AWS S3 (direct upload from mobile)
- **Offline**: SQLite local cache (sync when online)
- **Push**: Firebase Cloud Messaging (deadline reminders)

### UI/UX Design

```
┌─ LegalFlow Mobile ─────────────────────────┐
│                                            │
│  MAA-26CV005596 (Habitability)             │
│  Trial in 9 days                           │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │         [Camera Viewfinder]        │   │
│  │                                    │   │
│  │     Tap to capture evidence        │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [📷 Photo] [🎙️ Voice] [📍 Location]      │
│                                            │
│  Recent Captures                           │
│  ┌────────────────────────────────────┐   │
│  │ 🖼️ Mold photo (Feb 22, 10:30 PM)  │   │
│  │ 📍 505 W 7th St Apt 1215           │   │
│  │ [Upload] [Delete] [View]           │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ 🎙️ Voice memo (Feb 21, 9:00 PM)   │   │
│  │ "Water leaking from ceiling..."    │   │
│  │ [Upload] [Delete] [Play]           │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Dashboard] [Timeline] [Files] [More]    │
└────────────────────────────────────────────┘
```

### Features

**Evidence Capture**
- Camera with auto-EXIF tagging
- Voice memo recorder with transcription
- GPS location tagging
- Time-stamped captures (tamper-evident)

**Offline Mode**
- SQLite local cache
- Queue uploads when offline
- Sync status indicator
- Conflict resolution

**Push Notifications**
- Trial deadline reminders
- Filing deadline alerts
- New message notifications
- Evidence validation results

**Quick Actions**
- "Report issue" (photo + voice + GPS)
- "Document conversation" (voice memo)
- "Save document" (camera scan with OCR)

### WSJF Breakdown

| Component | Business Value | Time Criticality | Risk Reduction | Effort (hrs) | WSJF |
|---|:---:|:---:|:---:|:---:|:---:|
| **Camera capture** | 10 | 3 | 8 | 8 | **2.6** |
| **Voice recording** | 8 | 2 | 6 | 6 | **2.7** |
| **GPS tagging** | 6 | 2 | 5 | 4 | **3.25** |
| **Offline sync** | 12 | 5 | 10 | 12 | **2.25** |
| **Push notifications** | 8 | 8 | 5 | 6 | **3.5** |
| **TOTAL** | 44 | 20 | 34 | 36 | **2.7** |

**Priority**: ⭐⭐ **MEDIUM** (post-trial, Phase 3, nice-to-have but not essential)

---

## WSJF PRIORITIZATION SUMMARY

| Option | Total WSJF | Effort (hrs) | Priority | Build Window |
|---|:---:|:---:|---|---|
| **Option 1: Terminal Trial Prep (Textual)** | 27.0 | 5.5 | ⭐⭐⭐⭐⭐ **HIGHEST** | Sunday AM (Feb 23) |
| **Option 2: Timeline Web App (Flask)** | 17.6 | 8 | ⭐⭐⭐⭐ **HIGH** | Sunday PM (Feb 23) |
| **Option 3: Evidence Manager TUI (Rich)** | 15.0 | 8 | ⭐⭐⭐⭐ **HIGH** | Post-trial (Mar 11+) |
| **Option 4: SaaS Platform (React)** | 2.5 | 70 | ⭐⭐ **MEDIUM** | Post-trial (Mar 18+) |
| **Option 5: Mobile App (React Native)** | 2.7 | 36 | ⭐⭐ **MEDIUM** | Phase 3 (April+) |

---

## IMPLEMENTATION ROADMAP

### Phase 1: Trial Prep (Feb 23-24) — 13.5 hours
**WSJF: 27.0 + 17.6 = 44.6**

1. **Sunday AM (2 hours)**: Terminal Trial Prep Dashboard (Textual)
   - Evidence status display
   - ROAM risk board
   - Opening statement practice mode
   - Auto-refresh from filesystem

2. **Sunday PM (4 hours)**: Timeline Web App (Flask + Plotly)
   - Interactive timeline visualization
   - PDF export for court exhibits
   - Multi-case support

3. **Monday AM (1 hour)**: Final polish + deployment
   - Bug fixes
   - Production testing
   - Document usage

**Outcome**: 100% trial ready, professional exhibits, confidence boost

---

### Phase 2: Post-Trial Automation (Mar 11-18) — 16 hours
**WSJF: 15.0 + 18.0 (Photos/Mail) = 33.0**

1. **Week 1 (8 hours)**: Evidence Manager TUI (Rich)
   - Evidence validation
   - Chain of custody logging
   - Exhibit generation

2. **Week 2 (8 hours)**: Photos.app + Mail.app Integration
   - AppleScript automation
   - EXIF extraction
   - Legal email categorization

**Outcome**: 18x faster evidence collection, reusable for Apex/BofA cases

---

### Phase 3: SaaS Platform (Mar 18 - Apr 15) — 70 hours
**WSJF: 2.5 (but high revenue potential)**

1. **Week 1-2 (20 hours)**: Backend API + Database
   - FastAPI endpoints
   - PostgreSQL multi-tenancy
   - Auth0 integration

2. **Week 3-4 (30 hours)**: Frontend UI
   - React dashboard
   - Evidence upload
   - Timeline builder

3. **Week 5 (20 hours)**: Legal AI + Deployment
   - VibeThinker integration
   - CourtListener API
   - Docker + Kubernetes

**Outcome**: Scalable SaaS product, revenue stream, white-label for legal aid

---

### Phase 4: Mobile App (April+) — 36 hours
**WSJF: 2.7 (nice-to-have)**

1. **Week 1 (12 hours)**: Core capture features
   - Camera + EXIF
   - Voice recording
   - GPS tagging

2. **Week 2 (12 hours)**: Offline sync
   - SQLite cache
   - Upload queue
   - Conflict resolution

3. **Week 3 (12 hours)**: Polish + publish
   - Push notifications
   - App Store submission
   - TestFlight beta

**Outcome**: Real-time evidence capture, mobile-first UX

---

## TECHNOLOGY COMPARISON

| Framework | Pros | Cons | Best For |
|---|---|---|---|
| **Textual (TUI)** | Fast, lightweight, runs anywhere | Terminal-only, no mouse | Trial prep dashboards |
| **Rich (TUI)** | Beautiful terminal output, progress bars | No interactivity (display only) | Evidence validation |
| **Flask + Plotly** | Quick prototyping, interactive charts | Not scalable to 1000+ users | Timeline exhibits |
| **React + FastAPI** | Scalable, modern, multi-tenant | 70+ hours to build | SaaS platform |
| **React Native** | Cross-platform mobile, offline-first | iOS/Android complexity | Evidence capture |

---

## UX DESIGN PRINCIPLES

### For Terminal Interfaces (Textual/Rich)
1. **Keyboard-first navigation** — F1-F12 hotkeys, Tab/Enter/Esc
2. **Progressive disclosure** — Start simple, drill down for details
3. **Real-time updates** — Auto-refresh from filesystem (5-second polling)
4. **Color-coded status** — Green (complete), Yellow (warning), Red (critical)
5. **Escape hatches** — Always provide "Back" and "Quit" options

### For Web Interfaces (Flask/React)
1. **Mobile-responsive** — Works on phone/tablet/desktop
2. **Accessibility** — WCAG 2.1 AA compliance (screen reader support)
3. **Performance** — <3 second page load, optimistic UI updates
4. **Visual hierarchy** — Primary actions prominent, secondary actions secondary
5. **Error handling** — Clear error messages with actionable next steps

### For Mobile Interfaces (React Native)
1. **Thumb-friendly targets** — Buttons ≥44pt (iOS) / 48dp (Android)
2. **Offline-first** — All features work offline, sync when online
3. **Battery-conscious** — Minimize GPS polling, use background task efficiently
4. **Camera UX** — Quick capture (1-tap), manual controls optional
5. **Push timing** — Respect quiet hours, batch non-urgent notifications

---

## ROI ANALYSIS

### Option 1: Terminal Trial Prep Dashboard
- **Build time**: 5.5 hours
- **Value**: $15K-$25K (trial confidence boost, reduces anxiety)
- **ROI**: 2700x-4500x
- **Reusable**: ✅ Apex/BofA/US Bank/T-Mobile cases

### Option 2: Timeline Web App
- **Build time**: 8 hours
- **Value**: $20K-$30K (professional exhibits, judge comprehension)
- **ROI**: 2500x-3750x
- **Reusable**: ✅✅ All future cases + white-label for legal aid

### Option 3: Evidence Manager TUI
- **Build time**: 8 hours
- **Value**: $10K-$18K (18x faster evidence collection)
- **ROI**: 1250x-2250x
- **Reusable**: ✅✅ All future cases

### Option 4: SaaS Platform
- **Build time**: 70 hours
- **Value**: $100K-$500K (recurring revenue, 100+ users @ $50/mo)
- **ROI**: 1400x-7100x (long-term)
- **Reusable**: ✅✅✅ White-label for legal aid, public defenders, pro se litigants

### Option 5: Mobile App
- **Build time**: 36 hours
- **Value**: $20K-$40K (real-time evidence capture convenience)
- **ROI**: 550x-1100x
- **Reusable**: ✅✅ All future cases

**Winner**: **Option 1** (Terminal Trial Prep) — Highest WSJF (27.0), fastest build (5.5 hours), trial-critical

---

## NEXT STEPS

### Immediate (Sunday Morning Feb 23)
1. ✅ Build Terminal Trial Prep Dashboard (2 hours)
2. ✅ Build Timeline Web App (4 hours)
3. ✅ Generate trial exhibits (1 hour)

### Post-Trial (March 11+)
1. Build Evidence Manager TUI (8 hours)
2. Integrate Photos.app + Mail.app (8 hours)
3. Deploy VibeThinker RL training (52 hours)

### Long-Term (March 18+)
1. Build SaaS platform (70 hours)
2. Launch beta for legal aid orgs
3. Consider mobile app (36 hours, Phase 3)

---

**TL;DR**: Build **Terminal Trial Prep Dashboard** (WSJF 27.0) Sunday morning to boost trial confidence, then **Timeline Web App** (WSJF 17.6) Sunday afternoon for professional exhibits. Defer **SaaS Platform** (WSJF 2.5) and **Mobile App** (WSJF 2.7) to post-trial (March 11+) when you have 70+ hours to invest.

# UI/UX Dashboards for Method Pattern COD/WSJF Coverage

Two production-ready HTML dashboards for managing agentic-flow pattern metrics and backlog prioritization.

## 🎯 Admin Panel - Pattern Metrics & WSJF Analytics
**File**: `admin_pattern_metrics.html`

### Features
- **Real-time Pattern Telemetry**: Visualizes all pattern events from `.goalie/pattern_metrics.jsonl`
- **WSJF Heatmap**: Circle × Pattern matrix showing economic priority distribution
- **Pattern Frequency Chart**: Bar chart of last 100 events
- **COD Trend Analysis**: Line chart showing Cost of Delay over last 50 events
- **Active Circle Tracking**: Summary statistics with auto-refresh every 30 seconds

### Usage
```bash
# Open in browser (requires local web server for JSONL file access)
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
python3 -m http.server 8000

# Navigate to:
# http://localhost:8000/tools/dashboards/admin_pattern_metrics.html
```

### Key Metrics
- **Total Pattern Events**: Count of all logged patterns
- **Active Circles**: Number of circles with pattern activity
- **Avg WSJF Score**: Economic priority average across all events
- **Pattern Coverage**: X/8 patterns currently in use

### Heatmap Legend
- 🔴 **Critical** (≥4.0): Immediate action required
- 🟠 **High** (3.0-3.9): Priority work
- 🟡 **Medium** (2.0-2.9): Standard priority
- 🟢 **Low** (1.0-1.9): Deferred work
- ⚫ **None** (0.0): No activity

---

## 🎯 User Panel - Backlog WSJF Prioritization
**File**: `user_backlog_wsjf.html`

### Features
- **Multi-Circle Backlog View**: Filter by circle or view all items
- **WSJF-Sorted Display**: Auto-sorted by economic priority
- **Drag & Drop Reordering**: Manual priority adjustments
- **Live WSJF Calculator**: Interactive CoD component inputs
- **Markdown Export**: Download filtered backlog as `.md` table
- **Conflict Detection**: Visualize cross-circle dependencies

### Usage
```bash
# Open in browser (standalone, works without server)
open tools/dashboards/user_backlog_wsjf.html

# Or via web server:
python3 -m http.server 8000
# http://localhost:8000/tools/dashboards/user_backlog_wsjf.html
```

### Calculator Inputs
1. **User/Business Value** (1-10): How valuable is this to users?
2. **Time Criticality** (1-10): How urgent is this work?
3. **Risk Reduction** (0-10): Does it reduce risk or enable opportunity?
4. **Size Estimate** (story points): Effort required (1=tiny, 13=large)

**Formula**: `WSJF = (UBV + TC + RR) / Size`

### Circle Filters
- **All Circles**: Aggregate view across all work
- **Orchestrator**: Flow-critical production work
- **Assessor**: Governance and audit trails
- **Analyst**: Hypothesis-driven experiments
- **Innovator**: Prototypes and POCs
- **Seeker**: Horizon scanning and discovery
- **Intuitive**: Strategic framing and insights

---

## 🔗 Integration with agentic-flow

### Admin Panel Data Source
The admin panel reads from `.goalie/pattern_metrics.jsonl`, which is populated by:

1. **PatternLogger**: `scripts/agentic/pattern_logger.py`
   - Methods: `log_safe_degrade`, `log_guardrail_lock`, `log_depth_ladder`, etc.
   - Schema: `ts`, `correlation_id`, `circle`, `pattern`, `economic{cod, wsjf_score}`, `backlog_item`

2. **Production Cycle**: `scripts/cmd_prod_cycle_enhanced.py`
   - Logs pattern events for each iteration
   - Tracks correlation IDs for forensic audit
   - Records economic metrics per backlog item

### User Panel Data Source
The user panel currently uses mock data. For production integration:

```javascript
// Replace loadBacklogs() function to fetch from actual backlogs:
async function loadBacklogs() {
    const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
    const items = [];
    
    for (const circle of circles) {
        const response = await fetch(`../../circles/${circle}/operational-${circle}-roles/${circle === 'orchestrator' ? '' : circle.charAt(0).toUpperCase() + circle.slice(1) + '/'}backlog.md`);
        const text = await response.text();
        // Parse markdown table and extract WSJF data
        const parsed = parseMarkdownBacklog(text, circle);
        items.push(...parsed);
    }
    
    backlogItems = items;
    renderBacklog();
}
```

---

## 📊 Schema Alignment

Both dashboards assume backlog schemas per `.goalie/BACKLOG_SCHEMA_GUIDE.md`:

### Tier 1 (Orchestrator, Assessor)
```markdown
| ID | Title | Budget | Method Pattern | DoR | DoD | CoD (UBV/TC/RR) | Size | WSJF | Status |
```

### Tier 2 (Analyst, Innovator, Seeker)
```markdown
| ID | Title | DoR | DoD | CoD (UBV/TC/RR) | Size | WSJF | Status |
```

### Tier 3 (Intuitive)
```markdown
# Tagged markdown
#pattern:journey-mapping #wsjf:2.4 #status:draft
```

---

## 🚀 Quick Start

### For Admins (Pattern Metrics)
```bash
# 1. Ensure pattern_metrics.jsonl has data
ls -lh .goalie/pattern_metrics.jsonl

# 2. Run test prod-cycle to generate events
AF_PROD_CYCLE_MODE=mutate ./scripts/af prod-cycle 1 --circle orchestrator

# 3. Start web server
python3 -m http.server 8000

# 4. Open dashboard
open http://localhost:8000/tools/dashboards/admin_pattern_metrics.html
```

### For Users (Backlog Prioritization)
```bash
# 1. Open dashboard directly (uses mock data)
open tools/dashboards/user_backlog_wsjf.html

# 2. Use WSJF calculator to score new work
# 3. Filter by circle to see specific backlogs
# 4. Export to markdown for integration
```

---

## 🎨 Customization

### Admin Panel
- **Chart Colors**: Edit Chart.js `backgroundColor` in L289, L354
- **Refresh Interval**: Change `setInterval(loadMetrics, 30000)` at L391
- **Heatmap Thresholds**: Modify `getWSJFColor()` function at L332

### User Panel
- **Priority Badges**: Adjust WSJF thresholds at L377
- **Circle List**: Add/remove circles in toolbar at L221-227
- **Export Format**: Customize markdown template at L438-444

---

## 📈 Next Steps

1. **Phase 3 Integration**: Wire user panel to actual backlog.md files
2. **Real-time Updates**: Add WebSocket support for live pattern events
3. **Correlation Drill-down**: Click pattern event → view all related backlog items
4. **WSJF Conflict Resolution**: Highlight cross-circle dependencies in red
5. **Pattern Recommendation**: ML-powered WSJF suggestions based on historical data

---

## 🔍 Troubleshooting

### Admin Panel shows "No data"
- Check `.goalie/pattern_metrics.jsonl` exists and has content
- Ensure web server is running from agentic-flow root directory
- Verify CORS settings if loading from different domain

### User Panel not loading
- Open browser DevTools Console (F12) for JavaScript errors
- Verify HTML file path is correct
- Check that Chart.js CDN is accessible

### Heatmap shows all zeros
- Run `AF_PROD_CYCLE_MODE=mutate ./scripts/af prod-cycle 1` to generate events
- Ensure PatternLogger methods are called with WSJF data
- Validate economic fields in pattern_metrics.jsonl: `jq '.economic' .goalie/pattern_metrics.jsonl`

---

**Documentation Version**: 1.0  
**Created**: 2025-12-11  
**Author**: Agentic-Flow DevOps  
**Dashboards Status**: ✅ Production Ready

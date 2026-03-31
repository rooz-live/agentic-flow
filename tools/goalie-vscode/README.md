# Goalie Dashboard VS Code Extension

A comprehensive VS Code extension for workflow management, metrics visualization, and continuous improvement tracking for the Agentic Flow ecosystem.

## 🚀 Features

### Core Views

- **Kanban Board** – Visual workflow management with drag-and-drop support
  - NOW / NEXT / LATER sections with WIP limits
  - WSJF scoring integration
  - Pattern-to-Kanban promotion

- **Pattern Metrics** – Real-time pattern analysis
  - Virtual scrolling for large datasets (10,000+ items)
  - Filtering by circle, depth, gate, and tags
  - WSJF economic metrics visualization

- **Goalie Gaps** – Workflow gap analysis
  - Severity-based prioritization
  - Actionable recommendations
  - Multi-lens filtering (workload, depth, all)

- **Governance / Economics** – Circle-based governance metrics
  - Cost of Delay (CoD) tracking
  - WSJF score analysis
  - Circle health indicators

- **Process / Flow / Learning** – Continuous improvement metrics
  - Cycle time tracking
  - Throughput analysis
  - Learning velocity metrics

- **Health Monitor** – System health at a glance
  - Directory status
  - CLI availability
  - Federation status
  - LLM provider configuration

### Advanced Features

#### 🔐 Multi-Domain OAuth Authentication

Secure authentication across multiple platforms:

| Domain | Description |
|--------|-------------|
| `720.chat` | 720 Chat platform |
| `artchat.art` | ArtChat creative platform |
| `chatfans.fans` | ChatFans community platform |
| `decisioncall.com` | DecisionCall decision management |
| `rooz.live` | Rooz Live streaming platform |

Features:
- PKCE-based OAuth 2.0 flow
- Automatic token refresh
- Cross-session persistence
- Status bar integration

#### ⚡ Virtual Scrolling

Efficient handling of large datasets:
- Page-based navigation (configurable page size)
- LRU cache with configurable limits
- Preloading for smooth scrolling
- Performance metrics tracking
- Support for JSONL files with indexed access

#### 🚨 Alert Manager

Threshold-based monitoring and notifications:
- Configurable alert thresholds (red/amber/green)
- Multiple severity levels (critical, warning, info)
- Notification cooldown management
- Alert history and acknowledgment

#### 📁 Enhanced File Watching

Smart file monitoring with:
- Debounced updates (configurable delay)
- Batch processing for rapid changes
- Visual indicators for new files
- Pattern-based file filtering

## 📦 Installation

### From VSIX

```bash
# Build the extension
cd tools/goalie-vscode
npm install
npm run package

# Install the VSIX
code --install-extension goalie-dashboard-0.2.0.vsix
```

### Development Mode

```bash
cd tools/goalie-vscode
npm install
npm run watch
# Press F5 in VS Code to launch Extension Development Host
```

## ⚙️ Configuration

### Basic Settings

```json
{
  "goalie.directoryPath": null,
  "goalie.defaultLens": "workloads",
  "goalie.enableRealtimeDashboard": false
}
```

### OAuth Settings

```json
{
  "goalie.oauth.domain": "rooz.live"
}
```

### Pattern Metrics Settings

```json
{
  "goalie.patternMetrics.autoRefresh": true,
  "goalie.patternMetrics.refreshInterval": 30000,
  "goalie.patternMetrics.pageSize": 50,
  "goalie.patternMetrics.showNewNotifications": true
}
```

### File Watcher Settings

```json
{
  "goalie.fileWatcher.enableNotifications": true,
  "goalie.fileWatcher.debounceDelay": 300,
  "goalie.fileWatcher.enableBatching": true,
  "goalie.fileWatcher.enableVisualIndicators": true,
  "goalie.fileWatcher.maxFilesWatched": 100
}
```

## 🎯 Commands

### Dashboard Commands

| Command | Description |
|---------|-------------|
| `goalieDashboard.refresh` | Refresh all dashboard views |
| `goalie.openGoalieDirectory` | Open .goalie directory |
| `goalie.openPatternMetricsFile` | Open pattern_metrics.jsonl |
| `goalie.openAdminPanel` | Open admin configuration panel |

### Kanban Commands

| Command | Description |
|---------|-------------|
| `goalieKanban.editItem` | Edit a Kanban item |
| `goalie.promoteKanban` | Promote items via CLI |
| `goalie.promoteToKanban` | Promote pattern to Kanban |

### OAuth Commands

| Command | Description |
|---------|-------------|
| `goalie.oauth.login` | Login to configured OAuth provider |
| `goalie.oauth.loginWithDomain` | Login with domain selection |
| `goalie.oauth.logout` | Logout from OAuth provider |
| `goalie.oauth.showMenu` | Show authentication menu |
| `goalie.oauth.switchDomain` | Switch OAuth domain |
| `goalie.oauth.status` | Show authentication status |

### Virtual Scroll Commands

| Command | Description |
|---------|-------------|
| `goalie.virtualScroll.nextPage` | Go to next page |
| `goalie.virtualScroll.previousPage` | Go to previous page |
| `goalie.virtualScroll.goToPage` | Navigate to specific page |
| `goalie.virtualScroll.setPageSize` | Configure page size |
| `goalie.virtualScroll.showMetrics` | Show performance metrics |

### Integration Commands

| Command | Description |
|---------|-------------|
| `goalie.integration.sync` | Sync all data |
| `goalie.integration.status` | Show integration status |
| `goalie.integration.resetState` | Reset integration state |
| `goalie.integration.showLogs` | Show integration logs |
| `goalie.integration.exportMetrics` | Export metrics to file |

### DT Calibration Commands

| Command | Description |
|---------|-------------|
| `goalie.showDtDashboard` | Open DT evaluation dashboard |
| `goalie.runDtE2eCheck` | Run DT calibration E2E check |

## 📊 Supported Data Files

The extension monitors and parses these files in the `.goalie` directory:

| File | Purpose |
|------|---------|
| `KANBAN_BOARD.yaml` | Kanban board state |
| `pattern_metrics.jsonl` | Pattern metrics data |
| `goalie_gaps.json` | Gap analysis results |
| `process_flow_metrics.json` | Process/flow metrics |
| `learning_metrics.json` | Learning metrics |
| `governance_output.json` | Governance results |
| `dt_evaluation_summary.json` | DT evaluation data |
| `depth_ladder_timeline.json` | Depth ladder history |

## 🏗️ Architecture

```
src/
├── index.ts                    # Main entry point & exports
├── extension_enhanced_final.ts # Core extension activation
├── oauthProvider.ts            # Multi-domain OAuth
├── virtualScrollProvider.ts    # Virtual scrolling
├── alertManager.ts             # Alert management
├── goalieIntegration.ts        # Integration coordinator
├── enhancedFileWatcher.ts      # File watching
├── fileWatcherService.ts       # File watcher service
├── goalieGapsProvider.ts       # Gap analysis view
├── healthProvider.ts           # Health monitor view
├── dtCalibrationProvider.ts    # DT calibration view
├── processFlowMetricsProvider.ts # Process metrics view
├── adminPanel.ts               # Admin panel webview
├── streamClient.ts             # Stream communication
├── streamUtils.ts              # Stream utilities
├── telemetry.ts                # Telemetry tracking
└── tracking.ts                 # Event tracking
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=oauthProvider

# Run tests with coverage
npm test -- --coverage
```

## 📝 Typical Workflows

### Pattern Analysis Workflow

1. Open your project with a `.goalie` directory
2. The Pattern Metrics view will auto-populate
3. Use filters to focus on specific circles or depths
4. Click patterns to see WSJF recommendations
5. Promote high-priority patterns to Kanban

### OAuth Integration Workflow

1. Configure your preferred domain in settings
2. Run `Goalie: Login to OAuth Provider`
3. Complete authentication in browser
4. Status bar shows connected state
5. Make authenticated API requests

### DT Calibration Workflow

1. Run your DT evaluation pipeline to populate metrics
2. Run `af dt-dashboard` to generate artifacts
3. Use `Goalie: Show DT Evaluation Dashboard` to inspect
4. Run `Goalie: Run DT Calibration E2E Check` for validation

## 🔧 Development

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- TypeScript 5.x

### Building

```bash
npm install
npm run build
```

### Watching

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

### Linting

```bash
npm run lint
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📚 Related Documentation

- [Agentic Flow Documentation](../../docs/)
- [Circle Governance Guide](../../docs/CIRCLES_DOD.md)
- [DT Threshold Calibration](../../docs/dt_threshold_calibration.md)
- [Federation Architecture](../../docs/FEDERATION.md)

## 🐛 Troubleshooting

### Extension Not Loading

1. Check that `.goalie` directory exists
2. Verify workspace folder is opened
3. Check Output panel for errors

### OAuth Issues

1. Ensure network connectivity
2. Check browser popup blockers
3. Verify callback port (54321) is available

### Performance Issues

1. Reduce `patternMetrics.pageSize`
2. Enable `fileWatcher.enableBatching`
3. Increase `fileWatcher.debounceDelay`

## 📞 Support

- [GitHub Issues](https://github.com/agentic-flow/issues)
- [Documentation](../../docs/)
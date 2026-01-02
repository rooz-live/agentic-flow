import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
/**
 * Enhanced Goalie Admin Panel with WSJF, OAuth, and Circle Configuration
 */
export class GoalieAdminPanel {
    workspaceRoot;
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    // Supported OAuth domains with metadata
    static OAUTH_DOMAINS = {
        communication: [
            {
                domain: "720.chat",
                name: "720 Chat",
                icon: "💬",
                description: "Community chat platform",
            },
            {
                domain: "artchat.art",
                name: "ArtChat",
                icon: "🎨",
                description: "Creative community platform",
            },
            {
                domain: "chatfans.fans",
                name: "ChatFans",
                icon: "❤️",
                description: "Fan community platform",
            },
        ],
        business: [
            {
                domain: "decisioncall.com",
                name: "DecisionCall",
                icon: "📞",
                description: "Decision management platform",
            },
            {
                domain: "o-gov.com",
                name: "O-Gov Governance",
                icon: "⚖️",
                description: "Governance and compliance",
                wsjfEnabled: true,
            },
            {
                domain: "tag.vote",
                name: "Tag Vote",
                icon: "🗳️",
                description: "Voting and analytics",
            },
        ],
        streaming: [
            {
                domain: "rooz.live",
                name: "Rooz Live",
                icon: "📡",
                description: "Live streaming platform",
                links: {
                    cv: "https://cv.rooz.live",
                    credly: "https://cv.rooz.live/credly",
                    calendar: "https://cal.rooz.live",
                    venmo: "https://go.rooz.live/venmo",
                },
            },
        ],
        infrastructure: [
            {
                domain: "openstack.org",
                name: "OpenStack",
                icon: "☁️",
                description: "Cloud computing infrastructure",
            },
            {
                domain: "starlingx.io",
                name: "StarlingX",
                icon: "🦅",
                description: "Edge cloud infrastructure",
            },
            {
                domain: "hostbillapp.com",
                name: "HostBill",
                icon: "🧾",
                description: "Billing and automation",
            },
        ],
        commerce: [
            {
                domain: "oroinc.com",
                name: "OroCommerce",
                icon: "🛒",
                description: "B2B e-commerce platform",
            },
            {
                domain: "symfony.com",
                name: "Symfony",
                icon: "🎻",
                description: "PHP framework ecosystem",
            },
            {
                domain: "affiliate.platform",
                name: "Affiliate Platform",
                icon: "🤝",
                description: "Partner management system",
            },
        ],
        content: [
            {
                domain: "wordpress.org",
                name: "WordPress",
                icon: "📝",
                description: "CMS & publishing",
            },
            {
                domain: "flarum.org",
                name: "Flarum",
                icon: "💬",
                description: "Community forum software",
            },
        ],
        analytics: [
            {
                domain: "risk.analytics",
                name: "Risk Analytics",
                icon: "📈",
                description: "Real-time risk monitoring",
                wsjfEnabled: true,
            },
            {
                domain: "inboxzero.app",
                name: "Inbox Zero",
                icon: "📥",
                description: "Email and task triage",
            },
        ],
    };
    // Circle tier schemas
    static CIRCLE_TIERS = {
        tier1: {
            name: "Tier 1 (High Structure)",
            circles: ["orchestrator", "assessor"],
            schema: "ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF",
            reason: "Direct impact on throughput, governance gates, deployment flow",
        },
        tier2: {
            name: "Tier 2 (Medium Structure)",
            circles: ["analyst", "innovator", "seeker"],
            schema: "ID | Task | Status | DoR (Hypothesis/Baseline) | DoD (Result/Success) | WSJF",
            reason: "Lightweight hypothesis-driven work, CoD often emergent",
        },
        tier3: {
            name: "Tier 3 (Flexible)",
            circles: ["intuitive", "facilitator", "scout", "synthesizer"],
            schema: "- [ ] #pattern:X #wsjf:Y Task description",
            reason: "Qualitative insights, contextual evaluation, relationship mapping",
        },
    };
    static createOrShow(extensionUri, workspaceRoot) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (GoalieAdminPanel.currentPanel) {
            GoalieAdminPanel.currentPanel._panel.reveal(column);
            GoalieAdminPanel.currentPanel._update();
            return;
        }
        const panel = vscode.window.createWebviewPanel("goalieAdmin", "Goalie Admin Panel", column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
        });
        GoalieAdminPanel.currentPanel = new GoalieAdminPanel(panel, extensionUri, workspaceRoot);
    }
    constructor(panel, extensionUri, workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.onDidChangeViewState(() => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            await this._handleMessage(message);
        }, null, this._disposables);
    }
    dispose() {
        GoalieAdminPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }
    async _handleMessage(message) {
        switch (message.command) {
            case "saveConfig":
                await this._saveConfig(message.data);
                vscode.window.showInformationMessage("Goalie configuration saved");
                break;
            case "oauthSignIn":
                await this._handleOAuthSignIn(message.data?.domain);
                break;
            case "oauthSignOut":
                await vscode.commands.executeCommand("goalie.oauth.logout");
                this._update();
                break;
            case "runGovernanceAgent":
                await this._runFederationCommand("governance-agent");
                break;
            case "runRetroCoach":
                await this._runFederationCommand("retro-coach");
                break;
            case "runProdCycle":
                await this._runProdCycle(message.data);
                break;
            case "calculateWsjf":
                await this._calculateWsjf(message.data);
                break;
            case "openExternalLink":
                if (message.data?.url) {
                    await vscode.env.openExternal(vscode.Uri.parse(message.data.url));
                }
                break;
            case "refreshStatus":
                this._update();
                break;
            case "saveCircleConfig":
                await this._saveCircleConfig(message.data);
                break;
            case "exportMetrics":
                await vscode.commands.executeCommand("goalie.integration.exportMetrics");
                break;
        }
    }
    async _saveConfig(data) {
        const config = vscode.workspace.getConfiguration("goalie");
        const updateIfPresent = async (key, value, target = vscode.ConfigurationTarget.Global) => {
            if (value !== undefined && value !== null) {
                await config.update(key, value, target);
            }
        };
        await updateIfPresent("oauth.domain", data.oauthDomain);
        await updateIfPresent("llm.provider", data.llmProvider);
        await updateIfPresent("llm.endpoint", data.llmEndpoint);
        await updateIfPresent("patternMetrics.pageSize", data.pageSize);
        await updateIfPresent("patternMetrics.autoRefresh", data.autoRefresh);
        await updateIfPresent("fileWatcher.debounceDelay", data.debounceDelay);
        await updateIfPresent("fileWatcher.enableBatching", data.enableBatching);
        await updateIfPresent("alerts.notificationCooldown", data.alertCooldown);
        if (data.mcpServers) {
            try {
                const parsed = JSON.parse(data.mcpServers);
                await updateIfPresent("mcp.servers", parsed);
            }
            catch {
                vscode.window.showWarningMessage("Invalid MCP servers JSON");
            }
        }
    }
    async _handleOAuthSignIn(domain) {
        if (domain) {
            const config = vscode.workspace.getConfiguration("goalie");
            await config.update("oauth.domain", domain, vscode.ConfigurationTarget.Global);
        }
        await vscode.commands.executeCommand("goalie.oauth.login");
        setTimeout(() => this._update(), 2000);
    }
    async _runFederationCommand(command) {
        const terminal = vscode.window.createTerminal(`Goalie ${command}`);
        terminal.show();
        const scriptPath = this.workspaceRoot
            ? path.join(this.workspaceRoot, "scripts", "af")
            : "af";
        terminal.sendText(`${scriptPath} ${command} --json`);
    }
    async _runProdCycle(data) {
        const terminal = vscode.window.createTerminal("Goalie prod-cycle");
        terminal.show();
        const scriptPath = this.workspaceRoot
            ? path.join(this.workspaceRoot, "scripts", "af")
            : "af";
        const circle = data?.circle || "";
        const iterations = data?.iterations || 1;
        let cmd = `${scriptPath} prod-cycle --iterations ${iterations}`;
        if (circle) {
            cmd += ` --circle ${circle}`;
        }
        terminal.sendText(cmd);
    }
    async _calculateWsjf(data) {
        if (!this.workspaceRoot) {
            vscode.window.showErrorMessage("No workspace root found");
            return;
        }
        const wsjfPath = path.join(this.workspaceRoot, "tools", "federation", "wsjf_calculator.ts");
        if (!fs.existsSync(wsjfPath)) {
            vscode.window.showErrorMessage("WSJF calculator not found");
            return;
        }
        const terminal = vscode.window.createTerminal("WSJF Calculator");
        terminal.show();
        terminal.sendText(`npx ts-node ${wsjfPath}`);
    }
    async _saveCircleConfig(data) {
        if (!this.workspaceRoot || !data)
            return;
        const goalieDir = path.join(this.workspaceRoot, ".goalie");
        const configPath = path.join(goalieDir, "circle_schemas.json");
        if (!fs.existsSync(goalieDir)) {
            fs.mkdirSync(goalieDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
        vscode.window.showInformationMessage("Circle configuration saved");
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }
    _getConfig() {
        const config = vscode.workspace.getConfiguration("goalie");
        return {
            oauthDomain: config.get("oauth.domain", "rooz.live"),
            llmProvider: config.get("llm.provider", "anthropic"),
            llmEndpoint: config.get("llm.endpoint", ""),
            mcpServers: JSON.stringify(config.get("mcp.servers", {}), null, 2),
            pageSize: config.get("patternMetrics.pageSize", 50),
            autoRefresh: config.get("patternMetrics.autoRefresh", true),
            debounceDelay: config.get("fileWatcher.debounceDelay", 300),
            enableBatching: config.get("fileWatcher.enableBatching", true),
            alertCooldown: config.get("alerts.notificationCooldown", 300000),
        };
    }
    _getGoalieStatus() {
        if (!this.workspaceRoot) {
            return {
                hasGoalieDir: false,
                hasPatternMetrics: false,
                hasKanban: false,
                patternCount: 0,
            };
        }
        const goalieDir = path.join(this.workspaceRoot, ".goalie");
        const hasGoalieDir = fs.existsSync(goalieDir);
        const metricsPath = path.join(goalieDir, "pattern_metrics.jsonl");
        const hasPatternMetrics = fs.existsSync(metricsPath);
        const kanbanPath = path.join(goalieDir, "KANBAN_BOARD.yaml");
        const hasKanban = fs.existsSync(kanbanPath);
        let patternCount = 0;
        if (hasPatternMetrics) {
            try {
                const content = fs.readFileSync(metricsPath, "utf8");
                patternCount = content.split("\n").filter(Boolean).length;
            }
            catch {
                // ignore
            }
        }
        return { hasGoalieDir, hasPatternMetrics, hasKanban, patternCount };
    }
    _getHtmlForWebview() {
        const config = this._getConfig();
        const status = this._getGoalieStatus();
        const domains = GoalieAdminPanel.OAUTH_DOMAINS;
        const tiers = GoalieAdminPanel.CIRCLE_TIERS;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goalie Admin Panel</title>
  <style>
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --bg-tertiary: var(--vscode-input-background);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --accent: var(--vscode-textLink-foreground);
      --accent-hover: var(--vscode-textLink-activeForeground);
      --border: var(--vscode-panel-border);
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --info: #3b82f6;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 0;
      line-height: 1.5;
    }

    .admin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }

    .admin-header h1 {
      font-size: 1.5em;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .admin-header .logo {
      font-size: 1.8em;
    }

    .status-badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 500;
    }

    .badge.success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .badge.warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .badge.error { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .badge.info { background: rgba(59, 130, 246, 0.2); color: var(--info); }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
      overflow-x: auto;
    }

    .tab {
      padding: 12px 20px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.9em;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: var(--text-primary);
      background: var(--bg-secondary);
    }

    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .section {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 1.1em;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      font-size: 0.9em;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      color: var(--text-secondary);
      font-size: 0.8em;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: inherit;
      font-size: inherit;
      transition: border-color 0.2s;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    textarea {
      min-height: 120px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.9em;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .checkbox-group input[type="checkbox"] {
      width: auto;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 18px;
      border: none;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.9em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
    }

    .btn-success {
      background: var(--success);
      color: white;
    }

    .btn-warning {
      background: var(--warning);
      color: white;
    }

    .btn-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .domain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .domain-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .domain-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .domain-card.selected {
      border-color: var(--accent);
      background: rgba(59, 130, 246, 0.1);
    }

    .domain-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .domain-icon {
      font-size: 1.5em;
    }

    .domain-name {
      font-weight: 600;
    }

    .domain-url {
      font-size: 0.8em;
      color: var(--text-secondary);
    }

    .domain-description {
      font-size: 0.85em;
      color: var(--text-secondary);
    }

    .tier-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .tier-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .tier-title {
      font-weight: 600;
      color: var(--accent);
    }

    .tier-circles {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .circle-tag {
      background: var(--bg-secondary);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 500;
    }

    .tier-schema {
      background: var(--bg-primary);
      padding: 10px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.85em;
      overflow-x: auto;
    }

    .tier-reason {
      font-size: 0.85em;
      color: var(--text-secondary);
      font-style: italic;
      margin-top: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 2em;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-label {
      font-size: 0.85em;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .link-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      color: var(--text-primary);
    }

    .link-card:hover {
      border-color: var(--accent);
      background: rgba(59, 130, 246, 0.05);
    }

    .link-icon {
      font-size: 1.3em;
    }

    .link-text {
      font-size: 0.9em;
    }

    .action-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .input-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .category-title {
      font-size: 0.85em;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 16px 0 12px 0;
    }

    .category-title:first-child {
      margin-top: 0;
    }

    .wsjf-formula {
      background: var(--bg-primary);
      border-left: 3px solid var(--accent);
      padding: 12px 16px;
      margin: 16px 0;
      font-family: var(--vscode-editor-font-family), monospace;
      font-size: 0.9em;
    }

    .wsjf-formula code {
      color: var(--accent);
    }

    .prod-cycle-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .prod-cycle-options {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>
        <span class="logo">⚽</span>
        Goalie Admin Panel
      </h1>
      <div class="status-badges">
        ${status.hasGoalieDir ? '<span class="badge success">✓ .goalie</span>' : '<span class="badge error">✗ .goalie</span>'}
        ${status.hasPatternMetrics ? `<span class="badge info">${status.patternCount} patterns</span>` : '<span class="badge warning">No metrics</span>'}
        ${status.hasKanban ? '<span class="badge success">✓ Kanban</span>' : '<span class="badge warning">No Kanban</span>'}
      </div>
    </header>

    <nav class="tabs">
      <button class="tab active" data-tab="auth">🔐 Authentication</button>
      <button class="tab" data-tab="wsjf">📊 WSJF & CoD</button>
      <button class="tab" data-tab="circles">🔵 Circles</button>
      <button class="tab" data-tab="federation">🚀 Federation</button>
      <button class="tab" data-tab="ai">🧠 AI Reasoning</button>
      <button class="tab" data-tab="settings">⚙️ Settings</button>
      <button class="tab" data-tab="links">🔗 Resources</button>
    </nav>

    <!-- Authentication Tab -->
    <div id="auth" class="tab-content active">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🌐 OAuth Domain Selection</h2>
          <button class="btn btn-primary" onclick="signIn()">Sign In</button>
        </div>
        <p style="margin-bottom: 16px; color: var(--text-secondary);">
          Select your preferred authentication domain. WSJF-enabled domains support governance metrics.
        </p>

        <div class="category-title">💬 Communication Platforms</div>
        <div class="domain-grid">
          ${domains.communication
            .map((d) => `
            <div class="domain-card ${config.oauthDomain === d.domain ? "selected" : ""}" onclick="selectDomain('${d.domain}')">
              <div class="domain-card-header">
                <span class="domain-icon">${d.icon}</span>
                <div>
                  <div class="domain-name">${d.name}</div>
                  <div class="domain-url">${d.domain}</div>
                </div>
              </div>
              <div class="domain-description">${d.description}</div>
            </div>
          `)
            .join("")}
        </div>

        <div class="category-title">💼 Business & Governance</div>
        <div class="domain-grid">
          ${domains.business
            .map((d) => `
            <div class="domain-card ${config.oauthDomain === d.domain ? "selected" : ""}" onclick="selectDomain('${d.domain}')">
              <div class="domain-card-header">
                <span class="domain-icon">${d.icon}</span>
                <div>
                  <div class="domain-name">${d.name} ${d.wsjfEnabled ? '<span class="badge info" style="font-size: 0.7em;">WSJF</span>' : ""}</div>
                  <div class="domain-url">${d.domain}</div>
                </div>
              </div>
              <div class="domain-description">${d.description}</div>
            </div>
          `)
            .join("")}
        </div>

        <div class="category-title">📡 Live & Streaming</div>
        <div class="domain-grid">
          ${domains.streaming
            .map((d) => `
            <div class="domain-card ${config.oauthDomain === d.domain ? "selected" : ""}" onclick="selectDomain('${d.domain}')">
              <div class="domain-card-header">
                <span class="domain-icon">${d.icon}</span>
                <div>
                  <div class="domain-name">${d.name}</div>
                  <div class="domain-url">${d.domain}</div>
                </div>
              </div>
              <div class="domain-description">${d.description}</div>
            </div>
          `)
            .join("")}
        </div>
      </div>
    </div>

    <!-- WSJF & CoD Tab -->
    <div id="wsjf" class="tab-content">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">📊 WSJF Prioritization</h2>
          <button class="btn btn-primary" onclick="calculateWsjf()">Calculate WSJF</button>
        </div>

        <div class="wsjf-formula">
          <strong>WSJF = Cost of Delay / Job Duration</strong><br>
          <code>CoD = User Business Value + Time Criticality + Risk Reduction/Opportunity Enablement</code>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${status.patternCount}</div>
            <div class="stat-label">Patterns Tracked</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">Avg WSJF Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">Critical Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">CoD Threshold</div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-secondary" onclick="runCommand('goalie.showWsjfRecommendation')">View Recommendations</button>
          <button class="btn btn-secondary" onclick="runCommand('goalieDashboard.refresh')">Refresh Metrics</button>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">📈 CoD Components</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Cost of Delay components auto-calculate WSJF during circle replenishment.
        </p>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">User Business Value</span>
          </div>
          <p style="font-size: 0.9em;">Impact on customers, revenue, or strategic objectives</p>
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Time Criticality</span>
          </div>
          <p style="font-size: 0.9em;">Urgency based on deadlines, market windows, or dependencies</p>
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Risk Reduction / Opportunity Enablement</span>
          </div>
          <p style="font-size: 0.9em;">Risk mitigation or new capability enablement value</p>
        </div>
      </div>
    </div>

    <!-- Circles Tab -->
    <div id="circles" class="tab-content">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🔵 Circle Schema Tiers</h2>
          <button class="btn btn-primary" onclick="saveCircleConfig()">Save Configuration</button>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Adaptive schema based on circle mandate rather than universal template.
        </p>

        ${Object.entries(tiers)
            .map(([key, tier]) => `
          <div class="tier-card">
            <div class="tier-header">
              <span class="tier-title">${tier.name}</span>
            </div>
            <div class="tier-circles">
              ${tier.circles.map((c) => `<span class="circle-tag">${c}</span>`).join("")}
            </div>
            <div class="tier-schema">${tier.schema}</div>
            <div class="tier-reason">📝 ${tier.reason}</div>
          </div>
        `)
            .join("")}
      </div>

      <div class="section">
        <h2 class="section-title">🔄 Circle Replenishment</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Run replenishment with auto-calculated WSJF across circles.
        </p>

        <div class="btn-group">
          <button class="btn btn-secondary" onclick="runReplenish('analyst')">Analyst</button>
          <button class="btn btn-secondary" onclick="runReplenish('assessor')">Assessor</button>
          <button class="btn btn-secondary" onclick="runReplenish('innovator')">Innovator</button>
          <button class="btn btn-secondary" onclick="runReplenish('intuitive')">Intuitive</button>
          <button class="btn btn-secondary" onclick="runReplenish('orchestrator')">Orchestrator</button>
          <button class="btn btn-secondary" onclick="runReplenish('seeker')">Seeker</button>
        </div>
      </div>
    </div>

    <!-- Federation Tab -->
    <div id="federation" class="tab-content">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🚀 Federation Commands</h2>
        </div>

        <div class="btn-group" style="margin-bottom: 20px;">
          <button class="btn btn-success" onclick="runGovernanceAgent()">▶ Governance Agent</button>
          <button class="btn btn-success" onclick="runRetroCoach()">▶ Retro Coach</button>
          <button class="btn btn-warning" onclick="runProdCycle()">▶ Prod Cycle</button>
        </div>

        <div class="prod-cycle-options">
          <div class="form-group">
            <label>Circle</label>
            <select id="prodCycleCircle">
              <option value="">All Circles</option>
              <option value="analyst">Analyst</option>
              <option value="assessor">Assessor</option>
              <option value="innovator">Innovator</option>
              <option value="intuitive">Intuitive</option>
              <option value="orchestrator">Orchestrator</option>
              <option value="seeker">Seeker</option>
            </select>
          </div>
          <div class="form-group">
            <label>Iterations</label>
            <input type="number" id="prodCycleIterations" value="1" min="1" max="100">
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">📋 Quick Commands</h2>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="runAfCommand('status')">af status</button>
          <button class="btn btn-secondary" onclick="runAfCommand('board')">af board</button>
          <button class="btn btn-secondary" onclick="runAfCommand('wsjf')">af wsjf</button>
          <button class="btn btn-secondary" onclick="runAfCommand('quick-wins')">af quick-wins</button>
          <button class="btn btn-secondary" onclick="runAfCommand('blockers')">af blockers</button>
          <button class="btn btn-secondary" onclick="runAfCommand('metrics')">af metrics</button>
        </div>
      </div>
    </div>

    <!-- AI Reasoning Tab -->
    <div id="ai" class="tab-content">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🧠 AI Reasoning Integration</h2>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Advanced reasoning with VibeThinker and Harbor framework for enhanced WSJF decisions.
        </p>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">VibeThinker 1.5B</span>
            <span class="badge info">Reasoning</span>
          </div>
          <p style="font-size: 0.9em; margin-bottom: 8px;">Extended thinking with diversity sampling for Pass@K optimization.</p>
          <div class="tier-circles">
            <span class="circle-tag">diversity-sampling</span>
            <span class="circle-tag">pass-at-k</span>
            <span class="circle-tag">reasoning</span>
          </div>
          <div class="btn-group" style="margin-top: 12px;">
            <button class="btn btn-secondary" onclick="openLink('https://huggingface.co/WeiboAI/VibeThinker-1.5B')">HuggingFace</button>
            <button class="btn btn-secondary" onclick="openLink('https://arxiv.org/pdf/2511.06221')">Paper</button>
          </div>
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Harbor Framework</span>
            <span class="badge success">Orchestration</span>
          </div>
          <p style="font-size: 0.9em; margin-bottom: 8px;">Agent orchestration with tool-use and memory for complex workflows.</p>
          <div class="tier-circles">
            <span class="circle-tag">agent-orchestration</span>
            <span class="circle-tag">tool-use</span>
            <span class="circle-tag">memory</span>
          </div>
          <div class="btn-group" style="margin-top: 12px;">
            <button class="btn btn-secondary" onclick="openLink('https://harborframework.com/')">Documentation</button>
          </div>
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Prime Intellect</span>
            <span class="badge warning">Compute</span>
          </div>
          <p style="font-size: 0.9em; margin-bottom: 8px;">Distributed training and decentralized compute environments.</p>
          <div class="btn-group" style="margin-top: 12px;">
            <button class="btn btn-secondary" onclick="openLink('https://github.com/PrimeIntellect-ai/')">GitHub</button>
            <button class="btn btn-secondary" onclick="openLink('https://www.primeintellect.ai/blog/environments')">Blog</button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🧪 Testing Methodology</h2>
        </div>

        <div class="wsjf-formula">
          <strong>SFT (Spectrum Phase)</strong>: Maximize diversity across potential solutions → Improve Pass@K<br>
          <strong>RL (Signal Phase)</strong>: MaxEnt-Guided Policy Optimization (MGPO) → Amplify correct paths
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Spectrum Phase (SFT)</span>
          </div>
          <p style="font-size: 0.9em;">Train to maximize diversity across potential correct answers. Builds wide range of plausible solution paths.</p>
          <div class="tier-reason">📊 Output: High Pass@K score with diverse solution pool</div>
        </div>

        <div class="tier-card">
          <div class="tier-header">
            <span class="tier-title">Signal Phase (RL)</span>
          </div>
          <p style="font-size: 0.9em;">MaxEnt-Guided Policy Optimization identifies and amplifies most correct paths. Entropy-based weighting focuses on uncertain problems.</p>
          <div class="tier-reason">🎯 Output: Ranked solutions with confidence scores</div>
        </div>

        <div class="action-row">
          <button class="btn btn-primary" onclick="runTestingCycle()">▶ Run Testing Cycle</button>
          <button class="btn btn-secondary" onclick="runBacktest()">📈 Backtest Strategy</button>
          <button class="btn btn-secondary" onclick="runForwardTest()">🔮 Forward Test</button>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🎯 GOAP Planner (PR #127)</h2>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Goal-Oriented Action Planning with dream engine and knowledge transfer.
        </p>

        <div class="wsjf-formula">
          <strong>5 Phases</strong>: Foundation → Learning → Transfer → Optimization → Emergence<br>
          <code>Dream Engine</code>: REM-inspired consolidation | <code>Knowledge Transfer</code>: 70%+ target
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">10</div>
            <div class="stat-label">GOAP Actions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">5</div>
            <div class="stat-label">Phases</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">70%</div>
            <div class="stat-label">Transfer Target</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">150x</div>
            <div class="stat-label">Learning Speed</div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-primary" onclick="runGoapPlan()">▶ Generate Plan</button>
          <button class="btn btn-secondary" onclick="runGoapSimulate()">🔄 Simulate Cycle</button>
          <button class="btn btn-secondary" onclick="runGoapActions()">📋 List Actions</button>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">📊 Risk Analytics & Inbox Zero</h2>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">VaR (95%)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">Max Drawdown</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">Sharpe Ratio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">—</div>
            <div class="stat-label">Inbox Items</div>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-secondary" onclick="runRiskAnalytics()">📈 Run Risk Analysis</button>
          <button class="btn btn-secondary" onclick="runInboxZero()">📥 Process Inbox</button>
        </div>
      </div>
    </div>

    <!-- Settings Tab -->
    <div id="settings" class="tab-content">
      <div class="section">
        <h2 class="section-title">⚙️ General Settings</h2>

        <div class="input-row">
          <div class="form-group">
            <label>LLM Provider</label>
            <select id="llmProvider">
              <option value="anthropic" ${config.llmProvider === "anthropic" ? "selected" : ""}>Anthropic (Claude)</option>
              <option value="openai" ${config.llmProvider === "openai" ? "selected" : ""}>OpenAI</option>
              <option value="glm" ${config.llmProvider === "glm" ? "selected" : ""}>GLM-4</option>
              <option value="local" ${config.llmProvider === "local" ? "selected" : ""}>Local (Ollama)</option>
            </select>
          </div>
          <div class="form-group">
            <label>LLM Endpoint (Optional)</label>
            <input type="text" id="llmEndpoint" value="${config.llmEndpoint}" placeholder="https://api.anthropic.com/v1">
          </div>
        </div>

        <div class="input-row">
          <div class="form-group">
            <label>Pattern Metrics Page Size</label>
            <input type="number" id="pageSize" value="${config.pageSize}" min="10" max="500">
          </div>
          <div class="form-group">
            <label>File Watcher Debounce (ms)</label>
            <input type="number" id="debounceDelay" value="${config.debounceDelay}" min="100" max="5000">
          </div>
        </div>

        <div class="input-row">
          <div class="form-group">
            <label>Alert Cooldown (ms)</label>
            <input type="number" id="alertCooldown" value="${config.alertCooldown}" min="60000" max="3600000">
          </div>
          <div class="form-group">
            <div class="checkbox-group" style="margin-top: 28px;">
              <input type="checkbox" id="autoRefresh" ${config.autoRefresh ? "checked" : ""}>
              <label for="autoRefresh" style="margin: 0;">Auto-refresh metrics</label>
            </div>
            <div class="checkbox-group" style="margin-top: 8px;">
              <input type="checkbox" id="enableBatching" ${config.enableBatching ? "checked" : ""}>
              <label for="enableBatching" style="margin: 0;">Enable file batching</label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>MCP Servers (JSON)</label>
          <textarea id="mcpServers" rows="6">${config.mcpServers}</textarea>
        </div>

        <div class="action-row">
          <button class="btn btn-primary" onclick="saveConfig()">Save Settings</button>
          <button class="btn btn-secondary" onclick="exportMetrics()">Export Metrics</button>
          <button class="btn btn-secondary" onclick="refreshStatus()">Refresh Status</button>
        </div>
      </div>
    </div>

    <!-- Links Tab -->
    <div id="links" class="tab-content">
      <div class="section">
        <h2 class="section-title">🔗 Quick Links</h2>

        <div class="category-title">📋 Professional</div>
        <div class="links-grid">
          <div class="link-card" onclick="openLink('https://cv.rooz.live')">
            <span class="link-icon">🗂</span>
            <span class="link-text">CV / Resume</span>
          </div>
          <div class="link-card" onclick="openLink('https://cv.rooz.live/credly')">
            <span class="link-icon">🪪</span>
            <span class="link-text">Credly Badges</span>
          </div>
          <div class="link-card" onclick="openLink('https://decisioncall.com')">
            <span class="link-icon">💬</span>
            <span class="link-text">DecisionCall</span>
          </div>
        </div>

        <div class="category-title">📅 Scheduling</div>
        <div class="links-grid">
          <div class="link-card" onclick="openLink('https://cal.rooz.live')">
            <span class="link-icon">🗓</span>
            <span class="link-text">Calendar</span>
          </div>
          <div class="link-card" onclick="openLink('https://cal.rooz.live/intro')">
            <span class="link-icon">👋</span>
            <span class="link-text">Intro Meeting</span>
          </div>
          <div class="link-card" onclick="openLink('https://720.chat')">
            <span class="link-icon">💭</span>
            <span class="link-text">720 Chat</span>
          </div>
        </div>

        <div class="category-title">💰 Pricing Tiers</div>
        <div class="links-grid">
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/50')">
            <span class="link-icon">🎯</span>
            <span class="link-text">$50 Iterative</span>
          </div>
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/250')">
            <span class="link-icon">⏰</span>
            <span class="link-text">$250/hr Lingual</span>
          </div>
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/2500')">
            <span class="link-icon">📆</span>
            <span class="link-text">$2.5K/day Multilingual</span>
          </div>
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/25M')">
            <span class="link-icon">🚀</span>
            <span class="link-text">$25M Sprint</span>
          </div>
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/250M')">
            <span class="link-icon">🌏</span>
            <span class="link-text">$250M Season</span>
          </div>
          <div class="link-card" onclick="openLink('https://rooz.o-gov.com/1MM')">
            <span class="link-icon">💎</span>
            <span class="link-text">$1MM Protocol</span>
          </div>
        </div>

        <div class="category-title">💳 Payments</div>
        <div class="links-grid">
          <div class="link-card" onclick="openLink('https://go.rooz.live/venmo')">
            <span class="link-icon">🥖</span>
            <span class="link-text">Venmo</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let selectedDomain = '${config.oauthDomain}';

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    function selectDomain(domain) {
      selectedDomain = domain;
      document.querySelectorAll('.domain-card').forEach(card => {
        card.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
    }

    function signIn() {
      vscode.postMessage({ command: 'oauthSignIn', data: { domain: selectedDomain } });
    }

    function saveConfig() {
      const data = {
        oauthDomain: selectedDomain,
        llmProvider: document.getElementById('llmProvider').value,
        llmEndpoint: document.getElementById('llmEndpoint').value,
        pageSize: parseInt(document.getElementById('pageSize').value),
        debounceDelay: parseInt(document.getElementById('debounceDelay').value),
        alertCooldown: parseInt(document.getElementById('alertCooldown').value),
        autoRefresh: document.getElementById('autoRefresh').checked,
        enableBatching: document.getElementById('enableBatching').checked,
        mcpServers: document.getElementById('mcpServers').value
      };
      vscode.postMessage({ command: 'saveConfig', data });
    }

    function runGovernanceAgent() {
      vscode.postMessage({ command: 'runGovernanceAgent' });
    }

    function runRetroCoach() {
      vscode.postMessage({ command: 'runRetroCoach' });
    }

    function runProdCycle() {
      const circle = document.getElementById('prodCycleCircle').value;
      const iterations = parseInt(document.getElementById('prodCycleIterations').value);
      vscode.postMessage({ command: 'runProdCycle', data: { circle, iterations } });
    }

    function calculateWsjf() {
      vscode.postMessage({ command: 'calculateWsjf' });
    }

    function runAfCommand(cmd) {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: cmd } });
    }

    function runReplenish(circle) {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'replenish --circle ' + circle + ' --auto-calc-wsjf' } });
    }

    function saveCircleConfig() {
      vscode.postMessage({ command: 'saveCircleConfig', data: { tiers: ${JSON.stringify(tiers)} } });
    }

    function openLink(url) {
      vscode.postMessage({ command: 'openExternalLink', data: { url } });
    }

    function exportMetrics() {
      vscode.postMessage({ command: 'exportMetrics' });
    }

    function refreshStatus() {
      vscode.postMessage({ command: 'refreshStatus' });
    }

    function runCommand(cmd) {
      vscode.postMessage({ command: 'runProdCycle', data: { vscodeCommand: cmd } });
    }

    function runTestingCycle() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/testing_methodology.py --strategy momentum --json' } });
    }

    function runBacktest() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/testing_methodology.py --strategy backtest --samples 5' } });
    }

    function runForwardTest() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/testing_methodology.py --strategy forward --samples 3' } });
    }

    function runRiskAnalytics() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/risk_analytics.py' } });
    }

    function runInboxZero() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/inbox_zero.py --stats' } });
    }

    function runGoapPlan() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/goap_planner.py --plan --json' } });
    }

    function runGoapSimulate() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/goap_planner.py --simulate --json' } });
    }

    function runGoapActions() {
      vscode.postMessage({ command: 'runProdCycle', data: { customCommand: 'python3 scripts/agentic/goap_planner.py --actions' } });
    }
  </script>
</body>
</html>`;
    }
}
/**
 * Factory function for creating admin panel
 */
export function createAdminPanel(context, workspaceRoot) {
    GoalieAdminPanel.createOrShow(context.extensionUri, workspaceRoot);
}
//# sourceMappingURL=adminPanel.js.map
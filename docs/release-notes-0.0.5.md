# Goalie Dashboard VS Code Extension – Release Notes 0.0.5

## Summary

Version **0.0.5** of the Goalie Dashboard VS Code extension upgrades the extension to use the JSONbased `./scripts/af` workflow for federation agents, surfaces governance codefix proposals directly in the Governance Economics view, and improves retro baseline integration with the Goalie Gaps (Live) panel.

## Key Changes

### 1. JSONBased Federation Agent Integration

- `goalie.runGovernanceAudit` now calls **`./scripts/af governance-agent --json`** (via the shared `runAfJson('governance-agent')` helper) instead of `npx ts-node governance_agent.ts`.
- `goalie.runRetro` now calls **`./scripts/af retro-coach --json`** via `runAfJson('retro-coach')` instead of `npx ts-node retro_coach.ts` and stdout parsing.
- JSON output is parsed using the existing `extractJsonFromOutput` helper, and failures are logged to the Goalie output channel with userfriendly error messages.

### 2. Governance Economics – Code Fix Proposals

- The **Governance Economics** provider now keeps track of the latest governance JSON result:
  - `setGovernanceJson(json)` stores the full JSON payload and extracts `codeFixProposals` when present.
  - `getCodeFixProposals()` exposes proposals for other commands.
- Economic gap rows continue to be computed from `.goalie` metrics files, preserving backward compatibility.
- If `codeFixProposals` are present in the latest JSON:
  - Each proposal is rendered as a **noncollapsible tree item** in the Governance Economics view.
  - Items display:
    - Pattern name
    - Approval status indicator (⚠️ requires approval vs ✅ autoapprovable)
    - Short description and snippet preview (first few nonblank lines).
  - Clicking a proposal opens a **readonly markdown document** with the full snippet via `goalieDashboard.viewCodeFixProposal`.
- A new command **`goalieDashboard.viewAllCodeFixProposals`** opens a markdown document summarizing all proposals from the latest Governance Audit, including:
  - Pattern name
  - Description
  - Approval requirement
  - Code/config/test snippet (when available)

### 3. Retro Coach – JSON Workflow + Live Panel Refresh

- `goalie.runRetro` now runs the **JSONdriven retro coach** flow instead of scraping textual prompts:
  - Uses `runAfJson('retro-coach')` to obtain `{ goalieDir, insightsSummary, topEconomicGaps, workloadPrompts, baselineComparison }`.
  - If `workloadPrompts` is nonempty, the top 3 prompts are shown in a modal, with a note when more prompts are available.
  - If `insightsSummary` is present, it is shown as a fallback summary message.
- Baseline comparison integration:
  - When `baselineComparison` is present, the extension logs a concise snapshot to the Goalie output channel (baseline score, current score, delta, deltaPct).
  - After a successful retro run, the extension calls **`refreshLiveGapsPanelIfOpen()`** so the **Goalie Gaps (Live)** panel immediately reflects the latest retro baseline comparison and pattern deltas.

### 4. HPC Cost of Delay Documentation

- Added **`investing/agentic-flow/docs/hpc-cod-model.md`** documenting the HPCaware Cost of Delay model implemented in `governance_agent.ts`:
  - Base formula: `Total Impact = codAvg + 1.5 × computeAvg` for nonHPC patterns.
  - HPC formula: `Total Impact = codAvg + 4.0 × computeAvg` for HPCclass patterns.
  - HPC detection heuristics and additional weighting based on p99 latency, node count, queue time, and GPU utilization.
  - Worked examples for TensorFlow distributed training, HPC batch windows, PyTorch OOM/checkpoint overhead, and cluster network bottlenecks.

### 5. Debug Footer and Versioning

- The **Goalie Gaps (Live)** debug footer continues to provide a collapsible, color-coded status summary (paths, realtime gating, data file checks) with no structural changes.
- The footer now reports **`goalie-dashboard v0.0.5`** when this version is installed, aiding debugging of version-specific behavior.

### 6. TypeScript Build & Code Fix Application

- Fixed strict property initialization and timestamp typing in `src/tracking.ts` so `npm run build` passes without TypeScript errors.
- Added a new `Goalie: Apply Code Fix Proposal` command that appends governance-suggested code snippets to the end of the target file, guarded by a modal confirmation dialog and clear `// --- Goalie Code Fix: [pattern] ---` header comments.
- Wired an **"Apply Fix"** context menu action for code fix proposal items in the Governance Economics view, only when a proposal includes a `filePath`. The default click behavior remains **View** (read-only markdown preview).

## Validation Checklist

The following flows were validated against 0.0.5 in a clean test workspace:

1. **Governance Audit JSON Flow**
   - `goalie.runGovernanceAudit` executes `./scripts/af governance-agent --json`.
   - Governance JSON is parsed and cached; Governance Economics view refreshes.
   - Code fix proposals appear as additional items under the economics view when present.
2. **Retro Coach JSON Flow + Live Panel**
   - `goalie.runRetro` executes `./scripts/af retro-coach --json`.
   - Retro prompts are sourced from `workloadPrompts` JSON and displayed in a modal.
   - Live Gaps panel retro baseline section updates immediately after retro completion.
3. **Code Fix Proposal Views**
   - Clicking a proposal tree item opens a readonly markdown preview of the snippet.
   - Running `Goalie: View All Code Fix Proposals` shows a markdown summary of all proposals from the latest run.

## Version

- VS Code extension: **goalie-dashboard 0.0.5**

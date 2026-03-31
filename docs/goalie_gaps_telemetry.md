# Goalie Gaps Telemetry & Quick-Fix Integration

## Objectives
1. Measure whether the Goalie VS Code experience actually drives action on ML/HPC/Stats gaps during AF prod-cycle runs.
2. Capture guardrail interaction data (safe-degrade, guardrail-lock, HPC warnings) to inform UX experiments.
3. Provide an actionable quick-fix surface that lets engineers open or scaffold the remediation suggested by `proposeCodeFix()` without leaving VS Code.
4. Keep the “Goalie Gaps (Live)” dashboard in sync with AF prod-cycle agents via a streaming channel instead of polling the filesystem.

## UX & Telemetry Requirements
### Events to Emit
| Event | When | Payload |
| --- | --- | --- |
| `goalie.gapExpanded` | User expands a gap node in `goalieGapsView` | `{ pattern, circle, depth, cod, workloads, source: 'tree' }` |
| `goalie.guardrailIconClick` | User clicks a guardrail lock / safe-degrade icon in any panel | `{ pattern, guardrailType, action }` |
| `goalie.liveDashboard.opened` | Live dashboard webview opens | `{ lens, realtimeEnabled, prodCycleContext }` |
| `goalie.quickFix.applied` | Quick-fix button pressed | `{ pattern, fixType: 'code'|'config'|'test', filePath, mode }` |
| `goalie.retroPrompt.viewed` | Retro prompt modal shown | `{ workloadTag, pattern, cod }` |

Emit via VS Code `TelemetryLogger` (fallback to output channel if telemetry disabled). Include `afContext` (prod-cycle/dev-cycle) read from env.

### Panels & UI Cues
- Add icon-only buttons beside each gap row (in both tree view and live dashboard table) to trigger quick-fix actions.
- Display per-gap telemetry badges: hover shows aggregated clicks/quick-fix applications (from local session) to encourage follow-through.
- Show prod-cycle state indicator (green when AF context is prod, amber otherwise) in the dashboard header.

## Quick-Fix Workflow
1. **Discovery** – When governance_agent emits `codeFixProposals`, keep them cached per pattern/circle/depth in the extension.
2. **Surfacing** – Add context menu + inline button "Apply Suggested Fix" for gap entries. Button opens a Quick Pick listing available snippets (`codeSnippet`, `configSnippet`, `testSnippet`).
3. **Action** – When user selects a snippet:
   - If a `filePath` is provided and exists, open the file and insert the snippet at cursor with a comment header.
   - If file does not exist, scaffold it (create directories as needed) and paste snippet.
   - For config snippets, open diff view comparing generated content vs existing file (if any).
4. **Telemetry** – Record success/failure. Prompt to run associated tests (if snippet is test). Offer “Mark action complete” to append entry into `.goalie/CONSOLIDATED_ACTIONS.yaml`.

## AF Prod-Cycle Streaming Plan
### High-Level Flow
```
AF agents (governance_agent / retro_coach) ──> event bus (AF_STREAM.sock or redis)
                                             └─> VSIX Goalie extension subscribes via websocket/IPC
```

### Steps
1. **Agent Publisher**: augment `governance_agent.ts`/`retro_coach.ts` to optionally publish JSON payloads to a lightweight event bus when `AF_STREAM_SOCKET` is set (UNIX socket or TCP). Include message type, timestamp, and payload.
2. **VSIX Subscriber**: when `goalie.enableRealtimeDashboard` is true, spin up a client that connects to the socket and listens for `governance-json` / `retro-json` events. Fall back to existing `af … --json` polling if streaming is unavailable.
3. **State Cache**: maintain an in-memory cache of the last payloads so tree views can refresh immediately on event arrival, avoiding filesystem latency.
4. **Backpressure & Offline Handling**: if socket disconnects, log telemetry and resume polling every 30s until streaming returns.
5. **Security/Config**: derive socket path from `${workspaceRoot}/.goalie/af_stream.sock` by default; allow override via VS Code setting `goalie.streamSocketPath`.

## Open Questions / Next Steps
- Decide on persisted telemetry sink (internal endpoint vs local log). For now, store anonymized counts under `.goalie/telemetry_log.jsonl` for offline review.
- Confirm whether quick-fix scaffolding should auto-stage files or just open them.
- Validate event bus design with AF framework owners (ensure prod-cycle agents can safely emit realtime data).

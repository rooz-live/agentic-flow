# VSIX Quick-Fix & Streaming DoR/DoD

## Purpose
This document captures the Definition of Ready (DoR) and Definition of Done (DoD) for
Goalie's VS Code quick-fix UX and the AF real-time streaming bridge. The criteria tie
telemetry, UNIX-socket streaming, and session stats together so we can confidently ship the
VSIX quick-fix + live dashboard experience.

## Scope
- `tools/goalie-vscode` VSIX extension
- CLI publishers (`governance_agent.ts`, `retro_coach.ts`) emitting `governance-json` and
  `retro-json`
- AF stream socket client/server handoff (`af_stream.sock`)
- Telemetry surfaces (`GoalieTelemetry`, `.goalie/telemetry_log.jsonl` fallback)

## Definition of Ready
1. **Env & Dependencies**
   - `AF_STREAM_SOCKET` variable documented in README + launch configs.
   - Node typings (`@types/node`) available so CLI agents compile with stream helpers.
   - `.goalie` directory present with `OBSERVABILITY_ACTIONS.yaml`, pattern logs, and
     write permission for telemetry JSONL fallback.
2. **Instrumentation Hooks**
   - `GoalieTelemetry` wired into extension activation with `usage` + `error` events.
   - Stream publisher helper imported in governance + retro agents with graceful failure
     when socket absent.
   - `StreamClient` created during VSIX activation, passed a telemetry handle, and wired to
     refresh the Governance Economics and Gaps tree providers.
3. **Test Scaffolding**
   - Jest config runs extension unit tests with `ts-jest` + mocks for VS Code + net.
   - Telemetry helper covered by tests (fallback logging + property builder).
   - Planned mocks for stream socket (duplex stream or unix domain stub) with fixtures.
4. **Fixture Inputs**
   - Baseline governance JSON captured from `scripts/af governance-agent --json` after
     latest publisher changes.
   - Retro coach JSON fixture captured from equivalent CLI command.
5. **Ops Readiness**
   - Runbook snippet describing how to tail `.goalie/telemetry_log.jsonl` and
     `af_stream.sock` for troubleshooting.
   - NOW/NEXT/LATER backlog entries stubbed for downstream integrations.

## Definition of Done
| Area | Success Criteria | Validation Steps |
| --- | --- | --- |
| Quick-Fix Telemetry | Every QUICK_FIX_* command logs `usage` events with `sessionId`, `goalieDir`, `proposalId`, and `targetFile`. Errors emit `error` events containing stack + user-action context. | 1) Trigger a quick fix in VSIX; 2) Inspect VS Code telemetry dev console (or fallback JSONL) for event payload; 3) Confirm session stats updated in tree view. |
| Stream Events | `StreamClient` connects to `af_stream.sock`, emits `stream:connect/stream:event/stream:error/stream:disconnect` telemetry, and updates gaps/governance providers when `governance-json` payloads arrive. | 1) Export `AF_STREAM_SOCKET` and run extension with mock socket server; 2) Send governance payload fixture; 3) Observe tree refresh + telemetry logs. |
| Session Stats | Session panel increments `totalSuggestions`, `accepted`, `autoApplied`, etc. in response to quick-fix events and CLI runs. | 1) Execute governance audit command; 2) Apply at least one quick fix; 3) Verify tree provider + telemetry counters match expected deltas. |
| CLI Publishers | Governance + retro agents publish JSON payloads both to stdout (`--json`) and over the stream helper when socket set. No undefined helper references. | 1) Run `scripts/af governance-agent --json > tmp/governance.json`; 2) Validate JSON schema against fixture contract; 3) Run again with `AF_STREAM_SOCKET` pointing to nc listener to confirm socket write. |
| Tests & Docs | Telemetry Jest suite green; stream-client mock suite added; DoR/DoD doc checked into `docs/goalie_vscode_dor_dod.md`; README references real-time streaming instructions. | 1) `cd tools/goalie-vscode && npm test`; 2) Spot-check doc sections in review checklist. |

## Instrumentation Matrix
| Event | Source | Required Fields | Notes |
| --- | --- | --- | --- |
| `quickFix.apply` | command palette / tree item | `sessionId`, `proposalId`, `strategy`, `latencyMs`, `result` | Fired on success & error (with `result=error`). |
| `quickFix.batchApply` | multi-apply command | `sessionId`, `proposalCount`, `acceptedCount`, `failedCount` | Ensures we can reason about mass changes. |
| `stream.connect` | `StreamClient` | `socketPath`, `attempt`, `sessionId` | Only emitted when env variable present. |
| `stream.event` | `StreamClient` | `socketPath`, `eventType`, `sequenceId`, `payloadDigest` | Digest can be short hash to avoid PII. |
| `stream.error` | `StreamClient` | `socketPath`, `attempt`, `errorMessage`, `code` | Used for reconnect heuristics. |
| `session.stats` | `SessionStatsProvider` | `sessionId`, `metric`, `value`, `deltaSource` | Logged whenever local counters mutate. |

## Fixture Capture Workflow
1. `export AF_STREAM_SOCKET=$(pwd)/tmp/af_stream.sock`
2. Start a netcat listener: `rm -f $AF_STREAM_SOCKET && nc -lkU $AF_STREAM_SOCKET > tmp/stream.log`
3. Run governance agent: `scripts/af governance-agent --json > tmp/governance.json`
4. Run retro coach (optional for dashboard parity): `scripts/af retro-coach --json > tmp/retro.json`
5. Archive the JSON outputs under `tools/goalie-vscode/fixtures/` for Jest consumers.
6. Record hashes + timestamps in the readiness log so regressions can diff payloads.

## Readiness Checklist
- [ ] DoR items above verified by reviewer
- [ ] DoD validation steps executed + logged in PR description
- [ ] Telemetry + stream fixtures stored alongside tests
- [ ] `docs/goalie_vscode_dor_dod.md` linked from README + runbook

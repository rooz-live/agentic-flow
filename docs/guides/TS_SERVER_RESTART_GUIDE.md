# VS Code TypeScript Server Restart Guide

## When to do this

If you see TypeScript diagnostics that look stale (for example `@types/node` errors that persist after `ay yolife ts-refresh`), restart the VS Code TypeScript server.

Common triggers:

- You ran `ay yolife ts-refresh` (or reinstalled `node_modules`).
- You switched Node versions (nvm/asdf) or changed `typescript`/`@types/*` versions.
- `npm run build` succeeds, but VS Code Problems still shows old errors.

## Restart steps (VS Code)

1. Open the Command Palette.
2. Run: `TypeScript: Restart TS Server`.
3. Wait 5-20 seconds for indexing to settle.

If problems persist:

- Run: `Developer: Reload Window`.
- Then re-run: `TypeScript: Restart TS Server`.

## Quick confirmation checklist

- Open a TypeScript file inside `agentic-flow-core`.
- Confirm the Problems panel updates (errors should disappear or match `tsc`).
- Optional: Command Palette -> `TypeScript: Open TS Server log` and verify a fresh start sequence.

## Ground truth check (CLI)

When in doubt, treat `tsc` as authoritative.

From the relevant package folder, run the package build (or the repo build) and compare results to VS Code Problems.

# A11y Findings: in.html Dashboard

**Date:** 2026-03-11  
**Scope:** `.tmp/browser-check/in.html` and panel modules

## Completed

- **Workflow selector buttons:** Added `aria-label` for Email Send, Mover ETA, WSJF Review
- **Advanced/Contrastive toggle:** Added `aria-label` describing purpose
- **Send gate bar:** Added `role="status"`, `aria-live="polite"`, `aria-label="Send readiness gate"`
- **Filter checkboxes:** Already wrapped in `<label>` (Validation ON, Confidence, Bounce, TDD Pass/Fail)

## Remaining Debt (prioritized by impact)

1. **Inline styles:** Large volume of inline styles; prefer moving to CSS classes for maintainability
2. **Color contrast:** Verify #8b949e on #0d1117 meets WCAG AA (4.5:1 for text)
3. **Focus indicators:** Ensure visible focus ring on all interactive elements (buttons, links, inputs)
4. **axe scan:** Run `npx @axe-core/cli in.html` or browser extension for full audit

## Verification (Phase 7.2)

- Recipient selection, RCA merge, validate-full, send workflow, archive/snooze, mover SLA panel: functional
- "Good to send" appears only when gate passes (RUNNER_EXIT 0-1, fail100=0)
- Diagnostics hidden by default, visible via Advanced/Contrastive toggle

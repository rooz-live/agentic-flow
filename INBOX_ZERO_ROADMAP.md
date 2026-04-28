# INBOX ZERO TRACKER & IMPLEMENTATION ROADMAP

## Current State Analysis
The `comprehensive_email_automation.py` acts as our current Inbox Zero tracker. 
*   **Target Scope:** 352 Local Emails (MAA/Doug Grimes correspondence).
*   **Current Coverage:** ~1.1% (Local EML file parsing only).
*   **Architecture:** Monolithic script combining WSJF prioritization, ROAM risk matrices, and SQLite state tracking.

## Iterative Implementation Roadmap

### Phase 1: The "Beads" Shattering (Clean Room TDD)
* **Goal:** Improve agentic workflow by decomposing `comprehensive_email_automation.py` into atomic, testable functions (The `beads_rust` philosophy).
* **Action:** Break the monolith into standalone capabilities:
    * `beads_email/parse_eml_bead.py`
    * `beads_email/wsjf_scorer_bead.py`
    * `beads_email/roam_classifier_bead.py`
* **Compliance Gate:** Deploy a pre-commit server hook (`skill-ship-task`) to ensure every bead passes 100% isolation testing before merging into the main Swarm loop.

### Phase 2: Live API Bindings (Eliminating Local Mocks)
* **Goal:** Move from analyzing `.eml` file exports to live telemetry.
* **Action:** 
    * Implement the Gmail API `historyId` webhook to ingest emails the second they hit the inbox.
    * Implement Mailjet API integration to append Wholeness Metadata headers to outgoing replies.
* **Metric:** Increase tracking coverage from 1.1% to 50% (all active inbound/outbound).

### Phase 3: Matrix/Synapse Routing (The Agent Economy)
* **Goal:** Instead of just writing ROAM risks to an SQLite db, route them into the Fourth Wave ecosystem.
* **Action:** 
    * Integrate `element-web` and `synapse`. 
    * When `roam_classifier_bead.py` detects a SYSTEMIC Risk (e.g. Doug Grimes ignored 3 emails), it autonomously posts a mitigation contract to the Matrix room.
    * The Nous Hermes Agent evaluates the contract and proposes the immediate execution of a Settlement Extension Draft.

### Phase 4: 100% Coverage & Full Autonomous Action
* **Goal:** Complete Inbox Zero pipeline where WSJF=0 emails are archived, and WSJF>10 emails are auto-drafted by Hermes.
* **Action:** Enforce strict APFS/OPEX limits. Emails are converted to markdown, embedded, and physically shifted to the `/Volumes/cPanelBackups` ledger to preserve local system gravity.

---
**Execution Mandate:** Do you approve the Phase 1 "Beads" shattering of the comprehensive email script to enforce clean-room TDD?

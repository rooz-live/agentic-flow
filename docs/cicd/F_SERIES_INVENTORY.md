# F-Series Inventory — Receipt / Tick / Earnings Chain Closure

> Canonical map of the **F-series** behavioral contracts that close the MPP
> earnings → hire receipt chain. Each `F#` names a discrete, falsifiable
> property of the post-tick pipeline. Status reflects what is *proven by an
> executable test*, not what is asserted in prose.

**Status legend**
- ✅ **FIXED** — property proven by a committed, passing test.
- 🟢 **TESTED** — covered by an existing test that exercises the property.
- 🟡 **DESIGNATED** — a test slot is reserved/named but not yet implemented.
- ⬜ **OPEN** — not yet designated; proposal below.

---

## Proven (executable tests exist)

### F4 — tick-post pace reconcile / trap authority  ✅ FIXED
- **Property:** The `tick_post_hooks.sh` EXIT trap is pace-authoritative. On a
  stale/blocked LNNNL update it must fail-closed to `pace_source=stale`
  (never leak a live/last_good pace), and on a completed cycle it resolves
  `pace_source=policy_snapshot`.
- **Proven by:** [`test_tick_post_trap_integration.sh`](../../tests/cicd/test_tick_post_trap_integration.sh)
  (Phase 1 fail-closed + Phase 2 happy-path `pace_source=policy_snapshot`).
- **Immutable script:** [`scripts/cicd/tick_post_hooks.sh`](../../scripts/cicd/tick_post_hooks.sh).

### F9 — hire receipt schema closure  🟢 TESTED (NOW FULLY COVERED)
- **Property:** Every line appended to `.goalie/evidence/hire_receipts.jsonl`
  carries the F9 schema — `receipt_id` (non-empty), `timestamp` (ISO 8601),
  `status_code` (integer), `endpoint` (non-empty) — and the success invariant
  `status_code ∈ {200, 201, 202}`. If a `status` key is present it must equal
  `PASS` (forward-compatible).
- **Success semantics:** the canonical client
  ([`hire_mcp_client._write_receipt`](../../scripts/hire/hire_mcp_client.py)) and
  the in-script mock both key success off `status_code`; `status` is optional.
- **Proven by:** [`test_receipt_chain.sh`](../../tests/cicd/test_receipt_chain.sh)
  Phase 2 (per-line F9 validation) + Phase 1 (enforce-mode hire append) +
  Phase 4 (sequence closure to PASS).

### F11 — LNNNL update integrity  🟢 TESTED
- **Property:** `update_lnnnl` preserves lane ordering, monotonic tick counters,
  and shippable/hold lane separation without dropping or duplicating items.
- **Proven by:** [`test_update_lnnnl_integrity.sh`](../../tests/cicd/test_update_lnnnl_integrity.sh).

---

## Open (proposed designations)

These `F#`s are reserved for the properties below. Each proposal is grounded in
an existing script so the contract is implementable without new production code.

### F1 — CI provenance verification  ⬜ PROPOSED
- **Property:** In a CI context, `gate_integrity` is only `PASS` when an
  `AF_CI_PROVENANCE_SIGNATURE` from `emit_ci_provenance.sh` verifies against
  `allowed_signers` for the current HEAD. Otherwise `gate_integrity=FAIL`
  → disposition BLOCK (no self-asserted CI context).
- **Seed test:** [`test_emit_ci_provenance_failclosed.sh`](../../tests/cicd/test_emit_ci_provenance_failclosed.sh)
  already covers the fail-closed side; F1 would add the verified-PASS side.
- **Source:** [`derive_gate_integrity()`](../../scripts/gates/scorecard_gate.py).

### F2 — scorecard canonical-path resolution  ⬜ PROPOSED
- **Property:** `scorecard_resolver.py` resolves **only** scorecard documents
  (must carry `originality` + `impact` dicts) from
  `.goalie/scorecards/current.json` / `latest.json` or `AF_SCORECARD_PATH`, and
  rejects coherence-only artifacts (`{"gate":"coherence",...}`). No scorecard →
  receipt chain fail-closed under `ENFORCE=1`.
- **Source:** [`scorecard_resolver.py`](../../scripts/metrics/scorecard_resolver.py),
  covered partially by [`test_receipt_chain.sh`](../../tests/cicd/test_receipt_chain.sh) Phase 3.

### F3 — coherence artifact freshness & binding  ⬜ PROPOSED
- **Property:** `coherence_results.json` is only usable when `coherence=PASS`
  **and** `git_head` matches the current HEAD. A stale (HEAD-mismatched) or
  non-PASS artifact must yield `coherence=FAIL`, not a credit.
- **Source:** [`derive_coherence()`](../../scripts/gates/scorecard_gate.py)
  (`_coherence_artifact_usable`).

### F5 — earnings ledger verified-only credit  ⬜ PROPOSED
- **Property:** `earnings_engine.py` refuses to write a ledger entry from an
  unverified scorecard (`--verify` or `AF_EARNINGS_VERIFY=1` required) and
  refuses a `BLOCK` disposition. Ledger credits use the hardened result, never
  self-asserted `decision`/`sign_off`.
- **Source:** [`earnings_engine.py`](../../scripts/metrics/earnings_engine.py).

### F6 — earnings export require-verified gate  ⬜ PROPOSED
- **Property:** `earnings_export_json.py --require-verified` emits
  `earnings_latest.json` only from a `verified=true` ledger entry; absence of a
  verified entry blocks the receipt chain export step.
- **Source:** [`earnings_export_json.py`](../../scripts/metrics/earnings_export_json.py),
  exercised end-to-end by [`test_receipt_chain.sh`](../../tests/cicd/test_receipt_chain.sh) Phase 4.

### F7 — profile_readme EPA compile integrity  ⬜ PROPOSED
- **Property:** `compile_profile_readme.py` aggregates only `verified=true`
  ledger lines into the EPA table (latest + cumulative) and never invents
  metrics; a missing ledger or missing `profile_readme.md` fails non-zero.
- **Source:** [`compile_profile_readme.py`](../../scripts/hire/compile_profile_readme.py).

### F8 — intermediate BLOCK branch coverage  ⬜ PROPOSED
- **Property:** Each intermediate failure in
  [`receipt_chain.sh`](../../scripts/cicd/receipt_chain.sh) writes a `BLOCK`
  receipt (not `PASS`) and, under `ENFORCE=1`, exits non-zero. Branches:
  (1) earnings verify, (2) earnings export, (3) profile compile, (4) hire sync /
  receipt-append / receipt-schema-invalid. F8 would inject a failing step in
  each branch and assert `BLOCK` + non-zero exit.
- **Partial coverage:** Phase 3 covers the *no-scorecard* branch; the four
  mid-chain branches are not yet individually exercised.

### F10 — intel_pipeline post-receipt hook  ⬜ PROPOSED
- **Property:** After the PASS receipt is written, the post-receipt
  `intel_pipeline_tick.sh` hook runs best-effort and never inverts a PASS into a
  failure (its errors are demoted to `WARN:`).
- **Source:** [`receipt_chain.sh`](../../scripts/cicd/receipt_chain.sh) (tail),
  [`intel_pipeline_tick.sh`](../../scripts/cicd/intel_pipeline_tick.sh).

### F12 — coherence artifact signature  ⬜ PROPOSED
- **Property:** In CI/pre-commit, the coherence artifact must carry a verified
  SSH signature (`signature` + `principal`) over `git_head`; an unsigned or
  tampered artifact is rejected (`coherence=FAIL`).
- **Source:** [`_coherence_artifact_signed_usable()`](../../scripts/gates/scorecard_gate.py),
  `stamp_local_coherence_signature`.

### F13 — parallel/concurrent receipt write safety  ⬜ PROPOSED
- **Property:** Concurrent receipt-chain ticks must not corrupt
  `hire_receipts.jsonl` or `earnings_ledger.jsonl` (append-only atomicity) and
  must not collide on the per-tick receipt filename. Validates the
  `decentralized_lock.py` `flock` discipline and the `tick_${TS}` uniqueness
  window under parallel tiers.
- **Source:** [`receipt_chain.sh`](../../scripts/cicd/receipt_chain.sh)
  (`RECEIPT_PATH` / `_mock_hire_append`), [`decentralized_lock.py`](../../scripts/.../decentralized_lock.py).

---

## Summary

| F#  | Contract                                  | Status        | Test                                                                              |
|-----|-------------------------------------------|---------------|-----------------------------------------------------------------------------------|
| F1  | CI provenance verification                | ⬜ PROPOSED    | (extension of `test_emit_ci_provenance_failclosed.sh`)                            |
| F2  | scorecard canonical-path resolution       | ⬜ PROPOSED    | partial — `test_receipt_chain.sh` Phase 3                                         |
| F3  | coherence artifact freshness & binding    | ⬜ PROPOSED    | —                                                                                 |
| F4  | tick-post pace reconcile / trap authority | ✅ FIXED       | `test_tick_post_trap_integration.sh`                                              |
| F5  | earnings ledger verified-only credit      | ⬜ PROPOSED    | —                                                                                 |
| F6  | earnings export require-verified gate     | ⬜ PROPOSED    | end-to-end — `test_receipt_chain.sh` Phase 4                                      |
| F7  | profile_readme EPA compile integrity      | ⬜ PROPOSED    | —                                                                                 |
| F8  | intermediate BLOCK branch coverage        | ⬜ PROPOSED    | partial — `test_receipt_chain.sh` Phase 3 (no-scorecard branch only)              |
| F9  | hire receipt schema closure               | 🟢 TESTED     | `test_receipt_chain.sh` Phase 2 / Phase 1 / Phase 4                               |
| F10 | intel_pipeline post-receipt hook          | ⬜ PROPOSED    | —                                                                                 |
| F11 | LNNNL update integrity                    | 🟢 TESTED     | `test_update_lnnnl_integrity.sh`                                                  |
| F12 | coherence artifact signature              | ⬜ PROPOSED    | —                                                                                 |
| F13 | parallel/concurrent receipt write safety  | ⬜ PROPOSED    | —                                                                                 |

### Wave note (2026-06-29)
`test_receipt_chain.sh` now exercises the **enforce-mode happy path**, the
**F9 hire schema contract**, the **fail-closed no-scorecard branch**, and
**full sequence closure** — closing the highest-behavioral-ROI gap identified
in the receipt-chain RCA. F8 (the four mid-chain `BLOCK` branches) is the next
natural follow-on.

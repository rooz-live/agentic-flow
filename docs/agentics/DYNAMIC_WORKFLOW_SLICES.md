# Dynamic workflow slices (decomposed monolith)

## Invert rule
**Done** = `dod-gate --perceive` exit 0 + `learning_*.json` at HEAD — not staged line count.

## Three speeds

| Slice | Script | Owner | Target duration |
|-------|--------|-------|-----------------|
| Fast perceive | `scripts/cicd/perceive_tick.sh` | Every session | <15s |
| Slow index (gate) | `scripts/cicd/index_slice_allowlist.sh` | P1-INDEX-01 | Gate canonical, ≤25 |
| Slow index (substrate) | `scripts/cicd/index_slice_substrate.sh` | P1-INDEX-02 | WSJF pathspecs, ≤25; never blocks perceive |
| Slow trust | `scripts/cicd/trust_path_owner.sh` | Platform | Minutes, alone |

CLS (`continuous_learning_swarm.sh`) = observe→learn→gate daily; do not merge index+trust into one command.

## Edge substrates (do not conflate)
- **interface.tag.vote** — COG smoke (health 200, /cog 302); forwarders stay until phase2_signoff.
- **billing.bhopti.com** — `public_synthetic_check.sh`; perceive `public_edge_perceive_ok` uses this FQDN.

## Recovery without stalling
1. Read `perceive_bundle.json` + DLQ — no rerun if HEAD matches.
2. On abort/hang: swap git primitive (`status --porcelain`, never `ls-files --others` on this repo).
3. On scope creep: `scripts/cicd/unstage_scope_creep.sh` then `index_slice_allowlist.sh`.

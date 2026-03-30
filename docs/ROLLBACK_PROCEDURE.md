# Risk Analytics Soft Launch: Rollback Procedure

## Initiation Thresholds
A rollback MUST be initiated if any of the following constraints are breached during the OpenStack K8s / STX 11/12/13 Greenfield soft launch:
- DBOS Token Ceiling metrics exceed 4000 active tokens without native trimming.
- `check-infra-health.sh` issues an INFRASTRUCTURE HEALTH NO-GO warning in production.
- `check-csqbm.sh` fails to detect evidential CSQBM bounds for >120 minutes.

## Extrication Steps
1. **Halt Pipelines:** Pause the `.github/workflows/strict-validation.yml` PI Sync merge queue.
2. **Revert Superproject:** `git checkout HEAD~1` or select the last verified safe state.
3. **Forensic Backup:** Retain `.goalie/metrics_log.jsonl` objects natively for the retrospective.
4. **Resync Submodules:** Run `scripts/ci/repair-nested-submodules.sh`.

## Post-Rollback
Synthesize the event within `TURBOQUANT-DGM-METRICS-*.md` using the standard 5-whys RCA loop and flag it during the next PI Sync.

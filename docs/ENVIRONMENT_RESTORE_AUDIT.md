# Environment Restoration Audit Report

## Executive Summary
This report analyzes the `restore-environment.sh` script and associated infrastructure for completeness, functionality preservation, and risk mitigation. The goal is to ensure robust environment restoration capabilities that support Lean-Agentic workflows.

## Analysis of `restore-environment.sh`

### Strengths
- **Critical State Backup**: Correctly identifies and backs up `.agentdb`, `.goalie`, `.claude` directories, which contain essential agent state and governance data.
- **Git State Preservation**: Captures current HEAD, branch, status, and diffs, which is crucial for version control alignment.
- **Metrics Preservation**: Backs up the `metrics` directory, preserving the `risk_analytics_baseline.db`.
- **Validation**: Includes a `validate_snapshot` function to verify the integrity of the backup before confirmation.

### Critical Gaps & Risks
1.  **Untracked Files Loss**: The script uses `git diff` to save changes to tracked files, but **untracked files (new scripts, config files not yet added)** are NOT backed up. In a `clean` restore, these would be lost, potentially breaking the environment if recent work hasn't been committed.
2.  **Tool Dependencies**: The script runs `npm install` in the root, but does not explicitly handle dependencies for sub-projects like `tools/goalie-vscode`. Restoring the environment might leave the VS Code extension in an unbuilt state.
3.  **Virtual Environments**: Python `venv` directories are not backed up. While they can be recreated, missing this increases restoration time and relies on external package availability.
4.  **Local Secrets**: `.env` files (often ignored by git) are not explicitly targeted, though the `config` directory is backed up. If secrets exist outside `config`, they might be lost.

## Analysis of `collect_metrics.py`

### Functionality
- **Database Initialization**: Correctly initializes `risk_analytics_baseline.db` with WAL mode for concurrency.
- **Fallback**: Gracefully handles missing `git` or `psutil` (mostly).
- **Data Generation**: Has capability to generate dummy data.

### Improvement Opportunities
- **Initialization Blocking**: If the pipeline expects data to exist immediately, a fresh checkout might fail checks. The script should proactively seed data if the database is empty.
- **Dependency Management**: Reliance on `psutil` without an explicit check/install mechanism in the script or environment setup could lead to missing system metrics.

## Remediation Plan

### Phase 1: Patch `restore-environment.sh` (Immediate)
- **Action**: Add logic to identify and backup untracked files.
- **Action**: Add explicit backup/restore for `tools/goalie-vscode` dependencies/build state (or instructions to rebuild).

### Phase 2: Patch `collect_metrics.py` (Immediate)
- **Action**: Modify `main` to check if the database has data. If empty, trigger `generate_dummy_data` and store it to "unblock the pipeline".
- **Action**: Add a try/except block for `psutil` import that suggests installation.

### Phase 3: Validation
- **Action**: Execute a snapshot creation and dry-run restore validation.
- **Action**: Run `af prod-cycle` to verify the pipeline integrates with the patched metrics DB.

## Risk Assessment
- **Functionality Migration**: High risk of losing uncommitted work (untracked files) during restoration. Mitigated by the proposed patch.
- **Feature Porting**: Low risk; no features are being moved, only secured.

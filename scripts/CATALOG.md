# scripts/ CATALOG
> Auto-generated · 1872 scripts · `2026-04-08`

## Summary by Directory

| Directory | Total | .sh | .py | .ts/.js |
|-----------|------:|----:|----:|--------:|
| `(root)` | 416 | 286 | 109 | 21 |
| `_AUTOMATION` | 1 | 1 | 0 | 0 |
| `_SYSTEM` | 1 | 1 | 0 | 0 |
| `agentdb` | 3 | 0 | 1 | 2 |
| `agentic` | 55 | 2 | 53 | 0 |
| `agents` | 1 | 0 | 1 | 0 |
| `ai` | 1 | 0 | 1 | 0 |
| `aisp` | 2 | 2 | 0 | 0 |
| `alerts` | 1 | 0 | 1 | 0 |
| `analysis` | 33 | 2 | 31 | 0 |
| `api` | 1 | 0 | 1 | 0 |
| `assessments` | 1 | 0 | 0 | 1 |
| `backtest` | 1 | 0 | 1 | 0 |
| `benchmarks` | 1 | 0 | 1 | 0 |
| `bridge` | 1 | 0 | 1 | 0 |
| `canary` | 3 | 2 | 1 | 0 |
| `ci` | 24 | 15 | 9 | 0 |
| `circles` | 15 | 10 | 5 | 0 |
| `cleanup` | 1 | 1 | 0 | 0 |
| `credentials` | 3 | 1 | 2 | 0 |
| `daemons` | 3 | 1 | 2 | 0 |
| `dashboard` | 1 | 0 | 1 | 0 |
| `data` | 2 | 0 | 2 | 0 |
| `db` | 3 | 2 | 1 | 0 |
| `debug` | 1 | 0 | 0 | 1 |
| `deploy` | 2 | 2 | 0 | 0 |
| `deployment` | 3 | 2 | 1 | 0 |
| `dev` | 1 | 1 | 0 | 0 |
| `execution` | 1 | 0 | 1 | 0 |
| `goalie` | 1 | 1 | 0 | 0 |
| `governance` | 9 | 0 | 2 | 7 |
| `hooks` | 9 | 8 | 0 | 1 |
| `infrastructure` | 8 | 5 | 3 | 0 |
| `integrations` | 12 | 0 | 12 | 0 |
| `interfaces` | 5 | 0 | 4 | 1 |
| `lib` | 3 | 3 | 0 | 0 |
| `mcp` | 1 | 1 | 0 | 0 |
| `mcp-tools` | 3 | 3 | 0 | 0 |
| `metrics` | 1 | 0 | 1 | 0 |
| `migration` | 6 | 6 | 0 | 0 |
| `migrations` | 1 | 1 | 0 | 0 |
| `ml` | 5 | 0 | 5 | 0 |
| `monitoring` | 22 | 11 | 9 | 2 |
| `observability` | 4 | 0 | 4 | 0 |
| `orchestration` | 2 | 0 | 2 | 0 |
| `orchestrators` | 10 | 10 | 0 | 0 |
| `patterns` | 3 | 0 | 3 | 0 |
| `performance` | 1 | 0 | 0 | 1 |
| `policy` | 8 | 3 | 5 | 0 |
| `priority` | 2 | 0 | 2 | 0 |
| `quality` | 1 | 0 | 1 | 0 |
| `research` | 3 | 0 | 3 | 0 |
| `risk` | 1 | 0 | 1 | 0 |
| `scanners` | 1 | 0 | 1 | 0 |
| `security` | 1 | 1 | 0 | 0 |
| `starlingx` | 3 | 3 | 0 | 0 |
| `stx` | 1 | 0 | 1 | 0 |
| `superproject-gates` | 1013 | 282 | 136 | 595 |
| `swarms` | 2 | 2 | 0 | 0 |
| `system` | 6 | 6 | 0 | 0 |
| `temporal` | 1 | 0 | 1 | 0 |
| `tests` | 37 | 20 | 12 | 5 |
| `tuning` | 1 | 0 | 1 | 0 |
| `utils` | 2 | 1 | 0 | 1 |
| `validators` | 93 | 48 | 35 | 10 |
| `watchdog` | 1 | 1 | 0 | 0 |
| `workers` | 1 | 0 | 1 | 0 |
| `wsjf` | 6 | 1 | 5 | 0 |
| **TOTAL** | **1872** | **748** | **476** | **648** |

---

## `(root)/`

| File | Type | Purpose |
|------|------|---------|
| `__init__.py` | `.py` | Auto-generated for module imports |
| `ab-test-thresholds.sh` | `.sh` | A/B Test: Hardcoded vs Dynamic Thresholds |
| `add_circle_owners.py` | `.py` | Load YAML file |
| `advocate_dashboard.py` | `.py` | Add parent directory to path |
| `af-apply-fixes.ts` | `.ts` | /** |
| `af_dashboard.py` | `.py` | """ |
| `af_integration_patch.sh` | `.sh` | AF CLI Integration Patch |
| `af_pattern_helpers.sh` | `.sh` | af_pattern_helpers.sh - Enhanced Pattern Metrics Helpers |
| `aisp-quickstart.sh` | `.sh` | AISP Integration Quick Start Script |
| `analyze_process_health.py` | `.py` | ps -A -o pid,ppid,rss,pcpu,time,command |
| `append_run_logs.py` | `.py` | import json |
| `audit-all-validators.sh` | `.sh` | Comprehensive Validator Audit Script |
| `audit-hardcoded-params.sh` | `.sh` | scripts/audit-hardcoded-params.sh |
| `auto-collect-evidence.sh` | `.sh` | auto-collect-evidence.sh - Automatically collect evidence after successful commits |
| `auto-update-upstream.sh` | `.sh` | Automated Upstream Update System |
| `ay-adaptive-learning-rate.sh` | `.sh` | scripts/ay-adaptive-learning-rate.sh |
| `ay-aisp-validate.sh` | `.sh` | ay-aisp-validate.sh - Validate AISP proof requirements |
| `ay-aliases.sh` | `.sh` | WSJF Command Aliases - Source this file to get easy 'ay' commands |
| `ay-assess.sh` | `.sh` | ay-assess.sh - Quick Assessment Mode (24h Window Analysis) |
| `ay-auto-enhanced.sh` | `.sh` | ay-auto-enhanced.sh - Enhanced Auto-Resolution with Per-Threshold Progress |
| `ay-auto-iterative.sh` | `.sh` | ay - Auto/Iterative/Interactive Production Maturity |
| `ay-auto.sh` | `.sh` | ay-auto.sh - Adaptive Auto-Resolution with Iterative Strategy Cycling |
| `ay-backtest.sh` | `.sh` | ay-backtest.sh - Backtest runner for 382K episodes with parallel execution |
| `ay-baseline-audit.sh` | `.sh` | ============================================================================ |
| `ay-ceremony-executor.sh` | `.sh` | ay-ceremony-executor.sh - Execute Real Ceremonies with Measurable Outputs |
| `ay-ceremony-order-optimizer.sh` | `.sh` | scripts/ay-ceremony-order-optimizer.sh |
| `ay-cleanup-free-riders.sh` | `.sh` | ay-cleanup-free-riders.sh - Remove stale/unused artifacts |
| `ay-complete-maturity.sh` | `.sh` | ay-complete-maturity.sh - Final AY Maturity Completion |
| `ay-continuous-improve.sh` | `.sh` | exit 0 |
| `ay-continuous.sh` | `.sh` | ay-continuous.sh - Extended Continuous Monitoring (>1h duration) |
| `ay-convert-episodes-to-learning.sh` | `.sh` | ay-convert-episodes-to-learning.sh - Convert raw episode files to learning-retro format |
| `ay-demo-simple.sh` | `.sh` | ay-demo-simple.sh - Simple demonstration of adaptive mode cycling |
| `ay-divergence-monitor.sh` | `.sh` | ay-divergence-monitor.sh - Real-time monitoring for divergence testing |
| `ay-divergence-test.sh` | `.sh` | Controlled Divergence Testing Framework |
| `ay-dynamic-sleep.sh` | `.sh` | scripts/ay-dynamic-sleep.sh |
| `ay-dynamic-thresholds.sh` | `.sh` | Dynamic Threshold Calculator - Replace hardcoded values with statistical ground truth |
| `ay-embeddings.sh` | `.sh` | Qwen3-VL embedding integration |
| `ay-enhanced.sh` | `.sh` | ay-enhanced.sh - Focused Incremental Relentless Execution |
| `ay-fire.sh` | `.sh` | ay-fire.sh - FIRE (Focused Incremental Relentless Execution) |
| `ay-fix-remaining-issues.sh` | `.sh` | AY Fix Remaining Issues - Target 100% Test Pass Rate |
| `ay-fix-typescript-errors.sh` | `.sh` | AY Fix TypeScript Errors - Automated Resolution |
| `ay-generate-circuit-traffic.sh` | `.sh` | ay-generate-circuit-traffic.sh - Generate circuit breaker traffic for threshold learning |
| `ay-governance-check.sh` | `.sh` | AY Governance Check - Wire governance compliance to verdict registry |
| `ay-integrated-cycle.sh` | `.sh` | Ay Integrated Cycle - Focused Incremental Relentless Execution |
| `ay-iteration-handoff.sh` | `.sh` | ay-iteration-handoff.sh - Generate iteration handoff report |
| `ay-learning-circulation.sh` | `.sh` | ay-learning-circulation.sh |
| `ay-master-orchestrator.sh` | `.sh` | AY Master Orchestrator - Comprehensive System Improvement |
| `ay-maturity-enhance.sh` | `.sh` | ay-maturity-enhance.sh - Comprehensive AY Maturity Enhancement |
| `ay-mpp-hyperparameter-tuner.sh` | `.sh` | scripts/ay-mpp-hyperparameter-tuner.sh |
| `ay-mpp-weights.sh` | `.sh` | ay-mpp-weights.sh - Manage and learn reward calculation weights |
| `ay-orchestrate.sh` | `.sh` | ay-orchestrate.sh - Intelligent mode orchestrator for automatic resolution |
| `ay-orchestrator-governed.sh` | `.sh` | Governed Orchestrator - Truth-aligned execution with governance checkpoints |
| `ay-orchestrator.sh` | `.sh` | Agentic-Flow Intelligent Orchestrator |
| `ay-p1-complete.sh` | `.sh` | ay-p1-complete.sh - Complete P1 Implementation with AISP Integration |
| `ay-pre-flight-check.sh` | `.sh` | ay-pre-flight-check.sh - Pre-flight checklist for continuous improvement |
| `ay-preflight-check.sh` | `.sh` | Pre-flight checklist for continuous improvement |
| `ay-prod-cycle-with-dor.sh` | `.sh` | ay-prod-cycle-with-dor.sh - Execute ceremonies with DoR time budget enforcement |
| `ay-prod-cycle.sh` | `.sh` | ay-prod-cycle.sh - Run a Production Ceremony (single Circle × Ceremony) |
| `ay-prod-learn-loop.sh` | `.sh` | ay-prod-learn-loop.sh - Continuous circle-specific learning loops |
| `ay-prod-skill-lookup.sh` | `.sh` | ay-prod-skill-lookup.sh - Query skills from AgentDB before execution |
| `ay-prod-store-episode-enhanced.sh` | `.sh` | ay-prod-store-episode-enhanced.sh - Enhanced episode storage with circle_equity updates |
| `ay-prod-store-episode.sh` | `.sh` | ay-prod-store-episode.sh - Store episodes with circle/ceremony metadata |
| `ay-prod.sh` | `.sh` | ay-prod.sh - Production-Safe Ceremony Execution |
| `ay-reward-calculator.sh` | `.sh` | Dynamic Reward Calculator with MCP/MPP Integration |
| `ay-reward-dashboard.sh` | `.sh` | scripts/ay-reward-dashboard.sh |
| `ay-roam-staleness-check.sh` | `.sh` | ay-roam-staleness-check.sh - Monitor ROAM assessment staleness |
| `ay-scan-skills.ts` | `.ts` | /** |
| `ay-setup-autossl.sh` | `.sh` | ay-setup-autossl.sh - Configure AutoSSL on cPanel |
| `ay-skills-agentdb.sh` | `.sh` | ay-skills-agentdb.sh - Wire Skills to AgentDB |
| `ay-threshold-monitor.sh` | `.sh` | ay-threshold-monitor.sh - Real-time Dynamic Threshold Monitoring |
| `ay-trajectory-tracker.sh` | `.sh` | scripts/ay-trajectory-tracker.sh |
| `ay-trajectory-tracking.sh` | `.sh` | ay-trajectory-tracking.sh - Learning Trajectory Measurement |
| `ay-unified.sh` | `.sh` | ay-unified.sh - Unified Agentic Flow Command with Dynamic Threshold Integration |
| `ay-update-skill-confidence.sh` | `.sh` | ay-update-skill-confidence.sh - Update skill confidence based on outcomes |
| `ay-validate-phase1.sh` | `.sh` | ay-validate-phase1.sh - Validate Phase 1 Implementation |
| `ay-validate.sh` | `.sh` | ay-validate.sh - Validation-driven orchestrator with go/no-go verdicts |
| `ay-wsjf-iterate.sh` | `.sh` | ay-wsjf-iterate.sh - WSJF iteration with dynamic multiplier tuning |
| `ay-wsjf-runner.sh` | `.sh` | ay-wsjf-runner.sh - WSJF/Iterate/Run/Build/Measure/Learn Runner |
| `ay-yo-cleanup.sh` | `.sh` | ay-yo-cleanup.sh - Resource Management (Mitigation M1) |
| `ay-yo-continuous-improvement.sh` | `.sh` | exit 0 |
| `ay-yo-enhanced.sh` | `.sh` | ay-yo-enhanced.sh - Enhanced yo.life cockpit interface |
| `ay-yo-integrate.sh` | `.sh` | ay-yo-integrate.sh - Integrated DoR/DoD system with AgentDB and yo.life |
| `ay-yo-monitor-roam.sh` | `.sh` | ay-yo-monitor-roam.sh - ROAM Risk Monitoring |
| `ay-yo.sh` | `.sh` | ay-yo.sh - Local Development with Controlled Divergence |
| `ay-yolife.sh` | `.sh` | ay-yolife.sh - YoLife Production Deployment & Multi-LLM Orchestrator |
| `ay.sh` | `.sh` | ay - Agentic Yield: Iterative mode cycling with progress UI |
| `backfill_duration_measured.py` | `.py` | Backfill duration_measured for events with valid duration_ms. |
| `backfill_pattern_tags.py` | `.py` | """ |
| `balance_workload.sh` | `.sh` | Workload Balancing Script |
| `baseline-metrics.sh` | `.sh` | baseline-metrics.sh |
| `bootstrap_ubuntu_flamingo.sh` | `.sh` | Bootstrap Ubuntu 22.04 for OpenStack 2025.2 Flamingo |
| `break_glass.py` | `.py` | """ |
| `build-all.sh` | `.sh` | Build all packages in the monorepo for npm publishing |
| `build-orchestrator.sh` | `.sh` | build-orchestrator.sh - Comprehensive Build Orchestration for Agentic Flow |
| `cache-auto-update.sh` | `.sh` | cache-auto-update.sh - Automated cache updates with scheduling |
| `capability-extractor.sh` | `.sh` | capability-extractor.sh |
| `capability-inventory.sh` | `.sh` | @business-context WSJF: Pre-archive capability inventory for dashboards/scripts |
| `catalyst_ingest.py` | `.py` | import os |
| `check-infra-health.sh` | `.sh` | check-infra-health.sh |
| `check_upstream_updates.sh` | `.sh` | Check for upstream @foxruv/iris updates |
| `check_wsjf_hygiene.py` | `.py` | """ |
| `circle_orchestrator.py` | `.py` | """ |
| `classify-downloads.sh` | `.sh` | Quick batch classification of court filing PDFs |
| `cmd_actionable_context.py` | `.py` | """ |
| `cmd_allocation_efficiency.py` | `.py` | """ |
| `cmd_circle_perspective_coverage.py` | `.py` | """ |
| `cmd_detect_observability_gaps.py` | `.py` | """ |
| `cmd_execution_velocity.py` | `.py` | Get .goalie directory path |
| `cmd_flow_efficiency.py` | `.py` | Get .goalie directory path |
| `cmd_goalie_tail.py` | `.py` | import argparse |
| `cmd_pattern_coverage.py` | `.py` | Robust path resolution relative to this script |
| `cmd_pattern_stats.py` | `.py` | """ |
| `cmd_pattern_stats_enhanced.py` | `.py` | Import WSJF adjuster for enrichment |
| `cmd_prod.py` | `.py` | """ |
| `cmd_prod_cycle.py` | `.py` | Add src to path for evidence emitter imports |
| `cmd_prod_cycle_enhanced.py` | `.py` | QUICK WIN #2: Import Guardrails for WIP limits and mode enforcement |
| `cmd_prod_cycle_improved.py` | `.py` | """ |
| `cmd_prod_enhanced.py` | `.py` | Validate critical imports |
| `cmd_prompt_intent_coverage.py` | `.py` | """ |
| `cmd_retro.py` | `.py` | Load the approval log from .goalie/approval_log.jsonl. |
| `cmd_revenue_impact.py` | `.py` | """ |
| `cmd_swarm_compare.py` | `.py` | A conservative set of fields we know are emitted by prod_cycle_swarm_runner.py's TSV. |
| `cmd_tier_depth_coverage.py` | `.py` | --- Configuration --- |
| `cmd_wsjf.py` | `.py` | """ |
| `code_search.py` | `.py` | """ |
| `coherence-check.sh` | `.sh` | Coherence Validation Hook - 85% Threshold Enforcement |
| `collect-evidence.sh` | `.sh` | collect-evidence.sh - Collect evidence for trust-backed commits |
| `commit_proxy_gaming.sh` | `.sh` | Commit script for P2-TRUTH Proxy Gaming Detection Implementation |
| `compare-all-validators.sh` | `.sh` | compare-all-validators.sh - Run ALL validators on given emails and write CONSOLIDATION-TRUTH-REPORT. |
| `compliance-scanner.py` | `.py` | """ |
| `comprehensive-integration.sh` | `.sh` | Comprehensive Integration: Claude Flow v3 + AISP + LLM Observatory + AY Improvements |
| `consulting-outreach-swarm.sh` | `.sh` | FULL AUTO Consulting Outreach Swarm (WSJF Task #1) |
| `contract-enforcement-gate.sh` | `.sh` | ═══════════════════════════════════════════════════════════════════════════════ |
| `convert-photos-with-exif.sh` | `.sh` | Photo Conversion Script with EXIF Validation |
| `cpanel-env-setup.sh` | `.sh` | scripts/cpanel-env-setup.sh |
| `create-pushable-branch.sh` | `.sh` | ============================================================================= |
| `cv-deploy-cicd.sh` | `.sh` | cv-deploy-cicd.sh |
| `dashboard-capability-check.sh` | `.sh` | dashboard-capability-check.sh - Capability regression checks for active dashboards |
| `ddd-tdd-adr-coherence.sh` | `.sh` | DDD/TDD/ADR Coherence Pipeline |
| `ddp_network_tuning.sh` | `.sh` | --- Goalie Code Fix: network-bottleneck --- |
| `debug_metrics.py` | `.py` | import json |
| `decision_lens_metrics.py` | `.py` | Decision lens mapping - patterns to circles |
| `demo-ay-auto.sh` | `.sh` | demo-ay-auto.sh - Demonstrates ay auto resolution flow |
| `demo_integrated_workflow.sh` | `.sh` | Demo: Integrated Production Workflow |
| `deploy-production-subdomains.sh` | `.sh` | Production Deployment to YOLIFE Infrastructure |
| `deploy-production.sh` | `.sh` | Deploy Discord Bot Monitoring to yo.tag.ooo |
| `deploy-remote-environments.sh` | `.sh` | Remote Environment Deployment - Dev/Staging/Prod |
| `deploy-to-real-infra.sh` | `.sh` | Real-World Infrastructure Deployment & Testing |
| `deploy-via-cpanel.ts` | `.ts` | /** |
| `deploy-via-patch.sh` | `.sh` | Alternative Deployment: Generate Patch for GitHub PR |
| `deploy-yolife-api.sh` | `.sh` | YOLIFE API-Based Deployment Script |
| `deploy_canary_infrastructure.sh` | `.sh` | Deploy Canary Infrastructure |
| `deploy_discord_bot.sh` | `.sh` | Discord Bot Deployment Script |
| `deploy_qdrant.sh` | `.sh` | Verify k8s is running |
| `deploy_stx_greenfield.sh` | `.sh` | StarlingX Greenfield Deployment Script |
| `deploy_stx_greenfield_consolidated.sh` | `.sh` | ======================================== |
| `deploy_stx_loki_greenfield.sh` | `.sh` | Greenfield STX LOKI Linux OpenStack Kubernetes Infrastructure |
| `deploy_stx_with_migration_path.sh` | `.sh` | StarlingX Deployment with Ubuntu Migration Path |
| `deploy_ubuntu_on_stx.sh` | `.sh` | Deploy Ubuntu 22.04 VMs on StarlingX for Modern Stack |
| `deploy_ubuntu_on_stx_fixed.sh` | `.sh` | Deploy Ubuntu 22.04 VMs on StarlingX - Fixed Version |
| `diagnose-skills.sh` | `.sh` | Quick diagnostic for zero skills issue |
| `discord_bot_healthcheck.py` | `.py` | """ |
| `discord_trading_bot.py` | `.py` | Configuration for Discord bot deployment |
| `discord_wsjf_bot.py` | `.py` | Test mode (console output) |
| `disk-evidence-readonly.sh` | `.sh` | @business-context WSJF: Disk growth evidence without destructive actions |
| `divergence-test.sh` | `.sh` | Controlled Divergence Testing Framework |
| `divergence-testing.sh` | `.sh` | Controlled Divergence Testing Framework |
| `dns-health-check.sh` | `.sh` | DNS Health Check Script |
| `doc_query.py` | `.py` | """ |
| `drift_detector.ts` | `.ts` | import { randomUUID } from 'crypto'; |
| `dt_schema.py` | `.py` | Map a schema_id to a JSON file path. |
| `email-hash-db.sh` | `.sh` | scripts/email-hash-db.sh |
| `email-review-server.js` | `.js` | /** |
| `emit_metrics.py` | `.py` | @business-context WSJF-1 |
| `emit_safe_degrade_baseline.py` | `.py` | """ |
| `enforce-wip-limits.sh` | `.sh` | Enforce Kanban WIP Limits - WSJF 4.2 |
| `enforce_wip_limits.sh` | `.sh` | WIP Limits Enforcement with WSJF-based snoozing |
| `evidence-bundle-accelerator.sh` | `.sh` | Evidence Bundle Accelerator |
| `evidence-hasher.py` | `.py` | Calculate hash of a file using specified algorithm. |
| `execute-dod-first-workflow.sh` | `.sh` | Execute DoD-First Workflow: Inverted Thinking Applied |
| `execute-phases.sh` | `.sh` | Multi-Phase Execution Script |
| `execute-production-sprint.sh` | `.sh` | Production Sprint Execution Script |
| `execute_with_learning.sh` | `.sh` | execute_with_learning.sh |
| `exit-codes.sh` | `.sh` | Canonical registry: ../_SYSTEM/_AUTOMATION/exit-codes-robust.sh |
| `export-skills-cache.sh` | `.sh` | export-skills-cache.sh - Export skills from AgentDB to local cache |
| `export-skills.ts` | `.ts` | /** |
| `extract_resume.py` | `.py` | from pypdf import PdfReader |
| `feedback-loop-analyzer.sh` | `.sh` | ============================================================================== |
| `fire-execute.sh` | `.sh` | fire-execute.sh - Focused Incremental Relentless Execution |
| `fire_drill.sh` | `.sh` | -*- coding: utf-8 -*- |
| `fix-health-issues.sh` | `.sh` | Fix Health Issues Script |
| `fix-typescript-errors.sh` | `.sh` | Fix Remaining 62 TypeScript Errors |
| `fix_duration_instrumentation.py` | `.py` | """ |
| `fix_duration_instrumentation_p0.py` | `.py` | """ |
| `fix_high_severity_schema.py` | `.py` | Create backup before modifications |
| `fix_import.py` | `.py` | Simple script to fix the import issue in cmd_pattern_stats_enhanced.py |
| `fix_pattern_metrics_schema.py` | `.py` | Migrate a single JSON entry to new schema |
| `fix_pattern_metrics_tags.py` | `.py` | Define default tags for each circle |
| `fix_schema_tags.py` | `.py` | Default tags by circle |
| `fix_wsjf_metadata.py` | `.py` | Default WSJF component values by item type (heuristics) |
| `flourishing_life_model.py` | `.py` | """ |
| `frequency-analysis.sh` | `.sh` | frequency-analysis.sh - Analyze skill frequency, patterns, and circulation |
| `generate-consolidation-report.sh` | `.sh` | comprehensive-consolidation-report.sh |
| `generate-iteration-handoff.sh` | `.sh` | generate-iteration-handoff.sh - Generate handoff report for next iteration |
| `generate-production-workload.sh` | `.sh` | Production Workload Generator |
| `generate-test-data.ts` | `.ts` | import { AgenticSynth } from '@ruvector/agentic-synth'; |
| `generate-test-episodes.ts` | `.ts` | /** |
| `generate-timeline-exhibit.py` | `.py` | Generate timeline exhibit from JSON data |
| `generate_circle_index.py` | `.py` | """ |
| `generate_env_config.py` | `.py` | Sort keys for consistency or use catalog order (Python 3.7+ dicts preserve order) |
| `generate_resume.py` | `.py` | """ |
| `generate_ssh_config.sh` | `.sh` | set -euo pipefail |
| `generate_test_metrics.js` | `.js` | import fs from 'fs'; |
| `generate_trial_timeline.py` | `.py` | Generate ASCII timeline for terminal/PDF export |
| `geo_intelligence.py` | `.py` | Calculate distance in miles between two points. |
| `github_issue_automation.py` | `.py` | CPU Governor Guard (matches bash implementation) |
| `governance-audit-system.js` | `.js` | /** |
| `governance_agent.py` | `.py` | """ |
| `guard-parity-selftest.sh` | `.sh` | @business-context WSJF: ay / advocate / cascade-tunnel guard parity check |
| `health-check.sh` | `.sh` | Production Health Check |
| `health-dashboard.sh` | `.sh` | 📊 Health Dashboard - Real-time Metrics & Cycle Progress |
| `human_in_the_loop_osint.py` | `.py` | Helper for user input with default. |
| `ingest_catalyst.py` | `.py` | """ |
| `init_risk_db.sh` | `.sh` | set -euo pipefail |
| `install_daily_upstream_check.sh` | `.sh` | Install Daily Upstream Check Automation |
| `install_wsjf_cron.sh` | `.sh` | Install WSJF Automation Cron Jobs |
| `integrate-production-stack.sh` | `.sh` | Production Stack Integration Script |
| `iris_bridge_cli.js` | `.js` | /** |
| `kill-dev-ports.sh` | `.sh` | scripts/kill-dev-ports.sh |
| `launch_admin_panel.sh` | `.sh` | Launch the Admin Panel (local static file) |
| `launch_swarm.sh` | `.sh` | Swarm Orchestration Launch Script |
| `lease_comparator.py` | `.py` | """ |
| `legal-doc-processor.sh` | `.sh` | Legal Document OCR Review & Processing Script |
| `legal-pdf-ocr-pipeline.sh` | `.sh` | ============================================================================= |
| `lib-dynamic-thresholds.sh` | `.sh` | Dynamic Threshold Calculations Library |
| `link_metrics_to_retro.sh` | `.sh` | link_metrics_to_retro.sh |
| `load_secrets.sh` | `.sh` | load_secrets.sh - Secure Secrets Loader |
| `local-ci-validation.sh` | `.sh` | ============================================================================= |
| `log_pattern_event.py` | `.py` | """ |
| `manual-continuous-mode.sh` | `.sh` | Manual Continuous Improvement Mode |
| `mcp-auto-heal.sh` | `.sh` | mcp-auto-heal.sh - Auto-restart/self-heal MCP providers |
| `mcp-health-check-enhanced.sh` | `.sh` | mcp-health-check-enhanced.sh - NOW Tier: Evidence-first MCP health with observability |
| `mcp-health-check.sh` | `.sh` | mcp-health-check.sh - Check MCP server availability |
| `mcp-scheduler.sh` | `.sh` | MCP-based Automated Monitoring Scheduler |
| `mcp-setup.sh` | `.sh` | mcp-setup.sh - Comprehensive MCP setup with diagnostics |
| `mcp-start.sh` | `.sh` | mcp-start.sh - Start MCP server with proper port configuration |
| `mcp_workload_distributor.py` | `.py` | Handles MCP integration for workload distribution tracking and automation. |
| `measure_baselines.ts` | `.ts` | import os from 'os'; |
| `migrate-episodes.sh` | `.sh` | Episode Migration Wrapper |
| `migrate-episodes.ts` | `.ts` | /** |
| `migrate-to-dynamic-thresholds.sh` | `.sh` | Production Migration: Replace hardcoded thresholds with dynamic implementations |
| `migrate_legacy_manual_events.py` | `.py` | import argparse |
| `migrate_pattern_metrics.py` | `.py` | """ |
| `migrate_pattern_metrics_run_kind.py` | `.py` | """ |
| `monitor-cascade-failures.sh` | `.sh` | monitor-cascade-failures.sh - Detect cascade failures across circles |
| `monitor-deployment.sh` | `.sh` | Check deployment status |
| `monitor-divergence.sh` | `.sh` | monitor-divergence.sh - Real-time monitoring for divergence testing |
| `monitor-inbox-wsjf.sh` | `.sh` | Monitor Inbox WSJF Integration (Real-Time Dashboard) |
| `monitor-threshold-performance.sh` | `.sh` | Monitor dynamic threshold performance |
| `monitor_schema_drift.py` | `.py` | """ |
| `monitoring_dashboard.py` | `.py` | """ |
| `mover-email-stats-scan.sh` | `.sh` | mover-email-stats-scan.sh - Scan 02-EMAILS and mover subdirs for mover EML stats |
| `mover-email-truth.sh` | `.sh` | @business-context WSJF: Mover email state truth path (folder scan + evidence timestamps) |
| `multi-track-simple.sh` | `.sh` | Simplified Multi-Track Orchestration (No Memory Store Dependencies) |
| `multi-track-swarm-orchestration.sh` | `.sh` | Multi-Track Swarm Orchestration with Temporal Capacity Management |
| `multi-wsjf-swarm-orchestration-auto.sh` | `.sh` | Multi-WSJF Swarm Orchestration - Automated with Health Checkpoints |
| `multi-wsjf-swarm-orchestration.sh` | `.sh` | Multi-WSJF Swarm Orchestration |
| `multi_repo_analyzer.py` | `.py` | Analyze top 5 repos |
| `neural_trader_setup.py` | `.py` | Create necessary directories |
| `npm-stats.sh` | `.sh` | NPM Package Statistics Dashboard |
| `npm-user-stats.js` | `.js` | /** |
| `orchestrate_continuous_improvement.py` | `.py` | """ |
| `organize-ddd-structure.sh` | `.sh` | DDD/ADR/PRD/TDD Folder Structure Organizer |
| `organize-root-files.sh` | `.sh` | scripts/organize-root-files.sh |
| `pdf_classifier.py` | `.py` | Extract text from PDF using macOS textutil (native tool) |
| `pdf_classifier_multi_provider.py` | `.py` | Session persistence |
| `pi-prep-bootstrap.sh` | `.sh` | pi-prep-bootstrap.sh — PI Prep → trust-path with mkdir atomic lock (idempotent serial entry). |
| `pi-sync-checkpoint.sh` | `.sh` | pi-sync-checkpoint.sh - Generate PI-sync checkpoint from AISP/ROAM/WSJF outputs |
| `political-stability-analyst.py` | `.py` | """ |
| `populate-evidence-bundle.sh` | `.sh` | populate-evidence-bundle.sh |
| `portfolio_risk_dashboard.py` | `.py` | """ |
| `portfolio_technical_analyzer.py` | `.py` | Degraded mode - no external dependencies required |
| `post-send-hook.sh` | `.sh` | scripts/post-send-hook.sh |
| `pre-flight-check.sh` | `.sh` | Pre-Flight Checklist for Continuous Improvement |
| `pre-send-gate.sh` | `.sh` | ============================================================================= |
| `pre_cycle_script_review.py` | `.py` | """ |
| `pre_indexed_search.py` | `.py` | """ |
| `preflight-check.sh` | `.sh` | preflight-check.sh - Pre-flight checklist for continuous improvement |
| `preflight_health_check.sh` | `.sh` | Pre-Flight Health Check for af prod-cycle |
| `prepare-court-filing.sh` | `.sh` | Court Filing Preparation for 26CV007491-590 |
| `process_upstream_updates.py` | `.py` | Parse upstream report and extract actionable items |
| `prod_cycle_swarm_experiment.py` | `.py` | import argparse |
| `quick-publish.sh` | `.sh` | Quick publish script for agentic-flow |
| `quick-start-dashboard.sh` | `.sh` | Dashboard Server Launcher with TLD Support |
| `quick-start-throttling-hooks.sh` | `.sh` | Quick Start: Throttling + Learning Hooks Implementation |
| `readiness-api-guard.sh` | `.sh` | @business-context WSJF: Feature-flag simulation for readiness API (403 when disabled) |
| `real_value_tracker.py` | `.py` | """ |
| `record-skill-validation.sh` | `.sh` | record-skill-validation.sh - Record a skill validation event |
| `refine-trial-arguments.sh` | `.sh` | refine-trial-arguments.sh - Automated trial argument refinement via swarm |
| `reorganize-codebase.sh` | `.sh` | Comprehensive Code Reorganization with WSJF Prioritization |
| `reorganize-lean-budget.sh` | `.sh` | Repository Reorganization Script - Lean Budget Compliance |
| `repair-nested-submodules.sh` | `.sh` | @business-context WSJF-77: Resolve Git Object Fragmentation Anomalies blocking merge paths |
| `research_case_law.py` | `.py` | Search for relevant NC case law using Claude |
| `restart_services.sh` | `.sh` | Simulates service restart to load new .env configurations |
| `restore-environment-diagnostic.sh` | `.sh` | restore-environment-diagnostic.sh |
| `restore-environment-enhanced.sh` | `.sh` | restore-environment-enhanced.sh |
| `restore-environment.sh` | `.sh` | restore-environment-enhanced.sh |
| `restructure-folders-post-move.sh` | `.sh` | Post-Move Folder Restructuring Script |
| `reverse-recruiting-automation.sh` | `.sh` | REVERSE RECRUITING AUTOMATION |
| `roam-audit.ts` | `.ts` | /** |
| `roam-pre-archive-gate.sh` | `.sh` | @business-context WSJF: Pre-archive ROAM gate — no delete until R/O/A/M satisfied |
| `roam-staleness-watchdog.sh` | `.sh` | roam-staleness-watchdog.sh - Background daemon analyzing ROAM_TRACKER.yaml for stalled nodes |
| `roam-state-persistence.sh` | `.sh` | ROAM State Persistence Pattern (Beads-inspired) |
| `roam_risk_init.py` | `.py` | """ |
| `robust-quality.sh` | `.sh` | Robust Quality Execution with Bounded Runtime and ETA Live-Streaming |
| `run-af-dashboard.sh` | `.sh` | Launch the af-dashboard Rust TUI |
| `run-prod-cycle-tests.sh` | `.sh` | Production Cycle Test Execution Script |
| `run-validation-dashboard.sh` | `.sh` | Launcher for Real-Time Validation Dashboard |
| `run-verification-gates.sh` | `.sh` | Post-Task Verification Gates |
| `run_production_cycle.sh` | `.sh` | set -e |
| `safe-cleanup-reversible.sh` | `.sh` | @business-context WSJF: Reversible cleanup sequence — evidence + rollback path |
| `scaffold_circles.py` | `.py` | Base directory for circles |
| `search_tui.py` | `.py` | """ |
| `send-settlement-with-gate.sh` | `.sh` | Settlement Send with Verifiable Gate |
| `sensorimotor_worker.py` | `.py` | """ |
| `setup-automation-cron.sh` | `.sh` | setup-automation-cron.sh - Setup automated cron jobs for QE Fleet, AISP, and pattern reviews |
| `setup-continuous-improvement.sh` | `.sh` | Setup script for continuous improvement system |
| `setup-sindri-mimir-draupnir.sh` | `.sh` | Setup script for Sindri, Mimir, Draupnir (Phase 4) |
| `setup_secrets.sh` | `.sh` | Prompt user for secrets defined in env.catalog.json |
| `shellcheck-count-staged-sh.sh` | `.sh` | shellcheck-count-staged-sh.sh — count shellcheck findings per staged *.sh (evidence, advisory exit 0 |
| `show_quick_wins_progress.sh` | `.sh` | show_quick_wins_progress.sh |
| `show_roadmap.sh` | `.sh` | Display 90-day roadmap summary from CONSOLIDATED_ACTIONS.yaml |
| `sla-slo-monitor.sh` | `.sh` | SLA/SLO Monitoring for Multi-tenant Vault Operations |
| `slurm_optimized.sh` | `.sh` | --- Goalie Code Fix: hpc-batch-window --- |
| `slurm_packed_training.sh` | `.sh` | --- Goalie Code Fix: cluster-fragmentation --- |
| `spawn_swarms.sh` | `.sh` | Spawn 10 Swarms of AF Prod-Cycle to Improve Production Maturity |
| `start-api-server.sh` | `.sh` | Start yo.life API Server |
| `start-cache-service.sh` | `.sh` | Start Cache Service (Node.js + NAPI-RS) |
| `start-eta-dashboard.sh` | `.sh` | start-eta-dashboard.sh - Launch dashboard with ETA tracking and tunnel |
| `start-medical-system.sh` | `.sh` | Medical Analysis System - Quick Start Script |
| `start-tld-tunnel.sh` | `.sh` | TLD Tunnel Launcher - Start dashboard with TLD configuration |
| `start_ubuntu_test_env.sh` | `.sh` | Ubuntu 22.04 Test Environment Setup Script |
| `stitch_trajectories.py` | `.py` | """ |
| `store-skills-in-db.sh` | `.sh` | store-skills-in-db.sh - Wire skills from episodes into AgentDB |
| `stripe_sandbox_setup.py` | `.py` | Validate Stripe test keys are properly configured |
| `stripe_webhook_handler.py` | `.py` | Flask server |
| `stx-ssh-probe.sh` | `.sh` | StarlingX SSH Probe - Week 1 P1 Action |
| `stx_phase2_manual_rpm.sh` | `.sh` | stx_phase2_manual_rpm.sh - Manual containerd 1.7.x RPM installation helper |
| `stx_phase2_manual_rpm_auto.sh` | `.sh` | stx_phase2_manual_rpm_auto.sh - Non-interactive version of manual RPM installer |
| `stx_phase2_rollback.sh` | `.sh` | stx_phase2_rollback.sh - Rollback script for Phase 2 containerd upgrade |
| `swarm_runner.sh` | `.sh` | Swarm Performance Harness: 3-Way Comparison |
| `sync_backlogs.py` | `.py` | """ |
| `sync_github_repos.sh` | `.sh` | GitHub Repository Sync Script |
| `systemic_indifference_analyzer.py` | `.py` | """ |
| `telegram-claude-orchestrator.py` | `.py` | Start listener daemon |
| `test-dashboard.spec.js` | `.js` | const { test, expect } = require('@playwright/test'); |
| `test-tld-config.sh` | `.sh` | Test Matrix for TLD Server Configuration Guard Clauses |
| `track-learning-trajectory.sh` | `.sh` | track-learning-trajectory.sh - Track learning convergence metrics over time |
| `triage_drain.py` | `.py` | import os |
| `trial-prep-now.sh` | `.sh` | Trial Prep ROI Swarm - Execute in 30 minutes |
| `trial-prep-workflow.sh` | `.sh` | trial-prep-workflow.sh |
| `trust-status.sh` | `.sh` | trust-status.sh - Quick visibility into trust gate states |
| `tunnel-url-tracker.sh` | `.sh` | tunnel-url-tracker.sh — Track free tunnel URLs for splitcite affiliate branding upgrade path |
| `unified-dashboard-nav.sh` | `.sh` | unified-dashboard-nav.sh |
| `unified-monitoring-status.sh` | `.sh` | Unified monitoring status dashboard |
| `update-skill-confidence.sh` | `.sh` | update-skill-confidence.sh - Update skill confidence based on outcomes |
| `update-skills-cache.sh` | `.sh` | update-skills-cache.sh - Automated skills cache updates from AgentDB |
| `update_dependencies.sh` | `.sh` | set -e |
| `update_members.py` | `.py` | CIRCLE ROLES (Layer 1) |
| `user_feedback_collector.py` | `.py` | """ |
| `validate-bridge-integration.sh` | `.sh` | validate-bridge-integration.sh |
| `validate-dynamic-thresholds.sh` | `.sh` | Validate Dynamic Thresholds vs Hardcoded |
| `validate-emails-robust.sh` | `.sh` | Enhanced Email Validator with Robust Exit Codes v2.0 |
| `validate-foundation-ci.sh` | `.sh` | validate-foundation-ci.sh — Merge-trust gate for CI (evidence-backed, deterministic) |
| `validate-foundation.sh` | `.sh` | validate-foundation.sh - QE Validation Gate for Foundation (Exit Code Enhanced) |
| `validate-governor-integration.sh` | `.sh` | validate-governor-integration.sh |
| `validate-learned-skills.sh` | `.sh` | Validate Learned Skills - Human-in-Loop Verification |
| `validate-p0-implementation.sh` | `.sh` | P0 Implementation Validation Script |
| `validate-secrets.sh` | `.sh` | validate-secrets.sh - Validate secrets configuration and report gaps |
| `validate.sh` | `.sh` | compare-all-validators.sh - Run ALL validators on given emails and write CONSOLIDATION-TRUTH-REPORT. |
| `validate_blockers.sh` | `.sh` | ============================================================================= |
| `validate_coherence_fast.py` | `.py` | Constrain scan budget so the validator finishes within our timeout |
| `validate_learning_parity.py` | `.py` | import json |
| `validate_photo_exif.py` | `.py` | """ |
| `validate_proxy_gaming.sh` | `.sh` | Comprehensive Proxy Gaming Detection Validation Script |
| `validate_resume.py` | `.py` | Add parent directory to path |
| `validate_snn.ts` | `.ts` | async function validateSNN() { |
| `validation-core-cli.sh` | `.sh` | CLI wrapper for validation-core.sh with JSON output support |
| `validation-core.sh` | `.sh` | ============================================================================= |
| `validation-gate-v2.sh` | `.sh` | validation-gate-v2.sh - Enhanced validation with MCP/MPP/WSJF/ROAM |
| `validation-gate.sh` | `.sh` | File: scripts/validation-gate.sh |
| `validation-with-fleet.ts` | `.ts` | /** |
| `validator-baseline.sh` | `.sh` | @business-context WSJF: Validator pipeline truth baseline (shellcheck + syntax) |
| `verify-contract-compliance.sh` | `.sh` | Verifiable Gates for Auto Commandments |
| `verify-d-c-a-b.sh` | `.sh` | Verifiable Gates for D/C/A/B Execution |
| `verify-licenses.sh` | `.sh` | License Verification Script for LOV Integration |
| `verify-new-modules.sh` | `.sh` | Verify New Modules: cPanel API Client + LLM Observatory |
| `verify-otlp.sh` | `.sh` | verify-otlp.sh – end-to-end test of OTLP telemetry export |
| `verify-package.sh` | `.sh` | Verify package is ready for npm publishing |
| `verify-send-readiness-contract.sh` | `.sh` | @business-context WSJF: Enforce unified send-readiness JSON contract |
| `verify_governance_p0.ts` | `.ts` | import Database from 'better-sqlite3'; |
| `verify_improvements.py` | `.py` | Verify the four proxy gaming detection improvements. |
| `verify_logger_enhanced.py` | `.py` | Add scripts dir to path |
| `verify_observability.sh` | `.sh` | 1. Observability First (Need 9 more, we have 1) |
| `verify_skills_persistence.ts` | `.ts` | import { existsSync, unlinkSync } from 'fs'; |
| `verify_system_improvements.py` | `.py` | Verify revenue_impact is auto-calculated per circle. |
| `web_dashboard.py` | `.py` | Add scripts directory to path |
| `wire-dynamic-mcp-rewards.sh` | `.sh` | wire-dynamic-mcp-rewards.sh |
| `workload_balancer.py` | `.py` | Circle capacity limits (max events per circle) |
| `wsjf-cycle.sh` | `.sh` | wsjf-cycle.sh - Single-thread WSJF cycle tracker |
| `wsjf-lock.sh` | `.sh` | wsjf-lock.sh - Enforce single-thread WSJF cycle execution |
| `wsjf-script-review-execute.sh` | `.sh` | wsjf-script-review-execute.sh — Iterative script review/execution with WSJF ordering |
| `wsjf-status.sh` | `.sh` | scripts/wsjf-status.sh |
| `wsjf-viz-select.ts` | `.ts` | /** |
| `yolife-deployment-readiness.sh` | `.sh` | YoLife Deployment Readiness - Comprehensive Pre-Flight & Orchestration |
| `yolife-readiness-simple.sh` | `.sh` | YoLife Deployment Readiness - Simple Version (Bash 3.2+ compatible) |

## `_AUTOMATION/`

| File | Type | Purpose |
|------|------|---------|
| `_AUTOMATION/stx-k8s-prep-matrix.sh` | `.sh` | ============================================================================== |

## `_SYSTEM/`

| File | Type | Purpose |
|------|------|---------|
| `_SYSTEM/_AUTOMATION/legal-pdf-ocr.sh` | `.sh` | Legal Document OCR Review & Processing Script |

## `agentdb/`

| File | Type | Purpose |
|------|------|---------|
| `agentdb/audit_agentdb.py` | `.py` | Schema definitions |
| `agentdb/process_governor_ingest.js` | `.js` | /** |
| `agentdb/process_governor_ingest_dedup.js` | `.js` | /** |

## `agentic/`

| File | Type | Purpose |
|------|------|---------|
| `agentic/__init__.py` | `.py` |  |
| `agentic/af_prod_wiring.py` | `.py` | """ |
| `agentic/affiliate_platform.py` | `.py` | """ |
| `agentic/agentdb_pattern_integration.py` | `.py` | -*- coding: utf-8 -*- |
| `agentic/ai_reasoning.py` | `.py` | """ |
| `agentic/alignment_checker.py` | `.py` | """ |
| `agentic/autocommit_graduation.py` | `.py` | """ |
| `agentic/autocommit_trust_metrics.py` | `.py` | """ |
| `agentic/bootstrap_local_metrics.py` | `.py` | """ |
| `agentic/break_glass_guard.py` | `.py` | """ |
| `agentic/code_guardrails.py` | `.py` | code_guardrails.py |
| `agentic/connectome_schema.py` | `.py` | """ |
| `agentic/detect_observability_gaps.py` | `.py` | Detect observability gaps by correlating failures with nearby metrics. |
| `agentic/dspy_optimizer.py` | `.py` | Setup basic logging |
| `agentic/economic_attribution.py` | `.py` | """ |
| `agentic/economic_calculator.py` | `.py` | """ |
| `agentic/evidence_manager.py` | `.py` | """ |
| `agentic/export_replenish_to_kanban.py` | `.py` | """ |
| `agentic/financial_services.py` | `.py` | """ |
| `agentic/generate_deliverables.py` | `.py` | Generate research synthesis deliverables for agentic-flow. |
| `agentic/generate_observability_actions.py` | `.py` | generate_observability_actions.py |
| `agentic/goap_planner.py` | `.py` | """ |
| `agentic/governance_integration.py` | `.py` | Get the project root directory |
| `agentic/graduation_assessor.py` | `.py` | Assess autocommit readiness using evidence |
| `agentic/guardrails.py` | `.py` | """ |
| `agentic/health_check.py` | `.py` | Monitor BML cycle health and detect risks. |
| `agentic/inbox_zero.py` | `.py` | Add project root to path |
| `agentic/interpretability_wrapper.py` | `.py` | import numpy as np |
| `agentic/kanban_sync.py` | `.py` | Synchronize Kanban board state between YAML and VSCode. |
| `agentic/learning_hooks_system.py` | `.py` | """ |
| `agentic/list_emitters.py` | `.py` | List available evidence emitters and graduation thresholds |
| `agentic/observability_gaps.py` | `.py` | Analyze pattern metrics for observability gaps |
| `agentic/pattern_logger.py` | `.py` | Import SchemaValidator for validation before write |
| `agentic/pattern_logger_old.py` | `.py` | Use env var for root if set, else relative to CWD |
| `agentic/pattern_logging_helper.py` | `.py` | -*- coding: utf-8 -*- |
| `agentic/platform_integrations.py` | `.py` | Circle-specific revenue impact (from revenue_attribution.py) |
| `agentic/prod_learning_collector.py` | `.py` | Collect and analyze monitoring data to improve af prod adaptive decisions |
| `agentic/retro_replenish_workflow.py` | `.py` | """ |
| `agentic/revenue_attribution.py` | `.py` | """ |
| `agentic/risk_analytics.py` | `.py` | """ |
| `agentic/roam_auto_escalation.py` | `.py` | """ |
| `agentic/run_feedback_loop.sh` | `.sh` | run_feedback_loop.sh - Execute complete Build-Measure-Learn cycle |
| `agentic/schema_validator.py` | `.py` | Schema requirements per tier |
| `agentic/show_roam_risks.py` | `.py` | show_roam_risks.py |
| `agentic/spiritual_dimension_recovery.py` | `.py` | """ |
| `agentic/suggest_actions.py` | `.py` | suggest_actions.py |
| `agentic/suggest_team.py` | `.py` | suggest_team.py |
| `agentic/swarm_perf_experiment.py` | `.py` | Swarm Performance Analysis: Validate optimal iteration count for af prod-cycle. |
| `agentic/testing_methodology.py` | `.py` | """ |
| `agentic/testing_strategies.py` | `.py` | """ |
| `agentic/tier_mapping.py` | `.py` | from __future__ import annotations |
| `agentic/timesfm_xreg_acg.py` | `.py` | """ |
| `agentic/unified_interface.py` | `.py` | """ |
| `agentic/unified_tool_interface.sh` | `.sh` | unified_tool_interface.sh - Single interface for all agentic tools |
| `agentic/wsjf_actionable_context.py` | `.py` | """ |

## `agents/`

| File | Type | Purpose |
|------|------|---------|
| `agents/infrastructure_agent.py` | `.py` | """ |

## `ai/`

| File | Type | Purpose |
|------|------|---------|
| `ai/wsjf_reasoner.py` | `.py` | """ |

## `aisp/`

| File | Type | Purpose |
|------|------|---------|
| `aisp/setup.sh` | `.sh` | set -euo pipefail |
| `aisp/validate.sh` | `.sh` | Fail if ambiguity rate > 0.02 (2%) |

## `alerts/`

| File | Type | Purpose |
|------|------|---------|
| `alerts/alert_manager.py` | `.py` | """ |

## `analysis/`

| File | Type | Purpose |
|------|------|---------|
| `analysis/__init__.py` | `.py` | Auto-generated for module imports |
| `analysis/analyze_dt_ci_history.py` | `.py` | Analyze DT CI history from ci_dt_check_history.jsonl. |
| `analysis/build_trajectories.py` | `.py` | Build offline RL trajectories from .goalie/metrics_log.jsonl. |
| `analysis/check_pattern_tag_coverage.py` | `.py` | Load pattern events from JSONL file. |
| `analysis/compare_presets.py` | `.py` | Compare hybrid reward presets over a trajectories file. |
| `analysis/dt_data_quality_check.py` | `.py` | DT Training Data Quality Analysis for Phase 2 Review. |
| `analysis/dt_e2e_check.py` | `.py` | End-to-end DT threshold calibration check. |
| `analysis/dt_evaluation_dashboard.py` | `.py` | DT evaluation dashboard: aggregate dt_evaluation events into HTML + summary. |
| `analysis/earnings_options_strategy.py` | `.py` | """ |
| `analysis/enforce_dt_quality_gates.py` | `.py` | Enforce DT evaluation quality gates from dt_evaluation_summary.json. |
| `analysis/evaluate_dt_model.py` | `.py` | Offline evaluation for Decision Transformer checkpoints. |
| `analysis/extract_valuable_metrics.py` | `.py` | """ |
| `analysis/fix_pattern_metrics.py` | `.py` | """ |
| `analysis/flow_metrics.py` | `.py` | Flow and learning metrics analysis for Agentic Flow. |
| `analysis/governance_evaluation_dashboard.py` | `.py` | Governance Agent calibration dashboard. |
| `analysis/list_reward_presets.py` | `.py` | List named Decision Transformer reward presets and their semantics. |
| `analysis/memory_leak_check.sh` | `.sh` | Track memory usage of Agentic Flow processes |
| `analysis/migrate_legacy_to_schema.py` | `.py` | """ |
| `analysis/migrate_pattern_metrics.py` | `.py` | Add missing required fields to an event. |
| `analysis/plot_dt_distributions.py` | `.py` | Visualize DT calibration distribution analysis. |
| `analysis/prepare_dt_dataset.py` | `.py` | Normalize Decision Transformer input features from trajectory JSONL. |
| `analysis/preview_rewards.py` | `.py` | Preview hybrid reward distributions for existing trajectories. |
| `analysis/publish_dt_gates_summary.py` | `.py` | import argparse |
| `analysis/retrospective_analysis.py` | `.py` | """ |
| `analysis/run_dossier.py` | `.py` | Build a consolidated "run dossier" for a given run_id. |
| `analysis/sla_flow_metrics.py` | `.py` | Analyze pattern metrics and generate SLA dashboard. |
| `analysis/suggest_dt_thresholds.py` | `.py` | Suggest DT model-quality thresholds from dashboard summary. |
| `analysis/suggest_governance_thresholds.py` | `.py` | Suggest Governance Agent health thresholds from evaluation summary. |
| `analysis/train_dt_model.py` | `.py` | Minimal Decision Transformer training script skeleton. |
| `analysis/validate_dt_trajectories.py` | `.py` | Validate Decision Transformer trajectories. |
| `analysis/validate_pattern_metrics.py` | `.py` | """ |
| `analysis/validate_success_criteria.sh` | `.sh` | validate_success_criteria.sh - production success criteria checks for Agentic Flow |
| `analysis/value_guided_dt.py` | `.py` | Value-Guided Decision Transformer Enhancement. |

## `api/`

| File | Type | Purpose |
|------|------|---------|
| `api/eta-server.py` | `.py` | """ |

## `assessments/`

| File | Type | Purpose |
|------|------|---------|
| `assessments/external_resource_risk_assessment.js` | `.js` | /** |

## `backtest/`

| File | Type | Purpose |
|------|------|---------|
| `backtest/backtest_engine.py` | `.py` | """ |

## `benchmarks/`

| File | Type | Purpose |
|------|------|---------|
| `benchmarks/establish_baselines.py` | `.py` | Add src to path |

## `bridge/`

| File | Type | Purpose |
|------|------|---------|
| `bridge/ingest_governor_incidents.py` | `.py` | Paths relative to project root |

## `canary/`

| File | Type | Purpose |
|------|------|---------|
| `canary/canary_release_controller.sh` | `.sh` | Canary Release Controller for Ubuntu 22.04 Migration |
| `canary/health_monitor.py` | `.py` | Configuration defaults |
| `canary/validate_ubuntu_vm_compliance.sh` | `.sh` | Remote Compliance Validation for Ubuntu 22.04 VM |

## `ci/`

| File | Type | Purpose |
|------|------|---------|
| `ci/adr-frontmatter-gate.sh` | `.sh` | ═══════════════════════════════════════════════════════════════════════════════ |
| `ci/aqe-shared-metrics-baseline.sh` | `.sh` | scripts/ci/aqe-shared-metrics-baseline.sh |
| `ci/audit_security_credentials.py` | `.py` | """ |
| `ci/check-adr-frontmatter.sh` | `.sh` | CI Gate: Reject ADRs without frontmatter |
| `ci/check-infra-health.sh` | `.sh` | scripts/ci/check-infra-health.sh |
| `ci/collect_metrics.py` | `.py` | """ |
| `ci/dependency_check.sh` | `.sh` | 1. Node.js Dependency Check |
| `ci/hostbill-sync-agent.py` | `.py` | """ |
| `ci/hostbill_api_client.py` | `.py` | Mock implementation of HostBill API client for testing. |
| `ci/import_calibration_to_agentdb.py` | `.py` | Connect to AgentDB database |
| `ci/k8s-conformance-sync.py` | `.py` | """ |
| `ci/maa-telemetry-baseline.py` | `.py` | Parses structural financial footprints from raw MAA correspondence schemas. |
| `ci/push-status-dashboard.sh` | `.sh` | Push Status Dashboard - Visualize push readiness and evidence |
| `ci/repair-nested-submodules.sh` | `.sh` | ============================================================================= |
| `ci/run-validation-tests.sh` | `.sh` | CI entry: hash-db + validation-core + runner tests + shellcheck manifest (warning+) |
| `ci/run_calibration.sh` | `.sh` | Enhanced Risk Analytics Calibration with Neural and Claude Integration |
| `ci/run_calibration_enhanced.sh` | `.sh` | Enhanced Calibration Wrapper |
| `ci/safe-timeout.py` | `.py` | """ |
| `ci/setup_calibration.sh` | `.sh` | Setup Calibration Environment |
| `ci/stx-k8s-prep-matrix.sh` | `.sh` | stx-k8s-prep-matrix.sh |
| `ci/stx-telemetry-check.sh` | `.sh` | STX OpenStack Telemetry Verification |
| `ci/test_automated_rca.sh` | `.sh` | @business-context WSJF-1: Deep-why CSQBM contract verification |
| `ci/track-push-evidence.sh` | `.sh` | Track push evidence for superproject/submodule trust spine |
| `ci/trading-telemetry-baseline.py` | `.py` | """ |

## `circles/`

| File | Type | Purpose |
|------|------|---------|
| `circles/daily_standup.sh` | `.sh` | Daily Standup Script |
| `circles/daily_standup_enhanced.sh` | `.sh` | Enhanced Daily Standup - WSJF + Actionable Context + Relentless Execution |
| `circles/expand_roles.py` | `.py` | import os |
| `circles/promote_to_kanban.py` | `.py` | --- Configuration --- |
| `circles/replenish_all_circles.sh` | `.sh` | Replenish all circles with WSJF auto-calculation and aggregation |
| `circles/replenish_circle.sh` | `.sh` | Default to project root |
| `circles/replenish_full_stack_coverage.sh` | `.sh` | Replenish backlog with Full Stack Coverage actions for each circle |
| `circles/replenish_manager.py` | `.py` | --- Configuration --- |
| `circles/retro_insights.sh` | `.sh` | Retro Insights Tracking and Sync Script |
| `circles/review_verification.sh` | `.sh` | Review Verification Script |
| `circles/standardize_backlog_schemas.sh` | `.sh` | Standardize Backlog Schemas Across All Circles |
| `circles/standardize_backlogs.sh` | `.sh` | Standardize Circle Backlog Schemas with CoD/WSJF |
| `circles/wsjf_automation_engine.py` | `.py` | Add parent directory to path for imports |
| `circles/wsjf_calculator.py` | `.py` | --- Configuration --- |
| `circles/wsjf_interactive.sh` | `.sh` | wsjf_interactive.sh |

## `cleanup/`

| File | Type | Purpose |
|------|------|---------|
| `cleanup/kill_stale_git_processes.sh` | `.sh` | Kill stale git and sudo processes |

## `credentials/`

| File | Type | Purpose |
|------|------|---------|
| `credentials/load_credentials.py` | `.py` | Try to import python-dotenv for .env file support |
| `credentials/propagate-real-keys.sh` | `.sh` | Credential Propagation: Write Real API Keys to .env Files |
| `credentials/validate_credentials.py` | `.py` | Add parent directory to path for imports |

## `daemons/`

| File | Type | Purpose |
|------|------|---------|
| `daemons/__init__.py` | `.py` |  |
| `daemons/mcp_scheduler_daemon.py` | `.py` | """ |
| `daemons/stx-cold-storage-archiver.sh` | `.sh` | scripts/daemons/stx-cold-storage-archiver.sh |

## `dashboard/`

| File | Type | Purpose |
|------|------|---------|
| `dashboard/pattern_dashboard.py` | `.py` | """ |

## `data/`

| File | Type | Purpose |
|------|------|---------|
| `data/analyst_ratings_fetcher.py` | `.py` | """ |
| `data/earnings_calendar_fetcher.py` | `.py` | """ |

## `db/`

| File | Type | Purpose |
|------|------|---------|
| `db/migrate.py` | `.py` | Represents a database migration |
| `db/risk_db_auto_init_patch.sh` | `.sh` | Risk Database Auto-Initialization Patch Script |
| `db/risk_db_init.sh` | `.sh` | Risk Database Auto-Initialization Script |

## `debug/`

| File | Type | Purpose |
|------|------|---------|
| `debug/validate_learning_capture.js` | `.js` | /** |

## `deploy/`

| File | Type | Purpose |
|------|------|---------|
| `deploy/deploy_domains.sh` | `.sh` | Agentic Flow - Domain Deployment Script |
| `deploy/phase4-quickstart.sh` | `.sh` | phase4-quickstart.sh |

## `deployment/`

| File | Type | Purpose |
|------|------|---------|
| `deployment/canary_release.py` | `.py` | Canary Release Pipeline for StarlingX STX.11 Upgrade. |
| `deployment/phase1_domain_routing.sh` | `.sh` | Phase 1.1: Multi-Tenant Domain Routing Infrastructure Setup |
| `deployment/setup_multitenant_nginx.sh` | `.sh` | Multi-Tenant Domain Routing Setup for StarlingX |

## `dev/`

| File | Type | Purpose |
|------|------|---------|
| `dev/count-shellcheck.sh` | `.sh` | @business-context WSJF-MOVE: Method score — shellcheck pass / total scripts |

## `execution/`

| File | Type | Purpose |
|------|------|---------|
| `execution/wip_monitor.py` | `.py` | WIP Limits per circle (configurable) |

## `goalie/`

| File | Type | Purpose |
|------|------|---------|
| `goalie/git_process_governor.sh` | `.sh` | Git Process Circuit Breaker |

## `governance/`

| File | Type | Purpose |
|------|------|---------|
| `governance/analyze_semantic_context.ts` | `.ts` | /** |
| `governance/compliance_as_code.py` | `.py` | Compliance as Code - Automated Governance Validation. |
| `governance/enrich_events.js` | `.js` | /** |
| `governance/final_coverage_report.js` | `.js` | const fs = require('fs'); |
| `governance/generate_audit_logs.js` | `.js` | /** |
| `governance/integrate_and_test.js` | `.js` | /** |
| `governance/runbook_generator.py` | `.py` | """ |
| `governance/test_circuit_breaker.js` | `.js` | /** |
| `governance/test_coverage.ts` | `.ts` | import { GovernanceSystem } from '../../src/governance/core/governance_system'; |

## `hooks/`

| File | Type | Purpose |
|------|------|---------|
| `hooks/auto-learning-trigger.sh` | `.sh` | auto-learning-trigger.sh - Auto-trigger learning and circulation every N episodes |
| `hooks/capture-task-learning.js` | `.js` | /** |
| `hooks/ceremony-hooks.sh` | `.sh` | ceremony-hooks.sh - Dynamic hook system for ceremony lifecycle |
| `hooks/emit-task-complete.sh` | `.sh` | Hook: Post-Task - Emit agent completion event to visualization |
| `hooks/emit-task-spawn.sh` | `.sh` | Hook: Pre-Task - Emit agent spawn event to visualization |
| `hooks/post-episode-learning-enhanced.sh` | `.sh` | post-episode-learning-enhanced.sh - Enhanced post-episode learning extraction |
| `hooks/post-episode-learning.sh` | `.sh` | Post-Episode Learning Hook |
| `hooks/pre-commit-staged-validation.sh` | `.sh` | Pre-commit helper: shellcheck on staged *.sh; validate-email on staged *.eml (BHOPTI). |
| `hooks/run-commit-gates.sh` | `.sh` | Shared commit gates: Date Semantics + CSQBM (CI/deterministic) + optional contract annotation audit. |

## `infrastructure/`

| File | Type | Purpose |
|------|------|---------|
| `infrastructure/deploy_greenfield_stx.sh` | `.sh` | ============================================================================= |
| `infrastructure/deploy_pipeline.sh` | `.sh` | ============================================================================= |
| `infrastructure/device_metrics_integration.py` | `.py` | Setup logging |
| `infrastructure/execute_greenfield_deployment.sh` | `.sh` | ============================================================================= |
| `infrastructure/fix_flannel_cni.sh` | `.sh` | Fix Flannel CNI CrashLoopBackOff |
| `infrastructure/monitor_and_bootstrap_ubuntu.sh` | `.sh` | set -euo pipefail |
| `infrastructure/mttr_tracker.py` | `.py` | Configuration |
| `infrastructure/sla_dashboard_service.py` | `.py` | Configuration |

## `integrations/`

| File | Type | Purpose |
|------|------|---------|
| `integrations/communication_platform_integrations.py` | `.py` | """ |
| `integrations/discord_bot.py` | `.py` | """ |
| `integrations/discord_notifier.py` | `.py` | Send formatted notifications to Discord webhook |
| `integrations/mail_integration.py` | `.py` | """ |
| `integrations/multitenant_adapters.py` | `.py` | Base adapter for platform integrations |
| `integrations/rust_validator.py` | `.py` | Photo EXIF metadata extracted via Rust. |
| `integrations/starlingx_hostbill.py` | `.py` | Log integration events for audit trail |
| `integrations/stripe_sandbox.py` | `.py` | Simple call to verify key |
| `integrations/stx_telemetry_agent.py` | `.py` | """ |
| `integrations/telegram_notifier.py` | `.py` | """ |
| `integrations/twitch_eventsub.py` | `.py` | """ |
| `integrations/twitch_overlay.py` | `.py` | """ |

## `interfaces/`

| File | Type | Purpose |
|------|------|---------|
| `interfaces/__init__.py` | `.py` |  |
| `interfaces/discord_bot_proxy.py` | `.py` | """ |
| `interfaces/graphql_proxy.py` | `.py` | """ |
| `interfaces/offline-proxy-bridge.js` | `.js` | /** |
| `interfaces/universal_bridge_proxy.py` | `.py` | Fix import path logically ensuring we can hit interface endpoints |

## `lib/`

| File | Type | Purpose |
|------|------|---------|
| `lib/dynamic-reward-calculator.sh` | `.sh` | dynamic-reward-calculator.sh |
| `lib/dynamic-thresholds.sh` | `.sh` | Dynamic Threshold Calculator |
| `lib/log_pattern_event.sh` | `.sh` | Pattern telemetry logging helper |

## `mcp/`

| File | Type | Purpose |
|------|------|---------|
| `mcp/run-validation-runner-json.sh` | `.sh` | @business-context WSJF: T1a MCP bridge — IDE/CI calls validation-runner without hand-rolling paths |

## `mcp-tools/`

| File | Type | Purpose |
|------|------|---------|
| `mcp-tools/resource-monitor-tool.sh` | `.sh` | MCP Tool: Resource Monitor |
| `mcp-tools/roam-watchdog-tool.sh` | `.sh` | MCP Tool: ROAM Staleness Watchdog |
| `mcp-tools/swarm-supervisor-tool.sh` | `.sh` | MCP Tool: Swarm Supervisor |

## `metrics/`

| File | Type | Purpose |
|------|------|---------|
| `metrics/init_risk_analytics_db.py` | `.py` | """ |

## `migration/`

| File | Type | Purpose |
|------|------|---------|
| `migration/execute_migration.sh` | `.sh` | ============================================================================ |
| `migration/post_migration_validate.sh` | `.sh` | ============================================================================ |
| `migration/pre_migration_check.sh` | `.sh` | ============================================================================ |
| `migration/run_shim.sh` | `.sh` | export GITLAB_IP_OVERRIDE="127.0.0.1" |
| `migration/setup_monitoring.sh` | `.sh` | ============================================================================ |
| `migration/test_shim.sh` | `.sh` | SOURCE="gitlab.yocloud.com" |

## `migrations/`

| File | Type | Purpose |
|------|------|---------|
| `migrations/run_migrations.sh` | `.sh` | Migration Runner for Affiliate System |

## `ml/`

| File | Type | Purpose |
|------|------|---------|
| `ml/build_dt_dataset.py` | `.py` | """ |
| `ml/dt_offline_training.py` | `.py` | """ |
| `ml/predict_setups.py` | `.py` | """ |
| `ml/train_dt.py` | `.py` | """ |
| `ml/train_setup_predictor.py` | `.py` | """ |

## `monitoring/`

| File | Type | Purpose |
|------|------|---------|
| `monitoring/agentdb_monitor.py` | `.py` | """ |
| `monitoring/circle_health_monitor.py` | `.py` | """ |
| `monitoring/cron_health_monitor.sh` | `.sh` | cron_health_monitor.sh |
| `monitoring/dashboard_server.js` | `.js` | /** |
| `monitoring/deploy_dashboard.sh` | `.sh` | Deploy INFRA-2 Monitoring Dashboard to yo.tag.ooo |
| `monitoring/deploy_monitoring.sh` | `.sh` | Deploy Discord Bot Monitoring to yo.tag.ooo |
| `monitoring/discord_bot_health.sh` | `.sh` | Discord Bot Health Check Script |
| `monitoring/evidence_trail_manager.py` | `.py` | """ |
| `monitoring/evidence_validator.py` | `.py` | Result of evidence validation |
| `monitoring/external-validation-gates.sh` | `.sh` | External Validation Gates Implementation |
| `monitoring/heartbeat_monitor.py` | `.py` | heartbeat_monitor.py |
| `monitoring/integrate-alignment-sentinel.sh` | `.sh` | Integrate Alignment Sentinel with Monitoring Stack |
| `monitoring/integration_health_checks.py` | `.py` | """ |
| `monitoring/process_tree_watch.js` | `.js` | /** |
| `monitoring/site_health.py` | `.py` | """ |
| `monitoring/site_health_monitor.py` | `.py` | """ |
| `monitoring/system_health_orchestrator.py` | `.py` | """ |
| `monitoring/tm_disk_guardian.sh` | `.sh` | tm_disk_guardian.sh |
| `monitoring/validate-claims.sh` | `.sh` | Validate that performance claims have supporting evidence |
| `monitoring/validate-ssh-connectivity.sh` | `.sh` | OBS-3 SSH Connectivity Validation Script |
| `monitoring/watch_cycle.sh` | `.sh` | watch_cycle.sh - Real-time monitor for af prod-cycle |
| `monitoring/watch_prod_cycle.sh` | `.sh` | watch_prod_cycle.sh - Real-time monitor for af prod-cycle telemetry |

## `observability/`

| File | Type | Purpose |
|------|------|---------|
| `observability/anomaly_detector.py` | `.py` | Statistical anomaly detection and root cause analysis engine |
| `observability/gap_detector.py` | `.py` | Detects gaps in observability coverage |
| `observability/pattern_telemetry_analyzer.py` | `.py` | Analyzes pattern execution telemetry and identifies performance patterns |
| `observability/telemetry_collector.py` | `.py` | """ |

## `orchestration/`

| File | Type | Purpose |
|------|------|---------|
| `orchestration/anthropic_harness.py` | `.py` | Anthropic Long-Running Agent Harness. |
| `orchestration/conductor_workflow.py` | `.py` | Google Conductor-Style Context-Driven Development Workflow. |

## `orchestrators/`

| File | Type | Purpose |
|------|------|---------|
| `orchestrators/3-2-1-backup.sh` | `.sh` | scripts/orchestrators/3-2-1-backup.sh |
| `orchestrators/FULL-AUTO-MASTER.sh` | `.sh` | FULL-AUTO MASTER ORCHESTRATOR |
| `orchestrators/MASTER-PARALLEL-COORDINATOR.sh` | `.sh` | MASTER PARALLEL COORDINATOR |
| `orchestrators/cascade-tunnel.sh` | `.sh` | ============================================================================= |
| `orchestrators/delegate-agent-spawn.sh` | `.sh` | delegate-agent-spawn.sh — Universal Agent Spawn Wrapper with Registry Update |
| `orchestrators/deploy-tunnel.sh` | `.sh` | ============================================================================= |
| `orchestrators/inject-dashboard-nav.sh` | `.sh` | scripts/orchestrators/inject-dashboard-nav.sh |
| `orchestrators/persistent-agent-wrapper.sh` | `.sh` | Persistent Agent Wrapper v1.0 |
| `orchestrators/start-ledger-tunnel.sh` | `.sh` | start-ledger-tunnel.sh - Start individual ledger tunnel with bounded reasoning |
| `orchestrators/swarm-agent-supervisor.sh` | `.sh` | Swarm Agent Supervisor v1.0 |

## `patterns/`

| File | Type | Purpose |
|------|------|---------|
| `patterns/apply_template.py` | `.py` | Load pattern template YAML |
| `patterns/batch_apply_templates.py` | `.py` | Pattern matching rules for automatic template selection |
| `patterns/validate_dor_dod.py` | `.py` | """ |

## `performance/`

| File | Type | Purpose |
|------|------|---------|
| `performance/establish_baselines.js` | `.js` | /** |

## `policy/`

| File | Type | Purpose |
|------|------|---------|
| `policy/dynamic_autocommit.sh` | `.sh` | Reads metrics_log.jsonl to decide if code autocommit is safe |
| `policy/env_shim.sh` | `.sh` | env_shim.sh - Deterministic tool paths for macOS |
| `policy/governance.py` | `.py` | """ |
| `policy/governance_patch.py` | `.py` | Monkey-patch argparse to allow unknown args |
| `policy/no_new_md_guard.sh` | `.sh` | no_new_md_guard.sh - Enforce NO NEW .md FILES constraint |
| `policy/polymarket_scraper.py` | `.py` | Neural-Trader Native Weights evaluating constraints seamlessly cleanly tracing variables securely sa |
| `policy/postgres_mapper.py` | `.py` | Enforcing Zero-Trust credential mappings exclusively mapping .env bounds natively |
| `policy/stx_ipmi_poller.py` | `.py` | Maps tracking variables cleanly tracking gracefully cleanly |

## `priority/`

| File | Type | Purpose |
|------|------|---------|
| `priority/dynamic_queue.py` | `.py` | """ |
| `priority/wsjf_adjuster.py` | `.py` | """ |

## `quality/`

| File | Type | Purpose |
|------|------|---------|
| `quality/prod_quality_gates.py` | `.py` | Quality assessment levels |

## `research/`

| File | Type | Purpose |
|------|------|---------|
| `research/hybrid_memory_consolidate.py` | `.py` | Compute MIRAS surprise score for an event. |
| `research/miras_vs_agentdb_poc.py` | `.py` | """ |
| `research/test_hybrid_memory.py` | `.py` | """ |

## `risk/`

| File | Type | Purpose |
|------|------|---------|
| `risk/integration_risk_analytics.py` | `.py` | Add risk-analytics to path |

## `scanners/`

| File | Type | Purpose |
|------|------|---------|
| `scanners/oversold_tech_scanner.py` | `.py` | """ |

## `security/`

| File | Type | Purpose |
|------|------|---------|
| `security/test-sso-flow.sh` | `.sh` | SSO Flow Validation Test Suite |

## `starlingx/`

| File | Type | Purpose |
|------|------|---------|
| `starlingx/deploy.sh` | `.sh` | StarlingX r/stx.11.0 Deployment Automation |
| `starlingx/run-k8s-conformance.sh` | `.sh` | run-k8s-conformance.sh - StarlingX v1.33 CNCF Kubernetes Conformance Pipeline |
| `starlingx/validate_deployment.sh` | `.sh` | StarlingX Deployment Validation |

## `stx/`

| File | Type | Purpose |
|------|------|---------|
| `stx/stx_health_extended.py` | `.py` | """ |

## `superproject-gates/`

| File | Type | Purpose |
|------|------|---------|
| `superproject-gates/@llm-observatory-sdk.d.ts` | `.ts` | /** |
| `superproject-gates/AdminPanel.d.ts` | `.ts` | import React from 'react'; |
| `superproject-gates/CircleDetailView.d.ts` | `.ts` | import React from 'react'; |
| `superproject-gates/DEPLOY_PRODUCTION_NOW.sh` | `.sh` | 🚀 PRODUCTION DEPLOYMENT - RISK ANALYTICS SOFT LAUNCH |
| `superproject-gates/EXECUTE_SOFT_LAUNCH_IMMEDIATE.sh` | `.sh` | ================================================ |
| `superproject-gates/RoamGraph.d.ts` | `.ts` | import React from 'react'; |
| `superproject-gates/RoozApp.d.ts` | `.ts` | import React from 'react'; |
| `superproject-gates/YoLifeCockpit.d.ts` | `.ts` | /** |
| `superproject-gates/__init__.py` | `.py` | Detect package manager |
| `superproject-gates/act-plan-feedback-loop.d.ts` | `.ts` | /** |
| `superproject-gates/act-plan-feedback-loop.ts` | `.ts` | /** |
| `superproject-gates/action-tracker.ts` | `.ts` | /** |
| `superproject-gates/activate-remediation-tracking.sh` | `.sh` | Activate Remediation Effectiveness Tracking |
| `superproject-gates/adaptive-correction.ts` | `.ts` | /** |
| `superproject-gates/add-pattern-rationales.ts` | `.ts` | /** |
| `superproject-gates/adr-compliance.sh` | `.sh` | Claude Flow V3 - ADR Compliance Checker Worker |
| `superproject-gates/advanced_mcp_integration.py` | `.py` | """ |
| `superproject-gates/advocacy-council-test-harness-v2.py` | `.py` | Add advocacy pipeline to path |
| `superproject-gates/advocacy-council-test-harness.py` | `.py` | Add advocacy pipeline to path |
| `superproject-gates/af-prod-dor-dod.d.ts` | `.ts` | /** |
| `superproject-gates/af-prod-dor-dod.ts` | `.ts` | /** |
| `superproject-gates/af-prod-engine.d.ts` | `.ts` | /** |
| `superproject-gates/af-prod-engine.ts` | `.ts` | /** |
| `superproject-gates/af.sh` | `.sh` | --- Enhanced AF CLI with Multipass Integration --- |
| `superproject-gates/af_prod_cycle.py` | `.py` | Add investing/agentic-flow/scripts directory to Python path |
| `superproject-gates/af_prod_swarm.py` | `.py` | Add investing/agentic-flow/scripts directory to Python path |
| `superproject-gates/af_prod_swarm_fixed.py` | `.py` | Add investing/agentic-flow/scripts directory to Python path |
| `superproject-gates/af_unified.sh` | `.sh` | --- Unified AF CLI with Consistent Evidence Emission --- |
| `superproject-gates/af_wrapper.py` | `.py` | Add src to Python path for imports |
| `superproject-gates/affiliate-network-manager.ts` | `.ts` | /** |
| `superproject-gates/affinity-engine.ts` | `.ts` | /** |
| `superproject-gates/agent-coordination.ts` | `.ts` | /** |
| `superproject-gates/agent-harness.ts` | `.ts` | /** |
| `superproject-gates/agent_sdk_examples.sh` | `.sh` | Agent SDK Mode Examples using OpenRouter free models |
| `superproject-gates/agentdb-client.d.ts` | `.ts` | /** |
| `superproject-gates/agentdb-client.ts` | `.ts` | /** |
| `superproject-gates/agentdb.d.ts` | `.ts` | export declare class AgentDB { |
| `superproject-gates/agentdb.ts` | `.ts` | // Stub for AgentDB - actual implementation elsewhere |
| `superproject-gates/agentdb_monitor.py` | `.py` | """ |
| `superproject-gates/agentic-flow-integration.ts` | `.ts` | /** |
| `superproject-gates/aggregation-engine.ts` | `.ts` | /** |
| `superproject-gates/aggregation-reporting.d.ts` | `.ts` | /** |
| `superproject-gates/aggregation-reporting.ts` | `.ts` | /** |
| `superproject-gates/ai-decision-engine.ts` | `.ts` | /** |
| `superproject-gates/aisp-script-1.py` | `.py` | 404: Not Found |
| `superproject-gates/aisp-script-2.py` | `.py` | 404: Not Found |
| `superproject-gates/aisp-types.d.ts` | `.ts` | /** |
| `superproject-gates/aisp-types.ts` | `.ts` | /** |
| `superproject-gates/aisp-validator.d.ts` | `.ts` | /** |
| `superproject-gates/aisp-validator.ts` | `.ts` | /** |
| `superproject-gates/alert-router.ts` | `.ts` | /** |
| `superproject-gates/alerting-engine.ts` | `.ts` | /** |
| `superproject-gates/alignment-sentinel.ts` | `.ts` | /** |
| `superproject-gates/alignment_checker.py` | `.py` | """ |
| `superproject-gates/analytics-engine.ts` | `.ts` | /** |
| `superproject-gates/analytics.d.ts` | `.ts` | import { SystemHealth } from '../core/health-checks'; |
| `superproject-gates/analytics.ts` | `.ts` | import { SystemHealth } from '../core/health-checks'; |
| `superproject-gates/analyze-circle-equity.sh` | `.sh` | Analyze skill distribution across circles for equity |
| `superproject-gates/anomaly_detector.py` | `.py` | Statistical anomaly detection and root cause analysis engine |
| `superproject-gates/ansible-validation.sh` | `.sh` | Ansible Validation Script - Off-Host Syslog Black Box Recorder |
| `superproject-gates/anthropic_affinity_engine.py` | `.py` | """ |
| `superproject-gates/api_server.py` | `.py` | """ |
| `superproject-gates/apply-firewall.sh` | `.sh` | ============================================================================= |
| `superproject-gates/apply-migrations.sh` | `.sh` | set -euo pipefail |
| `superproject-gates/archive-compress.sh` | `.sh` | Archive Compression Script |
| `superproject-gates/assess-code.sh` | `.sh` | Brutal Honesty Code Assessment Script (Linus Mode) |
| `superproject-gates/assess-tests.sh` | `.sh` | Brutal Honesty Test Assessment Script (Ramsay Mode) |
| `superproject-gates/async-spike-communication.ts` | `.ts` | /** |
| `superproject-gates/auth-federation.d.ts` | `.ts` | /** |
| `superproject-gates/auth-federation.ts` | `.ts` | /** |
| `superproject-gates/auto-commit.sh` | `.sh` | Auto-commit helper for Claude Code hooks |
| `superproject-gates/auto-wsjf-calculator.ts` | `.ts` | /** |
| `superproject-gates/automated-risk-mitigation.ts` | `.ts` | /** |
| `superproject-gates/aws-health-monitor.ts` | `.ts` | /** |
| `superproject-gates/aws-lightsail-adapter.d.ts` | `.ts` | /** |
| `superproject-gates/aws-lightsail-adapter.ts` | `.ts` | /** |
| `superproject-gates/aws-lightsail-provider.ts` | `.ts` | /** |
| `superproject-gates/ay-auto-consolidate-skills.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-auto-cycle.ts` | `.ts` | /** |
| `superproject-gates/ay-baseline-review.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-ceremony-seeker.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-continuous-improve.sh` | `.sh` | Continuous Improvement Orchestrator |
| `superproject-gates/ay-dashboard.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-dashboard.spec.ts` | `.ts` | import { test, expect } from '@playwright/test'; |
| `superproject-gates/ay-db-init.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-dynamic-risk-health.sh` | `.sh` | Dynamic Risk Parameter Health Check |
| `superproject-gates/ay-fire-cycle.sh` | `.sh` | Short ay fire cycle: rapid decision audit + pattern log generation |
| `superproject-gates/ay-focused-execution.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-governance-check.sh` | `.sh` | ay-governance-check.sh - Run governance compliance checks |
| `superproject-gates/ay-governance-framework.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-governance.sh` | `.sh` | AY Governance Framework |
| `superproject-gates/ay-green-streak-tracker.ts` | `.ts` | /** |
| `superproject-gates/ay-improve-wrapper.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-integrated-cycle.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-mode-selector.d.ts` | `.ts` | /** |
| `superproject-gates/ay-mode-selector.ts` | `.ts` | /** |
| `superproject-gates/ay-p0-validation.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-p1-feedback-loop.ts` | `.ts` | /** |
| `superproject-gates/ay-preflight-check.sh` | `.sh` | Pre-flight checklist for continuous improvement |
| `superproject-gates/ay-prod-cycle-with-dor.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-prod-cycle.sh` | `.sh` | Configuration |
| `superproject-gates/ay-prod-dor-lookup.sh` | `.sh` | DoR Budget Lookup - Query time/quality constraints before ceremony execution |
| `superproject-gates/ay-prod-failure-scenarios.sh` | `.sh` | ========================================== |
| `superproject-gates/ay-prod-learn-loop.sh` | `.sh` | ay-prod-learn-loop.sh - Continuous learning loop for ay prod-cycle |
| `superproject-gates/ay-prod-progress-monitor.sh` | `.sh` | Progress monitor - reads state file and renders progress |
| `superproject-gates/ay-prod-record-causal.ts` | `.ts` | /** |
| `superproject-gates/ay-prod-run-all.sh` | `.sh` | Configuration |
| `superproject-gates/ay-prod-run-with-progress.ts` | `.ts` | /** |
| `superproject-gates/ay-prod-skill-lookup.sh` | `.sh` | ay-prod-skill-lookup.sh - Query relevant skills before ceremony execution |
| `superproject-gates/ay-prod-store-completion.ts` | `.ts` | /** |
| `superproject-gates/ay-prod-store-episode.sh` | `.sh` | ay-prod-store-episode.sh - Store ay prod-cycle outcome for learning |
| `superproject-gates/ay-production.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-qe-integration.ts` | `.ts` | /** |
| `superproject-gates/ay-remediation-tracker.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-seeker-mpp.sh` | `.sh` | ============================================================================ |
| `superproject-gates/ay-skill-scanner.ts` | `.ts` | /** |
| `superproject-gates/ay-smart-cycle-governed.sh` | `.sh` | ay-smart-cycle-governed.sh - Governance-Enhanced Smart Cycle |
| `superproject-gates/ay-smart-cycle.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-smart-select.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-toolsets-integration.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-truth-calibration.sh` | `.sh` | ay-truth-calibration.sh - Axiomatic Truth-Alignment Verification |
| `superproject-gates/ay-unified-cycle.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-wrapper.sh` | `.sh` | ay Command Wrapper - Routes commands properly |
| `superproject-gates/ay-wsjf-iterate.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/ay-yo-auto.sh` | `.sh` | ay-yo-auto.sh - Automatic inventory → interactive cockpit flow |
| `superproject-gates/ay-yo-digital-cockpit.sh` | `.sh` | Yo.life Digital Cockpit - Unified ay-prod × yo.life Dashboard |
| `superproject-gates/ay-yo-enhanced.sh` | `.sh` | Color codes |
| `superproject-gates/ay-yo-env-editor-agent.sh` | `.sh` | Interactive .env Editor Agent |
| `superproject-gates/ay-yo-import-skills.sh` | `.sh` | Import Claude Skills into AgentDB |
| `superproject-gates/ay-yo-integrate.sh` | `.sh` | ay-yo Integration Script |
| `superproject-gates/ay-yo-interactive-cockpit.ts` | `.ts` | /** |
| `superproject-gates/ay-yo-interactive.sh` | `.sh` | Interactive Yo.life Digital Cockpit - Shell Wrapper |
| `superproject-gates/ay-yo-resolve-action.sh` | `.sh` | Deep Resolution Orchestrator |
| `superproject-gates/ay-yo.sh` | `.sh` | Default to interactive cockpit for manual control |
| `superproject-gates/ay-yolife-with-skills.sh` | `.sh` | ay-yolife-with-skills.sh - Integrate yo.life CLI with AgentDB learned skills |
| `superproject-gates/ay-yolife.sh` | `.sh` | ============================================================================ |
| `superproject-gates/backup-agentdb.sh` | `.sh` | ============================================================================ |
| `superproject-gates/backup-incremental.sh` | `.sh` | Incremental Backup Script with Hard Links |
| `superproject-gates/backup-now.sh` | `.sh` | Quick backup trigger |
| `superproject-gates/backup_alerting.sh` | `.sh` | GitLab Backup Alerting Script |
| `superproject-gates/backup_metrics_collector.sh` | `.sh` | GitLab Backup Metrics Collector Script |
| `superproject-gates/backup_validator.sh` | `.sh` | GitLab Backup Validator Script |
| `superproject-gates/base-evidence-emitter.ts` | `.ts` | /** |
| `superproject-gates/base_validator.py` | `.py` | Base class for all validators |
| `superproject-gates/baseline_assessment.py` | `.py` | Configure logging |
| `superproject-gates/bio-inspired-orchestration-integration.ts` | `.ts` | /** |
| `superproject-gates/blue-green-deploy.sh` | `.sh` | Blue-Green Deployment Script for Governance Agents |
| `superproject-gates/bml-cycle-manager.ts` | `.ts` | /** |
| `superproject-gates/bot.ts` | `.ts` | // Discord Bot for Multi-Tenant Affiliate Platform |
| `superproject-gates/boundary-enforcer.d.ts` | `.ts` | /** |
| `superproject-gates/boundary-enforcer.ts` | `.ts` | /** |
| `superproject-gates/break_glass.py` | `.py` | """ |
| `superproject-gates/break_glass_activate.sh` | `.sh` | break_glass_activate.sh |
| `superproject-gates/break_glass_hooks.sh` | `.sh` | Break Glass Hooks for AF CLI |
| `superproject-gates/browser-smoke-open.sh` | `.sh` | set -euo pipefail |
| `superproject-gates/brutal-honesty-dashboard.ts` | `.ts` | /** |
| `superproject-gates/brutal-honesty-integration.ts` | `.ts` | /** |
| `superproject-gates/brutal-honesty-tracker.ts` | `.ts` | /** |
| `superproject-gates/brutal-honesty-validator.ts` | `.ts` | /** |
| `superproject-gates/budget-guardrails.ts` | `.ts` | /** |
| `superproject-gates/budget_monitor.py` | `.py` | """ |
| `superproject-gates/bundle-evidence.sh` | `.sh` | bundle-evidence.sh - 7-section evidence bundler with SHA-256 chain of custody |
| `superproject-gates/business-risk-analyzer.ts` | `.ts` | /** |
| `superproject-gates/calculate-thresholds.sh` | `.sh` | calculate-thresholds.sh - Dynamic percentile-based thresholds |
| `superproject-gates/calculate-wsjf-auto.sh` | `.sh` | ========================================== |
| `superproject-gates/calculator.d.ts` | `.ts` | /** |
| `superproject-gates/calculator.ts` | `.ts` | /** |
| `superproject-gates/calibrate_model.py` | `.py` | """ |
| `superproject-gates/calibration-optimizer.d.ts` | `.ts` | /** |
| `superproject-gates/calibration-optimizer.ts` | `.ts` | /** |
| `superproject-gates/capture-episodes.sh` | `.sh` | Episode Capture Script |
| `superproject-gates/capture_baselines.sh` | `.sh` | Repos count |
| `superproject-gates/capture_baselines_simple.sh` | `.sh` | Repos count |
| `superproject-gates/causal-emergence-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/causal-emergence-analyzer.ts` | `.ts` | /** |
| `superproject-gates/causal-emergence.ts` | `.ts` | /** |
| `superproject-gates/causal-learning-integration.d.ts` | `.ts` | /** |
| `superproject-gates/causal-learning-integration.ts` | `.ts` | /** |
| `superproject-gates/causal-strength-metrics.d.ts` | `.ts` | /** |
| `superproject-gates/causal-strength-metrics.ts` | `.ts` | /** |
| `superproject-gates/ceremony-instrumentation.d.ts` | `.ts` | /** |
| `superproject-gates/ceremony-instrumentation.ts` | `.ts` | /** |
| `superproject-gates/ceremony-routes.d.ts` | `.ts` | /** |
| `superproject-gates/ceremony-routes.ts` | `.ts` | /** |
| `superproject-gates/ceremony-scheduler.d.ts` | `.ts` | /** |
| `superproject-gates/ceremony-scheduler.ts` | `.ts` | /** |
| `superproject-gates/ceremony-tools.ts` | `.ts` | /** |
| `superproject-gates/check-coherence.sh` | `.sh` | P2-LIVE: Coherence Check Script for CI Integration |
| `superproject-gates/check-maa-inbox.sh` | `.sh` | check-maa-inbox.sh - MAA Inbox Monitor with AppleScript (Fixed) |
| `superproject-gates/check-roam-freshness.sh` | `.sh` | Fail if newest docs/ROAM*.md is older than MAX_DAYS (default 3) |
| `superproject-gates/checkpoint-manager.sh` | `.sh` | Claude Checkpoint Manager |
| `superproject-gates/ci-pipeline-config.ts` | `.ts` | /** |
| `superproject-gates/circle-batch-runner.d.ts` | `.ts` | /** |
| `superproject-gates/circle-batch-runner.ts` | `.ts` | /** |
| `superproject-gates/circle-learning-worker.d.ts` | `.ts` | /** |
| `superproject-gates/circle-learning-worker.ts` | `.ts` | /** |
| `superproject-gates/circle-perspective-analyzer.ts` | `.ts` | /** |
| `superproject-gates/circle-perspective-telemetry.ts` | `.ts` | /** |
| `superproject-gates/circle_health_monitor.py` | `.py` | """ |
| `superproject-gates/claude-code-execution.ts` | `.ts` | /** |
| `superproject-gates/claude-flow-integration.d.ts` | `.ts` | /** |
| `superproject-gates/claude-flow-integration.ts` | `.ts` | /** |
| `superproject-gates/claude-flow-swarm.spec.ts` | `.ts` | import { test, expect } from '@playwright/test'; |
| `superproject-gates/claude_code_examples.sh` | `.sh` | Claude Code Mode Examples using OpenRouter free models |
| `superproject-gates/cleanup-learning.sh` | `.sh` | Prune old learning retros and rotate transmission log |
| `superproject-gates/cleanup-phase1-safe.sh` | `.sh` | Phase 1 Safe Cleanup - Build Artifacts & Caches Only |
| `superproject-gates/cli.py` | `.py` | """ |
| `superproject-gates/cli_dashboard.py` | `.py` | Import our dashboard components |
| `superproject-gates/cloud-provider-mocks.ts` | `.ts` | /** |
| `superproject-gates/cloud-provider-selector.ts` | `.ts` | /** |
| `superproject-gates/cloud-provider-usage.ts` | `.ts` | /** |
| `superproject-gates/cloud-provider.ts` | `.ts` | /** |
| `superproject-gates/cmd_actionable_context.py` | `.py` | """ |
| `superproject-gates/cmd_pattern_stats.py` | `.py` | Get .goalie directory path |
| `superproject-gates/cmd_prod_cycle.py` | `.py` | cmd_prod_cycle.py - Production Cycle Management |
| `superproject-gates/cockpit-routes.d.ts` | `.ts` | /** |
| `superproject-gates/cockpit-routes.ts` | `.ts` | /** |
| `superproject-gates/coherence_ci.d.ts` | `.ts` | /** |
| `superproject-gates/coherence_ci.ts` | `.ts` | /** |
| `superproject-gates/collect_metrics.py` | `.py` | """ |
| `superproject-gates/commission-manager.ts` | `.ts` | /** |
| `superproject-gates/completion-dashboard.sh` | `.sh` | ════════════════════════════════════════════════════════════════════════════ |
| `superproject-gates/completion-tracker.d.ts` | `.ts` | /** |
| `superproject-gates/completion-tracker.ts` | `.ts` | /** |
| `superproject-gates/compliance-framework.ts` | `.ts` | /** |
| `superproject-gates/compliance_as_code.py` | `.py` | Configure logging |
| `superproject-gates/component-health-provider.d.ts` | `.ts` | /** |
| `superproject-gates/component-health-provider.ts` | `.ts` | /** |
| `superproject-gates/comprehensive_validation_suite.sh` | `.sh` | comprehensive_validation_suite.sh |
| `superproject-gates/comprehensive_validator.py` | `.py` | Comprehensive validation system for production workflows |
| `superproject-gates/compute-circle-equity.sh` | `.sh` | Compute Circle Equity from Learning Loop Baselines |
| `superproject-gates/config.d.ts` | `.ts` | /** |
| `superproject-gates/config.ts` | `.ts` | /** |
| `superproject-gates/configuration-management.ts` | `.ts` | /** |
| `superproject-gates/configuration_validator.py` | `.py` | Add project root to path |
| `superproject-gates/connection-pool.d.ts` | `.ts` | /** |
| `superproject-gates/connection-pool.ts` | `.ts` | /** |
| `superproject-gates/connectivity-test.sh` | `.sh` | Connectivity Test Script |
| `superproject-gates/consensus-engine.ts` | `.ts` | /** |
| `superproject-gates/content-sync-engine.d.ts` | `.ts` | /** |
| `superproject-gates/content-sync-engine.ts` | `.ts` | /** |
| `superproject-gates/context-switcher.ts` | `.ts` | /** |
| `superproject-gates/continuous-improvement-cycle.ts` | `.ts` | /** |
| `superproject-gates/continuous_improvement.py` | `.py` | Configure logging |
| `superproject-gates/core.py` | `.py` | -*- coding: utf-8 -*- |
| `superproject-gates/correlation_analysis.py` | `.py` | Add investing/agentic-flow/scripts directory to Python path |
| `superproject-gates/count_missing_rationale.py` | `.py` | import json |
| `superproject-gates/coverage-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/coverage-analyzer.ts` | `.ts` | /** |
| `superproject-gates/coverage-cli.ts` | `.ts` | /** |
| `superproject-gates/coverage-metrics.ts` | `.ts` | /** |
| `superproject-gates/coverage-reporting-system.ts` | `.ts` | /** |
| `superproject-gates/cpanel-ssl-manager.sh` | `.sh` | cPanel SSL Certificate Manager |
| `superproject-gates/cpanel-ssl-monitor.sh` | `.sh` | SSL Certificate Monitoring Daemon |
| `superproject-gates/create-backend.sh` | `.sh` | create-backend.sh |
| `superproject-gates/cron_health_monitor.sh` | `.sh` | cron_health_monitor.sh |
| `superproject-gates/cross-dimensional-coherence.d.ts` | `.ts` | /** |
| `superproject-gates/cross-dimensional-coherence.ts` | `.ts` | /** |
| `superproject-gates/cross-tenant-discovery.d.ts` | `.ts` | /** |
| `superproject-gates/cross-tenant-discovery.ts` | `.ts` | /** |
| `superproject-gates/daemon-manager.sh` | `.sh` | Claude Flow V3 - Daemon Manager |
| `superproject-gates/dashboard-data.ts` | `.ts` | /** |
| `superproject-gates/dashboard-integration.ts` | `.ts` | /** |
| `superproject-gates/dashboard-manager.ts` | `.ts` | /** |
| `superproject-gates/dashboard-server.d.ts` | `.ts` | /** |
| `superproject-gates/dashboard-server.ts` | `.ts` | /** |
| `superproject-gates/dashboard-system.ts` | `.ts` | /** |
| `superproject-gates/dashboard.d.ts` | `.ts` | /** |
| `superproject-gates/dashboard.ts` | `.ts` | /** |
| `superproject-gates/data_consistency_validator.py` | `.py` | Add project root to path |
| `superproject-gates/data_validation.py` | `.py` | --- Goalie Code Fix: data-leakage-detection --- |
| `superproject-gates/ddd-tracker.sh` | `.sh` | Claude Flow V3 - DDD Progress Tracker Worker |
| `superproject-gates/decay-detector.d.ts` | `.ts` | /** |
| `superproject-gates/decay-detector.ts` | `.ts` | /** |
| `superproject-gates/decision-audit-cli.ts` | `.ts` | import { getDecisionAuditLogger, createDecisionAuditEntry } from '../../src/governance/decision-audi |
| `superproject-gates/decision-audit-logger.sh` | `.sh` | Appends JSONL entries to reports/decision-audit.jsonl |
| `superproject-gates/decision-audit.ts` | `.ts` | /** |
| `superproject-gates/deckgl-swarm-viz.d.ts` | `.ts` | import React from 'react'; |
| `superproject-gates/deckgl-visualization.ts` | `.ts` | /** |
| `superproject-gates/deep-blocker-analyzer.ts` | `.ts` | import React, { useState, useEffect, useCallback } from 'react'; |
| `superproject-gates/degradation-engine.ts` | `.ts` | /** |
| `superproject-gates/demo-ay-prod.sh` | `.sh` | 1. AFProdEngine demonstration |
| `superproject-gates/demo-progress-multi-pipeline.ts` | `.ts` | /** |
| `superproject-gates/demo-progress.ts` | `.ts` | /** |
| `superproject-gates/deploy-discord-bot.sh` | `.sh` |  |
| `superproject-gates/deploy-multicloud.sh` | `.sh` | Multi-Cloud Deployment Script |
| `superproject-gates/deploy-source.sh` | `.sh` | ============================================================================= |
| `superproject-gates/deploy-stx.sh` | `.sh` | Deploy agentic-flow-core to StarlingX |
| `superproject-gates/deploy-yo-life.sh` | `.sh` | ════════════════════════════════════════════════════════════════════════════ |
| `superproject-gates/deploy.sh` | `.sh` | Off-Host Syslog Black Box Recorder - Terraform Deployment Script |
| `superproject-gates/deploy_commands.sh` | `.sh` | Production deployment commands for rooz.live |
| `superproject-gates/deploy_discord_bot.sh` | `.sh` | set -euo pipefail |
| `superproject-gates/deploy_multi_tenant.sh` | `.sh` | Multi-Tenant Deployment Script |
| `superproject-gates/deploy_obs3_syslog.sh` | `.sh` | deploy_obs3_syslog.sh |
| `superproject-gates/deploy_production.sh` | `.sh` | Production Deployment Script for Enterprise Guest Pass Dashboard |
| `superproject-gates/deploy_stx_greenfield.sh` | `.sh` | Canonical Consolidated StarlingX Greenfield Deployment Script |
| `superproject-gates/deployment-api-server.ts` | `.ts` | /** |
| `superproject-gates/depth-coverage-analyzer.ts` | `.ts` | /** |
| `superproject-gates/depth_ladder_governance.py` | `.py` | Governance policy types |
| `superproject-gates/depth_oscillation_detector.py` | `.py` | """ |
| `superproject-gates/depth_stabilization.py` | `.py` | Stabilization strategy types |
| `superproject-gates/design_system.py` | `.py` | -*- coding: utf-8 -*- |
| `superproject-gates/detect_observability_gaps.py` | `.py` | Get the project root directory |
| `superproject-gates/device_monitor.py` | `.py` | Monitor physical devices and network endpoints |
| `superproject-gates/device_state_manager.py` | `.py` | """ |
| `superproject-gates/device_state_tracker.py` | `.py` | """ |
| `superproject-gates/diagnose-rewards.sh` | `.sh` | diagnose-rewards.sh - Investigate why rewards are constant |
| `superproject-gates/dimensional-menu-builder.ts` | `.ts` | /** |
| `superproject-gates/discover_openstack_services.sh` | `.sh` | Discover OpenStack Services for HostBill Integration |
| `superproject-gates/distributed-cognition.d.ts` | `.ts` | /** |
| `superproject-gates/distributed-cognition.ts` | `.ts` | /** |
| `superproject-gates/divergence-test.sh` | `.sh` | divergence-test.sh - Controlled divergence testing with circuit breakers |
| `superproject-gates/dns-update.sh` | `.sh` | Cloudflare DNS Update Script for rooz.live |
| `superproject-gates/domain-manager.ts` | `.ts` | /** |
| `superproject-gates/domain-router.d.ts` | `.ts` | /** |
| `superproject-gates/domain-router.ts` | `.ts` | /** |
| `superproject-gates/domain_router.py` | `.py` | """ |
| `superproject-gates/drift-monitor.d.ts` | `.ts` | /** |
| `superproject-gates/drift-monitor.ts` | `.ts` | /** |
| `superproject-gates/ducke_debugging_integration.py` | `.py` | """ |
| `superproject-gates/duration-alerting-engine.ts` | `.ts` | /** |
| `superproject-gates/duration-metrics-cli.ts` | `.ts` | /** |
| `superproject-gates/duration-tracker.d.ts` | `.ts` | /** |
| `superproject-gates/duration-tracker.ts` | `.ts` | /** |
| `superproject-gates/dynamic-governance-adjuster.d.ts` | `.ts` | /** |
| `superproject-gates/dynamic-governance-adjuster.ts` | `.ts` | /** |
| `superproject-gates/dynamic-risk-params.sh` | `.sh` | Dynamic Risk Parameters with Statistical Ground-Truth Validation |
| `superproject-gates/dynamic-role-assignment.d.ts` | `.ts` | /** |
| `superproject-gates/dynamic-role-assignment.ts` | `.ts` | /** |
| `superproject-gates/dynamic-router.d.ts` | `.ts` | /** |
| `superproject-gates/dynamic-router.ts` | `.ts` | /** |
| `superproject-gates/dynamic-thresholds.d.ts` | `.ts` | /** |
| `superproject-gates/dynamic-thresholds.sh` | `.sh` | dynamic-thresholds.sh - Statistically rigorous threshold calculation |
| `superproject-gates/dynamic-thresholds.ts` | `.ts` | /** |
| `superproject-gates/dynamic_queue.py` | `.py` | """ |
| `superproject-gates/e2e-deployment-test.sh` | `.sh` | End-to-End Deployment Test Suite for Governance Agents |
| `superproject-gates/e2e-testing-framework.ts` | `.ts` | /** |
| `superproject-gates/e2e-testing-integration.d.ts` | `.ts` | /** |
| `superproject-gates/e2e-testing-integration.ts` | `.ts` | /** |
| `superproject-gates/e2e_tests.py` | `.py` | Add project root to path |
| `superproject-gates/economic-compounding.ts` | `.ts` | /** |
| `superproject-gates/economic-integration.ts` | `.ts` | /** |
| `superproject-gates/economic-tracking-integration.sh` | `.sh` | Economic Tracking Integration Script |
| `superproject-gates/economic-tracking-integration.ts` | `.ts` | /** |
| `superproject-gates/edge-cache-manager.d.ts` | `.ts` | /** |
| `superproject-gates/edge-cache-manager.ts` | `.ts` | /** |
| `superproject-gates/emergency_rollback.sh` | `.sh` | Emergency Rollback Script for Risk Analytics Gates |
| `superproject-gates/emit-episode-complete.sh` | `.sh` | AY Hook: Run QE Fleet after each episode completion |
| `superproject-gates/emit-task-complete.sh` | `.sh` | Hook: Post-Task - Emit agent completion event to visualization |
| `superproject-gates/emit-task-spawn.sh` | `.sh` | Hook: Pre-Task - Emit agent spawn event to visualization |
| `superproject-gates/enforce_safe_structure.sh` | `.sh` | SAFe Structure Governance: Root File Creation Enforcement |
| `superproject-gates/engine.d.ts` | `.ts` | import { OrchestrationFramework } from '../core/orchestration-framework'; |
| `superproject-gates/engine.ts` | `.ts` | import { OrchestrationFramework } from '../core/orchestration-framework'; |
| `superproject-gates/enhanced-error-reporting.d.ts` | `.ts` | /** |
| `superproject-gates/enhanced-error-reporting.ts` | `.ts` | /** |
| `superproject-gates/enhanced-stripe-integration.ts` | `.ts` | /** |
| `superproject-gates/episode-batch-storage.d.ts` | `.ts` | /** |
| `superproject-gates/episode-batch-storage.ts` | `.ts` | /** |
| `superproject-gates/error-handling.ts` | `.ts` | /** |
| `superproject-gates/evidence-based-decision-support.ts` | `.ts` | /** |
| `superproject-gates/evidence-based-risk-mitigation.ts` | `.ts` | /** |
| `superproject-gates/evidence-cli.ts` | `.ts` | /** |
| `superproject-gates/evidence-db-integration-test.py` | `.py` | Add advocacy pipeline to path |
| `superproject-gates/evidence-manager.ts` | `.ts` | import fs from 'node:fs'; |
| `superproject-gates/evidence-risk-assessment.ts` | `.ts` | /** |
| `superproject-gates/evidence-types.d.ts` | `.ts` | /** |
| `superproject-gates/evidence-types.ts` | `.ts` | /** |
| `superproject-gates/evidence-validator.d.ts` | `.ts` | /** |
| `superproject-gates/evidence-validator.ts` | `.ts` | /** |
| `superproject-gates/evidence_emitters.py` | `.py` | Standardized evidence types |
| `superproject-gates/evidence_integration.py` | `.py` | Evidence integration system for production workflows |
| `superproject-gates/evidence_monitor.py` | `.py` | Evidence validation statuses |
| `superproject-gates/evidence_trail_manager.py` | `.py` | """ |
| `superproject-gates/evidence_validator.py` | `.py` | Result of evidence validation |
| `superproject-gates/example.d.ts` | `.ts` | /** |
| `superproject-gates/example.ts` | `.ts` | /** |
| `superproject-gates/examples.ts` | `.ts` | /** |
| `superproject-gates/execute_prod_cycle.ts` | `.ts` | /** |
| `superproject-gates/execution-engine.ts` | `.ts` | /** |
| `superproject-gates/execution-tracker-with-duration.ts` | `.ts` | /** |
| `superproject-gates/execution-tracker.ts` | `.ts` | /** |
| `superproject-gates/existential-risks.ts` | `.ts` | /** |
| `superproject-gates/exit-codes.sh` | `.sh` | ============================================================================ |
| `superproject-gates/external-validation-gates.sh` | `.sh` | External Validation Gates Implementation |
| `superproject-gates/factory.ts` | `.ts` | /** |
| `superproject-gates/failure-domain-manager.ts` | `.ts` | /** |
| `superproject-gates/failure_tracker.py` | `.py` | Get .goalie directory path |
| `superproject-gates/firewall-rules.sh` | `.sh` | Firewall Configuration Script for Syslog Sink |
| `superproject-gates/fix-cockpit.sh` | `.sh` | Fix ay-yo Interactive Cockpit |
| `superproject-gates/fix-prod-maturity-weighting.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/fix-ts-errors.sh` | `.sh` | Fix 1: affiliate/index.ts - Use export type for type-only exports |
| `superproject-gates/fix_hsts_final.sh` | `.sh` | Fix HSTS headers for interface.rooz.live and interface.tag.vote |
| `superproject-gates/fix_imports.sh` | `.sh` | find agentic-flow-core/src -name "*.ts" -type f -exec sed -i 's/from '\''\([^'\'']*\)\.js'\''/from ' |
| `superproject-gates/fix_pattern_rationale.py` | `.py` | import json |
| `superproject-gates/flarum-client.d.ts` | `.ts` | /** |
| `superproject-gates/flarum-client.ts` | `.ts` | /** |
| `superproject-gates/formatter.d.ts` | `.ts` | /** |
| `superproject-gates/formatter.ts` | `.ts` | /** |
| `superproject-gates/gap_detector.py` | `.py` | Detects gaps in observability coverage |
| `superproject-gates/generate-all-certs.sh` | `.sh` | Off-Host Syslog Internal PKI - Generate All Certificates |
| `superproject-gates/generate-ca.sh` | `.sh` | ============================================================================= |
| `superproject-gates/generate-certificates.sh` | `.sh` | TLS Certificate Generation Script |
| `superproject-gates/generate-circuit-breaker-traffic.sh` | `.sh` | Circuit Breaker Traffic Generator |
| `superproject-gates/generate-circuit-breaker-traffic.ts` | `.ts` | /** |
| `superproject-gates/generate-client-cert.sh` | `.sh` | ============================================================================= |
| `superproject-gates/generate-locales.sh` | `.sh` | Generate basic translation files for remaining locales |
| `superproject-gates/generate-server-cert.sh` | `.sh` | ============================================================================= |
| `superproject-gates/generate-wsjf-report.sh` | `.sh` | ========================================== |
| `superproject-gates/generic-provider.d.ts` | `.ts` | /** |
| `superproject-gates/generic-provider.ts` | `.ts` | /** |
| `superproject-gates/github-actions-template.d.ts` | `.ts` | /** |
| `superproject-gates/github-actions-template.ts` | `.ts` | /** |
| `superproject-gates/github-setup.sh` | `.sh` | Setup GitHub integration for Claude Flow |
| `superproject-gates/gitlab_full_backup.sh` | `.sh` | GitLab Full Backup Script |
| `superproject-gates/gitlab_incremental_backup.sh` | `.sh` | GitLab Incremental Backup Script |
| `superproject-gates/gitlab_recovery_manager.sh` | `.sh` | GitLab Recovery Manager Script |
| `superproject-gates/gitlab_snapshot_manager.sh` | `.sh` | GitLab Snapshot Manager Script |
| `superproject-gates/glm-integration.ts` | `.ts` | /** |
| `superproject-gates/glm46_integration.py` | `.py` | """ |
| `superproject-gates/globalSetup.ts` | `.ts` | /** |
| `superproject-gates/globalTeardown.ts` | `.ts` | /** |
| `superproject-gates/gnn-test-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/gnn-test-analyzer.ts` | `.ts` | /** |
| `superproject-gates/goalie-economic-integration.py` | `.py` | Configuration |
| `superproject-gates/goalie-pda-observer.d.ts` | `.ts` | /** |
| `superproject-gates/goalie-pda-observer.ts` | `.ts` | /** |
| `superproject-gates/google-provider.d.ts` | `.ts` | /** |
| `superproject-gates/google-provider.ts` | `.ts` | /** |
| `superproject-gates/governance-check.ts` | `.ts` | import * as path from 'path'; |
| `superproject-gates/governance-system.ts` | `.ts` | // Minimal GovernanceSystem: policy checks + compliance violations |
| `superproject-gates/governance.d.ts` | `.ts` | /** |
| `superproject-gates/governance.ts` | `.ts` | /** |
| `superproject-gates/governance_council.py` | `.py` | Governance review session record |
| `superproject-gates/governance_integration.py` | `.py` | Get .goalie directory path |
| `superproject-gates/governance_orchestrator.py` | `.py` | Configure logging |
| `superproject-gates/graduation-checker.ts` | `.ts` | import type { EvidenceEvent } from './types/schema'; |
| `superproject-gates/green-streak-tracker.d.ts` | `.ts` | /** |
| `superproject-gates/green-streak-tracker.ts` | `.ts` | /** |
| `superproject-gates/guardrail-hook.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/guest-pass-manager.d.ts` | `.ts` | /** |
| `superproject-gates/guest-pass-manager.ts` | `.ts` | /** |
| `superproject-gates/guidance-hook.sh` | `.sh` | Capture hook guidance for Claude visibility |
| `superproject-gates/guidance-hooks.sh` | `.sh` | Guidance Hooks for Claude Flow V3 |
| `superproject-gates/harden-starlingx.sh` | `.sh` | StarlingX Security Hardening Script |
| `superproject-gates/health-check-integration.ts` | `.ts` | /** |
| `superproject-gates/health-checks.d.ts` | `.ts` | /** |
| `superproject-gates/health-checks.ts` | `.ts` | /** |
| `superproject-gates/health-driven-decision-engine.ts` | `.ts` | /** |
| `superproject-gates/health-monitor.sh` | `.sh` | Claude Flow V3 - Health Monitor Worker |
| `superproject-gates/health-score-dashboard.ts` | `.ts` | /** |
| `superproject-gates/health_dashboard.py` | `.py` | """ |
| `superproject-gates/heartbeat_monitor.py` | `.py` | """ |
| `superproject-gates/hivelocity-adapter.d.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-adapter.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-device-manager.d.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-device-manager.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-device-usage.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-monitor.ts` | `.ts` | /** |
| `superproject-gates/hivelocity-provider.ts` | `.ts` | /** |
| `superproject-gates/hostbill-integration.ts` | `.ts` | /** |
| `superproject-gates/hostbill_integration_setup.sh` | `.sh` | HostBill + OpenStack Flamingo Integration Setup |
| `superproject-gates/hostbill_openstack_test.py` | `.py` | Configuration |
| `superproject-gates/ide-extension-manager.ts` | `.ts` | /** |
| `superproject-gates/immediate_infrastructure_fixes.sh` | `.sh` | immediate_infrastructure_fixes.sh |
| `superproject-gates/implement-phase1-timeouts.sh` | `.sh` | Phase 1: Centralize Timeout Configuration |
| `superproject-gates/implement_safe_structure.sh` | `.sh` | FIRE: Implement SAFe Structure in /code/projects |
| `superproject-gates/inbox-monitor-simple.sh` | `.sh` | inbox-monitor-simple.sh - Scenario branching for Grant/Deny/Silent |
| `superproject-gates/incident-timeline.ts` | `.ts` | /** |
| `superproject-gates/incremental-backup.sh` | `.sh` | Incremental Backup Strategy for Long-Horizon Utilization |
| `superproject-gates/incremental-execution-engine.d.ts` | `.ts` | /** |
| `superproject-gates/incremental-execution-engine.ts` | `.ts` | /** |
| `superproject-gates/index.d.ts` | `.ts` | /** |
| `superproject-gates/index.ts` | `.ts` | /** |
| `superproject-gates/infrastructure-health.d.ts` | `.ts` | export interface HealthStatus { |
| `superproject-gates/infrastructure-health.ts` | `.ts` | import { spawn } from 'child_process'; |
| `superproject-gates/init-completion-db.ts` | `.ts` | /** |
| `superproject-gates/init-completion-tracker.ts` | `.ts` | /** |
| `superproject-gates/init-decision-audit.ts` | `.ts` | /** |
| `superproject-gates/init-risk-db.sh` | `.sh` | Initialize Risk Traceability Database |
| `superproject-gates/init-risk-traceability.sh` | `.sh` | Create .db directory if it doesn't exist |
| `superproject-gates/init_risk_db.sh` | `.sh` | Ensure parent directory exists |
| `superproject-gates/initialize-infrastructure.sh` | `.sh` | Infrastructure Initialization Script |
| `superproject-gates/initialize.d.ts` | `.ts` | /** |
| `superproject-gates/initialize.ts` | `.ts` | /** |
| `superproject-gates/initiate_team_approval.sh` | `.sh` | Enhanced Team Approval Initiation with Measurable Validation |
| `superproject-gates/insert-episodes.sh` | `.sh` | Parse episode JSON |
| `superproject-gates/institutional-analysis.ts` | `.ts` | /** |
| `superproject-gates/integrate-alignment-sentinel.sh` | `.sh` | Integrate Alignment Sentinel with Monitoring Stack |
| `superproject-gates/integrate-philosophical-framework.sh` | `.sh` | Integrate Philosophical Framework with existing systems |
| `superproject-gates/integrate-production-stack.sh` | `.sh` | Production Stack Integration Orchestrator |
| `superproject-gates/integrate_swarm_comparison.py` | `.py` | Import automation components |
| `superproject-gates/integration-layer.ts` | `.ts` | /** |
| `superproject-gates/integration-routes.d.ts` | `.ts` | declare const router: import("express-serve-static-core").Router; |
| `superproject-gates/integration-routes.ts` | `.ts` | import express, { Request, Response } from 'express'; |
| `superproject-gates/integration-test.sh` | `.sh` | Integration Test Script - Off-Host Syslog Black Box Recorder |
| `superproject-gates/integration-testing-framework.ts` | `.ts` | /** |
| `superproject-gates/integration_health_checks.py` | `.py` | """ |
| `superproject-gates/integration_tests.py` | `.py` | Add project root to path |
| `superproject-gates/invariant-monitor.d.ts` | `.ts` | /** |
| `superproject-gates/invariant-monitor.ts` | `.ts` | /** |
| `superproject-gates/ipmi_ssh_workaround.py` | `.py` | """ |
| `superproject-gates/ipmi_workaround.py` | `.py` | """ |
| `superproject-gates/iteration-budget-tracker.ts` | `.ts` | /** |
| `superproject-gates/iteration-handoff-reporter.ts` | `.ts` | /** |
| `superproject-gates/iteration-handoff.d.ts` | `.ts` | /** |
| `superproject-gates/iteration-handoff.ts` | `.ts` | /** |
| `superproject-gates/k8s_ufw_bootstrap.sh` | `.sh` | Kubernetes UFW Firewall Bootstrap Script |
| `superproject-gates/knowledge-embedding.ts` | `.ts` | /** |
| `superproject-gates/knowledge-preservation.ts` | `.ts` | /** |
| `superproject-gates/knowledge-redundancy.ts` | `.ts` | /** |
| `superproject-gates/kubelet_diagnosis.py` | `.py` | """ |
| `superproject-gates/launch-visualizations.sh` | `.sh` | Launch all visualization components for agentic-flow-core |
| `superproject-gates/leakage-preventer.d.ts` | `.ts` | /** |
| `superproject-gates/leakage-preventer.ts` | `.ts` | /** |
| `superproject-gates/lean-agentic-integration.ts` | `.ts` | /** |
| `superproject-gates/lean-workflow-manager.ts` | `.ts` | /** |
| `superproject-gates/learn-circuit-breaker-thresholds.sh` | `.sh` | P1-LIVE: Circuit Breaker Threshold Learning Script |
| `superproject-gates/learning-hooks.sh` | `.sh` | Claude Flow V3 - Learning Hooks |
| `superproject-gates/learning-integration.ts` | `.ts` | /** |
| `superproject-gates/learning-loop.sh` | `.sh` | set -e |
| `superproject-gates/learning-optimizer.sh` | `.sh` | Claude Flow V3 - Learning Optimizer Worker |
| `superproject-gates/lime-explainer.ts` | `.ts` | /** |
| `superproject-gates/llm-observability.d.ts` | `.ts` | /** |
| `superproject-gates/llm-observability.ts` | `.ts` | /** |
| `superproject-gates/load-env.sh` | `.sh` | Dynamic Environment Loader |
| `superproject-gates/local-llm-client.d.ts` | `.ts` | /** |
| `superproject-gates/local-llm-client.ts` | `.ts` | /** |
| `superproject-gates/log-test.sh` | `.sh` | Log Transmission Test Script |
| `superproject-gates/log_quarantine_action.sh` | `.sh` | Quarantine Action Logger |
| `superproject-gates/macro-level-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/macro-level-analyzer.ts` | `.ts` | /** |
| `superproject-gates/majority-voting.ts` | `.ts` | /** |
| `superproject-gates/manthra-calibration.d.ts` | `.ts` | /** |
| `superproject-gates/manthra-calibration.ts` | `.ts` | /** |
| `superproject-gates/manthra-stage.d.ts` | `.ts` | /** |
| `superproject-gates/manthra-stage.ts` | `.ts` | /** |
| `superproject-gates/manthra-validation.d.ts` | `.ts` | /** |
| `superproject-gates/manthra-validation.ts` | `.ts` | /** |
| `superproject-gates/maturity-coverage.ts` | `.ts` | /** |
| `superproject-gates/maturity-surface-analyzer.ts` | `.ts` | /** |
| `superproject-gates/mcp-health-check.ts` | `.ts` | /** |
| `superproject-gates/mcp-health-types.ts` | `.ts` | /** |
| `superproject-gates/mcp-ide-bridge.ts` | `.ts` | /** |
| `superproject-gates/mcp-integration.ts` | `.ts` | /** |
| `superproject-gates/mcp_dynamic_context_loader.py` | `.py` | Configure logging |
| `superproject-gates/mcp_pi_sync.py` | `.py` | """ |
| `superproject-gates/menu-builder.ts` | `.ts` | /** |
| `superproject-gates/merge-time-coherence-check.sh` | `.sh` | Merge-Time Coherence Check Script |
| `superproject-gates/metabolic-pathway-simulator.ts` | `.ts` | /** |
| `superproject-gates/metaverse-context-manager.ts` | `.ts` | /** |
| `superproject-gates/metrics-collector.ts` | `.ts` | /** |
| `superproject-gates/metrics-dashboard.ts` | `.ts` | import fs from 'fs'; |
| `superproject-gates/micro-level-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/micro-level-analyzer.ts` | `.ts` | /** |
| `superproject-gates/microsoft-provider.d.ts` | `.ts` | /** |
| `superproject-gates/microsoft-provider.ts` | `.ts` | /** |
| `superproject-gates/middleware.d.ts` | `.ts` | /** |
| `superproject-gates/middleware.ts` | `.ts` | /** |
| `superproject-gates/migrate-decision-audit.py` | `.py` | Check if decision_id column exists |
| `superproject-gates/migrate-decision-audit.sh` | `.sh` | Migration script for decision_audit table |
| `superproject-gates/migrate-episode-metadata.sh` | `.sh` | Migrate existing episodes to include circle/ceremony in metadata |
| `superproject-gates/migrate-episodes.ts` | `.ts` | /** |
| `superproject-gates/migrate-old-env.sh` | `.sh` | Migration Script: Consolidate old .env files into new structure |
| `superproject-gates/migrate-pattern-metrics.sh` | `.sh` | Pattern Metrics Migration Script |
| `superproject-gates/migrate-repo.sh` | `.sh` | Repository Migration: Reduce technical debt, establish lean guardrails |
| `superproject-gates/migrate-structure.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/migrate-trajectory.sh` | `.sh` | ============================================================================ |
| `superproject-gates/migrate_legacy_platforms.sh` | `.sh` | IMMEDIATE MIGRATION: Legacy Platforms → SAFe Lean Budget Horizons |
| `superproject-gates/migration-handler.d.ts` | `.ts` | /** |
| `superproject-gates/migration-handler.ts` | `.ts` | /** |
| `superproject-gates/mithra-calibration.d.ts` | `.ts` | /** |
| `superproject-gates/mithra-calibration.ts` | `.ts` | /** |
| `superproject-gates/mithra-coherence.d.ts` | `.ts` | /** |
| `superproject-gates/mithra-coherence.ts` | `.ts` | /** |
| `superproject-gates/mithra-stage.d.ts` | `.ts` | /** |
| `superproject-gates/mithra-stage.ts` | `.ts` | /** |
| `superproject-gates/mitigation-effectiveness.ts` | `.ts` | /** |
| `superproject-gates/mitigation-strategy.ts` | `.ts` | /** |
| `superproject-gates/mitigation-workflow.ts` | `.ts` | /** |
| `superproject-gates/model-interpretability-system.ts` | `.ts` | /** |
| `superproject-gates/monitor-daemon.sh` | `.sh` | monitor-daemon.sh - Background daemon for continuous inbox monitoring |
| `superproject-gates/monitor-divergence.sh` | `.sh` | monitor-divergence.sh - Real-time monitoring for divergence testing |
| `superproject-gates/monitor_token_usage.py` | `.py` | """ |
| `superproject-gates/monitoring-analytics-factory.ts` | `.ts` | /** |
| `superproject-gates/monitoring-analytics-system.ts` | `.ts` | /** |
| `superproject-gates/monitoring-dashboard.ts` | `.ts` | /** |
| `superproject-gates/monitoring-integration.ts` | `.ts` | /** |
| `superproject-gates/monitoring_dashboard.py` | `.py` | """ |
| `superproject-gates/mpp-protocol.sh` | `.sh` | ============================================================================ |
| `superproject-gates/multi-tenant-dashboard.ts` | `.ts` | /** |
| `superproject-gates/multi-tenant-manager.ts` | `.ts` | /** |
| `superproject-gates/multi-tenant-navigation.d.ts` | `.ts` | /** |
| `superproject-gates/multi-tenant-navigation.ts` | `.ts` | /** |
| `superproject-gates/multi-tenant-setup.ts` | `.ts` | /** |
| `superproject-gates/multipass-analytics.d.ts` | `.ts` | /** |
| `superproject-gates/multipass-analytics.ts` | `.ts` | /** |
| `superproject-gates/multipass-statistics-engine.d.ts` | `.ts` | /** |
| `superproject-gates/multipass-statistics-engine.ts` | `.ts` | /** |
| `superproject-gates/mym-scoring.ts` | `.ts` | /** |
| `superproject-gates/network-topology-mapper.d.ts` | `.ts` | /** |
| `superproject-gates/network-topology-mapper.ts` | `.ts` | /** |
| `superproject-gates/neural-network-engine.ts` | `.ts` | /** |
| `superproject-gates/neural-trading-analytics.ts` | `.ts` | /** |
| `superproject-gates/neuromorphic-efficiency-benchmark.ts` | `.ts` | /** |
| `superproject-gates/neuromorphic-event-driven.ts` | `.ts` | /** |
| `superproject-gates/neuromorphic-hardware-compatibility-layer.ts` | `.ts` | /** |
| `superproject-gates/neuromorphic-hardware-types.ts` | `.ts` | /** |
| `superproject-gates/neuromorphic-patterns.ts` | `.ts` | /** |
| `superproject-gates/oauth-manager.d.ts` | `.ts` | /** |
| `superproject-gates/oauth-manager.ts` | `.ts` | /** |
| `superproject-gates/observability-gaps.ts` | `.ts` | /** |
| `superproject-gates/observability-patterns.d.ts` | `.ts` | /** |
| `superproject-gates/observability-patterns.ts` | `.ts` | /** |
| `superproject-gates/observatory-client.d.ts` | `.ts` | /** |
| `superproject-gates/observatory-client.ts` | `.ts` | /** |
| `superproject-gates/ontology-decision-support.ts` | `.ts` | /** |
| `superproject-gates/ontology-service.ts` | `.ts` | /** |
| `superproject-gates/oom_recovery.py` | `.py` | --- Goalie Code Fix: oom-recovery --- |
| `superproject-gates/opencode-docs.ts` | `.ts` | /** |
| `superproject-gates/openrouter_demo.py` | `.py` | Client for OpenRouter API with free model support |
| `superproject-gates/openstack_caracal_install.sh` | `.sh` | OpenStack Caracal Installation Script for StarlingX 11.0 Integration |
| `superproject-gates/operational-risk-analyzer.ts` | `.ts` | /** |
| `superproject-gates/opportunity-analyzer.ts` | `.ts` | /** |
| `superproject-gates/optimal-abstraction-level.d.ts` | `.ts` | /** |
| `superproject-gates/optimal-abstraction-level.ts` | `.ts` | /** |
| `superproject-gates/orchestration-framework.d.ts` | `.ts` | /** |
| `superproject-gates/orchestration-framework.ts` | `.ts` | /** |
| `superproject-gates/orchestration-integration.ts` | `.ts` | /** |
| `superproject-gates/p0-agentdb-skills-worker.ts` | `.ts` | import Database from 'better-sqlite3'; |
| `superproject-gates/p0-mode-scores-worker.ts` | `.ts` | import * as fs from 'fs'; |
| `superproject-gates/p0-run.ts` | `.ts` | /** |
| `superproject-gates/p0-validation.ts` | `.ts` | /** |
| `superproject-gates/p1-feedback-loop.d.ts` | `.ts` | /** |
| `superproject-gates/p1-feedback-loop.ts` | `.ts` | /** |
| `superproject-gates/package_manager.py` | `.py` | """ |
| `superproject-gates/parity-checks.ts` | `.ts` | /** |
| `superproject-gates/parse_skills.py` | `.py` | Regex to capture skill header "#1: <Name>: <Workflow>" |
| `superproject-gates/pattern-consolidator.sh` | `.sh` | Claude Flow V3 - Pattern Consolidator Worker |
| `superproject-gates/pattern-logger.ts` | `.ts` | /** |
| `superproject-gates/pattern-metrics-logger.ts` | `.ts` | import fs from 'fs'; |
| `superproject-gates/pattern_analysis.py` | `.py` | Get .goalie directory path |
| `superproject-gates/pattern_metrics_filter.py` | `.py` | Get .goalie directory path |
| `superproject-gates/pattern_telemetry_analyzer.py` | `.py` | Analyzes pattern execution telemetry and identifies performance patterns |
| `superproject-gates/payment-integration.ts` | `.ts` | /** |
| `superproject-gates/payment_processor.py` | `.py` | Configure logging |
| `superproject-gates/pda-cycle-manager.d.ts` | `.ts` | /** |
| `superproject-gates/pda-cycle-manager.ts` | `.ts` | /** |
| `superproject-gates/perf-worker.sh` | `.sh` | Claude Flow V3 - Performance Benchmark Worker |
| `superproject-gates/perfect-mym-score.sh` | `.sh` | Perfect MYM Score Achievement Script |
| `superproject-gates/performance-optimizer.ts` | `.ts` | /** |
| `superproject-gates/performance-testing-framework.ts` | `.ts` | /** |
| `superproject-gates/performance_validator.py` | `.py` | Add project root to path |
| `superproject-gates/phase5a_execute_deletion.sh` | `.sh` | FIRE: Phase 5A Deletion Execution |
| `superproject-gates/phase5a_fast_delete.sh` | `.sh` | FIRE: Fast deletion without snapshot |
| `superproject-gates/phase5a_fire_validation.sh` | `.sh` | FIRE: Fast Phase 5A Validation |
| `superproject-gates/philosophical-error-mitigation.d.ts` | `.ts` | /** |
| `superproject-gates/philosophical-error-mitigation.ts` | `.ts` | /** |
| `superproject-gates/pipeline-orchestrator.d.ts` | `.ts` | /** |
| `superproject-gates/pipeline-orchestrator.ts` | `.ts` | /** |
| `superproject-gates/pipeline_to_safe.sh` | `.sh` | FIRE: Pipeline Archive → SAFe Lifecycle Folders |
| `superproject-gates/platform-deployment-examples.ts` | `.ts` | /** |
| `superproject-gates/playwright.config.ts` | `.ts` | import { defineConfig, devices } from '@playwright/test'; |
| `superproject-gates/policy-check.sh` | `.sh` | ============================================================================= |
| `superproject-gates/policy_engine.py` | `.py` | Configure logging |
| `superproject-gates/populate-case-data.sh` | `.sh` | populate-case-data.sh - Populate real case data for MAA 26CV005596-590 |
| `superproject-gates/portfolio-analyzer.ts` | `.ts` | /** |
| `superproject-gates/portfolio-manager.ts` | `.ts` | /** |
| `superproject-gates/portfolio_technical_analyzer.py` | `.py` | import argparse |
| `superproject-gates/post_tool_reward_calc.py` | `.py` | """ |
| `superproject-gates/pre_tool_wsjf_enrich.py` | `.py` | """ |
| `superproject-gates/predictive-simulator.ts` | `.ts` | /** |
| `superproject-gates/priority-queue.d.ts` | `.ts` | /** |
| `superproject-gates/priority-queue.ts` | `.ts` | /** |
| `superproject-gates/priority_optimizer.py` | `.py` | """ |
| `superproject-gates/production_status_manager.py` | `.py` | Manages production workflow status with JSON file persistence. |
| `superproject-gates/progress-completion-bridge.d.ts` | `.ts` | /** |
| `superproject-gates/progress-completion-bridge.ts` | `.ts` | /** |
| `superproject-gates/progress_dashboard.py` | `.py` | Progress tracking and dashboard system |
| `superproject-gates/prompt-intent-coverage-analyzer.ts` | `.ts` | /** |
| `superproject-gates/provider-drift-monitor.ts` | `.ts` | /** |
| `superproject-gates/provider-drift-monitoring.ts` | `.ts` | /** |
| `superproject-gates/provider-health-monitor.ts` | `.ts` | /** |
| `superproject-gates/provider-selector.ts` | `.ts` | /** |
| `superproject-gates/proxy-client.d.ts` | `.ts` | /** |
| `superproject-gates/proxy-client.ts` | `.ts` | /** |
| `superproject-gates/qe-gates-integration.ts` | `.ts` | import { execSync } from 'child_process'; |
| `superproject-gates/quality-assurance.d.ts` | `.ts` | /** |
| `superproject-gates/quality-assurance.ts` | `.ts` | /** |
| `superproject-gates/quantum-error-correction.ts` | `.ts` | /** |
| `superproject-gates/quarantine_cleanup.sh` | `.sh` | Quarantine Cleanup Script |
| `superproject-gates/quick-ssh-check.sh` | `.sh` | Quick SSH Status Check |
| `superproject-gates/quick-start.sh` | `.sh` | Quick start guide for Claude Flow |
| `superproject-gates/rbac-integration.ts` | `.ts` | /** |
| `superproject-gates/rbac-manager.d.ts` | `.ts` | /** |
| `superproject-gates/rbac-manager.ts` | `.ts` | /** |
| `superproject-gates/realtime-risk-assessment.ts` | `.ts` | /** |
| `superproject-gates/rebuild-agentdb.sh` | `.sh` | rebuild-agentdb.sh - Fix Corrupted/Mismatched AgentDB |
| `superproject-gates/recommendation-disposition.ts` | `.ts` | /** |
| `superproject-gates/recommendation-escalation.ts` | `.ts` | /** |
| `superproject-gates/recommendation-execution.ts` | `.ts` | /** |
| `superproject-gates/recommendation-prioritization.ts` | `.ts` | /** |
| `superproject-gates/recommendation-queue.ts` | `.ts` | /** |
| `superproject-gates/recommendation-reevaluation.ts` | `.ts` | /** |
| `superproject-gates/recommendation-system.ts` | `.ts` | /** |
| `superproject-gates/recommendation-types.ts` | `.ts` | /** |
| `superproject-gates/recommendation-verification.ts` | `.ts` | /** |
| `superproject-gates/recovery-orchestrator.ts` | `.ts` | /** |
| `superproject-gates/recursive_structure_analysis.sh` | `.sh` | Recursive Structure Analysis for Workflow Optimization |
| `superproject-gates/redundancy-manager.ts` | `.ts` | /** |
| `superproject-gates/refine-starlingx-security-fixed.sh` | `.sh` | Backup current firewall config |
| `superproject-gates/remediation_recommender.py` | `.py` | Get .goalie directory path |
| `superproject-gates/repository.d.ts` | `.ts` | /** |
| `superproject-gates/repository.ts` | `.ts` | /** |
| `superproject-gates/resonant-fire-neuron.ts` | `.ts` | /** |
| `superproject-gates/restore-agentdb.sh` | `.sh` | ============================================================================ |
| `superproject-gates/restore-environment-enhanced.sh` | `.sh` | restore-environment-enhanced.sh |
| `superproject-gates/restore-environment.sh` | `.sh` | restore-environment.sh - Basic Environment Restoration Script |
| `superproject-gates/retro_coach.d.ts` | `.ts` | /** |
| `superproject-gates/retro_coach.ts` | `.ts` | /** |
| `superproject-gates/revenue-attribution-system.ts` | `.ts` | /** |
| `superproject-gates/revenue-attribution.d.ts` | `.ts` | /** |
| `superproject-gates/revenue-attribution.ts` | `.ts` | /** |
| `superproject-gates/reward-calculator.d.ts` | `.ts` | /** |
| `superproject-gates/reward-calculator.py` | `.py` | """ |
| `superproject-gates/reward-calculator.ts` | `.ts` | /** |
| `superproject-gates/risk-assessment.ts` | `.ts` | import { logPattern } from './pattern-metrics-logger'; |
| `superproject-gates/risk-aware-execution-planner.ts` | `.ts` | /** |
| `superproject-gates/risk-identification-workflow.ts` | `.ts` | /** |
| `superproject-gates/risk-identifier.ts` | `.ts` | /** |
| `superproject-gates/risk-management-engine.ts` | `.ts` | /** |
| `superproject-gates/risk-matrix.ts` | `.ts` | /** |
| `superproject-gates/risk-model-training.ts` | `.ts` | /** |
| `superproject-gates/risk-monitoring-system.ts` | `.ts` | /** |
| `superproject-gates/risk-reporting-workflow.ts` | `.ts` | /** |
| `superproject-gates/risk-scorer.ts` | `.ts` | /** |
| `superproject-gates/risk-trend-analyzer.ts` | `.ts` | /** |
| `superproject-gates/roam-framework.ts` | `.ts` | /** |
| `superproject-gates/roam-generator.d.ts` | `.ts` | import { AgentDB } from '../core/agentdb'; |
| `superproject-gates/roam-generator.ts` | `.ts` | import { AgentDB } from '../core/agentdb'; |
| `superproject-gates/roam-runbook-generator.d.ts` | `.ts` | /** |
| `superproject-gates/roam-runbook-generator.ts` | `.ts` | /** |
| `superproject-gates/robust_fix_metrics.py` | `.py` | Fix multi-json on one line |
| `superproject-gates/role-affinity-calculator.d.ts` | `.ts` | /** |
| `superproject-gates/role-affinity-calculator.ts` | `.ts` | /** |
| `superproject-gates/root_cause_analyzer.py` | `.py` | Get .goalie directory path |
| `superproject-gates/rooz-routes.d.ts` | `.ts` | /** |
| `superproject-gates/rooz-routes.ts` | `.ts` | /** |
| `superproject-gates/routes.d.ts` | `.ts` | /** |
| `superproject-gates/routes.ts` | `.ts` | /** |
| `superproject-gates/run-all-tests.sh` | `.sh` | ════════════════════════════════════════════════════════════════════════════ |
| `superproject-gates/run-assessment.sh` | `.sh` | Testability Scoring Assessment Runner |
| `superproject-gates/run-causal-experiment.sh` | `.sh` | Causal Experiment Runner |
| `superproject-gates/run_calibration.py` | `.py` | """ |
| `superproject-gates/run_calibration_enhanced.sh` | `.sh` | Enhanced Risk Analytics Calibration with Neural and Claude Integration |
| `superproject-gates/runtime-config.sh` | `.sh` | Runtime Config for AY |
| `superproject-gates/saas-deployment-setup.ts` | `.ts` | /** |
| `superproject-gates/sandbox-manager.d.ts` | `.ts` | /** |
| `superproject-gates/sandbox-manager.ts` | `.ts` | /** |
| `superproject-gates/schedule_quarantine_cleanup.sh` | `.sh` | Schedule Quarantine Cleanup |
| `superproject-gates/schema-validator.ts` | `.ts` | /** |
| `superproject-gates/schema.d.ts` | `.ts` | export interface EvidenceConfig { |
| `superproject-gates/schema.ts` | `.ts` | export interface EvidenceConfig { |
| `superproject-gates/scoring-service.d.ts` | `.ts` | /** |
| `superproject-gates/scoring-service.ts` | `.ts` | /** |
| `superproject-gates/search.py` | `.py` | -*- coding: utf-8 -*- |
| `superproject-gates/security-audit-gap-detection.ts` | `.ts` | /** |
| `superproject-gates/security-gaps-emitter.ts` | `.ts` | /** |
| `superproject-gates/security-scan.sh` | `.sh` | Security Scan Script - Off-Host Syslog Black Box Recorder |
| `superproject-gates/security-scanner.sh` | `.sh` | Claude Flow V3 - Security Scanner Worker |
| `superproject-gates/security-testing-framework.ts` | `.ts` | /** |
| `superproject-gates/security_validator.py` | `.py` | Add project root to path |
| `superproject-gates/seed-completion-data-direct.ts` | `.ts` | import Database from 'better-sqlite3'; |
| `superproject-gates/seed-completion-data.ts` | `.ts` | /** |
| `superproject-gates/selection-service.d.ts` | `.ts` | /** |
| `superproject-gates/selection-service.ts` | `.ts` | /** |
| `superproject-gates/semantic-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/semantic-analyzer.ts` | `.ts` | /** |
| `superproject-gates/semantic-reasoning-engine.ts` | `.ts` | /** |
| `superproject-gates/server.d.ts` | `.ts` | import { Server as SocketIOServer } from 'socket.io'; |
| `superproject-gates/server.ts` | `.ts` | import express from 'express'; |
| `superproject-gates/session_end_report.py` | `.py` | """ |
| `superproject-gates/setup-backup-cron.sh` | `.sh` | Setup Automated Incremental Backups via Cron/LaunchAgent |
| `superproject-gates/setup-completion-tracker.ts` | `.ts` | /** |
| `superproject-gates/setup-credentials.sh` | `.sh` | Off-Host Syslog Infrastructure - Credential Setup Script |
| `superproject-gates/setup-infrastructure.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/setup-mcp.sh` | `.sh` | Setup MCP server for Claude Flow |
| `superproject-gates/setup.ts` | `.ts` | /** |
| `superproject-gates/setup_agent_integrations.sh` | `.sh` | Agent Integration Setup Script |
| `superproject-gates/setup_backup_infrastructure.sh` | `.sh` | GitLab Backup Infrastructure Setup Script |
| `superproject-gates/setup_stx_deployment_env.sh` | `.sh` | setup_stx_deployment_env.sh |
| `superproject-gates/setup_upstream_sync.sh` | `.sh` | Automated Upstream Sync System |
| `superproject-gates/shap-explainer.ts` | `.ts` | /** |
| `superproject-gates/shareable-outputs.ts` | `.ts` | /** |
| `superproject-gates/simulate-rewards.ts` | `.ts` | /** |
| `superproject-gates/skill-confidence-updater.d.ts` | `.ts` | /** |
| `superproject-gates/skill-confidence-updater.ts` | `.ts` | /** |
| `superproject-gates/skill-validation-tracker.d.ts` | `.ts` | /** |
| `superproject-gates/skill-validation-tracker.ts` | `.ts` | /** |
| `superproject-gates/skills-manager.d.ts` | `.ts` | /** |
| `superproject-gates/skills-manager.ts` | `.ts` | /** |
| `superproject-gates/slop-detection.d.ts` | `.ts` | /** |
| `superproject-gates/slop-detection.ts` | `.ts` | /** |
| `superproject-gates/snapshot_scheduler.sh` | `.sh` | GitLab Snapshot Scheduler Script |
| `superproject-gates/sona-anomaly-detector.d.ts` | `.ts` | /** |
| `superproject-gates/sona-anomaly-detector.ts` | `.ts` | /** |
| `superproject-gates/spiking-nn-engine.ts` | `.ts` | /** |
| `superproject-gates/ssh-health-check.ts` | `.ts` | /** |
| `superproject-gates/stability-enhancer.d.ts` | `.ts` | /** |
| `superproject-gates/stability-enhancer.ts` | `.ts` | /** |
| `superproject-gates/stability-metrics.d.ts` | `.ts` | /** |
| `superproject-gates/stability-metrics.ts` | `.ts` | /** |
| `superproject-gates/standard-checkpoint-hooks.sh` | `.sh` | Standard checkpoint hook functions for Claude settings.json (without GitHub features) |
| `superproject-gates/standardize_logs.py` | `.py` | Fix Break Glass Logs |
| `superproject-gates/statistical-thresholds.sh` | `.sh` | Learned thresholds helpers (SQLite-based, best-effort). Safe fallbacks on errors. |
| `superproject-gates/status_file_manager.py` | `.py` | """ |
| `superproject-gates/statusline-command.sh` | `.sh` | Read JSON input from stdin |
| `superproject-gates/statusline.sh` | `.sh` | Claude Flow V3 Development Status Line |
| `superproject-gates/store-trajectory.sh` | `.sh` | ============================================================================ |
| `superproject-gates/stripe-integration.d.ts` | `.ts` | import { EventEmitter } from 'events'; |
| `superproject-gates/stripe-integration.ts` | `.ts` | import Stripe from 'stripe'; |
| `superproject-gates/stripe_sandbox_setup.py` | `.py` | """ |
| `superproject-gates/stub-providers.d.ts` | `.ts` | /** |
| `superproject-gates/stub-providers.ts` | `.ts` | /** |
| `superproject-gates/stx-domain-monitor-enhanced.sh` | `.sh` | STX Domain Health Monitor - Enhanced Version |
| `superproject-gates/stx-domain-monitor.sh` | `.sh` | STX Domain Health Monitor for yo.life, rooz.live, yoservice.com |
| `superproject-gates/stx11-greenfield-deploy.sh` | `.sh` | set -euo pipefail |
| `superproject-gates/stx_health_probes.sh` | `.sh` | STX Health Probes - Read-Only Diagnostic Checks |
| `superproject-gates/subdomain-testing.ts` | `.ts` | /** |
| `superproject-gates/super-macro-level-analyzer.d.ts` | `.ts` | /** |
| `superproject-gates/super-macro-level-analyzer.ts` | `.ts` | /** |
| `superproject-gates/supply-chain-resilience.ts` | `.ts` | /** |
| `superproject-gates/sustained-engagement.ts` | `.ts` | /** |
| `superproject-gates/swarm-api-server.ts` | `.ts` | /** |
| `superproject-gates/swarm-comms.sh` | `.sh` | Claude Flow V3 - Optimized Swarm Communications |
| `superproject-gates/swarm-compare-automation.ts` | `.ts` | /** |
| `superproject-gates/swarm-hooks.sh` | `.sh` | Claude Flow V3 - Swarm Communication Hooks |
| `superproject-gates/swarm-integration.d.ts` | `.ts` | /** |
| `superproject-gates/swarm-integration.ts` | `.ts` | /** |
| `superproject-gates/swarm-intelligence-engine.ts` | `.ts` | /** |
| `superproject-gates/swarm-monitor.sh` | `.sh` | Claude Flow V3 - Real-time Swarm Activity Monitor |
| `superproject-gates/swarm_compare.py` | `.py` | Extended metrics for richer analysis |
| `superproject-gates/swarm_compare_automation.py` | `.py` | """ |
| `superproject-gates/symfony-oro.d.ts` | `.ts` | /** |
| `superproject-gates/symfony-oro.ts` | `.ts` | /** |
| `superproject-gates/sync-institutional-cloud.sh` | `.sh` | Sync Institutional Cloud Systems |
| `superproject-gates/sync-personal-documentation.sh` | `.sh` | Sync Personal Documentation |
| `superproject-gates/sync-physical-offline.sh` | `.sh` | Sync Physical Offline Backup |
| `superproject-gates/sync-v3-metrics.sh` | `.sh` | Claude Flow V3 - Auto-sync Metrics from Actual Implementation |
| `superproject-gates/syslog-health-monitor.ts` | `.ts` | /** |
| `superproject-gates/system-adapters.ts` | `.ts` | /** |
| `superproject-gates/system-metrics-provider.d.ts` | `.ts` | /** |
| `superproject-gates/system-metrics-provider.ts` | `.ts` | /** |
| `superproject-gates/system_health_orchestrator.py` | `.py` | """ |
| `superproject-gates/system_integrity_validator.py` | `.py` | """ |
| `superproject-gates/task-emergence.d.ts` | `.ts` | /** |
| `superproject-gates/task-emergence.ts` | `.ts` | /** |
| `superproject-gates/tdd-metrics.ts` | `.ts` | /** |
| `superproject-gates/tdd_autofix.sh` | `.sh` | TDD Automated Fix Script for Milestone Gate Blockers |
| `superproject-gates/technical-precision.ts` | `.ts` | /** |
| `superproject-gates/technical-risk-analyzer.ts` | `.ts` | /** |
| `superproject-gates/telemetry-coverage-analyzer.ts` | `.ts` | /** |
| `superproject-gates/telemetry_collector.py` | `.py` | """ |
| `superproject-gates/temporal_budget_tracker.py` | `.py` | Types of temporal budgets |
| `superproject-gates/tenant-config.d.ts` | `.ts` | /** |
| `superproject-gates/tenant-config.ts` | `.ts` | /** |
| `superproject-gates/tenant-isolation.ts` | `.ts` | /** |
| `superproject-gates/tenant-middleware.ts` | `.ts` | /** |
| `superproject-gates/tensor-engine.d.ts` | `.ts` | /** |
| `superproject-gates/tensor-engine.ts` | `.ts` | /** |
| `superproject-gates/terraform-validation.sh` | `.sh` | Terraform Validation Script - Off-Host Syslog Black Box Recorder |
| `superproject-gates/test-causal-dashboard.ts` | `.ts` | /** |
| `superproject-gates/test-completion-data.ts` | `.ts` | import { CompletionTracker } from '../src/core/completion-tracker.js'; |
| `superproject-gates/test-completion-logic.sh` | `.sh` | Test script to demonstrate improved completion tracking logic |
| `superproject-gates/test-connectivity.sh` | `.sh` | ============================================================================= |
| `superproject-gates/test-coverage-sprint.sh` | `.sh` | Test Coverage Improvement Sprint |
| `superproject-gates/test-data-factory.ts` | `.ts` | /** |
| `superproject-gates/test-dor-dod-flow.sh` | `.sh` | DoR/DoD Flow Test Runner |
| `superproject-gates/test-evidence-logging.sh` | `.sh` | Evidence Logging Test Script |
| `superproject-gates/test-execution-planner.d.ts` | `.ts` | /** |
| `superproject-gates/test-execution-planner.ts` | `.ts` | /** |
| `superproject-gates/test-graph-builder.d.ts` | `.ts` | /** |
| `superproject-gates/test-graph-builder.ts` | `.ts` | /** |
| `superproject-gates/test-helpers.ts` | `.ts` | /** |
| `superproject-gates/test-inbox-parsing.sh` | `.sh` | test-inbox-parsing.sh - Test cases for inbox monitor parsing |
| `superproject-gates/test-infrastructure-health.ts` | `.ts` | /** |
| `superproject-gates/test-log-ingestion.sh` | `.sh` | Test log ingestion from stx-aio-0 to syslog sink |
| `superproject-gates/test-new-integrations.sh` | `.sh` | Test New ay prod/yo Integrations |
| `superproject-gates/test-phase-d-integration.sh` | `.sh` | ========================================== |
| `superproject-gates/test-saas-deployment.sh` | `.sh` | SaaS Deployment Framework Test Script |
| `superproject-gates/test-ssh-login.sh` | `.sh` | ============================================================================= |
| `superproject-gates/test-statistical-thresholds.sh` | `.sh` | Test statistical threshold functions |
| `superproject-gates/test-synthetic-log.sh` | `.sh` | ============================================================================= |
| `superproject-gates/test-utils.d.ts` | `.ts` | /** |
| `superproject-gates/test-utils.ts` | `.ts` | /** |
| `superproject-gates/test_affinity_engine.py` | `.py` | """ |
| `superproject-gates/test_ay_smart_cycle_ci.sh` | `.sh` | --- CI Integration Tests for AY Smart Cycle Script --- |
| `superproject-gates/test_device_24460_ssh_ipmi.py` | `.py` | """ |
| `superproject-gates/test_device_24460_ssh_ipmi_enhanced.py` | `.py` | """ |
| `superproject-gates/test_hostbill_api.sh` | `.sh` | HostBill API Integration Test |
| `superproject-gates/test_integration.py` | `.py` | Generate test swarm data for integration testing |
| `superproject-gates/test_ipmi_refactor.py` | `.py` | Set environment variables for testing |
| `superproject-gates/test_milestone_gates.py` | `.py` | Add parent directory to path |
| `superproject-gates/test_pattern_analysis.py` | `.py` | Add the agentic directory to the path |
| `superproject-gates/test_restore_procedure.sh` | `.sh` | GitLab Test Restore Procedure Script |
| `superproject-gates/test_runner.py` | `.py` | Add project root to path |
| `superproject-gates/test_swarm_comparison.py` | `.py` | Add scripts directory to path |
| `superproject-gates/test_variant_controls.py` | `.py` | Run a command and return the result |
| `superproject-gates/test_write_status.py` | `.py` | Add the investing/agentic-flow/scripts to path |
| `superproject-gates/testing-framework.ts` | `.ts` | /** |
| `superproject-gates/tier-depth-analyzer.ts` | `.ts` | import fs from 'fs'; |
| `superproject-gates/tier-depth-bridge.ts` | `.ts` | /** |
| `superproject-gates/tier-depth-coverage-analyzer.ts` | `.ts` | /** |
| `superproject-gates/tier-framework.ts` | `.ts` | /** |
| `superproject-gates/tier_depth_coverage.py` | `.py` | Add project root to Python path |
| `superproject-gates/tls_cert_issue.sh` | `.sh` | TLS Cert Issue Script - Dry Run / Echo Mode |
| `superproject-gates/todo-system.ts` | `.ts` | /** |
| `superproject-gates/token_optimization.py` | `.py` | """ |
| `superproject-gates/toolsets-orchestrator.d.ts` | `.ts` | /** |
| `superproject-gates/toolsets-orchestrator.ts` | `.ts` | /** |
| `superproject-gates/train_with_guardrails.py` | `.py` | --- Goalie Code Fix: ml-training-guardrail --- |
| `superproject-gates/trajectory-cli.ts` | `.ts` | /** |
| `superproject-gates/trajectory-storage.d.ts` | `.ts` | /** |
| `superproject-gates/trajectory-storage.ts` | `.ts` | /** |
| `superproject-gates/transmission-networks.ts` | `.ts` | /** |
| `superproject-gates/trend-analysis-engine.ts` | `.ts` | /** |
| `superproject-gates/triage-system.ts` | `.ts` | /** |
| `superproject-gates/triage-types.ts` | `.ts` | /** |
| `superproject-gates/trm-bounded-reasoning.d.ts` | `.ts` | /** |
| `superproject-gates/trm-bounded-reasoning.ts` | `.ts` | /** |
| `superproject-gates/turbo-flow-integration.ts` | `.ts` | /** |
| `superproject-gates/types.d.ts` | `.ts` | import { SystemHealth } from '../core/health-checks'; |
| `superproject-gates/types.ts` | `.ts` | import { SystemHealth } from '../core/health-checks'; |
| `superproject-gates/ultimate_deploy.sh` | `.sh` | ultimate_deploy.sh |
| `superproject-gates/unified-cli-evidence-emitter.ts` | `.ts` | /** |
| `superproject-gates/unified-economic-compounding.ts` | `.ts` | /** |
| `superproject-gates/unified-evidence-manager.d.ts` | `.ts` | /** |
| `superproject-gates/unified-evidence-manager.ts` | `.ts` | /** |
| `superproject-gates/unified-evidence-registry.ts` | `.ts` | /** |
| `superproject-gates/unified-evidence-schema.ts` | `.ts` | /** |
| `superproject-gates/unified-maturity-coverage.ts` | `.ts` | /** |
| `superproject-gates/unified-progress-tracker.d.ts` | `.ts` | /** |
| `superproject-gates/unified-progress-tracker.ts` | `.ts` | /** |
| `superproject-gates/unified_af_cli.py` | `.py` | Add the project root to the Python path |
| `superproject-gates/unified_evidence_emitter.py` | `.py` | Standardized evidence types |
| `superproject-gates/unified_heartbeat_monitor.py` | `.py` | """ |
| `superproject-gates/unit-testing-framework.ts` | `.ts` | /** |
| `superproject-gates/update-v3-progress.sh` | `.sh` | V3 Progress Update Script |
| `superproject-gates/upstream_check_hourly.sh` | `.sh` | Hourly Upstream Check (Lightweight) |
| `superproject-gates/upstream_sync_daily.sh` | `.sh` | Daily Upstream Sync |
| `superproject-gates/user-data.sh` | `.sh` | Cloud-init user-data script for Off-Host Syslog Black Box Recorder |
| `superproject-gates/utils.ts` | `.ts` | /** |
| `superproject-gates/v3-quick-status.sh` | `.sh` | V3 Quick Status - Compact development status overview |
| `superproject-gates/v3.sh` | `.sh` | V3 Helper Alias Script - Quick access to all V3 development tools |
| `superproject-gates/validate-api-routes.sh` | `.sh` | API Routes Validation |
| `superproject-gates/validate-claims.sh` | `.sh` | Validate that performance claims have supporting evidence |
| `superproject-gates/validate-dor-dod.sh` | `.sh` | DoR/DoD Validation Automation |
| `superproject-gates/validate-production.ts` | `.ts` | /** |
| `superproject-gates/validate-roam-freshness.sh` | `.sh` | ROAM Freshness Validation Script |
| `superproject-gates/validate-ssh-connectivity.sh` | `.sh` | OBS-3 SSH Connectivity Validation Script |
| `superproject-gates/validate-translations.sh` | `.sh` | Translation validation script for expanded localization |
| `superproject-gates/validate-v3-config.sh` | `.sh` | V3 Configuration Validation Script |
| `superproject-gates/validate_affiliate_attribution.sh` | `.sh` | Affiliate Attribution Accuracy Validation Script |
| `superproject-gates/validate_pi_sync.py` | `.py` | """ |
| `superproject-gates/validation-engine.ts` | `.ts` | /** |
| `superproject-gates/validation-protocols.ts` | `.ts` | /** |
| `superproject-gates/verification-gates.sh` | `.sh` | Verification Gates Script |
| `superproject-gates/verify-all.sh` | `.sh` | ============================================================================= |
| `superproject-gates/verify-ay-integration.sh` | `.sh` | set -euo pipefail |
| `superproject-gates/verify-connectivity.sh` | `.sh` | Verify connectivity from stx-aio-0 to syslog sink |
| `superproject-gates/verify-deployment.sh` | `.sh` | Syslog Sink Deployment Verification Script |
| `superproject-gates/verify-dor-dod.sh` | `.sh` | ========================================================================= |
| `superproject-gates/verify-logging.sh` | `.sh` | ============================================================================= |
| `superproject-gates/verify-retention.sh` | `.sh` | Verify logrotate configuration and retention policies |
| `superproject-gates/vibe_thinker.py` | `.py` | """ |
| `superproject-gates/webrtc-handler.d.ts` | `.ts` | /** |
| `superproject-gates/webrtc-handler.ts` | `.ts` | /** |
| `superproject-gates/weekly-governance-smart.sh` | `.sh` | 1) Optional governance check placeholder (replace with real when available) |
| `superproject-gates/wip-bounds-check.ts` | `.ts` | /** |
| `superproject-gates/wip_monitor.py` | `.py` | """ |
| `superproject-gates/wire-circulation-skills-learning.sh` | `.sh` | ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ |
| `superproject-gates/wordpress-client.d.ts` | `.ts` | /** |
| `superproject-gates/wordpress-client.ts` | `.ts` | /** |
| `superproject-gates/wordpress-flarum.ts` | `.ts` | /** |
| `superproject-gates/worker-manager.sh` | `.sh` | Claude Flow V3 - Unified Worker Manager |
| `superproject-gates/ws-server.d.ts` | `.ts` | /** |
| `superproject-gates/ws-server.ts` | `.ts` | /** |
| `superproject-gates/wsjf-batch-scorer.d.ts` | `.ts` | /** |
| `superproject-gates/wsjf-batch-scorer.ts` | `.ts` | /** |
| `superproject-gates/wsjf-file-selector.d.ts` | `.ts` | /** |
| `superproject-gates/wsjf-file-selector.ts` | `.ts` | /** |
| `superproject-gates/wsjf-integration.ts` | `.ts` | /** |
| `superproject-gates/wsjf-monitor.ts` | `.ts` | /** |
| `superproject-gates/wsjf-prioritizer.d.ts` | `.ts` | /** |
| `superproject-gates/wsjf-prioritizer.ts` | `.ts` | /** |
| `superproject-gates/wsjf-progress-tracker.ts` | `.ts` | /** |
| `superproject-gates/wsjf-rca-emitter.ts` | `.ts` | /** |
| `superproject-gates/wsjf_adjuster.py` | `.py` | """ |
| `superproject-gates/wsjf_calculator.py` | `.py` | WSJF calculation components |
| `superproject-gates/wsjf_enrichment_analysis.py` | `.py` | Get .goalie directory path |
| `superproject-gates/wsjf_failure_tracker.py` | `.py` | Get .goalie directory path |
| `superproject-gates/wsjf_pattern_filter.py` | `.py` | Get .goalie directory path |
| `superproject-gates/wsjf_remediation_recommender.py` | `.py` | Get .goalie directory path |
| `superproject-gates/wsjf_root_cause_analyzer.py` | `.py` | Get .goalie directory path |
| `superproject-gates/yasna-alignment.d.ts` | `.ts` | /** |
| `superproject-gates/yasna-alignment.ts` | `.ts` | /** |
| `superproject-gates/yasna-calibration.d.ts` | `.ts` | /** |
| `superproject-gates/yasna-calibration.ts` | `.ts` | /** |
| `superproject-gates/yasna-stage.d.ts` | `.ts` | /** |
| `superproject-gates/yasna-stage.ts` | `.ts` | /** |
| `superproject-gates/yolife-cockpit.d.ts` | `.ts` | /** |
| `superproject-gates/yolife-cockpit.ts` | `.ts` | /** |
| `superproject-gates/yolife-types.d.ts` | `.ts` | /** |
| `superproject-gates/yolife-types.ts` | `.ts` | /** |

## `swarms/`

| File | Type | Purpose |
|------|------|---------|
| `swarms/launch-vibethinker-interactive.sh` | `.sh` | Interactive VibeThinker Swarm Launcher |
| `swarms/vibethinker-legal-orchestrator.sh` | `.sh` | VibeThinker-Inspired Legal Swarm Orchestrator |

## `system/`

| File | Type | Purpose |
|------|------|---------|
| `system/fix_cpanel_ssl_matrix.sh` | `.sh` | fix_cpanel_ssl_matrix.sh |
| `system/map_tlds.sh` | `.sh` | ============================================================================== |
| `system/rca-dispatcher.sh` | `.sh` | rca-dispatcher.sh - Automated Root Cause Analysis Dispatcher |
| `system/setup_soxl_cron.sh` | `.sh` | @business-context WSJF-Cycle-59: SOXL Probability Extraction Cron Scheduler |
| `system/sync-universal-models.sh` | `.sh` | scripts/system/sync-universal-models.sh |
| `system/tunnel_ledger.sh` | `.sh` | @business-context WSJF-Cycle-63: Multi-Ledger Boundary Tunnel Extractor |

## `temporal/`

| File | Type | Purpose |
|------|------|---------|
| `temporal/budget_tracker.py` | `.py` | """ |

## `tests/`

| File | Type | Purpose |
|------|------|---------|
| `tests/playwright/tests/dashboard_metrics.spec.ts` | `.ts` | import { test, expect } from '@playwright/test'; |
| `tests/playwright/tests/tld_dashboard.spec.ts` | `.ts` | // @business-context WSJF-Cycle-60: TLD Dashboard Native UI Extractor |
| `tests/test-33-role-dashboard.sh` | `.sh` | Test 33-Role Dashboard Integration |
| `tests/test-api.sh` | `.sh` | Test yo.life API Server endpoints |
| `tests/test-bash.sh` | `.sh` | ============================================================================= |
| `tests/test-coverage-analysis.sh` | `.sh` | Test Coverage Gap Analysis and Automated Test Generation |
| `tests/test-coverage-systematic.sh` | `.sh` | Test Coverage Systematic Gap Analysis and Filling |
| `tests/test-dynamic-threshold-fixes.sh` | `.sh` | Test Dynamic Threshold Fixes |
| `tests/test-dynamic-thresholds.sh` | `.sh` | Test dynamic thresholds with yo.life observations data |
| `tests/test-inbox-wsjf-integration.sh` | `.sh` | Test Inbox WSJF Integration (WSJF 10.0) |
| `tests/test-providers.sh` | `.sh` | Test 1: Anthropic |
| `tests/test-sprint2-complete.sh` | `.sh` | Sprint 2 Completion Validation |
| `tests/test-tld-config.sh` | `.sh` | Test TLD Configuration - Verify TLD setup is working |
| `tests/test-tui-portfolio-coherence.sh` | `.sh` | Test TUI Dashboard Portfolio + Coherence Integration |
| `tests/test-validation-integration.sh` | `.sh` | Single entry point: validation-core + validation-runner tests; optional BHOPTI hash-db + post-send. |
| `tests/test-yolife-connectivity.sh` | `.sh` | Test YOLIFE Multi-Host Connectivity |
| `tests/test_af_prod_quality.sh` | `.sh` | Colors for output |
| `tests/test_agentdb_hydration.py` | `.py` | Agentic QA Integration mapping R-2026-021 Evidence Validation parameters |
| `tests/test_all_platforms.py` | `.py` | 1. Symfony/Oro CRM - Customer Ticket |
| `tests/test_auto_cod.py` | `.py` | Add parent directory to path |
| `tests/test_circle_normalization.sh` | `.sh` | Test: Circle Name Normalization |
| `tests/test_comprehensive_improvements.sh` | `.sh` | Comprehensive Test Suite for Agentic Flow Production Improvements |
| `tests/test_concurrent_governor.py` | `.py` | Simulate a heavy analysis task. |
| `tests/test_discord_temporal_bot.py` | `.py` | Fix import path logically ensuring we can hit interface endpoints |
| `tests/test_enhanced_pattern_stats.py` | `.py` | Run a test case and report results |
| `tests/test_governance_admission.py` | `.py` | Arrange 1000 minutes = under 5000 limit |
| `tests/test_governor_optimization.ts` | `.ts` | /** |
| `tests/test_governor_simple.py` | `.py` | Add the scripts directory to Python path |
| `tests/test_json_schema_governance.py` | `.py` | import pytest |
| `tests/test_pattern_metrics.sh` | `.sh` | test_pattern_metrics.sh - Pattern Metrics Demo & Testing |
| `tests/test_proxy_gaming.py` | `.py` | """ |
| `tests/test_stability.ts` | `.ts` | import { guarded, drain, config, reset } from '../src/runtime/processGovernor'; |
| `tests/test_stripe_integration.ts` | `.ts` | /** |
| `tests/test_webhooks.sh` | `.sh` | Test Webhook Integration (Mock Mode) |
| `tests/test_workload_distribution.py` | `.py` | Run a test cycle with multiple validation tests. |
| `tests/test_wsjf_calculation.py` | `.py` | Test WSJF auto-calculation for different circles |
| `tests/value_stream_test.sh` | `.sh` | value_stream_test.sh |

## `tuning/`

| File | Type | Purpose |
|------|------|---------|
| `tuning/tune_governor.py` | `.py` | Corrected export command: Just db path, defaults to ./agentdb-export.json |

## `utils/`

| File | Type | Purpose |
|------|------|---------|
| `utils/SafeGuard.ts` | `.ts` | /** |
| `utils/init_risk_db.sh` | `.sh` | Auto-initialize risk analytics DB if missing |

## `validators/`

| File | Type | Purpose |
|------|------|---------|
| `validators/.claude/helpers/v3/quality-criteria/validate-quality-criteria.ts` | `.ts` | /** |
| `validators/.claude/skills/brutal-honesty-review/scripts/assess-code.sh` | `.sh` | Brutal Honesty Code Assessment Script (Linus Mode) |
| `validators/.claude/skills/brutal-honesty-review/scripts/assess-tests.sh` | `.sh` | Brutal Honesty Test Assessment Script (Ramsay Mode) |
| `validators/.claude/skills/coverage-guard/scripts/check-coverage.sh` | `.sh` | check-coverage.sh — Coverage Guard hook |
| `validators/.claude/skills/freeze-tests/scripts/block-test-edits.sh` | `.sh` | block-test-edits.sh — Freeze Tests hook |
| `validators/.claude/skills/no-skip/scripts/check-skips.sh` | `.sh` | check-skips.sh — No-Skip hook |
| `validators/.claude/skills/security-watch/scripts/scan-security.sh` | `.sh` | scan-security.sh — Security Watch hook |
| `validators/.claude/skills/strict-tdd/scripts/enforce-red-phase.sh` | `.sh` | enforce-red-phase.sh — Strict TDD hook |
| `validators/.claude/skills/testability-scoring/resources/templates/config.template.js` | `.js` | // Testability Scorer Configuration Template |
| `validators/.claude/skills/testability-scoring/resources/templates/testability-scoring.spec.template.js` | `.js` | const { test, expect } = require('@playwright/test'); |
| `validators/.claude/skills/testability-scoring/scripts/generate-html-report.js` | `.js` | /** |
| `validators/.claude/skills/testability-scoring/scripts/run-assessment.sh` | `.sh` | Testability Scoring Assessment Runner |
| `validators/.compiled/wsjf-roam-escalator.js` | `.js` | "use strict"; |
| `validators/aqe-model-router.sh` | `.sh` | aqe-model-router.sh |
| `validators/aqe-shared-metrics-baseline.sh` | `.sh` | aqe-shared-metrics-baseline.sh |
| `validators/ci-email-validation-integration.sh` | `.sh` | ci-email-validation-integration.sh |
| `validators/core/automated_wholeness_validator.py` | `.py` | """ |
| `validators/core/base_validator.py` | `.py` | Base class for all validators |
| `validators/core/comprehensive_validator.py` | `.py` | Comprehensive validation system for production workflows |
| `validators/core/config_parity_check.py` | `.py` | """ |
| `validators/core/configuration_validator.py` | `.py` | Add project root to path |
| `validators/core/data_consistency_validator.py` | `.py` | Add project root to path |
| `validators/core/email_validation_pipeline.py` | `.py` | """ |
| `validators/core/email_validation_pipeline_41_roles.py` | `.py` | """ |
| `validators/core/hitl_email_verifier.py` | `.py` | """ |
| `validators/core/learning_capture_parity.py` | `.py` | Validate that retro-coach captures all processGovernor events |
| `validators/core/performance_validator.py` | `.py` | Add project root to path |
| `validators/core/security_validator.py` | `.py` | Add project root to path |
| `validators/core/signature_block_validator.py` | `.py` | """ |
| `validators/core/system_integrity_validator.py` | `.py` | """ |
| `validators/core/temporal_accuracy_validator.py` | `.py` | Validates temporal accuracy including day-of-week |
| `validators/core/timestamp_integrity_validator.py` | `.py` | """ |
| `validators/core/validate_payment_gateways.py` | `.py` | """ |
| `validators/core/validate_spiking_neural_networks.js` | `.js` | /** |
| `validators/core/wholeness_framework_meta_validator.py` | `.py` | """ |
| `validators/core/wholeness_validator_extended.py` | `.py` | Import base framework |
| `validators/core/wholeness_validator_legal_patterns.py` | `.py` | ═════════════════════════════════════════════════════════════════ |
| `validators/cross-eval-scorer.py` | `.py` | """ |
| `validators/dist/wsjf-roam-escalator.js` | `.js` | "use strict"; |
| `validators/email/domain_model.test.ts` | `.ts` | import { |
| `validators/email/domain_model.ts` | `.ts` | import { readFileSync } from 'fs'; |
| `validators/email/email-gate-lean.sh` | `.sh` | scripts/validators/email/email-gate-lean.sh |
| `validators/email/hitl-auto-promote.sh` | `.sh` | hitl-auto-promote.sh — Watches validated/ and auto-promotes to sent/ |
| `validators/email/validate-email-wsjf.sh` | `.sh` | Email Validator with WSJF Pre-Send Check |
| `validators/email-gate-lean.sh` | `.sh` | email-gate-lean.sh - Lean Email Validator (No Python Dependencies) |
| `validators/email-hitl-gate.sh` | `.sh` | email-hitl-gate.sh — Human-in-the-Loop Gate for Email Sending |
| `validators/email-lifecycle-tracker.py` | `.py` | """ |
| `validators/file/mail-capture-validate.sh` | `.sh` | ═══════════════════════════════════════════════════════════════════════════════ |
| `validators/file/semantic-checks.sh` | `.sh` | semantic-checks.sh - Semantic validation (stub implementation) |
| `validators/file/semantic-validation-gate.sh` | `.sh` | ═══════════════════════════════════════════════════════════════════════════════ |
| `validators/file/validation-runner.sh` | `.sh` | validation-runner.sh - Orchestration layer for email validation |
| `validators/force-rescan.sh` | `.sh` | Force Re-Scan Trigger for Validator #12 |
| `validators/generate-trial-report.py` | `.py` | """ |
| `validators/hitl-audit-safeguard.sh` | `.sh` | HITL Audit & Safeguard Script |
| `validators/mgpo-refiner.py` | `.py` | """ |
| `validators/multi-wsjf-swarm-orchestrator.sh` | `.sh` | Multi-WSJF Swarm Orchestration |
| `validators/project/agentdb-hydrate.py` | `.py` | """ |
| `validators/project/check-csqbm.sh` | `.sh` | check-csqbm.sh - Current-State Query Before Merge Enforcement |
| `validators/project/check-infra-health.sh` | `.sh` | ============================================================================= |
| `validators/project/check_roam_staleness.py` | `.py` | """ |
| `validators/project/contract-enforcement-gate.sh` | `.sh` | contract-enforcement-gate.sh |
| `validators/project/hostbill_telemetry.py` | `.py` | """ |
| `validators/project/json_to_yaml_parser.py` | `.py` | """ |
| `validators/project/legal-fact-check.sh` | `.sh` | EML Integrity Validation Gate (R-2026-100) |
| `validators/project/validate_coherence.py` | `.py` | """ |
| `validators/roam-staleness-watchdog.sh` | `.sh` | ============================================================================= |
| `validators/run-wsjf-validator.sh` | `.sh` | T3: Pre-flight checks — prevent EAGAIN cascades under disk pressure |
| `validators/semantic/confidence-scoring.py` | `.py` | Calculate confidence scores for validation checks |
| `validators/semantic/validate-case-numbers.sh` | `.sh` | validate-case-numbers.sh - Semantic Layer 1: Case Number Verification |
| `validators/semantic/validate-contacts.sh` | `.sh` | validate-contacts.sh - Semantic Layer 3: Contact Verification |
| `validators/semantic/validate-dates.sh` | `.sh` | Semantic Date Consistency Validator |
| `validators/semantic/validate-email-presend.sh` | `.sh` | scripts/validators/semantic/validate-email-presend.sh |
| `validators/semantic/validate-events.sh` | `.sh` | validate-events.sh - Semantic Layer 4: Event Validation |
| `validators/semantic/validate-wsjf-escalation.sh` | `.sh` | scripts/validators/semantic/validate-wsjf-escalation.sh |
| `validators/system/os_metric_validator.sh` | `.sh` | @business-context WSJF-Cycle-55: OS Memory Shell Bounding Matrix |
| `validators/tests/conftest.py` | `.py` | Test configuration and shared fixtures. |
| `validators/tests/test_coherence_smoke.py` | `.py` | Smoke tests to verify project structure. |
| `validators/unified-validation-orch.sh` | `.sh` | unified-validation-orch.sh |
| `validators/update-wsjf-live-dashboard.sh` | `.sh` | WSJF Live Dashboard Auto-Updater |
| `validators/validate-email-bounce-detect.sh` | `.sh` | scripts/validators/validate-email-bounce-detect.sh |
| `validators/validate-email-dupe.sh` | `.sh` | scripts/validators/validate-email-dupe.sh |
| `validators/validate-email-master.sh` | `.sh` | scripts/validators/validate-email-master.sh |
| `validators/validate-email-pre-send.sh` | `.sh` | Pre-Send Email Validator with WSJF Priority Updates |
| `validators/validate-email-response-track.sh` | `.sh` | scripts/validators/validate-email-response-track.sh |
| `validators/validate_coherence.py` | `.py` | """ |
| `validators/vibethinker-trial-swarm.sh` | `.sh` | VibeThinker Trial Validator Swarm (SFT→RL MGPO) |
| `validators/wsjf/batch-file-classifier.sh` | `.sh` | BATCH FILE CLASSIFIER - Auto-route files to WSJF swarms |
| `validators/wsjf/skill-harvest.py` | `.py` | Reads core execution telemetry safely natively isolating DB anomalies. |
| `validators/wsjf/turboquant-dgm-loop.py` | `.py` | Telemetry DB hook |
| `validators/wsjf/wsjf-roam-escalator.sh` | `.sh` | Validator #13: WSJF-ROAM Email Escalator |
| `validators/wsjf/wsjf_validation.sh` | `.sh` | WSJF Single Source of Truth Validation |
| `validators/wsjf-bash-validator.sh` | `.sh` | WSJF BASH Validator - Simple file monitor that routes to swarms |
| `validators/wsjf-roam-escalator.ts` | `.ts` | /** |

## `watchdog/`

| File | Type | Purpose |
|------|------|---------|
| `watchdog/roam-watchdog.sh` | `.sh` | scripts/watchdog/roam-watchdog.sh |

## `workers/`

| File | Type | Purpose |
|------|------|---------|
| `workers/sensorimotor_worker.py` | `.py` | """ |

## `wsjf/`

| File | Type | Purpose |
|------|------|---------|
| `wsjf/aggregate_wsjf.sh` | `.sh` | Multi-Repo WSJF Aggregation |
| `wsjf/budget_monitor.py` | `.py` | """ |
| `wsjf/priority_optimizer.py` | `.py` | """ |
| `wsjf/temporal_budget_tracker.py` | `.py` | Types of temporal budgets |
| `wsjf/wsjf_calculator.py` | `.py` | WSJF calculation components |
| `wsjf/wsjf_rotation_orchestrator.py` | `.py` | Add parent directory to path for imports |

## [DEPRECATED] 2026-04-15 - WSJF 9.8 Obfuscation & Duplication Legacy Consolidation
- Tombstoned `ay-*.sh` ecosystem (52+ files) to `scripts/legacy/ay-shells/`.
- Tombstoned `stx_phase2_manual_rpm.sh` and `deploy_ubuntu_on_stx_fixed.sh` to `scripts/legacy/`.
- Reason: Duplicate internal logic mapping driving cognitive drift overhead without modern MAPEK coverage.

## [DEPRECATED] 2026-04-15 - WSJF 7.4 Transition Architecture
- Tombstoned `validate-emails-robust.sh`, `analyze_process_health.py`, and `monitoring_dashboard.py` to `scripts/legacy/`.
- Reason: Capabilities subsumed natively by TSX dashboard / React component state.

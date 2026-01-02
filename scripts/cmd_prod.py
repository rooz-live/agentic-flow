#!/usr/bin/env python3
"""
Adaptive Production Orchestrator
Intelligently rotates between prod-cycle and prod-swarm based on current needs assessment
"""

import json
import os
import subprocess
import sys
import uuid
import time
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class NeedsAssessor:
    """Assess current system needs to determine optimal iteration strategy"""

    def __init__(self):
        self.goalie_path = PROJECT_ROOT / ".goalie"
        self.metrics_path = self.goalie_path / "pattern_metrics.jsonl"
        self.evidence_path = self.goalie_path / "evidence.jsonl"

    def _load_recent_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Load recent pattern metrics"""
        if not self.metrics_path.exists():
            return []

        metrics = []
        with open(self.metrics_path) as f:
            lines = f.readlines()
            for line in lines[-limit:]:
                try:
                    metrics.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return metrics

    def _pattern_name(self, metric: Dict[str, Any]) -> str:
        return metric.get('pattern_name') or metric.get('pattern') or ''

    def _calculate_stability_score(self, metrics: List[Dict]) -> float:
        """Calculate system stability (0-1, higher = more stable)"""
        if not metrics:
            return 0.5

        # Count failures and degradations
        failures = sum(1 for m in metrics if 'fail' in self._pattern_name(m).lower())
        degradations = sum(1 for m in metrics if 'degrad' in self._pattern_name(m).lower())
        total = len(metrics)

        stability = 1.0 - ((failures + degradations) / total if total > 0 else 0)
        return max(0.0, min(1.0, stability))

    def _calculate_maturity_gaps(self, metrics: List[Dict]) -> int:
        """Count maturity/coverage gaps needing attention"""
        gap_patterns = ['observability_gap', 'maturity_coverage', 'tier_depth_gap', 'aqe_coverage_gap']
        gaps = sum(
            1
            for m in metrics
            if any(gp in self._pattern_name(m) for gp in gap_patterns)
        )
        return gaps

    def _get_aqe_health(self) -> float:
        """Get AQE fleet health (0-1)"""
        try:
            res = subprocess.run(["ps", "aux"], capture_output=True, text=True)
            if "aqe start" in res.stdout:
                return 1.0
            return 0.5
        except Exception:
            return 0.0

    def _calculate_economic_volatility(self, metrics: List[Dict]) -> float:
        """Calculate economic metric volatility (0-1, higher = more volatile)"""
        wsjf_changes = []
        for m in metrics:
            if m.get('pattern_name') == 'wsjf_recalc':
                wsjf_changes.append(m.get('metadata', {}).get('change_pct', 0))

        if len(wsjf_changes) < 2:
            return 0.5

        # Calculate coefficient of variation
        mean = sum(wsjf_changes) / len(wsjf_changes)
        variance = sum((x - mean) ** 2 for x in wsjf_changes) / len(wsjf_changes)
        std_dev = variance ** 0.5
        cv = std_dev / abs(mean) if mean != 0 else 1.0

        return min(1.0, cv)

    def assess_needs(self) -> Dict[str, Any]:
        """
        Assess current system needs and recommend cycle/swarm strategy

        Returns:
            {
                "stability": float (0-1),
                "maturity_gaps": int,
                "economic_volatility": float (0-1),
                "recommended_cycle_iters": int,
                "recommended_swarm_iters": int,
                "reason": str,
                "confidence": float (0-1)
            }
        """
        metrics = self._load_recent_metrics(limit=200)

        if not metrics:
            return {
                "stability": 0.5,
                "maturity_gaps": 0,
                "economic_volatility": 0.5,
                "recommended_cycle_iters": 5,
                "recommended_swarm_iters": 10,
                "reason": "No metrics available, using conservative defaults",
                "confidence": 0.3
            }

        stability = self._calculate_stability_score(metrics)
        gaps = self._calculate_maturity_gaps(metrics)
        volatility = self._calculate_economic_volatility(metrics)
        aqe_health = self._get_aqe_health()

        # Decision logic: balance stability, gaps, and economic volatility
        cycle_iters = 5  # default
        swarm_iters = 10  # default
        reason = []

        # High instability → more focused cycles
        if stability < 0.7:
            cycle_iters = min(10, int(5 + (0.7 - stability) * 20))
            reason.append(f"Low stability ({stability:.1%}) needs focus")

        # Many gaps → more swarm iterations for exploration
        if gaps > 5:
            swarm_iters = min(50, 10 + gaps * 2)
            reason.append(f"High gaps ({gaps}) need exploration")

        # High economic volatility → more swarm comparisons
        if volatility > 0.5:
            swarm_iters = min(100, int(swarm_iters * (1 + volatility)))
            reason.append(f"High volatility ({volatility:.1%}) needs comparison")

        # High stability + low gaps → can reduce iterations
        if stability > 0.9 and gaps < 3:
            cycle_iters = max(3, cycle_iters - 2)
            swarm_iters = max(5, swarm_iters - 5)
            reason.append("High stability, reducing iterations")

        confidence = stability * (1.0 - volatility)

        return {
            "stability": round(stability, 3),
            "maturity_gaps": gaps,
            "economic_volatility": round(volatility, 3),
            "aqe_health": aqe_health,
            "recommended_cycle_iters": cycle_iters,
            "recommended_swarm_iters": swarm_iters,
            "reason": "; ".join(reason) if reason else "Using balanced defaults",
            "confidence": round(confidence * aqe_health, 3)
        }


class ProdOrchestrator:
    """Orchestrate rotation between prod-cycle and prod-swarm"""

    def __init__(
        self,
        progress_tooltip: str = "off",
        progress_status_file: Optional[str] = None,
    ):
        self.assessor = NeedsAssessor()
        self.af_script = PROJECT_ROOT / "scripts" / "af"
        self.progress_tooltip = progress_tooltip
        self.progress_status_file = progress_status_file
        self.progress_context: Dict[str, Any] = {}
        self._status_path: Optional[Path] = None

        if self.progress_tooltip == "write-status-file":
            goalie = PROJECT_ROOT / ".goalie"
            goalie.mkdir(parents=True, exist_ok=True)
            if self.progress_status_file:
                p = Path(self.progress_status_file)
                if not p.is_absolute():
                    p = PROJECT_ROOT / p
                # Validate path is within PROJECT_ROOT to prevent path traversal
                try:
                    p.resolve().relative_to(PROJECT_ROOT.resolve())
                except ValueError:
                    raise ValueError(f"Status file path {p} must be within project directory")
                self._status_path = p
            else:
                run_id = os.environ.get("AF_RUN_ID") or "unknown"
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                self._status_path = goalie / f"prod_status_{ts}_{run_id}.json"
            self.progress_event("init")

    def set_progress_context(self, ctx: Dict[str, Any]) -> None:
        self.progress_context = dict(ctx or {})

    def _progress_watch_commands(self) -> List[str]:
        return [
            "tail -f .goalie/production_run.log",
            "tail -f .goalie/prod_cycle_progress.log",
            "ls -t .goalie/evidence/evidence_*.jsonl | head -n 3",
        ]

    def _progress_payload(self, phase: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "ts": datetime.now().isoformat(),
            "phase": phase,
            "run_id": os.environ.get("AF_RUN_ID") or "unknown",
            "af_env": os.environ.get("AF_ENV", "local"),
        }
        if self.progress_context:
            payload["context"] = self.progress_context
        payload["watch"] = self._progress_watch_commands()
        if extra:
            payload.update(extra)
        return payload

    def _write_status_file(self, payload: Dict[str, Any]) -> None:
        if not self._status_path:
            return
        try:
            self._status_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._status_path, "w") as f:
                json.dump(payload, f, indent=2)

            # Also update "current" status for easier monitoring
            current_path = self._status_path.parent / "prod_status_current.json"
            with open(current_path, "w") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            return
            print(f"⚠️  WARNING: Failed to write status file {self._status_path}: {e}", file=sys.stderr)
            return

    def progress_event(self, phase: str, extra: Optional[Dict[str, Any]] = None) -> None:
        if self.progress_tooltip == "off":
            return

        payload = self._progress_payload(phase, extra=extra)

        if self.progress_tooltip == "write-status-file":
            self._write_status_file(payload)
            return

        if self.progress_tooltip == "json":
            print(json.dumps(payload), flush=True)
            return

        if self.progress_tooltip in {"compact", "rich"}:
            print("\n" + "=" * 70)
            print(f"⏱️  PROD PROGRESS: {phase}")
            if self._status_path:
                print(f"Status file: {self._status_path}")
            for k in ("run_id", "af_env"):
                if k in payload:
                    print(f"{k}: {payload[k]}")
            if "context" in payload:
                ctx = payload["context"]
                for k in ("mode", "rotations", "multipass", "preflight_iters"):
                    if k in ctx:
                        print(f"{k}: {ctx[k]}")
            print("Watch:")
            for cmd in payload.get("watch", []):
                print(f"  {cmd}")
            if self.progress_tooltip == "rich":
                try:
                    payload["integration_stats"] = self._collect_integration_stats()
                except Exception:
                    payload["integration_stats"] = None
                if payload.get("integration_stats"):
                    pm = payload["integration_stats"].get("pattern_metrics", {})
                    ev = payload["integration_stats"].get("learning_evidence", {})
                    pe = payload["integration_stats"].get("prod_learning_evidence", {})
                    cb = payload["integration_stats"].get("compounding_benefits", {})
                    print("Evidence sizes:")
                    print(f"  pattern_metrics: {pm.get('size', 0)}")
                    print(f"  learning_evidence: {ev.get('size', 0)}")
                    print(f"  prod_learning_evidence: {pe.get('size', 0)}")
                    print(f"  compounding_benefits: {cb.get('size', 0)}")
            print("=" * 70 + "\n")
            return

    def _run_command(self, cmd: List[str], env: Dict[str, str] = None) -> Tuple[int, str]:
        """Run a shell command and return (exit_code, output)"""
        cmd_env = os.environ.copy()
        if env:
            cmd_env.update(env)

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=cmd_env
            )
            return result.returncode, result.stdout + result.stderr
        except Exception as e:
            return 1, str(e)

    def _collect_integration_stats(self) -> Dict[str, Any]:
        goalie = PROJECT_ROOT / ".goalie"
        evidence_dir = goalie / "evidence"

        def stat_file(path: Path) -> Dict[str, Any]:
            if not path.exists():
                return {"exists": False, "size": 0}
            try:
                return {"exists": True, "size": path.stat().st_size}
            except Exception:
                return {"exists": True, "size": 0}

        evidence_files: List[Dict[str, Any]] = []
        if evidence_dir.exists():
            for p in evidence_dir.glob("evidence_*.jsonl"):
                try:
                    evidence_files.append({
                        "path": str(p),
                        "size": p.stat().st_size,
                        "mtime": p.stat().st_mtime,
                    })
                except Exception:
                    continue

        evidence_files.sort(key=lambda x: x.get("mtime", 0), reverse=True)

        return {
            "ts": datetime.now().isoformat(),
            "pattern_metrics": stat_file(goalie / "pattern_metrics.jsonl"),
            "learning_evidence": stat_file(goalie / "learning_evidence.jsonl"),
            "prod_learning_evidence": stat_file(goalie / "prod_learning_evidence.jsonl"),
            "aqe_memory": stat_file(PROJECT_ROOT / ".agentic-qe" / "memory.db"),
            "compounding_benefits": stat_file(goalie / "compounding_benefits.jsonl"),
            "compound_history": stat_file(goalie / "compound_history.jsonl"),
            "evidence_files": evidence_files[:25],
        }

    def collect_ledger_summary(self, hours: int = 6) -> Dict[str, Any]:
        run_id = os.environ.get("AF_RUN_ID") or "unknown"
        script = PROJECT_ROOT / "scripts" / "agentic" / "revenue_attribution.py"
        cmd = [
            sys.executable,
            str(script),
            "--hours",
            str(int(hours)),
            "--json",
            "--correlation-id",
            run_id,
        ]

        p = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
        if p.returncode != 0:
            err = (p.stderr or p.stdout or "").strip()
            return {"ok": False, "error": err[-800:], "summary": None}

        raw = (p.stdout or "").strip()
        if not raw:
            return {"ok": False, "error": "empty_stdout", "summary": None}

        try:
            doc = json.loads(raw)
        except Exception as e:
            return {"ok": False, "error": f"invalid_json: {e}", "summary": None}

        summary = doc.get("summary") if isinstance(doc, dict) else None
        if not isinstance(summary, dict):
            return {"ok": False, "error": "missing_summary", "summary": None}

        return {"ok": True, "error": None, "summary": summary}

    def run_prod_cycle(self, iterations: int, mode: str = "advisory",
                       with_health: bool = True, with_evidence: bool = True) -> bool:
        """Run prod-cycle with specified iterations"""
        print(f"\n{'='*70}")
        print(f"🔄 Running prod-cycle (iterations={iterations}, mode={mode})")
        print(f"{'='*70}\n")

        cmd = [str(self.af_script), "prod-cycle", "--mode", mode, "--iterations", str(iterations)]

        # Add health check and evidence assessment by default
        # Evidence assessment now uses advisory mode (exit 0) unless --strict is passed
        if with_health:
            cmd.append("--with-health-check")

        if with_evidence:
            cmd.append("--with-evidence-assess")

        exit_code, output = self._run_command(cmd)
        print(output)

        # Check if actual cycle execution succeeded by looking for success patterns
        # Don't fail just because evidence assessment returned non-zero
        if "✅ Cycle Complete" in output or "Successful:" in output:
            return True

        return exit_code == 0

    def run_prod_swarm(self, iterations: int, with_health: bool = True,
                       with_evidence: bool = True, default_emitters: bool = True,
                       auto_compare: bool = False) -> bool:
        """Run prod-swarm with specified iterations"""
        print(f"\n{'='*70}")
        print(f"🐝 Running prod-swarm (iterations={iterations})")
        print(f"{'='*70}\n")

        cmd = [
            str(self.af_script),
            "prod-swarm",
            "--golden-iters",
            str(iterations),
            "--platinum-iters",
            str(iterations),
            "--skip-capacity",
        ]

        if default_emitters:
            cmd.append("--default-emitters")

        if auto_compare:
            cmd.append("--auto-compare")

        # Add health check and evidence assessment by default
        # Evidence assessment now uses advisory mode (exit 0) unless --strict is passed
        if with_health:
            cmd.append("--with-health-check")

        if with_evidence:
            cmd.append("--with-evidence-assess")

        exit_code, output = self._run_command(cmd)
        print(output)

        # Check for swarm success patterns in output
        if "Swarm comparison complete" in output or "Winner" in output:
            return True

        return exit_code == 0

    def run_adaptive_rotation(
        self,
        max_rotations: int = 3,
        mode: str = "advisory",
        multipass: bool = False,
        preflight_iters: int = 5,
        swarm_auto_compare: bool = False,
    ) -> Dict[str, Any]:
        """
        Run adaptive rotation between cycle and swarm

        Args:
            max_rotations: Maximum number of cycle→swarm rotations
            mode: Production cycle mode (advisory, mutate, enforcement)

        Returns:
            Summary dict with results
        """
        results = {
            "rotations": [],
            "total_cycle_iterations": 0,
            "total_swarm_iterations": 0,
            "start_time": datetime.now().isoformat(),
            "success": True,
            "af_env": os.environ.get("AF_ENV", "local"),
            "pre_stats": self._collect_integration_stats(),
            "post_stats": None,
        }

        run_t0 = time.time()
        results["timing"] = {"start_ts": run_t0}

        print("\n" + "="*70)
        print("🎯 ADAPTIVE PRODUCTION ORCHESTRATOR")
        print("="*70)

        self.progress_event(
            "start",
            {
                "max_rotations": max_rotations,
                "mode": mode,
                "multipass": multipass,
                "preflight_iters": preflight_iters,
            },
        )

        for rotation in range(1, max_rotations + 1):
            print(f"\n{'='*70}")
            print(f"🔄 Rotation {rotation}/{max_rotations}")
            print(f"{'='*70}")

            self.progress_event("rotation_start", {"rotation": rotation, "max_rotations": max_rotations})

            # Assess current needs
            print("\n📊 Assessing Current Needs...")
            assessment = self.assessor.assess_needs()

            print(f"   Stability: {assessment['stability']:.1%}")
            print(f"   Maturity Gaps: {assessment['maturity_gaps']}")
            print(f"   Economic Volatility: {assessment['economic_volatility']:.1%}")
            print(f"   Confidence: {assessment['confidence']:.1%}")
            print(f"   📝 {assessment['reason']}")

            cycle_iters = assessment['recommended_cycle_iters']
            swarm_iters = assessment['recommended_swarm_iters']

            if multipass and preflight_iters > 0:
                cycle_iters = max(int(cycle_iters), int(preflight_iters))
                swarm_iters = max(int(swarm_iters), int(preflight_iters))

            print(f"\n   → Cycle iterations: {cycle_iters}")
            print(f"   → Swarm iterations: {swarm_iters}")

            rotation_result = {
                "rotation": rotation,
                "assessment": assessment,
                "cycle_iters": cycle_iters,
                "swarm_iters": swarm_iters,
                "cycle_success": False,
                "swarm_success": False,
                "preflight": {
                    "cycle": None,
                    "swarm": None,
                },
            }

            if multipass and preflight_iters > 0:
                cycle_pre_iters = min(preflight_iters, cycle_iters)
                self.progress_event(
                    "preflight_cycle_start",
                    {"rotation": rotation, "iters": cycle_pre_iters},
                )
                t0 = time.time()
                cycle_pre_success = self.run_prod_cycle(
                    iterations=cycle_pre_iters,
                    mode=mode,
                    with_health=True,
                    with_evidence=True,
                )
                cycle_pre_dur_s = time.time() - t0
                rotation_result["preflight"]["cycle"] = {
                    "iters": cycle_pre_iters,
                    "success": cycle_pre_success,
                    "duration_s": round(cycle_pre_dur_s, 3),
                }
                self.progress_event(
                    "preflight_cycle_end",
                    {
                        "rotation": rotation,
                        "iters": cycle_pre_iters,
                        "success": cycle_pre_success,
                        "duration_s": round(cycle_pre_dur_s, 3),
                    },
                )
                if not cycle_pre_success:
                    print("\n⚠️  Preflight cycle failed; aborting before full cycle")
                    results["success"] = False
                    rotation_result["cycle_success"] = False
                    rotation_result["swarm_success"] = None
                    results["rotations"].append(rotation_result)
                    self.progress_event(
                        "aborted",
                        {"rotation": rotation, "reason": "preflight_cycle_failed"},
                    )
                    break

            # Run prod-cycle with full workflow (health check + evidence assessment)
            self.progress_event("cycle_start", {"rotation": rotation, "iters": cycle_iters})
            t0 = time.time()
            cycle_success = self.run_prod_cycle(
                iterations=cycle_iters,
                mode=mode,
                with_health=True,
                with_evidence=True  # Evidence assessment now advisory by default
            )
            cycle_dur_s = time.time() - t0
            self.progress_event(
                "cycle_end",
                {
                    "rotation": rotation,
                    "iters": cycle_iters,
                    "success": cycle_success,
                    "duration_s": round(cycle_dur_s, 3),
                },
            )
            rotation_result["cycle_success"] = cycle_success
            rotation_result["cycle_duration_s"] = round(cycle_dur_s, 3)
            results["total_cycle_iterations"] += cycle_iters

            if not cycle_success:
                print(f"\n⚠️  Cycle failed, skipping swarm for rotation {rotation}")
                results["success"] = False
                rotation_result["swarm_success"] = None
                results["rotations"].append(rotation_result)
                self.progress_event(
                    "aborted",
                    {"rotation": rotation, "reason": "cycle_failed"},
                )
                break

            if multipass and preflight_iters > 0:
                swarm_pre_iters = min(preflight_iters, swarm_iters)
                self.progress_event(
                    "preflight_swarm_start",
                    {"rotation": rotation, "iters": swarm_pre_iters},
                )
                t0 = time.time()
                swarm_pre_success = self.run_prod_swarm(
                    iterations=swarm_pre_iters,
                    with_health=True,
                    with_evidence=True,
                    default_emitters=True,
                    auto_compare=False,
                )
                swarm_pre_dur_s = time.time() - t0
                rotation_result["preflight"]["swarm"] = {
                    "iters": swarm_pre_iters,
                    "success": swarm_pre_success,
                    "duration_s": round(swarm_pre_dur_s, 3),
                }
                self.progress_event(
                    "preflight_swarm_end",
                    {
                        "rotation": rotation,
                        "iters": swarm_pre_iters,
                        "success": swarm_pre_success,
                        "duration_s": round(swarm_pre_dur_s, 3),
                    },
                )
                if not swarm_pre_success:
                    print("\n⚠️  Preflight swarm failed; aborting before full swarm")
                    results["success"] = False
                    rotation_result["swarm_success"] = False
                    results["rotations"].append(rotation_result)
                    self.progress_event(
                        "aborted",
                        {"rotation": rotation, "reason": "preflight_swarm_failed"},
                    )
                    break

            # Run prod-swarm with full workflow (health check + evidence assessment)
            self.progress_event("swarm_start", {"rotation": rotation, "iters": swarm_iters})
            t0 = time.time()
            swarm_success = self.run_prod_swarm(
                iterations=swarm_iters,
                with_health=True,
                with_evidence=True,  # Evidence assessment now advisory by default
                default_emitters=True,
                auto_compare=swarm_auto_compare,
            )
            swarm_dur_s = time.time() - t0
            self.progress_event(
                "swarm_end",
                {
                    "rotation": rotation,
                    "iters": swarm_iters,
                    "success": swarm_success,
                    "duration_s": round(swarm_dur_s, 3),
                },
            )
            rotation_result["swarm_success"] = swarm_success
            rotation_result["swarm_duration_s"] = round(swarm_dur_s, 3)
            results["total_swarm_iterations"] += swarm_iters

            if not swarm_success:
                print(f"\n⚠️  Swarm failed at rotation {rotation}")
                results["success"] = False

            results["rotations"].append(rotation_result)

            # Early exit if high stability achieved
            if assessment['stability'] > 0.95 and assessment['maturity_gaps'] < 2:
                print(f"\n✨ High stability achieved ({assessment['stability']:.1%}), stopping early")
                break

        results["end_time"] = datetime.now().isoformat()
        results["post_stats"] = self._collect_integration_stats()

        try:
            pre = results.get("pre_stats") or {}
            post = results.get("post_stats") or {}

            def _size(d: Dict[str, Any], key: str) -> int:
                obj = d.get(key) or {}
                try:
                    return int(obj.get("size") or 0)
                except Exception:
                    return 0

            results["integration_deltas"] = {
                "pattern_metrics_bytes": _size(post, "pattern_metrics") - _size(pre, "pattern_metrics"),
                "learning_evidence_bytes": _size(post, "learning_evidence") - _size(pre, "learning_evidence"),
                "prod_learning_evidence_bytes": _size(
    post, "prod_learning_evidence"
) - _size(pre, "prod_learning_evidence"),
            }
        except Exception:
            results["integration_deltas"] = None

        results["timing"]["end_ts"] = time.time()
        results["timing"]["elapsed_s"] = round(results["timing"]["end_ts"] - run_t0, 3)

        try:
            phase_durations: Dict[str, float] = {}
            total_cycle_s = 0.0
            total_swarm_s = 0.0
            total_preflight_cycle_s = 0.0
            total_preflight_swarm_s = 0.0

            for rot in results.get("rotations") or []:
                rno = rot.get("rotation")
                rkey = str(rno) if rno is not None else "unknown"

                c_dur = rot.get("cycle_duration_s")
                s_dur = rot.get("swarm_duration_s")
                if isinstance(c_dur, (int, float)):
                    phase_durations[f"rotation_{rkey}_cycle_s"] = float(c_dur)
                    total_cycle_s += float(c_dur)
                if isinstance(s_dur, (int, float)):
                    phase_durations[f"rotation_{rkey}_swarm_s"] = float(s_dur)
                    total_swarm_s += float(s_dur)

                preflight = rot.get("preflight") or {}
                pc = (preflight.get("cycle") or {}) if isinstance(preflight, dict) else {}
                ps = (preflight.get("swarm") or {}) if isinstance(preflight, dict) else {}
                pc_dur = pc.get("duration_s") if isinstance(pc, dict) else None
                ps_dur = ps.get("duration_s") if isinstance(ps, dict) else None
                if isinstance(pc_dur, (int, float)):
                    phase_durations[f"rotation_{rkey}_preflight_cycle_s"] = float(pc_dur)
                    total_preflight_cycle_s += float(pc_dur)
                if isinstance(ps_dur, (int, float)):
                    phase_durations[f"rotation_{rkey}_preflight_swarm_s"] = float(ps_dur)
                    total_preflight_swarm_s += float(ps_dur)

            phase_durations["total_preflight_cycle_s"] = round(total_preflight_cycle_s, 3)
            phase_durations["total_preflight_swarm_s"] = round(total_preflight_swarm_s, 3)
            phase_durations["total_cycle_s"] = round(total_cycle_s, 3)
            phase_durations["total_swarm_s"] = round(total_swarm_s, 3)
            phase_durations["total_elapsed_s"] = float(results.get("timing", {}).get("elapsed_s") or 0)
            results["phase_durations"] = phase_durations
        except Exception:
            results["phase_durations"] = None

        # Print summary
        self._print_summary(results)

        self.progress_event("end", {"success": results.get("success", False)})

        return results

    def save_run_bundle(self, results: Dict[str, Any]) -> str:
        goalie = PROJECT_ROOT / ".goalie"
        goalie.mkdir(parents=True, exist_ok=True)
        run_id = os.environ.get("AF_RUN_ID") or "unknown"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = goalie / f"prod_run_{ts}_{run_id}.json"
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)
        return str(out_path)

    def save_markdown_report(self, results: Dict[str, Any], bundle_path: str, out_path: Optional[str] = None):
        goalie = PROJECT_ROOT / ".goalie"
        goalie.mkdir(parents=True, exist_ok=True)
        run_id = os.environ.get("AF_RUN_ID") or "unknown"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")

        report_path = Path(out_path) if out_path else (goalie / f"prod_report_{ts}_{run_id}.md")
        if not report_path.is_absolute():
            report_path = PROJECT_ROOT / report_path

        pre = (results or {}).get("pre_stats") or {}
        post = (results or {}).get("post_stats") or {}

        def size(d: Dict[str, Any], key: str) -> int:
            obj = d.get(key) or {}
            try:
                return int(obj.get("size") or 0)
            except Exception:
                return 0

        pm_delta = size(post, "pattern_metrics") - size(pre, "pattern_metrics")
        le_delta = size(post, "learning_evidence") - size(pre, "learning_evidence")
        ple_delta = size(post, "prod_learning_evidence") - size(pre, "prod_learning_evidence")

        grad_doc: Optional[Dict[str, Any]] = None
        try:
            grad_path = goalie / f"graduation_latest_{run_id}.json"
            if not grad_path.exists():
                grad_path = goalie / "graduation_latest.json"
            if grad_path.exists():
                doc = json.load(open(grad_path))
                g = doc.get("graduation") if isinstance(doc, dict) else None
                if isinstance(g, dict):
                    grad_doc = g
        except Exception:
            grad_doc = None

        lines: List[str] = []
        lines.append("# AF Prod Run Report")
        lines.append("")
        lines.append(f"- Run ID: `{run_id}`")
        lines.append(f"- AF_ENV: `{os.environ.get('AF_ENV', 'local')}`")
        lines.append(f"- Success: `{'YES' if results.get('success') else 'NO'}`")
        lines.append(f"- Bundle: `{bundle_path}`")
        lines.append("")

        lines.append("## Multipass / Rotations")
        for rot in (results.get("rotations") or []):
            rno = rot.get("rotation")
            c_it = rot.get("cycle_iters")
            s_it = rot.get("swarm_iters")
            c_ok = rot.get("cycle_success")
            s_ok = rot.get("swarm_success")
            preflight = rot.get("preflight") or {}
            pc = (preflight.get("cycle") or {})
            ps = (preflight.get("swarm") or {})
            lines.append(
                f"- Rotation {rno}: cycle({c_it})={'ok' if c_ok else 'fail'} | "
                f"swarm({s_it})={'ok' if s_ok else 'fail'} | "
                f"preflight_cycle({pc.get('iters')})={'ok' if pc.get('success') else 'fail'} | "
                f"preflight_swarm({ps.get('iters')})={'ok' if ps.get('success') else 'fail'}"
            )
        lines.append("")

        phase = (results or {}).get("phase_durations")
        if isinstance(phase, dict) and phase:
            lines.append("## Phase Durations (seconds)")
            for key in [
                "total_elapsed_s",
                "total_preflight_cycle_s",
                "total_preflight_swarm_s",
                "total_cycle_s",
                "total_swarm_s",
            ]:
                if key in phase:
                    lines.append(f"- {key}: `{phase.get(key)}`")
            for key in sorted(k for k in phase.keys() if k.startswith("rotation_")):
                lines.append(f"- {key}: `{phase.get(key)}`")
            lines.append("")

        lines.append("## Pre/Post Integration Stats")
        lines.append(f"- pattern_metrics Δ bytes: `{pm_delta}`")
        lines.append(f"- learning_evidence Δ bytes: `{le_delta}`")
        lines.append(f"- prod_learning_evidence Δ bytes: `{ple_delta}`")
        lines.append("")

        ledger = (results or {}).get("ledger") or {}
        ledger_summary = ledger.get("summary") if isinstance(ledger, dict) else None
        if isinstance(ledger_summary, dict):
            lines.append("## Ledger (Revenue Attribution)")
            lines.append(f"- revenue_per_hour: `{ledger_summary.get('revenue_per_hour')}`")
            lines.append(f"- value_per_hour: `{ledger_summary.get('value_per_hour')}`")
            lines.append(f"- wsjf_per_hour: `{ledger_summary.get('wsjf_per_hour')}`")
            lines.append(f"- total_energy_cost_usd: `{ledger_summary.get('total_energy_cost_usd')}`")
            lines.append("")

        if isinstance(grad_doc, dict):
            g = grad_doc
            lines.append("## Autocommit Graduation (Unified)")
            lines.append(f"- Assessment: `{g.get('assessment')}`")
            lines.append(f"- Reason: `{g.get('reason')}`")
            lines.append(f"- OK Rate: `{g.get('ok_rate')}` / `{g.get('min_ok_rate')}`")
            lines.append(f"- Stability: `{g.get('stability_score')}` / `{g.get('min_stability_score')}`")
            lines.append(f"- Aborts: `{g.get('aborts')}` / `{g.get('max_abort')}`")
            lines.append(f"- System Errors: `{g.get('system_state_errors')}` / `{g.get('max_sys_state_err')}`")
            lines.append("")

        md = "\n".join(lines) + "\n"

        try:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            with open(report_path, "w") as f:
                f.write(md)
        except Exception:
            pass

        return str(report_path), md

    def _print_summary(self, results: Dict[str, Any]):
        """Print execution summary"""
        print("\n" + "="*70)
        print("📋 EXECUTION SUMMARY")
        print("="*70)

        print(f"\n   Total Rotations: {len(results['rotations'])}")
        print(f"   Total Cycle Iterations: {results['total_cycle_iterations']}")
        print(f"   Total Swarm Iterations: {results['total_swarm_iterations']}")
        print(f"   Overall Success: {'✅ YES' if results['success'] else '❌ NO'}")

        print("\n   Rotation Details:")
        for rot in results['rotations']:
            cycle_status = "✅" if rot['cycle_success'] else "❌"
            swarm_status = "✅" if rot['swarm_success'] else ("⏭️" if rot['swarm_success'] is None else "❌")
            print(
                f"      {rot['rotation']}. Cycle({rot['cycle_iters']}): {cycle_status} | "
                f"Swarm({rot['swarm_iters']}): {swarm_status}"
            )

        print("\n" + "="*70)


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Adaptive Production Orchestrator - Rotate between cycle and swarm"
    )
    parser.add_argument(
        '--rotations',
        type=int,
        default=3,
        help='Maximum number of cycle→swarm rotations (default: 3)'
    )
    parser.add_argument(
        '--mode',
        choices=['advisory', 'mutate', 'enforcement'],
        default='advisory',
        help='Production cycle mode (default: advisory)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '--assess-only',
        action='store_true',
        help='Only run needs assessment, don\'t execute'
    )

    parser.add_argument(
        '--multipass',
        action='store_true',
        help='Run preflight cycle+swarm with small iters to catch regressions early'
    )
    parser.add_argument(
        '--preflight-iters',
        type=int,
        default=5,
        help='Iterations to use for preflight when --multipass is set (default: 5)'
    )

    parser.add_argument(
        '--ledger-run',
        action='store_true',
        help='Collect optional revenue attribution (ledger) metrics for this run'
    )
    parser.add_argument(
        '--ledger-hours',
        type=int,
        default=6,
        help='Hours of data to include when computing ledger metrics (default: 6)'
    )

    parser.add_argument(
        '--swarm-auto-compare',
        action='store_true',
        help='When running prod-swarm from af prod, also pass --auto-compare to save a 3-way compare artifact'
    )

    parser.add_argument(
        '--report-md',
        action='store_true',
        help='Write a postable Markdown report under .goalie/ after the run'
    )
    parser.add_argument(
        '--report-md-path',
        type=str,
        default=None,
        help='Optional output path for --report-md (default: .goalie/prod_report_<ts>_<run_id>.md)'
    )
    parser.add_argument(
        '--progress-tooltip',
        choices=['off', 'compact', 'rich', 'json', 'write-status-file'],
        default='off',
        help='Progress helper output mode (default: off)'
    )
    parser.add_argument(
        '--progress-status-file',
        type=str,
        default=None,
        help='Optional path for write-status-file mode (default: .goalie/prod_status_<ts>_<run_id>.json)'
    )

    args = parser.parse_args()

    if not os.environ.get("AF_RUN_ID"):
        os.environ["AF_RUN_ID"] = str(uuid.uuid4())
    os.environ.setdefault("AF_CORRELATION_ID", os.environ.get("AF_RUN_ID") or "unknown")

    if args.ledger_run:
        os.environ["AF_LEDGER_RUN"] = "1"
        os.environ["AF_LEDGER_HOURS"] = str(int(args.ledger_hours))

    if args.json and args.progress_tooltip != 'write-status-file':
        args.progress_tooltip = 'off'

    orchestrator = ProdOrchestrator(
        progress_tooltip=args.progress_tooltip,
        progress_status_file=args.progress_status_file,
    )
    orchestrator.set_progress_context(
        {
            'rotations': args.rotations,
            'mode': args.mode,
            'multipass': args.multipass,
            'preflight_iters': args.preflight_iters,
            'ledger_run': args.ledger_run,
            'ledger_hours': args.ledger_hours,
            'swarm_auto_compare': args.swarm_auto_compare,
        }
    )

    if args.assess_only:
        # Just run assessment
        assessment = orchestrator.assessor.assess_needs()
        if args.json:
            print(json.dumps(assessment, indent=2))
        else:
            print("\n📊 Current Needs Assessment:")
            print(f"   Stability: {assessment['stability']:.1%}")
            print(f"   Maturity Gaps: {assessment['maturity_gaps']}")
            print(f"   Economic Volatility: {assessment['economic_volatility']:.1%}")
            print(f"   Recommended Cycle Iterations: {assessment['recommended_cycle_iters']}")
            print(f"   Recommended Swarm Iterations: {assessment['recommended_swarm_iters']}")
            print(f"   Confidence: {assessment['confidence']:.1%}")
            print(f"   📝 {assessment['reason']}")
        sys.exit(0)

    # Run adaptive rotation
    results = orchestrator.run_adaptive_rotation(
        max_rotations=args.rotations,
        mode=args.mode,
        multipass=args.multipass,
        preflight_iters=args.preflight_iters,
        swarm_auto_compare=args.swarm_auto_compare,
    )

    if args.ledger_run:
        results["ledger"] = orchestrator.collect_ledger_summary(hours=args.ledger_hours)

    bundle_path = orchestrator.save_run_bundle(results)
    orchestrator.progress_event(
        'bundle_saved',
        {'bundle_path': bundle_path, 'success': results.get('success', False)},
    )
    if not args.json:
        print(f"\n📦 Saved run bundle: {bundle_path}")

    if args.report_md:
        report_path, report_md = orchestrator.save_markdown_report(results, bundle_path, out_path=args.report_md_path)
        if not args.json:
            print("\n" + report_md)
            print(f"\n📝 Saved Markdown report: {report_path}")

    if args.json:
        print(json.dumps(results, indent=2))

    sys.exit(0 if results['success'] else 1)


if __name__ == '__main__':
    main()

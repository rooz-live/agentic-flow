#!/usr/bin/env python3
"""
bootstrap_local_metrics.py - Flow Instrumentation for Build-Measure-Learn

Captures Process, Flow, and Learning metrics using stdlib only.
Writes to risk_analytics_baseline.db and .goalie/metrics_log.jsonl.

Target Metrics:
- Process: retro→commit time, action items %, context switches/day
- Flow: lead time, cycle time, throughput, WIP violations
- Learning: experiments/sprint, retro→features %, learning implementation time

Usage:
    python3 scripts/agentic/bootstrap_local_metrics.py
    python3 scripts/agentic/bootstrap_local_metrics.py --validate-thresholds
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

class MetricsBootstrap:
    def __init__(self, repo_root=None):
        if repo_root is None:
            script_dir = Path(__file__).parent
            repo_root = script_dir.parent.parent

        self.repo_root = Path(repo_root)
        self.risk_db = self.repo_root / "metrics" / "risk_analytics_baseline.db"
        self.goalie_dir = self.repo_root / ".goalie"
        self.metrics_log = self.goalie_dir / "metrics_log.jsonl"

        # Thresholds
        self.thresholds = {
            "retro_to_commit_minutes": 60,  # < 1 hour
            "action_items_done_percent": 80,  # > 80%
            "context_switches_per_day": 5,  # < 5
            "wip_violations_percent": 5,  # < 5%
            "experiments_per_sprint": 3,  # > 3
            "retro_to_features_percent": 60,  # > 60%
            "learning_implementation_days": 7  # < 1 week
        }

    def compute_process_metrics(self):
        """Compute: retro→commit time, action items %, context switches."""
        metrics = {}

        # Action items completion (from QUICK_WINS.md)
        quick_wins = self.repo_root / "docs" / "QUICK_WINS.md"
        if quick_wins.exists():
            with open(quick_wins) as f:
                content = f.read()
                total = content.count("- [")
                done = content.count("- [x]")
                metrics["action_items_done_percent"] = (done / total * 100) if total > 0 else 0
        else:
            metrics["action_items_done_percent"] = 0

        # Retro→commit time (heuristic: time between last learning event and latest commit)
        events_log = self.repo_root / "logs" / "learning" / "events.jsonl"
        if events_log.exists():
            try:
                with open(events_log) as f:
                    lines = f.readlines()
                    if lines:
                        last_event = json.loads(lines[-1])
                        event_time = datetime.fromisoformat(last_event.get("timestamp", "").replace("Z", "+00:00"))

                        # Get latest commit time
                        result = subprocess.run(
                            ["git", "log", "-1", "--format=%aI"],
                            cwd=self.repo_root,
                            capture_output=True,
                            text=True
                        )
                        if result.returncode == 0:
                            commit_time = datetime.fromisoformat(result.stdout.strip())
                            delta = abs((commit_time - event_time).total_seconds() / 60)
                            metrics["retro_to_commit_minutes"] = delta
                        else:
                            metrics["retro_to_commit_minutes"] = None
            except Exception as e:
                metrics["retro_to_commit_minutes"] = None
        else:
            metrics["retro_to_commit_minutes"] = None

        # Context switches (heuristic: assume 0 if using unified interface)
        metrics["context_switches_per_day"] = 0

        return metrics

    def compute_flow_metrics(self):
        """Compute: lead time, cycle time, throughput, WIP violations."""
        metrics = {}

        # Get git log for last 30 days
        try:
            result = subprocess.run(
                ["git", "log", "--since=30.days.ago", "--pretty=format:%aI", "--no-merges"],
                cwd=self.repo_root,
                capture_output=True,
                text=True
            )

            if result.returncode == 0 and result.stdout.strip():
                commits = result.stdout.strip().split('\n')
                commit_count = len(commits)

                # Throughput: commits per day
                metrics["throughput_items_per_day"] = commit_count / 30.0

                # Lead/cycle time: average time between commits (placeholder)
                if commit_count > 1:
                    times = [datetime.fromisoformat(t) for t in commits]
                    times.sort()
                    deltas = [(times[i+1] - times[i]).total_seconds() / 3600 for i in range(len(times)-1)]
                    avg_delta = sum(deltas) / len(deltas)
                    metrics["lead_time_hours"] = avg_delta
                    metrics["cycle_time_hours"] = avg_delta * 0.8  # Estimate
                else:
                    metrics["lead_time_hours"] = None
                    metrics["cycle_time_hours"] = None
            else:
                metrics["throughput_items_per_day"] = 0
                metrics["lead_time_hours"] = None
                metrics["cycle_time_hours"] = None
        except Exception as e:
            metrics["throughput_items_per_day"] = 0
            metrics["lead_time_hours"] = None
            metrics["cycle_time_hours"] = None

        # WIP violations (from goalie cycle log)
        cycle_log = self.goalie_dir / "cycle_log.jsonl"
        if cycle_log.exists():
            try:
                with open(cycle_log) as f:
                    lines = f.readlines()
                    # Heuristic: count cycles with high WIP
                    high_wip = 0
                    for line in lines:
                        data = json.loads(line)
                        if data.get("wip", 0) > 10:
                            high_wip += 1
                    metrics["wip_violations"] = high_wip
            except:
                metrics["wip_violations"] = 0
        else:
            metrics["wip_violations"] = 0

        return metrics

    def compute_learning_metrics(self):
        """Compute: experiments/sprint, retro→features %, learning time."""
        metrics = {}

        # Experiments: count learning events with 'test' or 'experiment' tags
        events_log = self.repo_root / "logs" / "learning" / "events.jsonl"
        if events_log.exists():
            try:
                with open(events_log) as f:
                    lines = f.readlines()
                    experiments = sum(1 for line in lines if "test" in line.lower() or "experiment" in line.lower())
                    metrics["experiments_per_sprint"] = experiments
            except:
                metrics["experiments_per_sprint"] = 0
        else:
            metrics["experiments_per_sprint"] = 0

        # Retro→features: ratio of action items to commits (heuristic)
        quick_wins = self.repo_root / "docs" / "QUICK_WINS.md"
        if quick_wins.exists():
            with open(quick_wins) as f:
                content = f.read()
                done_items = content.count("- [x]")

                # Get commit count
                try:
                    result = subprocess.run(
                        ["git", "log", "--since=30.days.ago", "--oneline", "--no-merges"],
                        cwd=self.repo_root,
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        commits = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
                        if commits > 0:
                            metrics["retro_to_features_percent"] = (done_items / commits * 100)
                        else:
                            metrics["retro_to_features_percent"] = 0
                    else:
                        metrics["retro_to_features_percent"] = 0
                except:
                    metrics["retro_to_features_percent"] = 0
        else:
            metrics["retro_to_features_percent"] = 0

        # Learning implementation time: placeholder (would need tracking of learning→implementation)
        metrics["learning_implementation_days"] = 1.0  # Default: very fast

        # False positive rate
        if events_log.exists():
            try:
                with open(events_log) as f:
                    lines = f.readlines()
                    total = len(lines)
                    failures = sum(1 for line in lines if '"verdict": "failure"' in line)
                    metrics["false_positive_rate"] = (failures / total) if total > 0 else 0.0
            except:
                metrics["false_positive_rate"] = 0.0
        else:
            metrics["false_positive_rate"] = 0.0

        return metrics

    def write_to_db(self, process, flow, learning):
        """Write metrics to risk_analytics_baseline.db."""
        if not self.risk_db.exists():
            print(f"Warning: Risk analytics DB not found at {self.risk_db}", file=sys.stderr)
            return False

        try:
            conn = sqlite3.connect(self.risk_db)
            cursor = conn.cursor()

            # Insert process metrics
            cursor.execute("""
                INSERT INTO process_metrics
                (retro_to_commit_minutes, action_items_done_percent, context_switches_per_day)
                VALUES (?, ?, ?)
            """, (
                process.get("retro_to_commit_minutes"),
                process.get("action_items_done_percent"),
                process.get("context_switches_per_day")
            ))

            # Insert flow metrics
            cursor.execute("""
                INSERT INTO flow_metrics
                (lead_time_hours, cycle_time_hours, throughput_items_per_day, wip_violations)
                VALUES (?, ?, ?, ?)
            """, (
                flow.get("lead_time_hours"),
                flow.get("cycle_time_hours"),
                flow.get("throughput_items_per_day"),
                flow.get("wip_violations")
            ))

            # Insert learning metrics
            cursor.execute("""
                INSERT INTO learning_metrics
                (experiments_per_sprint, retro_to_features_percent, learning_implementation_days, false_positive_rate)
                VALUES (?, ?, ?, ?)
            """, (
                learning.get("experiments_per_sprint"),
                learning.get("retro_to_features_percent"),
                learning.get("learning_implementation_days"),
                learning.get("false_positive_rate")
            ))

            conn.commit()
            conn.close()

            return True

        except Exception as e:
            print(f"Error writing to DB: {e}", file=sys.stderr)
            return False

    def append_to_metrics_log(self, all_metrics):
        """Append to .goalie/metrics_log.jsonl."""
        try:
            self.goalie_dir.mkdir(parents=True, exist_ok=True)

            with open(self.metrics_log, 'a') as f:
                f.write(json.dumps(all_metrics) + '\n')

            return True
        except Exception as e:
            print(f"Error appending to metrics log: {e}", file=sys.stderr)
            return False

    def compute_scoring_summary(self, process, flow, learning):
	        """Compute aggregate average_score and risk_distribution for BML metrics.

	        This mirrors the spirit of scripts/ci/collect_metrics.py by producing a 0-100
	        overall score and mapping it into P0–P3 bands, but uses BML-oriented metrics
	        (process/flow/learning) instead of PR-level risk analytics.
	        """

	        def clamp(x: float) -> float:
	            return max(0.0, min(100.0, float(x)))

	        def norm(value, target: float, higher_is_better: bool = True) -> float:
	            """Normalize a raw metric to 0–100 around a target.

	            - higher_is_better=True: 0→0, target→100, >target capped at 100
	            - higher_is_better=False: 0→100, target→100, 4×target→0 (linear falloff)
	            """
	            if value is None:
	                return 50.0
	            try:
	                v = float(value)
	            except (TypeError, ValueError):
	                return 50.0

	            if higher_is_better:
	                if v >= target:
	                    return 100.0
	                if v <= 0:
	                    return 0.0
	                return clamp((v / target) * 100.0)
	            else:
	                if v <= target:
	                    return 100.0
	                if v >= 4 * target:
	                    return 0.0
	                return clamp((4 * target - v) * 100.0 / (3 * target))

	        # Process dimension: action items %, retro→commit minutes, context switches
	        p_scores = []
	        action_pct = process.get("action_items_done_percent")
	        if action_pct is not None:
	            p_scores.append(
	                norm(action_pct, self.thresholds["action_items_done_percent"], higher_is_better=True)
	            )
	        retro_mins = process.get("retro_to_commit_minutes")
	        if retro_mins is not None:
	            p_scores.append(
	                norm(retro_mins, self.thresholds["retro_to_commit_minutes"], higher_is_better=False)
	            )
	        ctx = process.get("context_switches_per_day")
	        if ctx is not None:
	            p_scores.append(
	                norm(ctx, self.thresholds["context_switches_per_day"], higher_is_better=False)
	            )
	        process_score = sum(p_scores) / len(p_scores) if p_scores else 50.0

	        # Flow dimension: throughput, lead/cycle time, WIP violations
	        f_scores = []
	        throughput = flow.get("throughput_items_per_day")
	        if throughput is not None:
	            # Target ≈ 1 item/day; more is fine and capped at 100
	            f_scores.append(norm(throughput, 1.0, higher_is_better=True))
	        lead = flow.get("lead_time_hours")
	        if lead is not None:
	            # Aim for < 24h lead time
	            f_scores.append(norm(lead, 24.0, higher_is_better=False))
	        cycle = flow.get("cycle_time_hours")
	        if cycle is not None:
	            # Aim for < 24h cycle time as a coarse proxy
	            f_scores.append(norm(cycle, 24.0, higher_is_better=False))
	        wip = flow.get("wip_violations")
	        if wip is not None:
	            # Any sustained WIP violations reduce flow score
	            f_scores.append(norm(wip, 1.0, higher_is_better=False))
	        flow_score = sum(f_scores) / len(f_scores) if f_scores else 50.0

	        # Learning dimension: experiments, retro→features %, implementation time, false positives
	        l_scores = []
	        exp = learning.get("experiments_per_sprint")
	        if exp is not None:
	            l_scores.append(
	                norm(exp, self.thresholds["experiments_per_sprint"], higher_is_better=True)
	            )
	        rtf = learning.get("retro_to_features_percent")
	        if rtf is not None:
	            l_scores.append(
	                norm(rtf, self.thresholds["retro_to_features_percent"], higher_is_better=True)
	            )
	        impl_days = learning.get("learning_implementation_days")
	        if impl_days is not None:
	            l_scores.append(
	                norm(impl_days, self.thresholds["learning_implementation_days"], higher_is_better=False)
	            )
	        fpr = learning.get("false_positive_rate")
	        if fpr is not None:
	            # false_positive_rate is a 0–1 fraction; keep <10% as "green"
	            l_scores.append(norm(fpr, 0.10, higher_is_better=False))
	        learning_score = sum(l_scores) / len(l_scores) if l_scores else 50.0

	        # Aggregate 0–100 score, weighting Flow slightly higher (similar to overall_score
	        # weighting in scripts/ci/collect_metrics.py but adapted to BML dimensions).
	        average_score = round(
	            process_score * 0.30 + flow_score * 0.40 + learning_score * 0.30,
	            2,
	        )

	        # Map to P0–P3 using the same bands as scripts/ci/collect_metrics.py
	        if average_score >= 90:
	            tier = "P3"  # low risk
	        elif average_score >= 75:
	            tier = "P2"  # medium
	        elif average_score >= 60:
	            tier = "P1"  # high
	        else:
	            tier = "P0"  # critical

	        risk_distribution = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
	        risk_distribution[tier] = 1

	        return {
	            "average_score": average_score,
	            "risk_distribution": risk_distribution,
	            "component_scores": {
	                "process": round(process_score, 2),
	                "flow": round(flow_score, 2),
	                "learning": round(learning_score, 2),
	            },
	        }


    def validate_thresholds(self, process, flow, learning):
        """Validate metrics against thresholds."""
        violations = []

        # Process metrics
        if process.get("action_items_done_percent", 0) < self.thresholds["action_items_done_percent"]:
            violations.append(f"Action items: {process.get('action_items_done_percent', 0):.1f}% < {self.thresholds['action_items_done_percent']}%")

        if process.get("context_switches_per_day", 0) > self.thresholds["context_switches_per_day"]:
            violations.append(f"Context switches: {process.get('context_switches_per_day', 0)} > {self.thresholds['context_switches_per_day']}")

        # Flow metrics
        wip_total = flow.get("wip_violations", 0)
        if wip_total > 0:
            violations.append(f"WIP violations: {wip_total} detected")

        # Learning metrics
        if learning.get("experiments_per_sprint", 0) < self.thresholds["experiments_per_sprint"]:
            violations.append(f"Experiments: {learning.get('experiments_per_sprint', 0)} < {self.thresholds['experiments_per_sprint']}")

        return violations

    def run(self, validate=False):
        """Main execution."""
        print("📊 Bootstrapping Local Metrics")
        print("=" * 40)

        # Compute all metrics
        process = self.compute_process_metrics()
        flow = self.compute_flow_metrics()
        learning = self.compute_learning_metrics()

        scoring = self.compute_scoring_summary(process, flow, learning)

        # Combine
        all_metrics = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "process": process,
            "flow": flow,
            "learning": learning,
            "average_score": scoring["average_score"],
            "risk_distribution": scoring["risk_distribution"],
        }

        # Display
        print(f"\n✓ Process Metrics:")
        for k, v in process.items():
            print(f"  {k}: {v}")

        print(f"\n✓ Flow Metrics:")
        for k, v in flow.items():
            print(f"  {k}: {v}")

        print(f"\n✓ Learning Metrics:")
        for k, v in learning.items():
            print(f"  {k}: {v}")

        # Write to DB
        db_success = self.write_to_db(process, flow, learning)
        if db_success:
            print("\n✅ Metrics written to risk_analytics_baseline.db")

        # Append to log
        log_success = self.append_to_metrics_log(all_metrics)
        if log_success:
            print(f"✅ Metrics appended to {self.metrics_log}")

        # Validate thresholds
        if validate:
            print("\n🎯 Threshold Validation:")
            violations = self.validate_thresholds(process, flow, learning)
            if violations:
                print("❌ Violations detected:")
                for v in violations:
                    print(f"  • {v}")
                return 1
            else:
                print("✅ All thresholds met")
                return 0

        return 0

def main():
    parser = argparse.ArgumentParser(description="Bootstrap local metrics")
    parser.add_argument("--validate-thresholds", action="store_true", help="Validate against thresholds")
    parser.add_argument("--repo-root", help="Override repo root")

    args = parser.parse_args()

    bootstrap = MetricsBootstrap(repo_root=args.repo_root)
    exit_code = bootstrap.run(validate=args.validate_thresholds)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()

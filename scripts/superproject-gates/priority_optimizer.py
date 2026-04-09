#!/usr/bin/env python3
"""
Priority Optimizer System
Dynamic priority calculation, ranking, and scheduling optimization
"""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from heapq import nlargest

from .wsjf_calculator import WSJFCalculator, WSJFInputs, WSJFResult
from .temporal_budget_tracker import TemporalBudgetTracker, BudgetAllocation

class PriorityStrategy(Enum):
    """Priority calculation strategies"""
    WSJF_ONLY = "wsjf_only"
    BUDGET_AWARE = "budget_aware"
    TIME_CRITICAL = "time_critical"
    CIRCLE_BALANCED = "circle_balanced"
    RISK_WEIGHTED = "risk_weighted"

class SchedulingConstraint(Enum):
    """Scheduling constraint types"""
    DEADLINE = "deadline"
    DEPENDENCY = "dependency"
    RESOURCE_AVAILABILITY = "resource_availability"
    BUDGET_LIMIT = "budget_limit"

@dataclass
class Job:
    """Represents a job/task for prioritization"""
    job_id: str
    title: str
    description: Optional[str] = None
    circle: Optional[str] = None
    estimated_effort: float = 1.0  # in story points or hours
    deadline: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    wsjf_inputs: Optional[WSJFInputs] = None
    priority_score: float = 0.0
    rank: int = 0
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    status: str = "pending"

@dataclass
class PriorityRanking:
    """Priority ranking result"""
    job_id: str
    priority_score: float
    rank: int
    strategy: str
    factors: Dict[str, float]
    timestamp: str

@dataclass
class ScheduleOptimization:
    """Schedule optimization result"""
    jobs: List[Job]
    total_effort: float
    time_window_days: int
    resource_utilization: float
    constraint_violations: List[str]
    optimization_score: float

class PriorityOptimizer:
    """Priority optimization and scheduling system"""

    def __init__(self, wsjf_config_path: Optional[str] = None,
                 budget_data_dir: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.wsjf_calculator = WSJFCalculator(wsjf_config_path)
        self.budget_tracker = TemporalBudgetTracker(data_dir=budget_data_dir)
        self.jobs: Dict[str, Job] = {}
        self.rankings: List[PriorityRanking] = []

    def add_job(self, job: Job):
        """Add a job to the optimization system"""
        if job.wsjf_inputs and not job.wsjf_inputs.job_id:
            job.wsjf_inputs.job_id = job.job_id

        self.jobs[job.job_id] = job
        self.logger.info(f"Added job: {job.job_id}")

    def calculate_priorities(self, strategy: PriorityStrategy = PriorityStrategy.WSJF_ONLY,
                           circle_weights: Optional[Dict[str, float]] = None) -> List[PriorityRanking]:
        """Calculate priorities for all jobs using specified strategy"""
        rankings = []

        for job in self.jobs.values():
            if job.status != "pending":
                continue

            priority_score = self._calculate_job_priority(job, strategy, circle_weights)
            job.priority_score = priority_score

            ranking = PriorityRanking(
                job_id=job.job_id,
                priority_score=priority_score,
                rank=0,  # Will be set after sorting
                strategy=strategy.value,
                factors=self._get_priority_factors(job, strategy),
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            rankings.append(ranking)

        # Sort by priority score (higher is better)
        rankings.sort(key=lambda x: x.priority_score, reverse=True)

        # Assign ranks
        for i, ranking in enumerate(rankings, 1):
            ranking.rank = i
            # Update job rank
            if ranking.job_id in self.jobs:
                self.jobs[ranking.job_id].rank = i

        self.rankings.extend(rankings)
        self.logger.info(f"Calculated priorities for {len(rankings)} jobs using {strategy.value}")
        return rankings

    def _calculate_job_priority(self, job: Job, strategy: PriorityStrategy,
                              circle_weights: Optional[Dict[str, float]]) -> float:
        """Calculate priority score for a single job"""
        base_score = 0.0

        if strategy == PriorityStrategy.WSJF_ONLY:
            base_score = self._calculate_wsjf_priority(job)
        elif strategy == PriorityStrategy.BUDGET_AWARE:
            base_score = self._calculate_budget_aware_priority(job)
        elif strategy == PriorityStrategy.TIME_CRITICAL:
            base_score = self._calculate_time_critical_priority(job)
        elif strategy == PriorityStrategy.CIRCLE_BALANCED:
            base_score = self._calculate_circle_balanced_priority(job, circle_weights)
        elif strategy == PriorityStrategy.RISK_WEIGHTED:
            base_score = self._calculate_risk_weighted_priority(job)

        # Apply deadline pressure
        deadline_multiplier = self._calculate_deadline_multiplier(job)
        final_score = base_score * deadline_multiplier

        return final_score

    def _calculate_wsjf_priority(self, job: Job) -> float:
        """Calculate priority based on WSJF score"""
        if not job.wsjf_inputs:
            return 0.0

        try:
            wsjf_result = self.wsjf_calculator.calculate_wsjf(job.wsjf_inputs)
            return wsjf_result.normalized_score
        except Exception as e:
            self.logger.warning(f"Failed to calculate WSJF for job {job.job_id}: {e}")
            return 0.0

    def _calculate_budget_aware_priority(self, job: Job) -> float:
        """Calculate priority considering budget constraints"""
        wsjf_score = self._calculate_wsjf_priority(job)

        # Check budget utilization for the job's circle
        if job.circle:
            active_budgets = self.budget_tracker.get_active_budgets(job.circle)
            if active_budgets:
                # Reduce priority if budget is heavily utilized
                total_utilization = sum(
                    budget.used_amount / budget.allocated_amount
                    for budget in active_budgets
                    if budget.allocated_amount > 0
                ) / len(active_budgets)

                # Apply budget pressure (reduce priority when budget is tight)
                budget_multiplier = max(0.1, 1.0 - (total_utilization - 0.8) * 2)
                wsjf_score *= budget_multiplier

        return wsjf_score

    def _calculate_time_critical_priority(self, job: Job) -> float:
        """Calculate priority based on time criticality"""
        if not job.deadline:
            return self._calculate_wsjf_priority(job)

        try:
            deadline = datetime.fromisoformat(job.deadline.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            time_to_deadline = (deadline - now).total_seconds() / 3600  # hours

            if time_to_deadline <= 0:
                # Overdue - maximum priority
                return float('inf')
            elif time_to_deadline < 24:
                # Due within 24 hours - very high priority
                return self._calculate_wsjf_priority(job) * 10
            elif time_to_deadline < 168:  # 1 week
                # Due within a week - high priority
                return self._calculate_wsjf_priority(job) * 3
            else:
                # Normal priority
                return self._calculate_wsjf_priority(job)
        except Exception as e:
            self.logger.warning(f"Failed to parse deadline for job {job.job_id}: {e}")
            return self._calculate_wsjf_priority(job)

    def _calculate_circle_balanced_priority(self, job: Job,
                                          circle_weights: Optional[Dict[str, float]]) -> float:
        """Calculate priority with circle balancing"""
        wsjf_score = self._calculate_wsjf_priority(job)

        if not circle_weights or not job.circle:
            return wsjf_score

        # Apply circle-specific weighting
        circle_weight = circle_weights.get(job.circle, 1.0)
        return wsjf_score * circle_weight

    def _calculate_risk_weighted_priority(self, job: Job) -> float:
        """Calculate priority with risk weighting"""
        if not job.wsjf_inputs:
            return 0.0

        wsjf_result = self.wsjf_calculator.calculate_wsjf(job.wsjf_inputs)

        # Extract risk reduction component
        rr_component = wsjf_result.components.get("risk_reduction", 0)

        # Boost priority for high-risk-reduction jobs
        risk_multiplier = 1.0 + (rr_component / 10.0)  # Up to 2x boost

        return wsjf_result.normalized_score * risk_multiplier

    def _calculate_deadline_multiplier(self, job: Job) -> float:
        """Calculate deadline pressure multiplier"""
        if not job.deadline:
            return 1.0

        try:
            deadline = datetime.fromisoformat(job.deadline.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            time_to_deadline = (deadline - now).total_seconds() / 86400  # days

            if time_to_deadline <= 0:
                return 10.0  # Overdue
            elif time_to_deadline <= 1:
                return 5.0   # Due tomorrow
            elif time_to_deadline <= 3:
                return 2.0   # Due within 3 days
            elif time_to_deadline <= 7:
                return 1.5   # Due within a week
            else:
                return 1.0   # Normal
        except Exception:
            return 1.0

    def _get_priority_factors(self, job: Job, strategy: PriorityStrategy) -> Dict[str, float]:
        """Get the factors that contributed to the priority score"""
        factors = {}

        if job.wsjf_inputs:
            try:
                wsjf_result = self.wsjf_calculator.calculate_wsjf(job.wsjf_inputs)
                factors.update({
                    "wsjf_score": wsjf_result.wsjf_score,
                    "cost_of_delay": wsjf_result.cost_of_delay,
                    "user_business_value": wsjf_result.components.get("user_business_value", 0),
                    "time_criticality": wsjf_result.components.get("time_criticality", 0),
                    "risk_reduction": wsjf_result.components.get("risk_reduction", 0),
                    "job_size": wsjf_result.components.get("job_size", 1),
                })
            except Exception:
                pass

        factors["deadline_multiplier"] = self._calculate_deadline_multiplier(job)

        if strategy == PriorityStrategy.BUDGET_AWARE and job.circle:
            active_budgets = self.budget_tracker.get_active_budgets(job.circle)
            if active_budgets:
                avg_utilization = sum(
                    budget.used_amount / budget.allocated_amount
                    for budget in active_budgets
                    if budget.allocated_amount > 0
                ) / len(active_budgets)
                factors["budget_utilization"] = avg_utilization

        return factors

    def optimize_schedule(self, available_effort: float, time_window_days: int = 14,
                         constraints: Optional[List[SchedulingConstraint]] = None) -> ScheduleOptimization:
        """Optimize job scheduling within constraints"""
        if not constraints:
            constraints = []

        # Get prioritized jobs
        rankings = self.calculate_priorities()
        prioritized_jobs = [self.jobs[r.job_id] for r in rankings]

        scheduled_jobs = []
        total_effort_used = 0.0
        current_time = datetime.now(timezone.utc)
        constraint_violations = []

        for job in prioritized_jobs:
            if total_effort_used + job.estimated_effort > available_effort:
                constraint_violations.append(f"Insufficient effort for job {job.job_id}")
                continue

            # Check dependencies
            if not self._check_dependencies(job):
                constraint_violations.append(f"Unmet dependencies for job {job.job_id}")
                continue

            # Check deadline constraints
            if job.deadline:
                try:
                    deadline = datetime.fromisoformat(job.deadline.replace('Z', '+00:00'))
                    scheduled_end = current_time + timedelta(hours=job.estimated_effort * 8)  # Assume 8h/day
                    if scheduled_end > deadline:
                        constraint_violations.append(f"Deadline violation for job {job.job_id}")
                        continue
                except Exception:
                    pass

            # Schedule the job
            job.scheduled_start = current_time.isoformat()
            job.scheduled_end = (current_time + timedelta(hours=job.estimated_effort * 8)).isoformat()
            job.status = "scheduled"
            scheduled_jobs.append(job)

            total_effort_used += job.estimated_effort
            current_time = datetime.fromisoformat(job.scheduled_end.replace('Z', '+00:00'))

        # Calculate optimization metrics
        resource_utilization = total_effort_used / available_effort if available_effort > 0 else 0
        optimization_score = len(scheduled_jobs) / len(prioritized_jobs) if prioritized_jobs else 0

        result = ScheduleOptimization(
            jobs=scheduled_jobs,
            total_effort=total_effort_used,
            time_window_days=time_window_days,
            resource_utilization=resource_utilization,
            constraint_violations=constraint_violations,
            optimization_score=optimization_score
        )

        self.logger.info(f"Optimized schedule: {len(scheduled_jobs)} jobs scheduled, "
                        f"{len(constraint_violations)} violations")
        return result

    def _check_dependencies(self, job: Job) -> bool:
        """Check if job dependencies are satisfied"""
        for dep_id in job.dependencies:
            dep_job = self.jobs.get(dep_id)
            if not dep_job or dep_job.status not in ["completed", "scheduled"]:
                return False
        return True

    def get_top_priority_jobs(self, count: int = 10) -> List[Job]:
        """Get top priority jobs"""
        rankings = sorted(self.rankings, key=lambda x: x.priority_score, reverse=True)
        top_job_ids = [r.job_id for r in rankings[:count]]
        return [self.jobs[job_id] for job_id in top_job_ids if job_id in self.jobs]

    def get_circle_distribution(self) -> Dict[str, int]:
        """Get priority distribution by circle"""
        distribution = {}
        for ranking in self.rankings:
            job = self.jobs.get(ranking.job_id)
            if job and job.circle:
                distribution[job.circle] = distribution.get(job.circle, 0) + 1
        return distribution

    def export_priorities(self, format: str = "json") -> str:
        """Export priority rankings"""
        if format == "json":
            return json.dumps([asdict(r) for r in self.rankings], indent=2, default=str)
        elif format == "csv":
            lines = ["job_id,priority_score,rank,strategy,timestamp"]
            for r in self.rankings:
                lines.append(f"{r.job_id},{r.priority_score},{r.rank},{r.strategy},{r.timestamp}")
            return "\n".join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")

def main():
    """CLI interface for priority optimizer"""
    import argparse

    parser = argparse.ArgumentParser(description="Priority Optimizer")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Calculate priorities
    calc_parser = subparsers.add_parser("calculate", help="Calculate job priorities")
    calc_parser.add_argument("--strategy", default="wsjf_only",
                           choices=["wsjf_only", "budget_aware", "time_critical", "circle_balanced", "risk_weighted"])
    calc_parser.add_argument("--circle-weights", help="Circle weights as JSON string")
    calc_parser.add_argument("--top", type=int, default=10, help="Show top N jobs")

    # Optimize schedule
    schedule_parser = subparsers.add_parser("schedule", help="Optimize job scheduling")
    schedule_parser.add_argument("--effort", type=float, required=True, help="Available effort (hours)")
    schedule_parser.add_argument("--days", type=int, default=14, help="Time window in days")

    # Export
    export_parser = subparsers.add_parser("export", help="Export priorities")
    export_parser.add_argument("--format", default="json", choices=["json", "csv"])
    export_parser.add_argument("--output", help="Output file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    optimizer = PriorityOptimizer()

    # Load jobs from some source (for demo, create sample jobs)
    sample_jobs = [
        Job(
            job_id="job1",
            title="Implement user authentication",
            circle="security",
            estimated_effort=5.0,
            deadline=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            wsjf_inputs=WSJFInputs(
                user_business_value=8.0,
                time_criticality=6.0,
                risk_reduction=7.0,
                job_size=5.0,
                job_id="job1"
            )
        ),
        Job(
            job_id="job2",
            title="Optimize database queries",
            circle="performance",
            estimated_effort=3.0,
            wsjf_inputs=WSJFInputs(
                user_business_value=6.0,
                time_criticality=4.0,
                risk_reduction=8.0,
                job_size=3.0,
                job_id="job2"
            )
        )
    ]

    for job in sample_jobs:
        optimizer.add_job(job)

    try:
        if args.command == "calculate":
            strategy = PriorityStrategy(args.strategy)
            circle_weights = json.loads(args.circle_weights) if args.circle_weights else None

            rankings = optimizer.calculate_priorities(strategy, circle_weights)
            top_jobs = optimizer.get_top_priority_jobs(args.top)

            print(f"Priority Rankings (Strategy: {strategy.value}):")
            for i, job in enumerate(top_jobs, 1):
                print(f"{i}. {job.job_id}: {job.title} (Score: {job.priority_score:.2f})")

        elif args.command == "schedule":
            schedule = optimizer.optimize_schedule(args.effort, args.days)

            print(f"Schedule Optimization Results:")
            print(f"Jobs Scheduled: {len(schedule.jobs)}")
            print(f"Total Effort: {schedule.total_effort:.1f} hours")
            print(f"Resource Utilization: {schedule.resource_utilization:.1%}")
            print(f"Optimization Score: {schedule.optimization_score:.2f}")

            if schedule.constraint_violations:
                print(f"\nConstraint Violations:")
                for violation in schedule.constraint_violations:
                    print(f"  - {violation}")

        elif args.command == "export":
            data = optimizer.export_priorities(args.format)
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(data)
                print(f"Exported to {args.output}")
            else:
                print(data)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
"""
Goalie - Goal-Oriented Execution Monitoring

Tracks all actions for goal-oriented execution monitoring.
Addresses Phase 5 requirement: Track all actions via goalie.

Key Functions:
- Goal tracking with WSJF prioritization
- Action audit trail with timestamps
- Progress measurement and gap detection
- Alignment monitoring for drift detection
"""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
from enum import Enum

class GoalStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    DEFERRED = "deferred"

@dataclass
class Action:
    id: str
    goal_id: str
    description: str
    timestamp: str
    actor: str
    status: str
    duration_ms: int = 0
    metadata: Dict = field(default_factory=dict)

@dataclass
class Goal:
    id: str
    name: str
    description: str
    wsjf_score: float
    status: GoalStatus
    created_at: str
    updated_at: str
    actions: List[Action] = field(default_factory=list)
    progress: float = 0.0
    blockers: List[str] = field(default_factory=list)

class GoalieTracker:
    """Goal-oriented execution monitoring system."""

    def __init__(self, data_dir: str = "goalie"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.goals: Dict[str, Goal] = {}
        self.load_state()

    def load_state(self) -> None:
        """Load persisted state from disk."""
        state_file = self.data_dir / "state.json"
        if state_file.exists():
            with open(state_file, "r") as f:
                data = json.load(f)
                for goal_data in data.get("goals", []):
                    goal = Goal(
                        id=goal_data["id"],
                        name=goal_data["name"],
                        description=goal_data["description"],
                        wsjf_score=goal_data["wsjf_score"],
                        status=GoalStatus(goal_data["status"]),
                        created_at=goal_data["created_at"],
                        updated_at=goal_data["updated_at"],
                        progress=goal_data.get("progress", 0.0),
                        blockers=goal_data.get("blockers", []),
                    )
                    self.goals[goal.id] = goal

    def save_state(self) -> None:
        """Persist state to disk."""
        state_file = self.data_dir / "state.json"
        data = {
            "goals": [
                {
                    "id": g.id,
                    "name": g.name,
                    "description": g.description,
                    "wsjf_score": g.wsjf_score,
                    "status": g.status.value,
                    "created_at": g.created_at,
                    "updated_at": g.updated_at,
                    "progress": g.progress,
                    "blockers": g.blockers,
                    "action_count": len(g.actions),
                }
                for g in self.goals.values()
            ],
            "updated_at": datetime.now().isoformat(),
        }
        with open(state_file, "w") as f:
            json.dump(data, f, indent=2)

    def create_goal(
        self,
        name: str,
        description: str,
        wsjf_score: float
    ) -> Goal:
        """Create a new goal with WSJF prioritization."""
        goal_id = f"goal_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.goals)}"
        now = datetime.now().isoformat()

        goal = Goal(
            id=goal_id,
            name=name,
            description=description,
            wsjf_score=wsjf_score,
            status=GoalStatus.PENDING,
            created_at=now,
            updated_at=now,
        )

        self.goals[goal_id] = goal
        self.save_state()
        return goal

    def log_action(
        self,
        goal_id: str,
        description: str,
        actor: str,
        status: str = "completed",
        duration_ms: int = 0,
        metadata: Optional[Dict] = None
    ) -> Action:
        """Log an action for a goal."""
        if goal_id not in self.goals:
            raise ValueError(f"Goal {goal_id} not found")

        goal = self.goals[goal_id]
        action_id = f"action_{len(goal.actions)}"

        action = Action(
            id=action_id,
            goal_id=goal_id,
            description=description,
            timestamp=datetime.now().isoformat(),
            actor=actor,
            status=status,
            duration_ms=duration_ms,
            metadata=metadata or {},
        )

        goal.actions.append(action)
        goal.updated_at = datetime.now().isoformat()

        # Auto-update status
        if goal.status == GoalStatus.PENDING:
            goal.status = GoalStatus.IN_PROGRESS

        self.save_state()
        return action

    def update_progress(self, goal_id: str, progress: float) -> None:
        """Update goal progress (0.0 to 1.0)."""
        if goal_id not in self.goals:
            return

        goal = self.goals[goal_id]
        goal.progress = min(1.0, max(0.0, progress))
        goal.updated_at = datetime.now().isoformat()

        if goal.progress >= 1.0:
            goal.status = GoalStatus.COMPLETED

        self.save_state()

    def add_blocker(self, goal_id: str, blocker: str) -> None:
        """Add a blocker to a goal."""
        if goal_id not in self.goals:
            return

        goal = self.goals[goal_id]
        goal.blockers.append(blocker)
        goal.status = GoalStatus.BLOCKED
        goal.updated_at = datetime.now().isoformat()
        self.save_state()

    def get_priority_queue(self) -> List[Goal]:
        """Get goals sorted by WSJF score (highest first)."""
        return sorted(
            self.goals.values(),
            key=lambda g: g.wsjf_score,
            reverse=True
        )

    def get_metrics(self) -> Dict:
        """Get goalie metrics for dashboard integration."""
        all_goals = list(self.goals.values())

        return {
            "total_goals": len(all_goals),
            "completed": len([g for g in all_goals if g.status == GoalStatus.COMPLETED]),
            "in_progress": len([g for g in all_goals if g.status == GoalStatus.IN_PROGRESS]),
            "blocked": len([g for g in all_goals if g.status == GoalStatus.BLOCKED]),
            "completion_rate": (
                len([g for g in all_goals if g.status == GoalStatus.COMPLETED]) / len(all_goals)
                if all_goals else 0
            ),
            "avg_wsjf": sum(g.wsjf_score for g in all_goals) / len(all_goals) if all_goals else 0,
            "total_actions": sum(len(g.actions) for g in all_goals),
        }

    def check_roam_staleness(self, roam_path: str = ".goalie/ROAM_TRACKER.yaml") -> List[Dict]:
        """P1-TIME: ROAMSTALENESSDETECTOR for >7 days old entries."""
        path = Path(roam_path)
        if not path.exists():
            return [{"type": "error", "message": f"ROAM tracker not found at {roam_path}"}]

        try:
            # We don't have yaml library easily available in Python env here,
            # so we'll use file modification time as a proxy for staleness,
            # and potentially parse it if needed.
            import os
            mtime = os.path.getmtime(path)
            age_days = (datetime.now().timestamp() - mtime) / (60 * 60 * 24)

            staleness_warnings = []
            if age_days > 7:
                staleness_warnings.append({
                    "id": "ROAM-STALE",
                    "type": "warning",
                    "message": f"ROAM tracker is {int(age_days)} days old (staleness threshold is 7 days)",
                    "age_days": age_days
                })

            return staleness_warnings
        except Exception as e:
            return [{"type": "error", "message": f"Failed to check ROAM staleness: {e}"}]

# Global tracker instance
tracker = GoalieTracker()

if __name__ == "__main__":
    print("=== Goalie Metrics ===")
    metrics = tracker.get_metrics()
    print(json.dumps(metrics, indent=2))

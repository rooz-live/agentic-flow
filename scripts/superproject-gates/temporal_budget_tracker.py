#!/usr/bin/env python3
"""
Temporal Budget Tracking System
Time-based budget allocation, monitoring, and forecasting
"""

import json
import logging
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

class BudgetType(Enum):
    """Types of temporal budgets"""
    TIME_WINDOW = "time_window"
    RESOURCE_HOURS = "resource_hours"
    EFFORT_POINTS = "effort_points"
    COST_DOLLARS = "cost_dollars"

class BudgetStatus(Enum):
    """Budget status states"""
    ACTIVE = "active"
    PAUSED = "paused"
    EXCEEDED = "exceeded"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class BudgetAllocation:
    """Budget allocation for a specific time period"""
    budget_id: str
    budget_type: BudgetType
    allocated_amount: float
    used_amount: float = 0.0
    start_time: str
    end_time: str
    circle: Optional[str] = None
    tags: Optional[List[str]] = None
    status: BudgetStatus = BudgetStatus.ACTIVE

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class BudgetTransaction:
    """Individual budget transaction"""
    transaction_id: str
    budget_id: str
    amount: float
    timestamp: str
    job_id: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class BudgetForecast:
    """Budget forecasting data"""
    budget_id: str
    current_usage: float
    projected_usage: float
    remaining_budget: float
    forecast_date: str
    confidence: float
    risk_level: str  # "low", "medium", "high", "critical"

class TemporalBudgetTracker:
    """Temporal budget tracking and monitoring system"""

    def __init__(self, config_path: Optional[str] = None, data_dir: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.data_dir = Path(data_dir) if data_dir else self._get_default_data_dir()
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # In-memory storage (in production, this would be a database)
        self.budgets: Dict[str, BudgetAllocation] = {}
        self.transactions: List[BudgetTransaction] = []

        self._load_persistent_data()

    def _get_default_data_dir(self) -> Path:
        """Get default data directory"""
        project_root = os.environ.get("PROJECT_ROOT", ".")
        return Path(project_root) / ".goalie" / "budget_data"

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load budget configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            project_root = os.environ.get("PROJECT_ROOT", ".")
            config_file = Path(project_root) / ".goalie" / "wsjf_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    return config.get("budget", self._get_default_budget_config())
            except json.JSONDecodeError:
                self.logger.warning("Invalid config, using defaults")

        return self._get_default_budget_config()

    def _get_default_budget_config(self) -> Dict[str, Any]:
        """Get default budget configuration"""
        return {
            "time_windows": {
                "daily": 8,  # hours
                "weekly": 40,
                "monthly": 160,
                "quarterly": 480
            },
            "alert_thresholds": {
                "warning": 0.8,  # 80% utilization
                "critical": 0.95  # 95% utilization
            },
            "forecast_horizon": 30,  # days
            "auto_save": True,
            "max_history_days": 90
        }

    def _load_persistent_data(self):
        """Load persistent budget data"""
        budgets_file = self.data_dir / "budgets.json"
        transactions_file = self.data_dir / "transactions.json"

        if budgets_file.exists():
            try:
                with open(budgets_file, 'r') as f:
                    budgets_data = json.load(f)
                    for budget_data in budgets_data:
                        budget = BudgetAllocation(**budget_data)
                        budget.status = BudgetStatus(budget.status) if isinstance(budget.status, str) else budget.status
                        self.budgets[budget.budget_id] = budget
            except Exception as e:
                self.logger.error(f"Failed to load budgets: {e}")

        if transactions_file.exists():
            try:
                with open(transactions_file, 'r') as f:
                    transactions_data = json.load(f)
                    self.transactions = [BudgetTransaction(**tx) for tx in transactions_data]
            except Exception as e:
                self.logger.error(f"Failed to load transactions: {e}")

    def _save_persistent_data(self):
        """Save budget data persistently"""
        if not self.config.get("auto_save", True):
            return

        budgets_file = self.data_dir / "budgets.json"
        transactions_file = self.data_dir / "transactions.json"

        try:
            budgets_data = [asdict(budget) for budget in self.budgets.values()]
            with open(budgets_file, 'w') as f:
                json.dump(budgets_data, f, indent=2)

            transactions_data = [asdict(tx) for tx in self.transactions]
            with open(transactions_file, 'w') as f:
                json.dump(transactions_data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save budget data: {e}")

    def create_budget(self, budget_id: str, budget_type: BudgetType,
                     allocated_amount: float, start_time: datetime,
                     end_time: datetime, circle: Optional[str] = None,
                     tags: Optional[List[str]] = None) -> BudgetAllocation:
        """Create a new budget allocation"""
        if budget_id in self.budgets:
            raise ValueError(f"Budget {budget_id} already exists")

        budget = BudgetAllocation(
            budget_id=budget_id,
            budget_type=budget_type,
            allocated_amount=allocated_amount,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            circle=circle,
            tags=tags or []
        )

        self.budgets[budget_id] = budget
        self._save_persistent_data()
        self.logger.info(f"Created budget {budget_id}: {allocated_amount} {budget_type.value}")
        return budget

    def allocate_time_window_budget(self, circle: str, window_type: str,
                                  hours: float) -> BudgetAllocation:
        """Create a time window budget for a circle"""
        budget_id = f"{circle}_{window_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        if window_type == "daily":
            start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
        elif window_type == "weekly":
            start = datetime.now() - timedelta(days=datetime.now().weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif window_type == "monthly":
            start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)
        else:
            raise ValueError(f"Unknown window type: {window_type}")

        return self.create_budget(
            budget_id=budget_id,
            budget_type=BudgetType.TIME_WINDOW,
            allocated_amount=hours,
            start_time=start,
            end_time=end,
            circle=circle,
            tags=[window_type, "auto_generated"]
        )

    def record_transaction(self, budget_id: str, amount: float,
                          job_id: Optional[str] = None,
                          description: Optional[str] = None,
                          tags: Optional[List[str]] = None) -> BudgetTransaction:
        """Record a budget transaction"""
        if budget_id not in self.budgets:
            raise ValueError(f"Budget {budget_id} not found")

        budget = self.budgets[budget_id]

        # Check if budget is still active
        now = datetime.now(timezone.utc)
        end_time = datetime.fromisoformat(budget.end_time.replace('Z', '+00:00'))
        if now > end_time:
            budget.status = BudgetStatus.COMPLETED
            self.logger.warning(f"Budget {budget_id} has expired")

        transaction = BudgetTransaction(
            transaction_id=f"tx_{budget_id}_{int(now.timestamp())}",
            budget_id=budget_id,
            amount=amount,
            timestamp=now.isoformat(),
            job_id=job_id,
            description=description,
            tags=tags or []
        )

        self.transactions.append(transaction)
        budget.used_amount += amount

        # Update budget status
        if budget.used_amount >= budget.allocated_amount:
            budget.status = BudgetStatus.EXCEEDED
            self.logger.warning(f"Budget {budget_id} exceeded: {budget.used_amount}/{budget.allocated_amount}")

        self._save_persistent_data()
        self.logger.info(f"Recorded transaction: {amount} for budget {budget_id}")
        return transaction

    def get_budget_status(self, budget_id: str) -> Optional[BudgetAllocation]:
        """Get current budget status"""
        return self.budgets.get(budget_id)

    def get_active_budgets(self, circle: Optional[str] = None) -> List[BudgetAllocation]:
        """Get all active budgets, optionally filtered by circle"""
        now = datetime.now(timezone.utc)
        active_budgets = []

        for budget in self.budgets.values():
            if budget.status not in [BudgetStatus.ACTIVE, BudgetStatus.PAUSED]:
                continue

            end_time = datetime.fromisoformat(budget.end_time.replace('Z', '+00:00'))
            if now <= end_time:
                if circle is None or budget.circle == circle:
                    active_budgets.append(budget)

        return active_budgets

    def get_budget_utilization(self, budget_id: str) -> Dict[str, Any]:
        """Get detailed budget utilization information"""
        budget = self.budgets.get(budget_id)
        if not budget:
            return {"error": "Budget not found"}

        utilization_rate = budget.used_amount / budget.allocated_amount if budget.allocated_amount > 0 else 0

        # Get recent transactions
        budget_transactions = [tx for tx in self.transactions if tx.budget_id == budget_id]
        recent_transactions = sorted(budget_transactions, key=lambda x: x.timestamp, reverse=True)[:10]

        # Calculate remaining time
        now = datetime.now(timezone.utc)
        end_time = datetime.fromisoformat(budget.end_time.replace('Z', '+00:00'))
        time_remaining = max(0, (end_time - now).total_seconds() / 3600)  # hours

        return {
            "budget_id": budget_id,
            "allocated": budget.allocated_amount,
            "used": budget.used_amount,
            "remaining": budget.allocated_amount - budget.used_amount,
            "utilization_rate": utilization_rate,
            "status": budget.status.value,
            "time_remaining_hours": time_remaining,
            "recent_transactions": [asdict(tx) for tx in recent_transactions],
            "alert_level": self._calculate_alert_level(utilization_rate)
        }

    def _calculate_alert_level(self, utilization_rate: float) -> str:
        """Calculate alert level based on utilization"""
        warning_threshold = self.config["alert_thresholds"]["warning"]
        critical_threshold = self.config["alert_thresholds"]["critical"]

        if utilization_rate >= critical_threshold:
            return "critical"
        elif utilization_rate >= warning_threshold:
            return "warning"
        else:
            return "normal"

    def forecast_budget_usage(self, budget_id: str, forecast_days: int = 30) -> BudgetForecast:
        """Forecast future budget usage"""
        budget = self.budgets.get(budget_id)
        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        # Simple forecasting based on recent usage patterns
        budget_transactions = [tx for tx in self.transactions if tx.budget_id == budget_id]
        if len(budget_transactions) < 3:
            # Not enough data for forecasting
            projected_usage = budget.used_amount
            confidence = 0.3
        else:
            # Calculate average daily usage from recent transactions
            sorted_txs = sorted(budget_transactions, key=lambda x: x.timestamp)
            total_usage = sum(tx.amount for tx in sorted_txs)
            days_span = (datetime.fromisoformat(sorted_txs[-1].timestamp.replace('Z', '+00:00')) -
                        datetime.fromisoformat(sorted_txs[0].timestamp.replace('Z', '+00:00'))).days

            if days_span > 0:
                daily_rate = total_usage / days_span
                projected_usage = budget.used_amount + (daily_rate * forecast_days)
                confidence = min(0.8, len(sorted_txs) / 10)  # Higher confidence with more data
            else:
                projected_usage = budget.used_amount
                confidence = 0.5

        remaining_budget = budget.allocated_amount - projected_usage

        # Determine risk level
        if remaining_budget < 0:
            risk_level = "critical"
        elif remaining_budget < budget.allocated_amount * 0.1:
            risk_level = "high"
        elif remaining_budget < budget.allocated_amount * 0.25:
            risk_level = "medium"
        else:
            risk_level = "low"

        forecast_date = (datetime.now(timezone.utc) + timedelta(days=forecast_days)).isoformat()

        return BudgetForecast(
            budget_id=budget_id,
            current_usage=budget.used_amount,
            projected_usage=projected_usage,
            remaining_budget=remaining_budget,
            forecast_date=forecast_date,
            confidence=confidence,
            risk_level=risk_level
        )

    def get_budget_alerts(self) -> List[Dict[str, Any]]:
        """Get all budget alerts"""
        alerts = []

        for budget in self.budgets.values():
            if budget.status == BudgetStatus.EXCEEDED:
                alerts.append({
                    "type": "exceeded",
                    "budget_id": budget.budget_id,
                    "message": f"Budget exceeded: {budget.used_amount}/{budget.allocated_amount}",
                    "severity": "critical"
                })
            else:
                utilization = self.get_budget_utilization(budget.budget_id)
                alert_level = utilization.get("alert_level", "normal")
                if alert_level != "normal":
                    alerts.append({
                        "type": "utilization",
                        "budget_id": budget.budget_id,
                        "message": f"High utilization: {utilization['utilization_rate']:.1%}",
                        "severity": alert_level
                    })

        return alerts

    def cleanup_expired_budgets(self, max_age_days: int = 90):
        """Clean up old completed/expired budgets"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=max_age_days)

        budgets_to_remove = []
        for budget_id, budget in self.budgets.items():
            end_time = datetime.fromisoformat(budget.end_time.replace('Z', '+00:00'))
            if end_time < cutoff_date and budget.status in [BudgetStatus.COMPLETED, BudgetStatus.CANCELLED]:
                budgets_to_remove.append(budget_id)

        for budget_id in budgets_to_remove:
            del self.budgets[budget_id]

        # Clean up old transactions
        self.transactions = [
            tx for tx in self.transactions
            if datetime.fromisoformat(tx.timestamp.replace('Z', '+00:00')) > cutoff_date
        ]

        self._save_persistent_data()
        self.logger.info(f"Cleaned up {len(budgets_to_remove)} expired budgets")

def main():
    """CLI interface for temporal budget tracker"""
    import argparse

    parser = argparse.ArgumentParser(description="Temporal Budget Tracker")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Create budget
    create_parser = subparsers.add_parser("create", help="Create a new budget")
    create_parser.add_argument("--budget-id", required=True, help="Budget ID")
    create_parser.add_argument("--type", required=True, choices=["time_window", "resource_hours", "effort_points", "cost_dollars"])
    create_parser.add_argument("--amount", type=float, required=True, help="Allocated amount")
    create_parser.add_argument("--start", required=True, help="Start time (ISO format)")
    create_parser.add_argument("--end", required=True, help="End time (ISO format)")
    create_parser.add_argument("--circle", help="Circle name")
    create_parser.add_argument("--tags", nargs="*", default=[], help="Tags")

    # Record transaction
    record_parser = subparsers.add_parser("record", help="Record a budget transaction")
    record_parser.add_argument("--budget-id", required=True, help="Budget ID")
    record_parser.add_argument("--amount", type=float, required=True, help="Transaction amount")
    record_parser.add_argument("--job-id", help="Job ID")
    record_parser.add_argument("--description", help="Transaction description")

    # Status
    status_parser = subparsers.add_parser("status", help="Get budget status")
    status_parser.add_argument("--budget-id", required=True, help="Budget ID")
    status_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Alerts
    alerts_parser = subparsers.add_parser("alerts", help="Get budget alerts")
    alerts_parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    tracker = TemporalBudgetTracker()

    try:
        if args.command == "create":
            budget_type = BudgetType(args.type)
            start_time = datetime.fromisoformat(args.start)
            end_time = datetime.fromisoformat(args.end)

            budget = tracker.create_budget(
                budget_id=args.budget_id,
                budget_type=budget_type,
                allocated_amount=args.amount,
                start_time=start_time,
                end_time=end_time,
                circle=args.circle,
                tags=args.tags
            )
            print(f"Created budget: {budget.budget_id}")

        elif args.command == "record":
            transaction = tracker.record_transaction(
                budget_id=args.budget_id,
                amount=args.amount,
                job_id=args.job_id,
                description=args.description
            )
            print(f"Recorded transaction: {transaction.transaction_id}")

        elif args.command == "status":
            status = tracker.get_budget_utilization(args.budget_id)
            if args.json:
                print(json.dumps(status, indent=2))
            else:
                print(f"Budget Status for {args.budget_id}:")
                print(f"  Allocated: {status['allocated']}")
                print(f"  Used: {status['used']}")
                print(f"  Remaining: {status['remaining']}")
                print(f"  Utilization: {status['utilization_rate']:.1%}")
                print(f"  Status: {status['status']}")
                print(f"  Alert Level: {status['alert_level']}")

        elif args.command == "alerts":
            alerts = tracker.get_budget_alerts()
            if args.json:
                print(json.dumps(alerts, indent=2))
            else:
                if alerts:
                    print("Budget Alerts:")
                    for alert in alerts:
                        print(f"  {alert['severity'].upper()}: {alert['message']}")
                else:
                    print("No budget alerts")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Budget Monitor System
Budget monitoring and alerting capabilities
"""

import json
import logging
import os
import smtplib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from enum import Enum

from .temporal_budget_tracker import TemporalBudgetTracker, BudgetStatus

class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertChannel(Enum):
    """Alert notification channels"""
    CONSOLE = "console"
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"

@dataclass
class BudgetAlert:
    """Budget alert definition"""
    alert_id: str
    budget_id: str
    condition: str  # e.g., "utilization > 0.8"
    severity: AlertSeverity
    message: str
    channels: List[AlertChannel] = field(default_factory=lambda: [AlertChannel.CONSOLE])
    enabled: bool = True
    last_triggered: Optional[str] = None
    cooldown_minutes: int = 60

@dataclass
class AlertNotification:
    """Alert notification record"""
    notification_id: str
    alert_id: str
    budget_id: str
    severity: str
    message: str
    channel: str
    timestamp: str
    status: str  # "sent", "failed"

class BudgetMonitor:
    """Budget monitoring and alerting system"""

    def __init__(self, budget_tracker: TemporalBudgetTracker,
                 config_path: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.budget_tracker = budget_tracker
        self.config = self._load_config(config_path)
        self.alerts: Dict[str, BudgetAlert] = {}
        self.notifications: List[AlertNotification] = []
        self._load_alerts()

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load monitor configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            project_root = os.environ.get("PROJECT_ROOT", ".")
            config_file = Path(project_root) / ".goalie" / "wsjf_config.json"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    full_config = json.load(f)
                    return full_config.get("monitor", self._get_default_monitor_config())
            except json.JSONDecodeError:
                self.logger.warning("Invalid config, using defaults")

        return self._get_default_monitor_config()

    def _get_default_monitor_config(self) -> Dict[str, Any]:
        """Get default monitor configuration"""
        return {
            "check_interval_minutes": 15,
            "email": {
                "smtp_server": "localhost",
                "smtp_port": 587,
                "sender": "budget-monitor@localhost",
                "recipients": []
            },
            "slack": {
                "webhook_url": "",
                "channel": "#budget-alerts"
            },
            "webhook": {
                "url": "",
                "headers": {}
            },
            "default_alerts": [
                {
                    "condition": "utilization > 0.8",
                    "severity": "warning",
                    "message": "Budget utilization above 80%",
                    "channels": ["console"]
                },
                {
                    "condition": "utilization > 0.95",
                    "severity": "critical",
                    "message": "Budget utilization above 95%",
                    "channels": ["console", "email"]
                },
                {
                    "condition": "status == 'exceeded'",
                    "severity": "critical",
                    "message": "Budget has been exceeded",
                    "channels": ["console", "email"]
                }
            ]
        }

    def _load_alerts(self):
        """Load saved alerts"""
        alerts_file = self._get_alerts_file()
        if alerts_file.exists():
            try:
                with open(alerts_file, 'r') as f:
                    alerts_data = json.load(f)
                    for alert_data in alerts_data:
                        alert = BudgetAlert(**alert_data)
                        alert.severity = AlertSeverity(alert.severity)
                        alert.channels = [AlertChannel(ch) for ch in alert.channels]
                        self.alerts[alert.alert_id] = alert
            except Exception as e:
                self.logger.error(f"Failed to load alerts: {e}")

        # Create default alerts if none exist
        if not self.alerts:
            self._create_default_alerts()

    def _create_default_alerts(self):
        """Create default budget alerts"""
        for i, alert_config in enumerate(self.config["default_alerts"]):
            alert = BudgetAlert(
                alert_id=f"default_alert_{i}",
                budget_id="*",  # Apply to all budgets
                condition=alert_config["condition"],
                severity=AlertSeverity(alert_config["severity"]),
                message=alert_config["message"],
                channels=[AlertChannel(ch) for ch in alert_config["channels"]]
            )
            self.alerts[alert.alert_id] = alert

        self._save_alerts()

    def _get_alerts_file(self) -> Path:
        """Get alerts storage file path"""
        return Path(self.budget_tracker.data_dir) / "alerts.json"

    def _save_alerts(self):
        """Save alerts to disk"""
        alerts_file = self._get_alerts_file()
        try:
            alerts_data = []
            for alert in self.alerts.values():
                alert_dict = {
                    "alert_id": alert.alert_id,
                    "budget_id": alert.budget_id,
                    "condition": alert.condition,
                    "severity": alert.severity.value,
                    "message": alert.message,
                    "channels": [ch.value for ch in alert.channels],
                    "enabled": alert.enabled,
                    "last_triggered": alert.last_triggered,
                    "cooldown_minutes": alert.cooldown_minutes
                }
                alerts_data.append(alert_dict)

            with open(alerts_file, 'w') as f:
                json.dump(alerts_data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save alerts: {e}")

    def add_alert(self, alert: BudgetAlert):
        """Add a new budget alert"""
        if alert.alert_id in self.alerts:
            raise ValueError(f"Alert {alert.alert_id} already exists")

        self.alerts[alert.alert_id] = alert
        self._save_alerts()
        self.logger.info(f"Added alert: {alert.alert_id}")

    def remove_alert(self, alert_id: str):
        """Remove a budget alert"""
        if alert_id in self.alerts:
            del self.alerts[alert_id]
            self._save_alerts()
            self.logger.info(f"Removed alert: {alert_id}")

    def check_alerts(self) -> List[AlertNotification]:
        """Check all budgets against alert conditions"""
        notifications = []

        # Get all budgets
        all_budgets = []
        for budget_id in self.budget_tracker.budgets.keys():
            budget_status = self.budget_tracker.get_budget_status(budget_id)
            if budget_status:
                all_budgets.append(budget_status)

        for budget in all_budgets:
            budget_alerts = self._get_alerts_for_budget(budget.budget_id)

            for alert in budget_alerts:
                if not alert.enabled:
                    continue

                # Check cooldown
                if self._is_alert_on_cooldown(alert):
                    continue

                # Evaluate condition
                if self._evaluate_condition(alert.condition, budget):
                    # Trigger alert
                    notification = self._trigger_alert(alert, budget)
                    if notification:
                        notifications.append(notification)

        return notifications

    def _get_alerts_for_budget(self, budget_id: str) -> List[BudgetAlert]:
        """Get alerts applicable to a specific budget"""
        applicable_alerts = []

        for alert in self.alerts.values():
            if alert.budget_id == "*" or alert.budget_id == budget_id:
                applicable_alerts.append(alert)

        return applicable_alerts

    def _is_alert_on_cooldown(self, alert: BudgetAlert) -> bool:
        """Check if alert is on cooldown"""
        if not alert.last_triggered:
            return False

        try:
            last_triggered = datetime.fromisoformat(alert.last_triggered.replace('Z', '+00:00'))
            cooldown_end = last_triggered + timedelta(minutes=alert.cooldown_minutes)
            return datetime.now(timezone.utc) < cooldown_end
        except Exception:
            return False

    def _evaluate_condition(self, condition: str, budget: Any) -> bool:
        """Evaluate alert condition against budget data"""
        try:
            # Get budget utilization data
            utilization_data = self.budget_tracker.get_budget_utilization(budget.budget_id)

            # Create evaluation context
            context = {
                "utilization": utilization_data.get("utilization_rate", 0),
                "used": utilization_data.get("used", 0),
                "allocated": utilization_data.get("allocated", 0),
                "remaining": utilization_data.get("remaining", 0),
                "status": budget.status.value if hasattr(budget, 'status') else "unknown",
                "time_remaining_hours": utilization_data.get("time_remaining_hours", 0)
            }

            # Simple condition evaluation (could be enhanced with a proper expression parser)
            return self._simple_condition_eval(condition, context)

        except Exception as e:
            self.logger.error(f"Failed to evaluate condition '{condition}': {e}")
            return False

    def _simple_condition_eval(self, condition: str, context: Dict[str, Any]) -> bool:
        """Simple condition evaluation"""
        try:
            # Replace variables in condition
            for key, value in context.items():
                if isinstance(value, str):
                    condition = condition.replace(key, f"'{value}'")
                else:
                    condition = condition.replace(key, str(value))

            # Evaluate the condition
            return bool(eval(condition))
        except Exception:
            return False

    def _trigger_alert(self, alert: BudgetAlert, budget: Any) -> Optional[AlertNotification]:
        """Trigger an alert and send notifications"""
        notification_id = f"notif_{alert.alert_id}_{budget.budget_id}_{int(datetime.now().timestamp())}"

        # Format message with budget info
        message = alert.message.format(
            budget_id=budget.budget_id,
            utilization=f"{self.budget_tracker.get_budget_utilization(budget.budget_id).get('utilization_rate', 0):.1%}"
        )

        notification = AlertNotification(
            notification_id=notification_id,
            alert_id=alert.alert_id,
            budget_id=budget.budget_id,
            severity=alert.severity.value,
            message=message,
            channel="",  # Will be set per channel
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="pending"
        )

        # Send to each channel
        success_count = 0
        for channel in alert.channels:
            try:
                notification.channel = channel.value
                if self._send_notification(notification, channel):
                    success_count += 1
                    notification.status = "sent"
                else:
                    notification.status = "failed"
            except Exception as e:
                self.logger.error(f"Failed to send {channel.value} notification: {e}")
                notification.status = "failed"

            # Store notification (create a copy for each channel)
            self.notifications.append(AlertNotification(**vars(notification)))

        # Update alert last triggered time
        if success_count > 0:
            alert.last_triggered = datetime.now(timezone.utc).isoformat()
            self._save_alerts()

        return notification if success_count > 0 else None

    def _send_notification(self, notification: AlertNotification, channel: AlertChannel) -> bool:
        """Send notification via specified channel"""
        try:
            if channel == AlertChannel.CONSOLE:
                self._send_console_notification(notification)
            elif channel == AlertChannel.EMAIL:
                self._send_email_notification(notification)
            elif channel == AlertChannel.SLACK:
                self._send_slack_notification(notification)
            elif channel == AlertChannel.WEBHOOK:
                self._send_webhook_notification(notification)
            else:
                self.logger.warning(f"Unknown channel: {channel}")
                return False

            return True
        except Exception as e:
            self.logger.error(f"Failed to send {channel.value} notification: {e}")
            return False

    def _send_console_notification(self, notification: AlertNotification):
        """Send notification to console"""
        severity_icon = {
            "info": "ℹ️",
            "warning": "⚠️",
            "critical": "🚨"
        }.get(notification.severity, "📢")

        print(f"{severity_icon} [{notification.severity.upper()}] {notification.message}")

    def _send_email_notification(self, notification: AlertNotification):
        """Send notification via email"""
        email_config = self.config.get("email", {})
        if not email_config.get("recipients"):
            return

        msg = MIMEMultipart()
        msg['From'] = email_config.get("sender", "budget-monitor@localhost")
        msg['To'] = ", ".join(email_config["recipients"])
        msg['Subject'] = f"Budget Alert: {notification.severity.upper()}"

        body = f"""
Budget Alert
Severity: {notification.severity.upper()}
Budget ID: {notification.budget_id}
Message: {notification.message}
Time: {notification.timestamp}
        """.strip()

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(email_config.get("smtp_server", "localhost"),
                            email_config.get("smtp_port", 587))
        server.send_message(msg)
        server.quit()

    def _send_slack_notification(self, notification: AlertNotification):
        """Send notification to Slack"""
        import requests

        slack_config = self.config.get("slack", {})
        webhook_url = slack_config.get("webhook_url")
        if not webhook_url:
            return

        payload = {
            "channel": slack_config.get("channel", "#budget-alerts"),
            "text": f"*{notification.severity.upper()}* Budget Alert\n{notification.message}",
            "username": "Budget Monitor"
        }

        requests.post(webhook_url, json=payload)

    def _send_webhook_notification(self, notification: AlertNotification):
        """Send notification via webhook"""
        import requests

        webhook_config = self.config.get("webhook", {})
        url = webhook_config.get("url")
        if not url:
            return

        headers = webhook_config.get("headers", {})
        payload = {
            "alert_id": notification.alert_id,
            "budget_id": notification.budget_id,
            "severity": notification.severity,
            "message": notification.message,
            "timestamp": notification.timestamp
        }

        requests.post(url, json=payload, headers=headers)

    def get_alert_history(self, budget_id: Optional[str] = None,
                         hours: int = 24) -> List[AlertNotification]:
        """Get alert notification history"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)

        history = []
        for notification in self.notifications:
            try:
                notif_time = datetime.fromisoformat(notification.timestamp.replace('Z', '+00:00'))
                if notif_time >= cutoff_time:
                    if budget_id is None or notification.budget_id == budget_id:
                        history.append(notification)
            except Exception:
                continue

        return sorted(history, key=lambda x: x.timestamp, reverse=True)

    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Get monitoring system summary"""
        active_alerts = [a for a in self.alerts.values() if a.enabled]
        recent_notifications = self.get_alert_history(hours=24)

        return {
            "total_alerts": len(self.alerts),
            "active_alerts": len(active_alerts),
            "recent_notifications": len(recent_notifications),
            "alerts_by_severity": {
                severity.value: len([a for a in active_alerts if a.severity == severity])
                for severity in AlertSeverity
            },
            "notifications_by_severity": {
                severity: len([n for n in recent_notifications if n.severity == severity])
                for severity in ["info", "warning", "critical"]
            }
        }

def main():
    """CLI interface for budget monitor"""
    import argparse

    parser = argparse.ArgumentParser(description="Budget Monitor")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Check alerts
    check_parser = subparsers.add_parser("check", help="Check budget alerts")

    # Add alert
    add_parser = subparsers.add_parser("add-alert", help="Add a new alert")
    add_parser.add_argument("--alert-id", required=True, help="Alert ID")
    add_parser.add_argument("--budget-id", default="*", help="Budget ID (* for all)")
    add_parser.add_argument("--condition", required=True, help="Alert condition")
    add_parser.add_argument("--severity", required=True, choices=["info", "warning", "critical"])
    add_parser.add_argument("--message", required=True, help="Alert message")
    add_parser.add_argument("--channels", nargs="*", default=["console"],
                           choices=["console", "email", "slack", "webhook"])

    # List alerts
    list_parser = subparsers.add_parser("list", help="List alerts")

    # History
    history_parser = subparsers.add_parser("history", help="Show alert history")
    history_parser.add_argument("--budget-id", help="Filter by budget ID")
    history_parser.add_argument("--hours", type=int, default=24, help="Hours to look back")

    # Summary
    summary_parser = subparsers.add_parser("summary", help="Show monitoring summary")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Initialize components
    budget_tracker = TemporalBudgetTracker()
    monitor = BudgetMonitor(budget_tracker)

    try:
        if args.command == "check":
            notifications = monitor.check_alerts()
            if notifications:
                print(f"Triggered {len(notifications)} alerts")
                for notif in notifications:
                    print(f"  {notif.severity.upper()}: {notif.message}")
            else:
                print("No alerts triggered")

        elif args.command == "add-alert":
            alert = BudgetAlert(
                alert_id=args.alert_id,
                budget_id=args.budget_id,
                condition=args.condition,
                severity=AlertSeverity(args.severity),
                message=args.message,
                channels=[AlertChannel(ch) for ch in args.channels]
            )
            monitor.add_alert(alert)
            print(f"Added alert: {alert.alert_id}")

        elif args.command == "list":
            if monitor.alerts:
                print("Configured Alerts:")
                for alert in monitor.alerts.values():
                    status = "enabled" if alert.enabled else "disabled"
                    print(f"  {alert.alert_id}: {alert.condition} ({alert.severity.value}) - {status}")
            else:
                print("No alerts configured")

        elif args.command == "history":
            history = monitor.get_alert_history(args.budget_id, args.hours)
            if history:
                print(f"Alert History (last {args.hours} hours):")
                for notif in history:
                    print(f"  {notif.timestamp}: [{notif.severity.upper()}] {notif.message}")
            else:
                print("No alert history found")

        elif args.command == "summary":
            summary = monitor.get_monitoring_summary()
            print("Budget Monitoring Summary:")
            print(f"  Total Alerts: {summary['total_alerts']}")
            print(f"  Active Alerts: {summary['active_alerts']}")
            print(f"  Recent Notifications: {summary['recent_notifications']}")
            print("  Alerts by Severity:")
            for severity, count in summary['alerts_by_severity'].items():
                print(f"    {severity}: {count}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
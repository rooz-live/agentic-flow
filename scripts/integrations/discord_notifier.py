#!/usr/bin/env python3
"""
Discord Webhook Notifier for Advocate CLI
Sends trial updates, classification notifications, and evidence status
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

class DiscordNotifier:
    """Send formatted notifications to Discord webhook"""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_WEBHOOK_URL")
        
        if not self.webhook_url:
            raise ValueError("DISCORD_WEBHOOK_URL not set")
    
    def send_classification_notification(self, result: Dict[str, Any]) -> bool:
        """Notify when PDF is classified"""
        
        embed = {
            "title": "📄 PDF Classified",
            "color": self._get_color_for_confidence(result.get("confidence", 0.0)),
            "fields": [
                {"name": "Document Type", "value": result.get("type", "unknown").upper(), "inline": True},
                {"name": "Confidence", "value": f"{result.get('confidence', 0.0):.1%}", "inline": True},
                {"name": "Provider", "value": result.get("provider", "unknown").upper(), "inline": True},
                {"name": "Case Number", "value": result.get("case_number") or "N/A", "inline": False},
                {"name": "Reasoning", "value": result.get("reasoning", "No reasoning provided"), "inline": False}
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return self._send_embed(embed)
    
    def send_trial_countdown(self, trials: list) -> bool:
        """Send trial countdown notification"""
        
        fields = []
        for trial in trials:
            days_remaining = trial.get("days_remaining", "?")
            trial_name = trial.get("name", "Unknown Trial")
            trial_date = trial.get("date", "TBD")
            
            urgency = "🚨" if days_remaining < 7 else "⏰"
            fields.append({
                "name": f"{urgency} {trial_name}",
                "value": f"**{trial_date}** ({days_remaining} days)",
                "inline": False
            })
        
        embed = {
            "title": "⚖️ Trial Countdown Update",
            "description": "Upcoming trials require attention",
            "color": 0xFF0000 if any(t.get("days_remaining", 999) < 7 for t in trials) else 0xFFAA00,
            "fields": fields,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return self._send_embed(embed)
    
    def send_evidence_bundle_status(self, status: Dict[str, Any]) -> bool:
        """Send evidence bundle completion status"""
        
        total = status.get("total_exhibits", 0)
        complete = status.get("complete_exhibits", 0)
        percent = (complete / total * 100) if total > 0 else 0
        
        embed = {
            "title": "📁 Evidence Bundle Status",
            "color": 0x00FF00 if percent == 100 else 0xFFAA00,
            "fields": [
                {"name": "Completion", "value": f"{complete}/{total} exhibits ({percent:.0f}%)", "inline": True},
                {"name": "Status", "value": "✅ Complete" if percent == 100 else "⚠️ In Progress", "inline": True}
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add missing exhibits if incomplete
        if percent < 100:
            missing = status.get("missing_exhibits", [])
            if missing:
                embed["fields"].append({
                    "name": "Missing",
                    "value": "\n".join(f"- {item}" for item in missing[:5]),  # Limit to 5
                    "inline": False
                })
        
        return self._send_embed(embed)
    
    def send_api_cost_alert(self, cost: float, threshold: float = 10.0) -> bool:
        """Alert when API costs exceed threshold"""
        
        if cost < threshold:
            return True  # No alert needed
        
        embed = {
            "title": "💰 API Cost Alert",
            "description": f"Monthly API costs have exceeded ${threshold:.2f}",
            "color": 0xFF0000,
            "fields": [
                {"name": "Current Cost", "value": f"${cost:.2f}", "inline": True},
                {"name": "Threshold", "value": f"${threshold:.2f}", "inline": True}
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return self._send_embed(embed)
    
    def send_custom_message(self, message: str, title: str = "Advocate Notification") -> bool:
        """Send custom text message"""
        
        embed = {
            "title": title,
            "description": message,
            "color": 0x5865F2,  # Discord blurple
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return self._send_embed(embed)
    
    def _send_embed(self, embed: Dict[str, Any]) -> bool:
        """Send embed to Discord webhook"""
        
        payload = {"embeds": [embed]}
        
        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Discord webhook failed: {e}", file=sys.stderr)
            return False
    
    def _get_color_for_confidence(self, confidence: float) -> int:
        """Map confidence to Discord color"""
        if confidence >= 0.8:
            return 0x00FF00  # Green
        elif confidence >= 0.5:
            return 0xFFAA00  # Orange
        else:
            return 0xFF0000  # Red


def main():
    """CLI for Discord notifier"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Discord webhook notifier for Advocate")
    parser.add_argument("--type", required=True, choices=["classification", "trial", "evidence", "cost", "custom"],
                        help="Notification type")
    parser.add_argument("--data", help="JSON data for notification")
    parser.add_argument("--message", help="Custom message (for --type custom)")
    
    args = parser.parse_args()
    
    notifier = DiscordNotifier()
    
    if args.type == "classification":
        data = json.loads(args.data)
        success = notifier.send_classification_notification(data)
    elif args.type == "trial":
        data = json.loads(args.data)
        success = notifier.send_trial_countdown(data)
    elif args.type == "evidence":
        data = json.loads(args.data)
        success = notifier.send_evidence_bundle_status(data)
    elif args.type == "cost":
        data = json.loads(args.data)
        success = notifier.send_api_cost_alert(data["cost"], data.get("threshold", 10.0))
    elif args.type == "custom":
        success = notifier.send_custom_message(args.message or "Test notification")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

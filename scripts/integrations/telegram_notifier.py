#!/usr/bin/env python3
"""
Telegram Bot Notifier for Advocate CLI
Sends trial updates, classification notifications, and evidence status

TDD Coverage:
- test_send_classification_notification()
- test_send_trial_countdown()
- test_send_evidence_bundle_status()
- test_message_formatting()
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional

class TelegramNotifier:
    """Send formatted notifications to Telegram bot"""
    
    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID")
        
        if not self.bot_token or not self.chat_id:
            raise ValueError("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set")
        
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
    
    def send_classification_notification(self, result: Dict[str, Any]) -> bool:
        """Notify when PDF is classified"""
        
        doc_type = result.get("type", "unknown").upper()
        confidence = result.get("confidence", 0.0)
        provider = result.get("provider", "unknown").upper()
        case_num = result.get("case_number", "N/A")
        reasoning = result.get("reasoning", "No reasoning provided")
        
        emoji = self._get_emoji_for_confidence(confidence)
        
        message = f"""📄 *PDF Classified*

{emoji} *Type*: {doc_type}
✓ *Confidence*: {confidence:.1%}
🤖 *Provider*: {provider}
🏛️ *Case*: {case_num}

💡 *Reasoning*: {reasoning}
"""
        
        return self._send_message(message, parse_mode="Markdown")
    
    def send_trial_countdown(self, trials: list) -> bool:
        """Send trial countdown notification"""
        
        lines = ["⚖️ *Trial Countdown Update*\n"]
        
        for trial in trials:
            days = trial.get("days_remaining", "?")
            name = trial.get("name", "Unknown Trial")
            date = trial.get("date", "TBD")
            
            urgency = "🚨" if isinstance(days, int) and days < 7 else "⏰"
            lines.append(f"{urgency} *{name}*")
            lines.append(f"   📅 {date} ({days} days)\n")
        
        message = "\n".join(lines)
        
        return self._send_message(message, parse_mode="Markdown")
    
    def send_evidence_bundle_status(self, status: Dict[str, Any]) -> bool:
        """Send evidence bundle completion status"""
        
        total = status.get("total_exhibits", 0)
        complete = status.get("complete_exhibits", 0)
        percent = (complete / total * 100) if total > 0 else 0
        
        status_emoji = "✅" if percent == 100 else "⚠️"
        status_text = "Complete" if percent == 100 else "In Progress"
        
        message = f"""📁 *Evidence Bundle Status*

{status_emoji} *Status*: {status_text}
📊 *Completion*: {complete}/{total} exhibits ({percent:.0f}%)
"""
        
        # Add missing exhibits if incomplete
        if percent < 100:
            missing = status.get("missing_exhibits", [])
            if missing:
                message += "\n❌ *Missing*:\n"
                for item in missing[:5]:  # Limit to 5
                    message += f"   • {item}\n"
        
        return self._send_message(message, parse_mode="Markdown")
    
    def send_api_cost_alert(self, cost: float, threshold: float = 10.0) -> bool:
        """Alert when API costs exceed threshold"""
        
        if cost < threshold:
            return True  # No alert needed
        
        message = f"""💰 *API Cost Alert*

⚠️ Monthly API costs have exceeded ${threshold:.2f}

💵 *Current Cost*: ${cost:.2f}
🎯 *Threshold*: ${threshold:.2f}
"""
        
        return self._send_message(message, parse_mode="Markdown")
    
    def send_custom_message(self, message: str, title: str = "Advocate Notification") -> bool:
        """Send custom text message"""
        
        formatted = f"*{title}*\n\n{message}"
        return self._send_message(formatted, parse_mode="Markdown")
    
    def _send_message(self, text: str, parse_mode: str = "Markdown") -> bool:
        """Send message to Telegram"""
        
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/sendMessage",
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Telegram API failed: {e}", file=sys.stderr)
            return False
    
    def _get_emoji_for_confidence(self, confidence: float) -> str:
        """Map confidence to emoji"""
        if confidence >= 0.8:
            return "✅"  # Green check
        elif confidence >= 0.5:
            return "⚠️"  # Warning
        else:
            return "❌"  # Red X


def main():
    """CLI for Telegram notifier"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Telegram notifier for Advocate")
    parser.add_argument("--type", required=True, choices=["classification", "trial", "evidence", "cost", "custom"],
                        help="Notification type")
    parser.add_argument("--data", help="JSON data for notification")
    parser.add_argument("--message", help="Custom message (for --type custom)")
    
    args = parser.parse_args()
    
    notifier = TelegramNotifier()
    
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

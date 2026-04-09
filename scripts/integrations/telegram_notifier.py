#!/usr/bin/env python3
"""
Telegram Settlement Notifier

DoR: Telegram Bot token from @BotFather, chat ID configured
DoD: Sends real-time notifications for validation events, settlement milestones

Setup:
    1. Message @BotFather on Telegram: /newbot
    2. Get API token
    3. Create .env file:
       TELEGRAM_BOT_TOKEN=your_token_here
       TELEGRAM_CHAT_ID=your_chat_id (or @username)

Usage:
    ./telegram_notifier.py --event validation_passed --details "WSJF 26.0"
    ./telegram_notifier.py --event deadline_approaching --details "2 hours remaining"
"""

import os
import sys
import click
import asyncio
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from telegram import Bot
from telegram.error import TelegramError

# Load environment variables
load_dotenv()


class TelegramNotifier:
    """Real-time settlement notifications via Telegram"""
    
    # Event types with emoji and urgency
    EVENT_TYPES = {
        "validation_passed": {"emoji": "✅", "urgency": "low", "title": "Validation Passed"},
        "validation_failed": {"emoji": "❌", "urgency": "high", "title": "Validation Failed"},
        "doug_response_received": {"emoji": "📨", "urgency": "critical", "title": "Doug Responded"},
        "deadline_approaching": {"emoji": "⏰", "urgency": "high", "title": "Deadline Approaching"},
        "send_approved": {"emoji": "🚀", "urgency": "medium", "title": "Email Send Approved"},
        "wsjf_recalculated": {"emoji": "📊", "urgency": "low", "title": "WSJF Recalculated"},
        "systemic_score_alert": {"emoji": "🔴", "urgency": "high", "title": "Systemic Score Alert"},
        "signature_error": {"emoji": "⚠️", "urgency": "medium", "title": "Signature Error"},
        "temporal_error": {"emoji": "🕐", "urgency": "high", "title": "Temporal Error"},
        "roam_risk_change": {"emoji": "📈", "urgency": "medium", "title": "ROAM Risk Changed"}
    }
    
    def __init__(self):
        self.token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        if not self.token:
            raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
        if not self.chat_id:
            raise ValueError("TELEGRAM_CHAT_ID not set in environment")
        
        self.bot = Bot(token=self.token)
    
    async def send_notification(self, event_type: str, details: str = "") -> bool:
        """
        Send notification for settlement event
        
        Args:
            event_type: One of EVENT_TYPES keys
            details: Additional context
        
        Returns:
            bool: True if sent successfully
        """
        if event_type not in self.EVENT_TYPES:
            click.secho(f"❌ Unknown event type: {event_type}", fg='red')
            return False
        
        event_info = self.EVENT_TYPES[event_type]
        message = self._format_message(event_type, event_info, details)
        
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode='Markdown',
                disable_web_page_preview=True
            )
            click.secho(f"✅ Telegram notification sent: {event_type}", fg='green')
            return True
        except TelegramError as e:
            click.secho(f"❌ Telegram error: {e}", fg='red')
            return False
        except Exception as e:
            click.secho(f"❌ Unexpected error: {e}", fg='red')
            return False
    
    def _format_message(self, event_type: str, event_info: dict, details: str) -> str:
        """Format notification message with emoji and structure"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        urgency_icon = {
            "critical": "🚨",
            "high": "⚠️",
            "medium": "ℹ️",
            "low": "📌"
        }[event_info["urgency"]]
        
        message_parts = [
            f"{event_info['emoji']} *{event_info['title']}*",
            f"{urgency_icon} Urgency: {event_info['urgency'].upper()}",
            f"🕐 Time: `{timestamp}`"
        ]
        
        if details:
            message_parts.append(f"\n📝 Details:\n```\n{details}\n```")
        
        # Add context based on event type
        context = self._get_event_context(event_type)
        if context:
            message_parts.append(f"\n💡 Context: {context}")
        
        return "\n".join(message_parts)
    
    def _get_event_context(self, event_type: str) -> str:
        """Get contextual information for event type"""
        context_map = {
            "validation_passed": "Email ready for send approval",
            "validation_failed": "Review suggestions in validation report",
            "doug_response_received": "Check email and update strategy",
            "deadline_approaching": "Consider extension request or escalation",
            "send_approved": "Email sent - monitor delivery confirmation",
            "wsjf_recalculated": "Priority may have changed - review dashboard",
            "systemic_score_alert": "Systemic indifference threshold reached",
            "signature_error": "Signature format incorrect for email type",
            "temporal_error": "Date/time validation failed - check calendar",
            "roam_risk_change": "Risk classification updated - reassess strategy"
        }
        return context_map.get(event_type, "")
    
    async def send_batch_notifications(self, events: list) -> dict:
        """
        Send multiple notifications
        
        Args:
            events: List of (event_type, details) tuples
        
        Returns:
            {"sent": int, "failed": int, "results": list}
        """
        results = []
        sent = 0
        failed = 0
        
        for event_type, details in events:
            success = await self.send_notification(event_type, details)
            results.append((event_type, success))
            if success:
                sent += 1
            else:
                failed += 1
        
        return {
            "sent": sent,
            "failed": failed,
            "results": results
        }
    
    async def send_validation_summary(self, validation_result: dict) -> bool:
        """Send comprehensive validation summary"""
        consensus = validation_result.get("consensus", {})
        roam = validation_result.get("roam", {})
        wsjf = validation_result.get("wsjf", {})
        
        summary = f"""
🎯 *Validation Summary*

📊 Consensus: {consensus.get('passed', 0)}/{consensus.get('total', 21)} ({consensus.get('percentage', 0):.1f}%)
🔍 ROAM Risk: {roam.get('classification', 'UNKNOWN')} ({roam.get('score', 0)}/100)
⚡ WSJF Score: {wsjf.get('score', 0):.1f} ({wsjf.get('priority', 'UNKNOWN')})

Status: {'✅ APPROVED' if consensus.get('percentage', 0) >= 95 else '❌ NEEDS REVISION'}
"""
        
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=summary,
                parse_mode='Markdown'
            )
            return True
        except TelegramError as e:
            click.secho(f"❌ Failed to send summary: {e}", fg='red')
            return False


@click.command()
@click.option('--event', '-e', required=True,
              type=click.Choice([
                  'validation_passed', 'validation_failed', 'doug_response_received',
                  'deadline_approaching', 'send_approved', 'wsjf_recalculated',
                  'systemic_score_alert', 'signature_error', 'temporal_error',
                  'roam_risk_change'
              ]),
              help='Event type to notify')
@click.option('--details', '-d', default="",
              help='Additional details about the event')
@click.option('--test', is_flag=True,
              help='Test connection without sending notification')
def main(event, details, test):
    """
    Send Telegram notification for settlement event
    
    Examples:
        ./telegram_notifier.py -e validation_passed -d "WSJF 26.0"
        ./telegram_notifier.py -e deadline_approaching -d "2 hours remaining"
        ./telegram_notifier.py --test
    """
    try:
        notifier = TelegramNotifier()
        
        if test:
            click.echo("Testing Telegram connection...")
            async def test_connection():
                try:
                    me = await notifier.bot.get_me()
                    click.secho(f"✅ Connected to bot: @{me.username}", fg='green')
                    click.secho(f"✅ Chat ID: {notifier.chat_id}", fg='green')
                    return True
                except TelegramError as e:
                    click.secho(f"❌ Connection failed: {e}", fg='red')
                    return False
            
            success = asyncio.run(test_connection())
            sys.exit(0 if success else 1)
        
        # Send notification
        success = asyncio.run(notifier.send_notification(event, details))
        sys.exit(0 if success else 1)
    
    except ValueError as e:
        click.secho(f"❌ Configuration error: {e}", fg='red')
        click.echo("\nSetup instructions:")
        click.echo("1. Create Telegram bot: Message @BotFather /newbot")
        click.echo("2. Get your chat ID: Message @userinfobot /start")
        click.echo("3. Create .env file with:")
        click.echo("   TELEGRAM_BOT_TOKEN=your_token")
        click.echo("   TELEGRAM_CHAT_ID=your_chat_id")
        sys.exit(1)
    except Exception as e:
        click.secho(f"❌ Unexpected error: {e}", fg='red')
        sys.exit(1)


if __name__ == "__main__":
    main()

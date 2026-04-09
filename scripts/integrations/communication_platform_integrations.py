#!/usr/bin/env python3
"""
Communication Platform Integrations
====================================

Multi-channel communication system for wholeness validation framework.

Supported Platforms:
- Mail.app (macOS AppleScript) - Email validation → send pipeline
- Telegram Bot API - Real-time settlement notifications
- Meta Business API - WhatsApp/Instagram/Messenger routing

Integration with:
- Wholeness validation framework (pre-send validation)
- ROAM risk classification
- WSJF priority calculation
- Systemic indifference scoring

Usage:
    from communication_platform_integrations import CommunicationHub
    
    hub = CommunicationHub()
    hub.send_notification("settlement_deadline", urgency="CRITICAL")
    hub.send_email("/path/to/validated.eml", validate_first=True)
"""

import os
import sys
import json
import asyncio
import subprocess
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import List, Dict, Optional, Any, Callable
from urllib.parse import urlencode

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MessagePriority(Enum):
    """Message priority levels aligned with WSJF"""
    CRITICAL = "CRITICAL"  # Settlement deadline, court hearing
    HIGH = "HIGH"          # Doug response received, validation failed
    MEDIUM = "MEDIUM"      # Status updates, reminders
    LOW = "LOW"            # Non-urgent info


class DeliveryStatus(Enum):
    """Message delivery status"""
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"


@dataclass
class MessagePayload:
    """Standardized message payload across all platforms"""
    title: str
    body: str
    priority: MessagePriority
    metadata: Dict[str, Any] = field(default_factory=dict)
    attachments: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "body": self.body,
            "priority": self.priority.value,
            "metadata": self.metadata,
            "attachments": self.attachments,
            "timestamp": datetime.now().isoformat()
        }


@dataclass 
class DeliveryResult:
    """Result of a message delivery attempt"""
    platform: str
    status: DeliveryStatus
    message_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    error: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "platform": self.platform,
            "status": self.status.value,
            "message_id": self.message_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "error": self.error
        }


class PlatformConnector(ABC):
    """Abstract base class for platform connectors"""
    
    @abstractmethod
    def send(self, payload: MessagePayload) -> DeliveryResult:
        """Send message via this platform"""
        pass
    
    @abstractmethod
    def validate_config(self) -> bool:
        """Validate platform configuration"""
        pass
    
    @abstractmethod
    def get_platform_name(self) -> str:
        """Return platform identifier"""
        pass


class MailAppConnector(PlatformConnector):
    """
    Mail.app integration via AppleScript (macOS)
    
    Features:
    - Create draft from validated .eml
    - Auto-fill recipient, subject, body
    - Signature block injection
    - Send with confirmation
    """
    
    def __init__(self, default_signature: str = None):
        self.default_signature = default_signature or self._get_default_signature()
        self.is_macos = sys.platform == 'darwin'
    
    def get_platform_name(self) -> str:
        return "Mail.app"
    
    def validate_config(self) -> bool:
        if not self.is_macos:
            logger.warning("Mail.app connector requires macOS")
            return False
        
        # Check if Mail.app is available
        result = subprocess.run(
            ['osascript', '-e', 'tell application "Mail" to name'],
            capture_output=True, text=True
        )
        return result.returncode == 0
    
    def send(self, payload: MessagePayload) -> DeliveryResult:
        """Create and optionally send email via Mail.app"""
        if not self.validate_config():
            return DeliveryResult(
                platform=self.get_platform_name(),
                status=DeliveryStatus.FAILED,
                error="Mail.app not available"
            )
        
        try:
            recipient = payload.metadata.get('recipient', '')
            subject = payload.title
            body = payload.body
            
            # Add signature if configured
            if self.default_signature and 'signature' not in body.lower():
                body += f"\n\n{self.default_signature}"
            
            # AppleScript to create email
            applescript = f'''
            tell application "Mail"
                set newMessage to make new outgoing message with properties {{
                    subject:"{self._escape_for_applescript(subject)}", 
                    content:"{self._escape_for_applescript(body)}"
                }}
                tell newMessage
                    make new to recipient at end of to recipients with properties {{
                        address:"{recipient}"
                    }}
                end tell
                set visible of newMessage to true
                {self._get_send_command(payload)}
            end tell
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                return DeliveryResult(
                    platform=self.get_platform_name(),
                    status=DeliveryStatus.SENT if payload.metadata.get('auto_send') else DeliveryStatus.PENDING,
                    timestamp=datetime.now(),
                    message_id=f"mail_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                )
            else:
                return DeliveryResult(
                    platform=self.get_platform_name(),
                    status=DeliveryStatus.FAILED,
                    error=result.stderr
                )
                
        except Exception as e:
            return DeliveryResult(
                platform=self.get_platform_name(),
                status=DeliveryStatus.FAILED,
                error=str(e)
            )
    
    def create_draft_from_eml(self, eml_path: str) -> DeliveryResult:
        """Create Mail.app draft from .eml file"""
        eml_content = Path(eml_path).read_text()
        
        # Parse .eml headers
        headers, body = self._parse_eml(eml_content)
        
        payload = MessagePayload(
            title=headers.get('Subject', 'No Subject'),
            body=body,
            priority=MessagePriority.HIGH,
            metadata={
                'recipient': headers.get('To', ''),
                'cc': headers.get('Cc', ''),
                'auto_send': False
            }
        )
        
        return self.send(payload)
    
    def _parse_eml(self, content: str) -> tuple:
        """Parse .eml file into headers and body"""
        headers = {}
        body = ""
        in_headers = True
        
        for line in content.split('\n'):
            if in_headers:
                if line.strip() == '':
                    in_headers = False
                elif ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()
            else:
                body += line + '\n'
        
        return headers, body.strip()
    
    def _escape_for_applescript(self, text: str) -> str:
        """Escape special characters for AppleScript"""
        return text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    def _get_send_command(self, payload: MessagePayload) -> str:
        """Generate send command based on auto_send setting"""
        if payload.metadata.get('auto_send', False):
            return 'send newMessage'
        return '-- Draft created, manual send required'
    
    def _get_default_signature(self) -> str:
        """Default professional signature block"""
        return """
Best regards,
Shahrooz Bhopti

Case Reference: 26CV005596-590
Pro Se Litigant | Mecklenburg County District Court
"""


class TelegramConnector(PlatformConnector):
    """
    Telegram Bot API integration
    
    Features:
    - Real-time settlement notifications
    - Priority-based message formatting
    - Markdown support
    - Delivery confirmation
    """
    
    TELEGRAM_API_BASE = "https://api.telegram.org/bot"
    
    def __init__(self, bot_token: str = None, default_chat_id: str = None):
        self.bot_token = bot_token or os.getenv('TELEGRAM_BOT_TOKEN')
        self.default_chat_id = default_chat_id or os.getenv('TELEGRAM_CHAT_ID')
    
    def get_platform_name(self) -> str:
        return "Telegram"
    
    def validate_config(self) -> bool:
        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not configured")
            return False
        if not self.default_chat_id:
            logger.warning("TELEGRAM_CHAT_ID not configured")
            return False
        return True
    
    def send(self, payload: MessagePayload) -> DeliveryResult:
        """Send message via Telegram Bot API"""
        if not self.validate_config():
            return DeliveryResult(
                platform=self.get_platform_name(),
                status=DeliveryStatus.FAILED,
                error="Telegram not configured"
            )
        
        try:
            # Format message with priority indicators
            formatted_message = self._format_message(payload)
            
            # Use requests if available, otherwise curl
            chat_id = payload.metadata.get('chat_id', self.default_chat_id)
            
            import urllib.request
            import urllib.parse
            
            url = f"{self.TELEGRAM_API_BASE}{self.bot_token}/sendMessage"
            data = urllib.parse.urlencode({
                'chat_id': chat_id,
                'text': formatted_message,
                'parse_mode': 'Markdown'
            }).encode()
            
            req = urllib.request.Request(url, data=data, method='POST')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode())
                
                if result.get('ok'):
                    return DeliveryResult(
                        platform=self.get_platform_name(),
                        status=DeliveryStatus.SENT,
                        timestamp=datetime.now(),
                        message_id=str(result.get('result', {}).get('message_id', ''))
                    )
                else:
                    return DeliveryResult(
                        platform=self.get_platform_name(),
                        status=DeliveryStatus.FAILED,
                        error=result.get('description', 'Unknown error')
                    )
                    
        except Exception as e:
            return DeliveryResult(
                platform=self.get_platform_name(),
                status=DeliveryStatus.FAILED,
                error=str(e)
            )
    
    def _format_message(self, payload: MessagePayload) -> str:
        """Format message with priority indicators and metadata"""
        emoji_map = {
            MessagePriority.CRITICAL: "🚨",
            MessagePriority.HIGH: "⚠️",
            MessagePriority.MEDIUM: "📌",
            MessagePriority.LOW: "ℹ️"
        }
        
        emoji = emoji_map.get(payload.priority, "📌")
        
        message = f"{emoji} *{payload.title}*\n\n{payload.body}"
        
        # Add metadata footer
        if payload.metadata:
            message += "\n\n---"
            if 'case_reference' in payload.metadata:
                message += f"\n📁 Case: `{payload.metadata['case_reference']}`"
            if 'deadline' in payload.metadata:
                message += f"\n⏰ Deadline: `{payload.metadata['deadline']}`"
            if 'systemic_score' in payload.metadata:
                message += f"\n📊 Systemic Score: `{payload.metadata['systemic_score']}/40`"
        
        return message
    
    async def send_async(self, payload: MessagePayload) -> DeliveryResult:
        """Async version of send for integration with asyncio"""
        return self.send(payload)


class MetaBusinessConnector(PlatformConnector):
    """
    Meta Business API integration (WhatsApp/Instagram/Messenger)
    
    Features:
    - Multi-channel routing based on WSJF
    - WhatsApp Business templates
    - Instagram Direct Messages
    - Messenger API
    """
    
    META_API_BASE = "https://graph.facebook.com/v18.0"
    
    def __init__(self, access_token: str = None, phone_number_id: str = None):
        self.access_token = access_token or os.getenv('META_ACCESS_TOKEN')
        self.phone_number_id = phone_number_id or os.getenv('META_PHONE_NUMBER_ID')
    
    def get_platform_name(self) -> str:
        return "Meta"
    
    def validate_config(self) -> bool:
        if not self.access_token:
            logger.warning("META_ACCESS_TOKEN not configured")
            return False
        return True
    
    def send(self, payload: MessagePayload) -> DeliveryResult:
        """Route message to appropriate Meta platform based on priority"""
        if not self.validate_config():
            return DeliveryResult(
                platform=self.get_platform_name(),
                status=DeliveryStatus.FAILED,
                error="Meta Business API not configured"
            )
        
        # Route based on priority
        channel = payload.metadata.get('channel', 'auto')
        
        if channel == 'auto':
            if payload.priority == MessagePriority.CRITICAL:
                return self._send_whatsapp(payload)
            elif payload.priority == MessagePriority.HIGH:
                return self._send_instagram(payload)
            else:
                return self._send_messenger(payload)
        elif channel == 'whatsapp':
            return self._send_whatsapp(payload)
        elif channel == 'instagram':
            return self._send_instagram(payload)
        else:
            return self._send_messenger(payload)
    
    def _send_whatsapp(self, payload: MessagePayload) -> DeliveryResult:
        """Send via WhatsApp Business API"""
        try:
            recipient = payload.metadata.get('phone_number', '')
            if not recipient:
                return DeliveryResult(
                    platform="WhatsApp",
                    status=DeliveryStatus.FAILED,
                    error="No phone number provided"
                )
            
            import urllib.request
            
            url = f"{self.META_API_BASE}/{self.phone_number_id}/messages"
            
            data = json.dumps({
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "text",
                "text": {"body": f"{payload.title}\n\n{payload.body}"}
            }).encode()
            
            req = urllib.request.Request(
                url, 
                data=data,
                headers={
                    'Authorization': f'Bearer {self.access_token}',
                    'Content-Type': 'application/json'
                },
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode())
                
                return DeliveryResult(
                    platform="WhatsApp",
                    status=DeliveryStatus.SENT,
                    timestamp=datetime.now(),
                    message_id=result.get('messages', [{}])[0].get('id', '')
                )
                
        except Exception as e:
            return DeliveryResult(
                platform="WhatsApp",
                status=DeliveryStatus.FAILED,
                error=str(e)
            )
    
    def _send_instagram(self, payload: MessagePayload) -> DeliveryResult:
        """Send via Instagram Direct Messages"""
        # Instagram DM requires specific setup - placeholder for now
        logger.info("Instagram DM integration placeholder - requires OAuth setup")
        return DeliveryResult(
            platform="Instagram",
            status=DeliveryStatus.PENDING,
            error="Instagram DM requires OAuth configuration"
        )
    
    def _send_messenger(self, payload: MessagePayload) -> DeliveryResult:
        """Send via Facebook Messenger"""
        # Messenger requires page access token - placeholder for now
        logger.info("Messenger integration placeholder - requires Page token")
        return DeliveryResult(
            platform="Messenger",
            status=DeliveryStatus.PENDING,
            error="Messenger requires Page token configuration"
        )


class CommunicationHub:
    """
    Unified communication hub orchestrating all platform connectors
    
    Features:
    - Priority-based routing
    - Multi-channel delivery
    - Delivery tracking
    - Integration with wholeness validation
    """
    
    # Event type templates
    EVENT_TEMPLATES = {
        "settlement_deadline": {
            "title": "⏰ Settlement Deadline Approaching",
            "body_template": "Deadline: {deadline}\nHours remaining: {hours_remaining}\n\nAction required: Review and send settlement proposal.",
            "priority": MessagePriority.CRITICAL
        },
        "doug_response": {
            "title": "📩 Response Received from Opposing Counsel",
            "body_template": "Doug Fierro has responded.\n\nSummary: {summary}\n\nNext action: {next_action}",
            "priority": MessagePriority.HIGH
        },
        "validation_failed": {
            "title": "❌ Document Validation Failed",
            "body_template": "Document: {document}\nIssues found: {issues}\n\nPlease address before sending.",
            "priority": MessagePriority.HIGH
        },
        "validation_passed": {
            "title": "✅ Document Validation Passed",
            "body_template": "Document: {document}\nConfidence: {confidence}%\nSystemic score: {systemic_score}/40\n\nReady to send.",
            "priority": MessagePriority.MEDIUM
        },
        "systemic_analysis": {
            "title": "📊 Systemic Indifference Analysis Complete",
            "body_template": "Organizations analyzed: {org_count}\nLitigation-ready: {litigation_ready}\nTotal score: {total_score}/240",
            "priority": MessagePriority.MEDIUM
        },
        "court_hearing": {
            "title": "⚖️ Court Hearing Reminder",
            "body_template": "Case: {case_reference}\nDate: {hearing_date}\nLocation: {location}\n\nPrepare: {prep_items}",
            "priority": MessagePriority.CRITICAL
        }
    }
    
    def __init__(self, enable_mail: bool = True, enable_telegram: bool = True, enable_meta: bool = False):
        self.connectors: Dict[str, PlatformConnector] = {}
        self.delivery_log: List[DeliveryResult] = []
        
        if enable_mail:
            mail = MailAppConnector()
            if mail.validate_config():
                self.connectors['mail'] = mail
                logger.info("Mail.app connector enabled")
        
        if enable_telegram:
            telegram = TelegramConnector()
            if telegram.validate_config():
                self.connectors['telegram'] = telegram
                logger.info("Telegram connector enabled")
        
        if enable_meta:
            meta = MetaBusinessConnector()
            if meta.validate_config():
                self.connectors['meta'] = meta
                logger.info("Meta Business connector enabled")
    
    def send_notification(self, event_type: str, channels: List[str] = None, **kwargs) -> List[DeliveryResult]:
        """
        Send notification for a specific event type
        
        Args:
            event_type: One of the EVENT_TEMPLATES keys
            channels: List of channels to use (default: auto-select based on priority)
            **kwargs: Template variables
        
        Returns:
            List of delivery results
        """
        template = self.EVENT_TEMPLATES.get(event_type)
        if not template:
            logger.error(f"Unknown event type: {event_type}")
            return []
        
        payload = MessagePayload(
            title=template["title"],
            body=template["body_template"].format(**kwargs),
            priority=template["priority"],
            metadata={
                "event_type": event_type,
                "case_reference": kwargs.get("case_reference", "26CV005596-590"),
                **kwargs
            }
        )
        
        # Determine channels
        if channels is None:
            channels = self._select_channels_by_priority(payload.priority)
        
        results = []
        for channel in channels:
            connector = self.connectors.get(channel)
            if connector:
                result = connector.send(payload)
                results.append(result)
                self.delivery_log.append(result)
                logger.info(f"Sent via {channel}: {result.status.value}")
        
        return results
    
    def send_email(self, eml_path: str, validate_first: bool = True, auto_send: bool = False) -> DeliveryResult:
        """
        Send email via Mail.app with optional validation
        
        Args:
            eml_path: Path to .eml file
            validate_first: Run wholeness validation before sending
            auto_send: Automatically send (vs. create draft)
        
        Returns:
            Delivery result
        """
        mail = self.connectors.get('mail')
        if not mail:
            return DeliveryResult(
                platform="Mail.app",
                status=DeliveryStatus.FAILED,
                error="Mail.app connector not available"
            )
        
        if validate_first:
            # Import validation framework
            try:
                from wholeness_validation_framework import WholenessValidator
                validator = WholenessValidator()
                
                content = Path(eml_path).read_text()
                validation_result = validator.validate(content)
                
                if not validation_result.get('passed', False):
                    # Notify about validation failure
                    self.send_notification(
                        "validation_failed",
                        channels=['telegram'],
                        document=eml_path,
                        issues=str(validation_result.get('issues', []))
                    )
                    
                    return DeliveryResult(
                        platform="Mail.app",
                        status=DeliveryStatus.FAILED,
                        error=f"Validation failed: {validation_result.get('issues', [])}"
                    )
                    
            except ImportError:
                logger.warning("WholenessValidator not available, skipping validation")
        
        # Create/send email
        return mail.create_draft_from_eml(eml_path)
    
    def send_multi_channel(self, payload: MessagePayload, channels: List[str] = None) -> List[DeliveryResult]:
        """
        Send message across multiple channels simultaneously
        
        Args:
            payload: Message payload
            channels: Channels to use (default: all available)
        
        Returns:
            List of delivery results
        """
        if channels is None:
            channels = list(self.connectors.keys())
        
        results = []
        for channel in channels:
            connector = self.connectors.get(channel)
            if connector:
                result = connector.send(payload)
                results.append(result)
                self.delivery_log.append(result)
        
        return results
    
    def _select_channels_by_priority(self, priority: MessagePriority) -> List[str]:
        """Select appropriate channels based on message priority"""
        available = list(self.connectors.keys())
        
        if priority == MessagePriority.CRITICAL:
            # Use all available channels for critical messages
            return available
        elif priority == MessagePriority.HIGH:
            # Prefer telegram for high priority
            return ['telegram'] if 'telegram' in available else available[:1]
        else:
            # Use single channel for lower priority
            return available[:1] if available else []
    
    def get_delivery_log(self, limit: int = 50) -> List[dict]:
        """Get recent delivery log entries"""
        return [r.to_dict() for r in self.delivery_log[-limit:]]
    
    def get_status_summary(self) -> dict:
        """Get summary of connector status and recent deliveries"""
        summary = {
            "connectors": {
                name: conn.validate_config() 
                for name, conn in self.connectors.items()
            },
            "total_deliveries": len(self.delivery_log),
            "recent_deliveries": len([
                r for r in self.delivery_log 
                if r.timestamp and (datetime.now() - r.timestamp) < timedelta(hours=24)
            ]),
            "failed_deliveries": len([
                r for r in self.delivery_log 
                if r.status == DeliveryStatus.FAILED
            ])
        }
        return summary


# Settlement-specific notification helpers
def notify_settlement_deadline(hours_remaining: int, deadline: str = "February 12, 2026 @ 5:00 PM EST"):
    """Convenience function for settlement deadline notifications"""
    hub = CommunicationHub(enable_mail=False, enable_telegram=True)
    return hub.send_notification(
        "settlement_deadline",
        deadline=deadline,
        hours_remaining=hours_remaining
    )


def notify_doug_response(summary: str, next_action: str = "Review and respond within 24 hours"):
    """Convenience function for opposing counsel response notifications"""
    hub = CommunicationHub(enable_mail=False, enable_telegram=True)
    return hub.send_notification(
        "doug_response",
        summary=summary,
        next_action=next_action
    )


def notify_validation_complete(document: str, confidence: float, systemic_score: int):
    """Convenience function for validation completion notifications"""
    hub = CommunicationHub(enable_mail=False, enable_telegram=True)
    return hub.send_notification(
        "validation_passed",
        document=document,
        confidence=confidence,
        systemic_score=systemic_score
    )


# CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Communication Platform Integrations CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python communication_platform_integrations.py --status
  python communication_platform_integrations.py --notify settlement_deadline --hours 24
  python communication_platform_integrations.py --send-email /path/to/draft.eml --validate
  python communication_platform_integrations.py --test-telegram "Test message"
        """
    )
    
    parser.add_argument("--status", action="store_true", help="Show connector status")
    parser.add_argument("--notify", choices=list(CommunicationHub.EVENT_TEMPLATES.keys()), help="Send notification by event type")
    parser.add_argument("--hours", type=int, help="Hours remaining (for deadline notifications)")
    parser.add_argument("--send-email", type=str, help="Path to .eml file to send")
    parser.add_argument("--validate", action="store_true", help="Validate before sending email")
    parser.add_argument("--test-telegram", type=str, help="Send test message via Telegram")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    hub = CommunicationHub()
    
    if args.status:
        status = hub.get_status_summary()
        print("\n=== Communication Hub Status ===")
        print(f"\nConnectors:")
        for name, available in status['connectors'].items():
            icon = "✅" if available else "❌"
            print(f"  {icon} {name}")
        print(f"\nDelivery Stats:")
        print(f"  Total: {status['total_deliveries']}")
        print(f"  Last 24h: {status['recent_deliveries']}")
        print(f"  Failed: {status['failed_deliveries']}")
    
    elif args.notify:
        kwargs = {}
        if args.hours:
            kwargs['hours_remaining'] = args.hours
            kwargs['deadline'] = "February 12, 2026 @ 5:00 PM EST"
        
        results = hub.send_notification(args.notify, **kwargs)
        for r in results:
            print(f"{r.platform}: {r.status.value}")
            if r.error:
                print(f"  Error: {r.error}")
    
    elif args.send_email:
        result = hub.send_email(args.send_email, validate_first=args.validate)
        print(f"{result.platform}: {result.status.value}")
        if result.error:
            print(f"  Error: {result.error}")
    
    elif args.test_telegram:
        payload = MessagePayload(
            title="🧪 Test Message",
            body=args.test_telegram,
            priority=MessagePriority.LOW,
            metadata={"test": True}
        )
        telegram = hub.connectors.get('telegram')
        if telegram:
            result = telegram.send(payload)
            print(f"Telegram: {result.status.value}")
            if result.message_id:
                print(f"  Message ID: {result.message_id}")
            if result.error:
                print(f"  Error: {result.error}")
        else:
            print("Telegram connector not available")
    
    else:
        parser.print_help()

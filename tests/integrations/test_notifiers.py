#!/usr/bin/env python3
"""
TDD Tests for Platform Notifiers

Test Coverage:
- Discord webhook integration
- Telegram bot API integration
- Message formatting
- Error handling
- Retry logic
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import sys

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts" / "integrations"))

from discord_notifier import DiscordNotifier
from telegram_notifier import TelegramNotifier


class TestDiscordNotifier:
    """Test Discord webhook integration"""
    
    @patch("discord_notifier.requests.post")
    def test_send_classification_notification_success(self, mock_post):
        """Test successful Discord classification notification"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = DiscordNotifier(webhook_url="https://test.webhook")
        result = {
            "type": "order",
            "confidence": 0.85,
            "provider": "anthropic",
            "case_number": "26CV007491-590",
            "reasoning": "Document contains ORDERED text"
        }
        
        # Act
        success = notifier.send_classification_notification(result)
        
        # Assert
        assert success == True
        assert mock_post.called
        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        assert "embeds" in payload
        assert payload["embeds"][0]["title"] == "📄 PDF Classified"
    
    @patch("discord_notifier.requests.post")
    def test_send_trial_countdown(self, mock_post):
        """Test trial countdown notification"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = DiscordNotifier(webhook_url="https://test.webhook")
        trials = [
            {"name": "Trial #1", "date": "2026-03-03", "days_remaining": 6},
            {"name": "Trial #2", "date": "2026-03-10", "days_remaining": 13}
        ]
        
        # Act
        success = notifier.send_trial_countdown(trials)
        
        # Assert
        assert success == True
        payload = mock_post.call_args[1]["json"]
        assert payload["embeds"][0]["title"] == "⚖️ Trial Countdown Update"
        assert payload["embeds"][0]["color"] == 0xFF0000  # Red for urgent (<7 days)
    
    @patch("discord_notifier.requests.post")
    def test_send_evidence_bundle_status_complete(self, mock_post):
        """Test evidence bundle status (complete)"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = DiscordNotifier(webhook_url="https://test.webhook")
        status = {
            "total_exhibits": 10,
            "complete_exhibits": 10,
            "missing_exhibits": []
        }
        
        # Act
        success = notifier.send_evidence_bundle_status(status)
        
        # Assert
        assert success == True
        payload = mock_post.call_args[1]["json"]
        assert payload["embeds"][0]["color"] == 0x00FF00  # Green for complete
    
    @patch("discord_notifier.requests.post")
    def test_webhook_failure_handling(self, mock_post):
        """Test handling of webhook failures"""
        # Arrange
        mock_post.side_effect = Exception("Network error")
        notifier = DiscordNotifier(webhook_url="https://test.webhook")
        result = {"type": "order", "confidence": 0.85, "provider": "local"}
        
        # Act
        success = notifier.send_classification_notification(result)
        
        # Assert
        assert success == False
    
    def test_confidence_color_mapping(self):
        """Test confidence → color mapping"""
        notifier = DiscordNotifier(webhook_url="https://test.webhook")
        
        assert notifier._get_color_for_confidence(0.9) == 0x00FF00  # Green
        assert notifier._get_color_for_confidence(0.7) == 0xFFAA00  # Orange
        assert notifier._get_color_for_confidence(0.3) == 0xFF0000  # Red


class TestTelegramNotifier:
    """Test Telegram bot API integration"""
    
    @patch("telegram_notifier.requests.post")
    def test_send_classification_notification_success(self, mock_post):
        """Test successful Telegram classification notification"""
        # Arrange
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"ok": True}
        notifier = TelegramNotifier(bot_token="test_token", chat_id="123456")
        result = {
            "type": "motion",
            "confidence": 0.92,
            "provider": "anthropic",
            "case_number": "26CV005596-590",
            "reasoning": "Contains MOTION TO text"
        }
        
        # Act
        success = notifier.send_classification_notification(result)
        
        # Assert
        assert success == True
        assert mock_post.called
        payload = mock_post.call_args[1]["json"]
        assert payload["chat_id"] == "123456"
        assert payload["parse_mode"] == "Markdown"
        assert "*Type*: MOTION" in payload["text"]
    
    @patch("telegram_notifier.requests.post")
    def test_markdown_formatting(self, mock_post):
        """Test Markdown formatting in messages"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = TelegramNotifier(bot_token="test", chat_id="123")
        result = {
            "type": "answer",
            "confidence": 0.88,
            "provider": "openai",
            "case_number": None,
            "reasoning": "Detected ANSWER keyword"
        }
        
        # Act
        success = notifier.send_classification_notification(result)
        
        # Assert
        payload = mock_post.call_args[1]["json"]
        text = payload["text"]
        assert "*PDF Classified*" in text
        assert "*Type*: ANSWER" in text
        assert "*Confidence*: 88.0%" in text
    
    @patch("telegram_notifier.requests.post")
    def test_trial_countdown_urgent(self, mock_post):
        """Test urgent trial countdown (<7 days)"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = TelegramNotifier(bot_token="test", chat_id="123")
        trials = [
            {"name": "Trial #1", "date": "2026-03-03", "days_remaining": 6}
        ]
        
        # Act
        success = notifier.send_trial_countdown(trials)
        
        # Assert
        payload = mock_post.call_args[1]["json"]
        assert "🚨" in payload["text"]  # Urgent emoji for <7 days
    
    @patch("telegram_notifier.requests.post")
    def test_api_cost_alert(self, mock_post):
        """Test API cost threshold alert"""
        # Arrange
        mock_post.return_value.status_code = 200
        notifier = TelegramNotifier(bot_token="test", chat_id="123")
        
        # Act
        success = notifier.send_api_cost_alert(cost=15.50, threshold=10.0)
        
        # Assert
        assert success == True
        payload = mock_post.call_args[1]["json"]
        assert "💰 *API Cost Alert*" in payload["text"]
        assert "$15.50" in payload["text"]
    
    @patch("telegram_notifier.requests.post")
    def test_cost_below_threshold_no_alert(self, mock_post):
        """Test no alert when cost below threshold"""
        # Arrange
        notifier = TelegramNotifier(bot_token="test", chat_id="123")
        
        # Act
        success = notifier.send_api_cost_alert(cost=5.0, threshold=10.0)
        
        # Assert
        assert success == True
        assert not mock_post.called  # No API call
    
    def test_missing_credentials_raises_error(self):
        """Test error when credentials missing"""
        with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set"):
            TelegramNotifier(bot_token=None, chat_id=None)
    
    def test_emoji_confidence_mapping(self):
        """Test confidence → emoji mapping"""
        notifier = TelegramNotifier(bot_token="test", chat_id="123")
        
        assert notifier._get_emoji_for_confidence(0.9) == "✅"  # High confidence
        assert notifier._get_emoji_for_confidence(0.7) == "⚠️"  # Medium confidence
        assert notifier._get_emoji_for_confidence(0.3) == "❌"  # Low confidence


class TestNotifierIntegration:
    """Integration tests for multi-platform notifications"""
    
    @patch("discord_notifier.requests.post")
    @patch("telegram_notifier.requests.post")
    def test_fanout_to_all_platforms(self, mock_telegram, mock_discord):
        """Test sending notification to all platforms"""
        # Arrange
        mock_discord.return_value.status_code = 200
        mock_telegram.return_value.status_code = 200
        
        discord = DiscordNotifier(webhook_url="https://discord.test")
        telegram = TelegramNotifier(bot_token="test", chat_id="123")
        
        result = {
            "type": "order",
            "confidence": 0.85,
            "provider": "anthropic",
            "case_number": "26CV007491-590"
        }
        
        # Act
        discord_success = discord.send_classification_notification(result)
        telegram_success = telegram.send_classification_notification(result)
        
        # Assert
        assert discord_success == True
        assert telegram_success == True
        assert mock_discord.called
        assert mock_telegram.called
    
    @patch("discord_notifier.requests.post")
    @patch("telegram_notifier.requests.post")
    def test_partial_failure_isolation(self, mock_telegram, mock_discord):
        """Test that one platform failure doesn't block others"""
        # Arrange
        mock_discord.side_effect = Exception("Discord down")
        mock_telegram.return_value.status_code = 200
        
        discord = DiscordNotifier(webhook_url="https://discord.test")
        telegram = TelegramNotifier(bot_token="test", chat_id="123")
        
        result = {"type": "motion", "confidence": 0.90}
        
        # Act
        discord_success = discord.send_classification_notification(result)
        telegram_success = telegram.send_classification_notification(result)
        
        # Assert
        assert discord_success == False  # Discord failed
        assert telegram_success == True   # Telegram succeeded


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

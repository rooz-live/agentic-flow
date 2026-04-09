#!/usr/bin/env python3
"""
@business-context WSJF-Cycle-45: Temporal Interface Boundaries
@adr ADR-042: Testing local cooldown constraints
"""

import unittest
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

# Fix import path logically ensuring we can hit interface endpoints
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from scripts.interfaces import discord_bot_proxy

class TestDiscordTemporalBot(unittest.TestCase):
    def setUp(self):
        self.bot = discord_bot_proxy.OllamaDiscordMiddleware()

    def test_temporal_bounds_rejection(self):
        # Create a timestamp exactly 1001 minutes in the past
        past_time = datetime.now(timezone.utc) - timedelta(minutes=1001)
        timestamp_str = past_time.isoformat()
        
        # Test boundary lookup limiting search exclusively mapped to 1000m
        is_valid = self.bot.check_temporal_bounds(timestamp_str, timeout_mins=1000)
        self.assertFalse(is_valid, "Temporal bound check failed; boundary should have rejected payload > 1000m.")

    def test_temporal_bounds_acceptance(self):
        # Create a timestamp exactly 900 minutes in the past
        past_time = datetime.now(timezone.utc) - timedelta(minutes=900)
        timestamp_str = past_time.isoformat()
        
        # Test boundary
        is_valid = self.bot.check_temporal_bounds(timestamp_str, timeout_mins=1000)
        self.assertTrue(is_valid, "Temporal bound check failed; boundary should have accepted payload < 1000m.")

if __name__ == '__main__':
    unittest.main()

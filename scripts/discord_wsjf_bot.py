#!/usr/bin/env python3
"""
discord_wsjf_bot.py - Discord bot for WSJF priority updates and blocker notifications

MVP Features:
- /status command: Returns current WSJF priorities
- /blockers command: Lists pending/blocked items
- Webhook notifications for approval updates

Environment Variables Required:
    DISCORD_BOT_TOKEN - Bot authentication token
    DISCORD_CHANNEL_ID - Channel ID for notifications

Usage:
    # Test mode (console output)
    python3 scripts/discord_wsjf_bot.py --test
    
    # Production mode (requires Discord token)
    export DISCORD_BOT_TOKEN="your_token_here"
    export DISCORD_CHANNEL_ID="channel_id_here"
    python3 scripts/discord_wsjf_bot.py
    
    # Send one-time status update
    python3 scripts/discord_wsjf_bot.py --send-status
"""

import os
import sys
import json
import yaml
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

try:
    import discord
    from discord.ext import commands
    DISCORD_AVAILABLE = True
except ImportError:
    DISCORD_AVAILABLE = False
    print("⚠️  discord.py not installed. Running in test mode.")
    print("   Install with: pip3 install discord.py")

class WSJFDiscordBot:
    def __init__(self, repo_root=None, test_mode=False):
        self.repo_root = Path(repo_root) if repo_root else Path(__file__).parent.parent
        self.goalie_dir = self.repo_root / ".goalie"
        self.test_mode = test_mode
        
        # Rate limiting
        self.command_history = {}
        self.rate_limit_commands = 5  # per minute per user
        self.rate_limit_webhooks = 1  # per minute
        
        if not test_mode and DISCORD_AVAILABLE:
            intents = discord.Intents.default()
            # Note: message_content intent not needed for slash commands
            # Only enable if you need to read message content directly
            # intents.message_content = True
            self.bot = commands.Bot(command_prefix='/', intents=intents)
            self.setup_commands()
    
    def load_consolidated_actions(self) -> Optional[Dict]:
        """Load WSJF priorities from CONSOLIDATED_ACTIONS.yaml"""
        actions_path = self.goalie_dir / "CONSOLIDATED_ACTIONS.yaml"
        if not actions_path.exists():
            return None
        
        with open(actions_path) as f:
            try:
                return yaml.safe_load(f)
            except yaml.YAMLError as e:
                print(f"Error loading YAML: {e}")
                return None
    
    def load_approval_log(self) -> List[Dict]:
        """Load recent approval decisions"""
        log_path = self.goalie_dir / "approval_log.jsonl"
        if not log_path.exists():
            return []
        
        records = []
        with open(log_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        
        # Return last 10
        return records[-10:]
    
    def format_status_message(self) -> str:
        """Format WSJF status message"""
        data = self.load_consolidated_actions()
        if not data:
            return "❌ Could not load WSJF priorities"
        
        items = data.get('items', [])
        
        # Filter by status and WSJF score
        in_progress = [i for i in items if i.get('status') == 'IN_PROGRESS']
        pending_high = [i for i in items if i.get('status') == 'PENDING' and i.get('wsjf_score', 0) >= 8.0]
        
        lines = ["📊 **WSJF Status Report**", ""]
        
        # In Progress
        if in_progress:
            lines.append("🟢 **In Progress:**")
            for item in in_progress[:5]:
                title = item.get('title', 'Unknown')
                wsjf = item.get('wsjf_score', 'N/A')
                item_id = item.get('id', 'N/A')
                lines.append(f"  • `{item_id}` (WSJF {wsjf}): {title}")
            lines.append("")
        
        # High Priority Pending
        if pending_high:
            lines.append("🟡 **High Priority (WSJF ≥ 8.0):**")
            for item in sorted(pending_high, key=lambda x: x.get('wsjf_score', 0), reverse=True)[:5]:
                title = item.get('title', 'Unknown')
                wsjf = item.get('wsjf_score', 'N/A')
                item_id = item.get('id', 'N/A')
                lines.append(f"  • `{item_id}` (WSJF {wsjf}): {title}")
            lines.append("")
        
        # Summary
        total = len(items)
        complete = len([i for i in items if i.get('status') == 'COMPLETE'])
        progress = (complete / total * 100) if total > 0 else 0
        
        lines.append(f"📈 **Progress:** {complete}/{total} items ({progress:.1f}%)")
        lines.append(f"⏰ **Updated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
        
        return "\n".join(lines)
    
    def format_blockers_message(self) -> str:
        """Format blockers message"""
        data = self.load_consolidated_actions()
        if not data:
            return "❌ Could not load blockers"
        
        items = data.get('items', [])
        
        # Find blockers
        blocked = [i for i in items if i.get('status') in ['PENDING', 'BLOCKED'] and i.get('blocker_severity')]
        pending_high_wsjf = [i for i in items if i.get('status') == 'PENDING' and i.get('wsjf_score', 0) >= 10.0]
        
        lines = ["🚫 **Current Blockers**", ""]
        
        if blocked:
            lines.append("🔴 **High Severity:**")
            for item in blocked:
                title = item.get('title', 'Unknown')
                item_id = item.get('id', 'N/A')
                severity = item.get('blocker_severity', 'UNKNOWN')
                description = item.get('description', '')[:80]
                lines.append(f"  • `{item_id}` [{severity}]: {title}")
                if description:
                    lines.append(f"    {description}...")
            lines.append("")
        
        if pending_high_wsjf:
            lines.append("⚠️  **High WSJF Pending (≥10.0):**")
            for item in sorted(pending_high_wsjf, key=lambda x: x.get('wsjf_score', 0), reverse=True):
                title = item.get('title', 'Unknown')
                wsjf = item.get('wsjf_score', 'N/A')
                item_id = item.get('id', 'N/A')
                lines.append(f"  • `{item_id}` (WSJF {wsjf}): {title}")
            lines.append("")
        
        if not blocked and not pending_high_wsjf:
            lines.append("✅ No critical blockers!")
        
        lines.append(f"⏰ **Updated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
        
        return "\n".join(lines)
    
    def format_approval_message(self, approval: Dict) -> str:
        """Format approval notification"""
        item_id = approval.get('item_id', 'Unknown')
        wsjf = approval.get('wsjf_score', 'N/A')
        tier = approval.get('approval_tier', 'N/A')
        outcome = approval.get('outcome', 'N/A')
        time_min = approval.get('execution_time_min', 'N/A')
        
        emoji = "✅" if outcome == "success" else "❌"
        
        lines = [
            f"{emoji} **Approval Update**",
            f"Item: `{item_id}` (WSJF {wsjf})",
            f"Tier: {tier}",
            f"Outcome: {outcome}",
            f"Time: {time_min} min"
        ]
        
        return "\n".join(lines)
    
    def setup_commands(self):
        """Setup Discord bot commands"""
        
        @self.bot.command(name='status')
        async def status(ctx):
            """Show current WSJF priorities"""
            message = self.format_status_message()
            await ctx.send(message)
        
        @self.bot.command(name='blockers')
        async def blockers(ctx):
            """List current blockers"""
            message = self.format_blockers_message()
            await ctx.send(message)
        
        @self.bot.command(name='ping')
        async def ping(ctx):
            """Check bot status"""
            await ctx.send(f"🟢 Bot online | Latency: {round(self.bot.latency * 1000)}ms")
    
    def test_messages(self):
        """Test mode: print messages to console"""
        print("\n" + "="*60)
        print("🧪 DISCORD BOT TEST MODE")
        print("="*60 + "\n")
        
        print("Testing /status command:")
        print("-" * 60)
        print(self.format_status_message())
        print("\n")
        
        print("Testing /blockers command:")
        print("-" * 60)
        print(self.format_blockers_message())
        print("\n")
        
        print("Testing approval notifications:")
        print("-" * 60)
        approvals = self.load_approval_log()
        if approvals:
            print(self.format_approval_message(approvals[-1]))
        else:
            print("No approval log entries found")
        print("\n")
        
        print("="*60)
        print("✅ Test complete. Messages formatted successfully.")
        print("="*60 + "\n")
    
    def run(self):
        """Run bot"""
        if self.test_mode:
            self.test_messages()
            return
        
        if not DISCORD_AVAILABLE:
            print("❌ discord.py not installed. Install with: pip3 install discord.py")
            sys.exit(1)
        
        token = os.getenv('DISCORD_BOT_TOKEN')
        if not token:
            print("❌ DISCORD_BOT_TOKEN environment variable not set")
            sys.exit(1)
        
        print("🚀 Starting Discord WSJF bot...")
        self.bot.run(token)
    
    def send_status_once(self):
        """Send one-time status update (for cron jobs)"""
        if self.test_mode:
            print(self.format_status_message())
            return
        
        # For webhook-based updates (simpler than full bot)
        webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
        if not webhook_url:
            print("❌ DISCORD_WEBHOOK_URL not set for one-time updates")
            sys.exit(1)
        
        try:
            import requests
            message = self.format_status_message()
            response = requests.post(webhook_url, json={"content": message})
            if response.status_code == 204:
                print("✅ Status update sent to Discord")
            else:
                print(f"❌ Failed to send: {response.status_code}")
        except ImportError:
            print("❌ requests library not installed: pip3 install requests")
        except Exception as e:
            print(f"❌ Error sending webhook: {e}")

def main():
    parser = argparse.ArgumentParser(description="Discord WSJF Bot")
    parser.add_argument('--test', action='store_true', help='Test mode (console output)')
    parser.add_argument('--send-status', action='store_true', help='Send one-time status update')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode (implies --test)')
    parser.add_argument('--repo-root', help='Repository root path')
    
    args = parser.parse_args()
    
    bot = WSJFDiscordBot(repo_root=args.repo_root, test_mode=args.test or args.dry_run)
    
    if args.send_status:
        bot.send_status_once()
    else:
        bot.run()

if __name__ == "__main__":
    main()

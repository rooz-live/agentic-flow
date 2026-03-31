#!/usr/bin/env python3
"""
Discord Bot - Production Implementation for Agentic Flow

Commands:
- /retro: Shows last 5 insights from .goalie/insights_log.jsonl
- /metrics: Shows live pattern metrics from .goalie/pattern_metrics.jsonl
- /governance: Triggers governance agent and reports status

All commands log to pattern_metrics.jsonl
"""

import os
import sys
import json
import subprocess
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

try:
    import discord
    from discord import app_commands
except ImportError:
    print("⚠️ discord.py not installed. Installing...")
    subprocess.run([sys.executable, "-m", "pip", "install", "discord.py"], check=True)
    import discord
    from discord import app_commands

# Configuration
GOALIE_DIR = Path(os.getenv("GOALIE_DIR", ".goalie"))
INSIGHTS_LOG = GOALIE_DIR / "insights_log.jsonl"
PATTERN_METRICS = GOALIE_DIR / "pattern_metrics.jsonl"
GOVERNANCE_SCRIPT = Path("tools/federation/governance_agent.ts")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")

class AgenticFlowBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        # No privileged intents needed for slash commands
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        self.guild_id = int(DISCORD_GUILD_ID) if DISCORD_GUILD_ID else None

    async def setup_hook(self):
        """Register commands with Discord"""
        if self.guild_id:
            guild = discord.Object(id=self.guild_id)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            print(f"✅ Commands synced to guild {self.guild_id}")
        else:
            await self.tree.sync()
            print("✅ Commands synced globally")

    async def on_ready(self):
        print(f"🤖 Bot logged in as {self.user} (ID: {self.user.id})")
        print(f"📁 Goalie directory: {GOALIE_DIR.absolute()}")
        await self.log_pattern_metric(
            pattern="discord-bot-ready",
            mode="advisory",
            gate="bot-startup",
            reason="Discord bot initialized",
            action="start",
            metrics={"bot_id": str(self.user.id)},
        )

    async def log_pattern_metric(
        self,
        pattern: str,
        mode: str,
        gate: str,
        reason: str,
        action: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log pattern metric to .goalie/pattern_metrics.jsonl"""
        event = {
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "run": "discord-bot",
            "run_id": f"discord-{datetime.now().timestamp()}",
            "iteration": 0,
            "circle": "discord-integration",
            "depth": 0,
            "pattern": pattern,
            "pattern:kebab-name": pattern,
            "mode": mode,
            "mutation": False,
            "gate": gate,
            "framework": "discord.py",
            "scheduler": "discord-event-loop",
            "tags": ["Discord", "Integration"],
            "economic": {"cod": 0.0, "wsjf_score": 0.0},
            "reason": reason,
            "action": action,
            "prod_mode": "advisory",
        }
        if metrics:
            event["metrics"] = metrics

        try:
            GOALIE_DIR.mkdir(parents=True, exist_ok=True)
            with open(PATTERN_METRICS, "a") as f:
                f.write(json.dumps(event) + "\n")
        except Exception as e:
            print(f"⚠️ Failed to log pattern metric: {e}")


client = AgenticFlowBot()


@client.tree.command(name="retro", description="Show last 5 retrospective insights")
async def retro_command(interaction: discord.Interaction):
    """Show last 5 insights from .goalie/insights_log.jsonl"""
    await interaction.response.defer(thinking=True)

    try:
        await client.log_pattern_metric(
            pattern="discord-retro-command",
            mode="advisory",
            gate="command-invocation",
            reason="User requested retro insights",
            action="read-insights",
            metrics={"user_id": str(interaction.user.id)},
        )

        if not INSIGHTS_LOG.exists():
            await interaction.followup.send(
                f"⚠️ No insights log found at `{INSIGHTS_LOG}`\nRun calibration first to generate insights."
            )
            return

        # Read last 5 insights
        insights = []
        with open(INSIGHTS_LOG, "r") as f:
            for line in f:
                try:
                    insights.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue

        if not insights:
            await interaction.followup.send("📊 No insights available yet.")
            return

        last_5 = insights[-5:]
        embed = discord.Embed(
            title="🔍 Latest Retrospective Insights",
            description=f"Last {len(last_5)} insights from Agentic Flow",
            color=discord.Color.blue(),
            timestamp=datetime.now(timezone.utc),
        )

        for i, insight in enumerate(last_5, 1):
            pattern = insight.get("pattern", "unknown")
            action = insight.get("action", "N/A")
            verified = insight.get("verified", False)
            status_emoji = "✅" if verified else "⏳"

            embed.add_field(
                name=f"{status_emoji} {i}. {pattern}",
                value=f"Action: {action}\nVerified: {verified}",
                inline=False,
            )

        embed.set_footer(text=f"Source: {INSIGHTS_LOG}")
        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"❌ Error reading insights: {str(e)}")
        print(f"Error in /retro command: {e}")


@client.tree.command(name="metrics", description="Show live pattern metrics")
async def metrics_command(interaction: discord.Interaction):
    """Show live pattern metrics from .goalie/pattern_metrics.jsonl"""
    await interaction.response.defer(thinking=True)

    try:
        await client.log_pattern_metric(
            pattern="discord-metrics-command",
            mode="advisory",
            gate="command-invocation",
            reason="User requested pattern metrics",
            action="read-metrics",
            metrics={"user_id": str(interaction.user.id)},
        )

        if not PATTERN_METRICS.exists():
            await interaction.followup.send(
                f"⚠️ No pattern metrics found at `{PATTERN_METRICS}`\nRun calibration first to generate metrics."
            )
            return

        # Read last 10 pattern metrics
        metrics = []
        with open(PATTERN_METRICS, "r") as f:
            for line in f:
                try:
                    metrics.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue

        if not metrics:
            await interaction.followup.send("📊 No metrics available yet.")
            return

        last_10 = metrics[-10:]

        # Aggregate pattern counts
        pattern_counts = {}
        for metric in last_10:
            pattern = metric.get("pattern", "unknown")
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

        embed = discord.Embed(
            title="📊 Live Pattern Metrics",
            description=f"Last {len(last_10)} events",
            color=discord.Color.green(),
            timestamp=datetime.now(timezone.utc),
        )

        # Top patterns
        sorted_patterns = sorted(
            pattern_counts.items(), key=lambda x: x[1], reverse=True
        )[:5]
        embed.add_field(
            name="🔝 Top Patterns",
            value="\n".join(
                [f"`{pattern}`: {count}" for pattern, count in sorted_patterns]
            )
            or "N/A",
            inline=False,
        )

        # Latest event
        latest = last_10[-1]
        embed.add_field(
            name="🕐 Latest Event",
            value=f"Pattern: `{latest.get('pattern', 'N/A')}`\nMode: {latest.get('mode', 'N/A')}",
            inline=False,
        )

        embed.set_footer(text=f"Source: {PATTERN_METRICS}")
        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"❌ Error reading metrics: {str(e)}")
        print(f"Error in /metrics command: {e}")


@client.tree.command(name="governance", description="Trigger governance agent")
async def governance_command(interaction: discord.Interaction):
    """Trigger governance agent and report status"""
    await interaction.response.defer(thinking=True)

    try:
        await client.log_pattern_metric(
            pattern="discord-governance-command",
            mode="advisory",
            gate="command-invocation",
            reason="User triggered governance agent",
            action="execute-governance",
            metrics={"user_id": str(interaction.user.id)},
        )

        if not GOVERNANCE_SCRIPT.exists():
            await interaction.followup.send(
                f"⚠️ Governance script not found at `{GOVERNANCE_SCRIPT}`"
            )
            return

        # Execute governance agent via Node.js
        await interaction.followup.send("⏳ Running governance agent...")

        result = subprocess.run(
            ["npx", "tsx", str(GOVERNANCE_SCRIPT), "--goalie-dir", str(GOALIE_DIR), "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode == 0:
            try:
                governance_data = json.loads(result.stdout)
                gov_summary = governance_data.get("governanceSummary", {})
                relentless = governance_data.get("relentlessExecution", {})
                top_gaps = governance_data.get("topEconomicGaps", [])

                embed = discord.Embed(
                    title="⚖️ Governance Agent Report",
                    color=discord.Color.gold(),
                    timestamp=datetime.now(timezone.utc),
                )

                embed.add_field(
                    name="📈 Reviews",
                    value=f"Total: {gov_summary.get('total', 0)}\nOK: {gov_summary.get('ok', 0)}\nFailed: {gov_summary.get('failed', 0)}",
                    inline=True,
                )

                embed.add_field(
                    name="🚀 Execution",
                    value=f"Actions Done: {relentless.get('pctActionsDone', 0):.1f}%\nAvg Cycle Time: {relentless.get('avgCycleTimeSec', 0):.1f}s",
                    inline=True,
                )

                if top_gaps:
                    gap_list = "\n".join(
                        [f"• {gap['pattern']} (impact: {gap['totalImpactAvg']:.0f})" for gap in top_gaps[:3]]
                    )
                    embed.add_field(
                        name="🎯 Top Economic Gaps",
                        value=gap_list,
                        inline=False,
                    )

                embed.set_footer(text="Governance agent executed successfully")
                await interaction.followup.send(embed=embed)

            except json.JSONDecodeError:
                await interaction.followup.send(
                    f"✅ Governance agent completed\n```\n{result.stdout[:1800]}\n```"
                )
        else:
            await interaction.followup.send(
                f"❌ Governance agent failed (exit code {result.returncode})\n```\n{result.stderr[:1800]}\n```"
            )

    except subprocess.TimeoutExpired:
        await interaction.followup.send(
            "⏱️ Governance agent timed out (>30s)"
        )
    except Exception as e:
        await interaction.followup.send(f"❌ Error executing governance: {str(e)}")
        print(f"Error in /governance command: {e}")


def deploy_discord_bot():
    """Deploy Discord bot with slash commands"""
    if not DISCORD_BOT_TOKEN:
        print("⚠️ DISCORD_BOT_TOKEN not set. Skipping deployment.")
        return False

    print("🚀 Starting Agentic Flow Discord Bot...")
    print(f"📁 Goalie directory: {GOALIE_DIR.absolute()}")
    print(f"📊 Insights log: {INSIGHTS_LOG}")
    print(f"📈 Pattern metrics: {PATTERN_METRICS}")
    print(f"⚖️ Governance script: {GOVERNANCE_SCRIPT}")

    try:
        client.run(DISCORD_BOT_TOKEN)
        return True
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")
        return False


if __name__ == "__main__":
    if deploy_discord_bot():
        sys.exit(0)
    else:
        sys.exit(1)

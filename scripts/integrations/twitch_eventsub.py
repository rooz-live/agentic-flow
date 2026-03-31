#!/usr/bin/env python3
"""
Twitch EventSub Webhook Listener - Stream Online Notifications

Listens for Twitch stream.online events and posts governance alerts to Discord.

Features:
- Twitch EventSub webhook verification (HMAC-SHA256)
- Automatic subscription to stream.online events
- Triggers governance agent on stream start
- Posts governance summary to Discord channel
- Pattern metrics logging

Usage:
    python3 scripts/integrations/twitch_eventsub.py --port 8080 --public-url https://your-domain.com/twitch/webhook
    
Requirements:
    pip install flask requests
"""

import os
import sys
import json
import hmac
import hashlib
import subprocess
import requests
from pathlib import Path
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from typing import Dict, Any, Optional

# Configuration
GOALIE_DIR = Path(os.getenv("GOALIE_DIR", ".goalie"))
PATTERN_METRICS = GOALIE_DIR / "pattern_metrics.jsonl"
GOVERNANCE_SCRIPT = Path("tools/federation/governance_agent.ts")

TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")
TWITCH_CHANNEL_NAME = os.getenv("TWITCH_CHANNEL_NAME")
TWITCH_WEBHOOK_SECRET = os.getenv("TWITCH_WEBHOOK_SECRET")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_ALERTS_CHANNEL_ID = os.getenv("DISCORD_ALERTS_CHANNEL_ID")

# Global state
app = Flask(__name__)
app_access_token = None
broadcaster_user_id = None


def log_pattern_metric(
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
        "run": "twitch-eventsub",
        "run_id": f"twitch-{datetime.now().timestamp()}",
        "iteration": 0,
        "circle": "twitch-integration",
        "depth": 0,
        "pattern": pattern,
        "pattern:kebab-name": pattern,
        "mode": mode,
        "mutation": False,
        "gate": gate,
        "framework": "flask",
        "scheduler": "twitch-webhook",
        "tags": ["Twitch", "EventSub", "Integration"],
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


def get_app_access_token() -> Optional[str]:
    """Get app access token from Twitch"""
    global app_access_token
    
    if app_access_token:
        return app_access_token
    
    try:
        response = requests.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": TWITCH_CLIENT_ID,
                "client_secret": TWITCH_CLIENT_SECRET,
                "grant_type": "client_credentials",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        app_access_token = data.get("access_token")
        print(f"✅ Obtained Twitch app access token")
        return app_access_token
    except Exception as e:
        print(f"❌ Failed to get app access token: {e}")
        return None


def get_user_id(username: str) -> Optional[str]:
    """Get Twitch user ID from username"""
    token = get_app_access_token()
    if not token:
        return None
    
    try:
        response = requests.get(
            "https://api.twitch.tv/helix/users",
            headers={
                "Client-ID": TWITCH_CLIENT_ID,
                "Authorization": f"Bearer {token}",
            },
            params={"login": username},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("data"):
            user_id = data["data"][0]["id"]
            print(f"✅ Found user ID for {username}: {user_id}")
            return user_id
        return None
    except Exception as e:
        print(f"❌ Failed to get user ID: {e}")
        return None


def subscribe_to_stream_online(callback_url: str, user_id: str) -> bool:
    """Subscribe to stream.online events"""
    token = get_app_access_token()
    if not token:
        return False
    
    try:
        response = requests.post(
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            headers={
                "Client-ID": TWITCH_CLIENT_ID,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "type": "stream.online",
                "version": "1",
                "condition": {"broadcaster_user_id": user_id},
                "transport": {
                    "method": "webhook",
                    "callback": callback_url,
                    "secret": TWITCH_WEBHOOK_SECRET,
                },
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Subscribed to stream.online events")
        print(f"   Subscription ID: {data['data'][0]['id']}")
        print(f"   Status: {data['data'][0]['status']}")
        
        log_pattern_metric(
            pattern="twitch-eventsub-subscribed",
            mode="advisory",
            gate="subscription-created",
            reason=f"Subscribed to stream.online for {TWITCH_CHANNEL_NAME}",
            action="subscribe",
            metrics={"user_id": user_id, "subscription_id": data['data'][0]['id']},
        )
        return True
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 409:
            print(f"⚠️ Subscription already exists")
            return True
        print(f"❌ Failed to subscribe: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ Failed to subscribe: {e}")
        return False


def verify_twitch_signature(request) -> bool:
    """Verify Twitch EventSub signature"""
    message_id = request.headers.get("Twitch-Eventsub-Message-Id", "")
    timestamp = request.headers.get("Twitch-Eventsub-Message-Timestamp", "")
    signature = request.headers.get("Twitch-Eventsub-Message-Signature", "")
    
    if not all([message_id, timestamp, signature]):
        return False
    
    message = message_id + timestamp + request.get_data(as_text=True)
    expected_signature = "sha256=" + hmac.new(
        TWITCH_WEBHOOK_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


def run_governance_agent() -> Dict[str, Any]:
    """Execute governance agent and return results"""
    try:
        result = subprocess.run(
            ["npx", "tsx", str(GOVERNANCE_SCRIPT), "--goalie-dir", str(GOALIE_DIR), "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            print(f"❌ Governance agent failed: {result.stderr}")
            return {}
    except subprocess.TimeoutExpired:
        print("⏱️ Governance agent timed out")
        return {}
    except Exception as e:
        print(f"❌ Error running governance agent: {e}")
        return {}


def post_to_discord(governance_data: Dict[str, Any], stream_info: Dict[str, Any]) -> bool:
    """Post governance alert to Discord channel"""
    if not DISCORD_BOT_TOKEN or not DISCORD_ALERTS_CHANNEL_ID:
        print("⚠️ Discord credentials not configured")
        return False
    
    try:
        gov_summary = governance_data.get("governanceSummary", {})
        relentless = governance_data.get("relentlessExecution", {})
        top_gaps = governance_data.get("topEconomicGaps", [])
        
        # Build Discord embed
        embed = {
            "title": "🔴 Stream Online - Governance Alert",
            "description": f"**{stream_info.get('broadcaster_user_name')}** just went live!",
            "color": 0x9146FF,  # Twitch purple
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fields": [
                {
                    "name": "📈 Governance Reviews",
                    "value": f"Total: {gov_summary.get('total', 0)} | OK: {gov_summary.get('ok', 0)} | Failed: {gov_summary.get('failed', 0)}",
                    "inline": True,
                },
                {
                    "name": "🚀 Execution Metrics",
                    "value": f"Actions Done: {relentless.get('pctActionsDone', 0):.1f}%\nAvg Cycle: {relentless.get('avgCycleTimeSec', 0):.1f}s",
                    "inline": True,
                },
            ],
            "footer": {"text": "Triggered by Twitch EventSub"},
        }
        
        if top_gaps:
            gap_list = "\n".join(
                [f"• {gap['pattern']} (impact: {gap['totalImpactAvg']:.0f})" for gap in top_gaps[:3]]
            )
            embed["fields"].append({
                "name": "🎯 Top Economic Gaps",
                "value": gap_list,
                "inline": False,
            })
        
        # Post to Discord
        response = requests.post(
            f"https://discord.com/api/v10/channels/{DISCORD_ALERTS_CHANNEL_ID}/messages",
            headers={
                "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
                "Content-Type": "application/json",
            },
            json={"embeds": [embed]},
            timeout=10,
        )
        response.raise_for_status()
        
        print(f"✅ Posted governance alert to Discord")
        log_pattern_metric(
            pattern="discord-governance-alert-posted",
            mode="advisory",
            gate="stream-online",
            reason=f"Posted governance alert for {stream_info.get('broadcaster_user_name')} stream",
            action="post-discord",
            metrics={"channel_id": DISCORD_ALERTS_CHANNEL_ID},
        )
        return True
        
    except Exception as e:
        print(f"❌ Failed to post to Discord: {e}")
        return False


@app.route("/twitch/webhook", methods=["POST"])
def twitch_webhook():
    """Handle Twitch EventSub webhook"""
    # Verify signature
    if not verify_twitch_signature(request):
        print("❌ Invalid Twitch signature")
        return jsonify({"error": "Invalid signature"}), 403
    
    data = request.get_json()
    message_type = request.headers.get("Twitch-Eventsub-Message-Type")
    
    # Handle webhook verification challenge
    if message_type == "webhook_callback_verification":
        challenge = data.get("challenge")
        print(f"✅ Webhook verification challenge received")
        log_pattern_metric(
            pattern="twitch-webhook-verified",
            mode="advisory",
            gate="webhook-verification",
            reason="Twitch webhook verification completed",
            action="verify",
        )
        return challenge, 200, {"Content-Type": "text/plain"}
    
    # Handle notification
    elif message_type == "notification":
        event = data.get("event", {})
        subscription = data.get("subscription", {})
        
        print(f"\n🔴 Stream Online Event Received")
        print(f"   Broadcaster: {event.get('broadcaster_user_name')}")
        print(f"   Started at: {event.get('started_at')}")
        
        log_pattern_metric(
            pattern="twitch-stream-online",
            mode="advisory",
            gate="stream-notification",
            reason=f"Stream went online: {event.get('broadcaster_user_name')}",
            action="stream-online",
            metrics={
                "broadcaster_id": event.get("broadcaster_user_id"),
                "broadcaster_name": event.get("broadcaster_user_name"),
            },
        )
        
        # Run governance agent
        print("⚙️ Running governance agent...")
        governance_data = run_governance_agent()
        
        # Post to Discord
        if governance_data:
            post_to_discord(governance_data, event)
        
        return jsonify({"status": "ok"}), 200
    
    # Handle revocation
    elif message_type == "revocation":
        print(f"⚠️ Subscription revoked: {data.get('subscription', {}).get('id')}")
        log_pattern_metric(
            pattern="twitch-subscription-revoked",
            mode="advisory",
            gate="subscription-revocation",
            reason="EventSub subscription was revoked",
            action="revoke",
        )
        return jsonify({"status": "ok"}), 200
    
    return jsonify({"status": "ok"}), 200


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "twitch-eventsub",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Twitch EventSub Webhook Listener")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--public-url", required=True, help="Public HTTPS URL for webhook (e.g., https://your-domain.com/twitch/webhook)")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    args = parser.parse_args()
    
    # Validate configuration
    if not all([TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_CHANNEL_NAME, TWITCH_WEBHOOK_SECRET]):
        print("❌ Missing Twitch configuration. Check .env.production")
        sys.exit(1)
    
    if not all([DISCORD_BOT_TOKEN, DISCORD_ALERTS_CHANNEL_ID]):
        print("❌ Missing Discord configuration. Check .env.production")
        sys.exit(1)
    
    print("\n🎬 Twitch EventSub Webhook Listener")
    print(f"   Channel: {TWITCH_CHANNEL_NAME}")
    print(f"   Webhook URL: {args.public_url}")
    print(f"   Discord Channel: {DISCORD_ALERTS_CHANNEL_ID}")
    
    # Get broadcaster user ID
    global broadcaster_user_id
    broadcaster_user_id = get_user_id(TWITCH_CHANNEL_NAME)
    if not broadcaster_user_id:
        print(f"❌ Failed to get user ID for {TWITCH_CHANNEL_NAME}")
        sys.exit(1)
    
    # Subscribe to stream.online events
    if not subscribe_to_stream_online(args.public_url, broadcaster_user_id):
        print("❌ Failed to subscribe to stream.online events")
        sys.exit(1)
    
    print(f"\n✅ EventSub listener ready")
    print(f"   Listening on {args.host}:{args.port}")
    print(f"   Press Ctrl+C to stop\n")
    
    # Start Flask server
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()

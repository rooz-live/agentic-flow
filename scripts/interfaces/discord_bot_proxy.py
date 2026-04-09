#!/usr/bin/env python3
"""
@business-context WSJF-Cycle-44: Local Interface Orchestration
@adr ADR-042: Bypassing cloud dependencies matching Discord message limits
@constraint DDD-INTERFACE: Bounding Ollama temporal execution parameters (1000/2500/5000 max_tokens)

discord-bot-proxy.py
Middleware interceptor chunking responses securely and delegating
commands to the local Ollama API (localhost:11434).
"""

import json
import logging
import urllib.request
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class OllamaDiscordMiddleware:
    def __init__(self, ollama_url="http://localhost:11434"):
        self.ollama_url = ollama_url
        self.max_message_length = 4000 # Discord strict chunk limit

        # If we are in validation pipeline, safely use offline bounds
        self.discord_token = os.environ.get("DISCORD_BOT_TOKEN", "mock_offline_string_for_tdd")

    def route_to_ollama(self, prompt: str, token_budget: int = 2500) -> str:
        """Sync to Local CLI Ollama using explicit token constraints."""
        payload = {
            "model": "gemma2", # General purpose proxy model standard
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_ctx": token_budget
            }
        }
        
        req = urllib.request.Request(f"{self.ollama_url}/api/generate", data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                response = json.loads(res.read().decode("utf-8"))
                return response.get("response", "[Error] Blank trace returned from Ollama node.")
        except Exception as e:
            logging.error(f"Ollama REST API timeout or connection failure: {str(e)}")
            return f"[Offline Hub] Currently unreachable bridging context: {str(e)}"

    def chunk_response(self, text: str) -> list:
        """Respecting the strict 4K payload constraints of Discord/Telegram"""
        return [text[i:i + self.max_message_length] for i in range(0, len(text), self.max_message_length)]

    def parse_temporal_string(self, user_command: str) -> int:
        """Parses dynamic zoom strings (hours, days, weeks, months, seasons) into minutes."""
        # Baseline limits
        temporal_limit = 2500
        if "1000" in user_command: temporal_limit = 1000
        elif "5000" in user_command: temporal_limit = 5000

        # Zoom factors
        if "hour" in user_command: return temporal_limit * 60
        if "day" in user_command: return temporal_limit * 60 * 24
        if "week" in user_command: return temporal_limit * 60 * 24 * 7
        if "month" in user_command: return temporal_limit * 60 * 24 * 30
        if "season" in user_command: return temporal_limit * 60 * 24 * 90
        
        return temporal_limit

    def check_temporal_bounds(self, timestamp: str, timeout_mins: int) -> bool:
        """Determines if the requested history payload falls within temporal contextual boundaries."""
        from datetime import datetime, timezone
        
        try:
            req_time = datetime.fromisoformat(timestamp)
            delta = datetime.now(timezone.utc) - req_time
            if delta.total_seconds() / 60 > timeout_mins:
                return False
            return True
        except ValueError:
            return True

    def get_turboquant_vector(self):
        """Retrieves financial probability matrices mapped directly from telemetry limits."""
        tq_path = Path(".goalie/trading_ledger.json")
        if tq_path.exists():
            return tq_path.read_text()
        return "[TurboQuant Bounds Unregistered Native Fallback]"

    def handle_command(self, user_command: str):
        """Routing multiplexer mapping temporal targets natively."""
        temporal_limit = self.parse_temporal_string(user_command)
            
        if user_command.startswith("!catalogue"):
            logging.info(f"Accessing WSJF Backlog Catalog (Temporal Bound: {temporal_limit}m)")
            return self.chunk_response(self.route_to_ollama(f"Ensure summary is contextually bounded to {temporal_limit} min limit: Summarize the current capabilities tracking catalog natively.", temporal_limit))
            
        elif user_command.startswith("!turboquant"):
            logging.info(f"Accessing TurboQuant Integration Matrix (Temporal Bound: {temporal_limit}m)")
            tq_matrix = self.get_turboquant_vector()
            return self.chunk_response(self.route_to_ollama(f"Evaluate the following TurboQuant traces under limit {temporal_limit}min context mapping: {tq_matrix}", temporal_limit))

        elif user_command.startswith("!discbot"):
            logging.info(f"Direct integration ping to Ollama (Temporal Bound: {temporal_limit}m)")
            return self.chunk_response(self.route_to_ollama(user_command.replace("!discbot", "").strip(), temporal_limit))
        
        return []

def main():
    if len(sys.argv) > 1:
        command = " ".join(sys.argv[1:])
        bot = OllamaDiscordMiddleware()
        output_chunks = bot.handle_command(command)
        for idx, chunk in enumerate(output_chunks):
            print(f"--- Chunk {idx+1} ---\n{chunk}")
    else:
        print("Usage: discord-bot-proxy.py '!discbot System prompt checking'")

if __name__ == "__main__":
    main()

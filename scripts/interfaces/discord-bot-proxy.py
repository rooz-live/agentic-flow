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

    def handle_command(self, user_command: str):
        """Routing multiplexer mapping temporal targets natively."""
        temporal_limit = 2500
        if "1000" in user_command: temporal_limit = 1000
        elif "5000" in user_command: temporal_limit = 5000
            
        if user_command.startswith("!catalogue"):
            logging.info(f"Accessing WSJF Backlog Catalog (ctx: {temporal_limit})")
            return self.chunk_response(self.route_to_ollama("Summarize the current capabilities tracking catalog natively.", temporal_limit))
            
        elif user_command.startswith("!discbot"):
            logging.info(f"Direct integration ping to Ollama (ctx: {temporal_limit})")
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

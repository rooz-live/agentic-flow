#!/usr/bin/env python3
"""
@business-context WSJF-Cycle-46: Universal TLD API Edge 
@adr ADR-042: Exposing temporal proxy limits universally to web UI networks.
@constraint DDD-INTERFACE: Bounding Ollama temporal execution parameters inside an HTTP server locally.

universal_bridge_proxy.py
Platform-neutral Universal API mapping offline dependencies to HTTP architectures
"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys
from pathlib import Path

# Fix import path logically ensuring we can hit interface endpoints
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from scripts.interfaces import discord_bot_proxy

KELLY_CONFIG_PATH = project_root / ".neural-trader" / "kelly_tuning.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class UniversalBridgeHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
            command = payload.get("command", "")
            
            # Utilize the natively tested module orchestrator
            bot = discord_bot_proxy.OllamaDiscordMiddleware()
            output_chunks = bot.handle_command(command)
            
            # Read explicit MoE Kelly tuning boundaries for HostBill linkage
            hostbill_neural_limits = {}
            if KELLY_CONFIG_PATH.exists():
                with open(KELLY_CONFIG_PATH, 'r') as f:
                    hostbill_neural_limits = json.load(f)

            response = {
                "status": "success",
                "chunks": output_chunks,
                "temporal_trace_bounds": "active",
                "hostbill_neural_limits": hostbill_neural_limits
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

def run_server(port=5050):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, UniversalBridgeHandler)
    logging.info(f"Universal Temporal Edge Booted -> http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logging.info("Universal Temporal Edge safely disconnected.")

if __name__ == "__main__":
    run_server()

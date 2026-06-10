#!/usr/bin/env python3
"""
ide_control_daemon.py — Host-side RPC Control Daemon

Listens on localhost:8888 for session reset requests. Writes incoming rehydration
manifests to the workspace and outputs instructions for resetting the chat context.
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8888
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

class IDEControlHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress standard logging to keep console clean for signals
        pass

    def do_POST(self):
        if self.path == "/session/reset":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": f"Invalid JSON: {e}"}).encode("utf-8"))
                return

            # Write manifest to .goalie/evidence/learning/rehydration_latest.json
            learning_dir = os.path.join(REPO_ROOT, ".goalie", "evidence", "learning")
            os.makedirs(learning_dir, exist_ok=True)
            
            latest_path = os.path.join(learning_dir, "rehydration_latest.json")
            with open(latest_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            signal_path = os.path.join(learning_dir, "reset_signal.json")
            with open(signal_path, "w", encoding="utf-8") as f:
                json.dump({"reset_triggered": True, "timestamp": data.get("timestamp_utc", "")}, f, indent=2)

            # Output highly visible terminal prompt for the operator/IDE extension
            print("\n" + "=" * 80)
            print(" [IDE_RESET] AUTOMATED SESSION RESET TRIGGERED!")
            print(f" Manifest saved to: {latest_path}")
            print(" Please clear the LLM context window / open a clean session thread.")
            print(" Load the manifest context to continue the next wave autonomously.")
            print("=" * 80 + "\n")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "message": "session reset manifest saved"}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=IDEControlHandler):
    server_address = ("127.0.0.1", PORT)
    httpd = server_class(server_address, handler_class)
    print(f"ide_control_daemon: listening on http://127.0.0.1:{PORT} ...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ide_control_daemon.")
        sys.exit(0)

if __name__ == "__main__":
    run()

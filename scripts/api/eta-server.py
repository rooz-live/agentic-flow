#!/usr/bin/env python3
"""
eta-server.py - Simple HTTP API to serve ETA data for dashboard
Provides /api/eta-state endpoint for real-time progress tracking
"""

import json
import os
import time
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import threading

class ETAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/eta-state':
            self.serve_eta_state()
        elif parsed_path.path == '/api/tdd-history':
            self.serve_tdd_history()
        elif parsed_path.path == '/api/exit-codes':
            self.serve_exit_codes()
        else:
            # Serve static files from dashboard directory
            super().do_GET()
    
    def serve_eta_state(self):
        """Serve current ETA state from bounded reasoning framework"""
        try:
            # Read the global state file
            state_file = '/tmp/eta-current-state.json'
            if os.path.exists(state_file):
                with open(state_file, 'r') as f:
                    data = json.load(f)
            else:
                # Return empty state if no file exists
                data = {"components": {}, "timestamp": datetime.utcnow().isoformat()}
            
            # Add server timestamp
            data['server_timestamp'] = datetime.utcnow().isoformat()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_error(500, f"Error reading ETA state: {str(e)}")
    
    def serve_tdd_history(self):
        """Serve TDD traceability history"""
        try:
            # Read TDD history from log file
            tdd_file = '/tmp/tdd-history.jsonl'
            history = []
            
            if os.path.exists(tdd_file):
                with open(tdd_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            history.append(json.loads(line))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(history).encode())
        except Exception as e:
            self.send_error(500, f"Error reading TDD history: {str(e)}")
    
    def serve_exit_codes(self):
        """Serve exit code analytics"""
        try:
            # Read exit code metrics
            metrics_file = '/tmp/exit-code-metrics.json'
            if os.path.exists(metrics_file):
                with open(metrics_file, 'r') as f:
                    data = json.load(f)
            else:
                # Mock data for demo
                data = {
                    "success_rate": 87.5,
                    "avg_eta": 42,
                    "failure_count": 3,
                    "last_24h": {
                        "0": 15,  # Success
                        "111": 2,  # Placeholder detected
                        "116": 1   # All tunnels failed
                    }
                }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_error(500, f"Error reading exit codes: {str(e)}")

def log_tdd_entry(entry_type, message, details=None):
    """Log a TDD entry to the history file"""
    tdd_file = '/tmp/tdd-history.jsonl'
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": entry_type,
        "message": message,
        "details": details or {}
    }
    
    with open(tdd_file, 'a') as f:
        f.write(json.dumps(entry) + '\n')

def start_eta_server(port=8081):
    """Start the ETA API server"""
    # Change to dashboard directory to serve static files
    os.chdir('/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD')
    
    server = HTTPServer(('localhost', port), ETAHandler)
    print(f"ETA API Server running on http://localhost:{port}")
    print(f"Dashboard available at: http://localhost:{port}/WSJF-LIVE-V6-ETA-TRACKED.html")
    
    # Log server start
    log_tdd_entry("green", "ETA API server started", {"port": port})
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down ETA server...")
        log_tdd_entry("refactor", "ETA API server stopped")
        server.shutdown()

if __name__ == '__main__':
    import sys
    
    port = 8081
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    start_eta_server(port)

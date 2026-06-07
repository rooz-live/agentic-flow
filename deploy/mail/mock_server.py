import http.server
import os
import socketserver
import threading
import time
import imaplib
import ssl
import socket

# Custom IMAP4_SSL class that sends a PROXY v1 protocol header first
class IMAP4_SSL_Proxy(imaplib.IMAP4_SSL):
    def open(self, host='', port=993, timeout=None):
        self.host = host
        self.port = port
        # Create raw TCP socket connection
        raw_sock = socket.create_connection((host, port), timeout)
        
        # Send PROXY TCP4 header so Dovecot parses the remote client IP correctly
        proxy_header = f"PROXY TCP4 192.168.122.1 {host} 12345 {port}\r\n"
        raw_sock.sendall(proxy_header.encode('ascii'))
        
        # Wrap with SSL/TLS
        if self.ssl_context is None:
            self.ssl_context = ssl.create_default_context()
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE
            
        self.sock = self.ssl_context.wrap_socket(raw_sock, server_hostname=host)
        self.file = self.sock.makefile('rb')

class MailStoreHandler(http.server.SimpleHTTPRequestHandler):
    def do_HEAD(self):
        if self.path not in ("/", "/admin", "/admin/"):
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

    def do_GET(self):
        if self.path not in ("/", "/admin", "/admin/"):
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        
        html = """<!DOCTYPE html>
<html>
<head>
    <title>MailStore Archive Server - admin.bhopti.com</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f8fafc;
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px;
            width: 650px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(to right, #38bdf8, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }
        .subtitle {
            color: #94a3b8;
            font-size: 1rem;
            margin-bottom: 30px;
        }
        .status-badge {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 30px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            text-align: left;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
        }
        .card-title {
            color: #64748b;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }
        .card-value {
            font-size: 1.25rem;
            font-weight: 600;
            color: #e2e8f0;
        }
        .logs {
            background: #090d16;
            border-radius: 12px;
            padding: 16px;
            font-family: monospace;
            font-size: 0.8rem;
            text-align: left;
            color: #38bdf8;
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>MailStore Server</h1>
        <div class="subtitle">Sovereign Email Archiving Service (StarlingX Edge)</div>
        <div class="status-badge">● System Status: Operational</div>
        
        <div class="grid">
            <div class="card">
                <div class="card-title">IMAP Source</div>
                <div class="card-value">cpanel-whm:993</div>
            </div>
            <div class="card">
                <div class="card-title">Excluded Domains</div>
                <div class="card-value">rooz.live (Google MX)</div>
            </div>
            <div class="card">
                <div class="card-title">Total Ingested Space</div>
                <div class="card-value">50.3 GB</div>
            </div>
            <div class="card">
                <div class="card-title">Last Sync Status</div>
                <div class="card-value" style="color: #10b981;">SUCCESS</div>
            </div>
        </div>
        
        <div class="logs">
            [SYS] MailStore Mock Service initialized on port 8081.<br>
            [IMAP] Running IMAP ingestion job from cpanel-whm:993...<br>
            [IMAP] Sending HAProxy PROXY v1 header...<br>
            [IMAP] Connected successfully via SSL.<br>
            [IMAP] Domain filter applied: excluding rooz.live.<br>
            [IMAP] Ingested 12 user accounts successfully. Status: OK.<br>
            [SYS] Waiting for next scheduled sync.
        </div>
    </div>
</body>
</html>
"""
        self.wfile.write(html.encode("utf-8"))

def run_imap_ingest_loop():
    import imap_ingest
    import os
    interval = int(os.environ.get("IMAP_INGEST_INTERVAL_SEC", "300"))
    while True:
        try:
            imap_ingest.run_once()
        except Exception as e:
            print(f"[IMAP] Ingestion failed: {e}")
        time.sleep(interval)

if __name__ == "__main__":
    threading.Thread(target=run_imap_ingest_loop, daemon=True).start()
    
    PORT = 8081
    with socketserver.TCPServer(("", PORT), MailStoreHandler) as httpd:
        print(f"Serving MailStore admin interface on port {PORT}")
        httpd.serve_forever()

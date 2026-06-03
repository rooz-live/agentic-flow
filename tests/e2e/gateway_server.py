from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys
import os

# Append the rust bridge library
sys.path.insert(0, '/Users/shahroozbhopti/Documents/code/src/rust/eventops_pyo3/target/release/')
import eventops_pyo3

SECRET = "whsec_bhopti_12345"

class StripeGatewayHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/webhooks/stripe':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            sig_header = self.headers.get('Stripe-Signature', '')
            
            try:
                # Validation Gate: PyO3 Rust Bridge enforces cryptography
                eventops_pyo3.validate_stripe_signature(post_data, sig_header, SECRET)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status": "forwarded"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run():
    print("Starting TDD Gateway on port 9090...")
    HTTPServer(('127.0.0.1', 9090), StripeGatewayHandler).serve_forever()

if __name__ == '__main__':
    run()

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys
import os

# Append the rust bridge library
sys.path.insert(0, '/tmp/eventops_edge_deployment/rust_bridge/.venv/lib/python3.10/site-packages')
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
                
                # If it doesn't throw, it's valid! Forward to HostBill (mocked)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status": "forwarded_to_hostbill"}')
                
            except Exception as e:
                # Validation Failed -> Return 400 Bad Request to reject Stripe payload
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=StripeGatewayHandler, port=9090):
    server_address = ('127.0.0.1', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting Stripe Webhook Gateway on 127.0.0.1:{port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run()

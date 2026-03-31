#!/usr/bin/env python3
"""
Stripe Webhook Handler for go.rooz.live / interface.rooz.live

Features:
- Webhook signature verification (PCI-DSS requirement)
- Event processing and logging
- Idempotency handling
- Rate limiting
- Multi-environment support (test/prod)

Deployment:
    # Flask server
    python3 scripts/stripe_webhook_handler.py --port 5000
    
    # With nginx reverse proxy
    # nginx config: proxy_pass http://localhost:5000/webhooks/stripe
    
Environment Variables:
    STRIPE_WEBHOOK_SECRET - Webhook signing secret (whsec_...)
    STRIPE_TEST_SECRET_KEY - Test mode secret key
    FLASK_ENV - 'development' or 'production'
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from collections import defaultdict

try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    print("⚠️  stripe package not installed. Install with: pip3 install stripe")

try:
    from flask import Flask, request, jsonify
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("⚠️  flask package not installed. Install with: pip3 install flask")


class StripeWebhookHandler:
    """Handle incoming Stripe webhook events with security best practices"""
    
    def __init__(self, webhook_secret: str, log_dir: str = "logs"):
        self.webhook_secret = webhook_secret
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Event processing state
        self.processed_events = set()  # For idempotency
        self.rate_limiter = defaultdict(list)  # For rate limiting
        
        # Setup logging
        self.logger = self._setup_logging()
    
    def _setup_logging(self) -> logging.Logger:
        """Configure logging for webhook events"""
        logger = logging.getLogger('stripe_webhook')
        logger.setLevel(logging.INFO)
        
        # File handler
        log_file = self.log_dir / f"stripe_webhooks_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature to prevent spoofing (PCI-DSS requirement)"""
        if not STRIPE_AVAILABLE:
            self.logger.error("Stripe SDK not available")
            return False
        
        try:
            stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return True
        except stripe.error.SignatureVerificationError as e:
            self.logger.error(f"Signature verification failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected verification error: {e}")
            return False
    
    def is_duplicate_event(self, event_id: str) -> bool:
        """Check if event has already been processed (idempotency)"""
        if event_id in self.processed_events:
            self.logger.info(f"Duplicate event detected: {event_id}")
            return True
        return False
    
    def check_rate_limit(self, ip_address: str, limit: int = 100, window: int = 60) -> bool:
        """Check if IP has exceeded rate limit"""
        now = time.time()
        cutoff = now - window
        
        # Clean old entries
        self.rate_limiter[ip_address] = [
            timestamp for timestamp in self.rate_limiter[ip_address]
            if timestamp > cutoff
        ]
        
        # Check limit
        if len(self.rate_limiter[ip_address]) >= limit:
            self.logger.warning(f"Rate limit exceeded for IP: {ip_address}")
            return False
        
        # Add current request
        self.rate_limiter[ip_address].append(now)
        return True
    
    def process_event(self, event: Dict) -> Dict:
        """Process webhook event based on type"""
        event_type = event['type']
        event_id = event['id']
        
        self.logger.info(f"Processing event: {event_id} ({event_type})")
        
        # Mark as processed
        self.processed_events.add(event_id)
        
        # Route to appropriate handler
        handlers = {
            'payment_intent.succeeded': self.handle_payment_success,
            'payment_intent.payment_failed': self.handle_payment_failure,
            'charge.succeeded': self.handle_charge_success,
            'charge.failed': self.handle_charge_failure,
            'customer.subscription.created': self.handle_subscription_created,
            'customer.subscription.updated': self.handle_subscription_updated,
            'customer.subscription.deleted': self.handle_subscription_deleted,
            'invoice.payment_succeeded': self.handle_invoice_paid,
            'invoice.payment_failed': self.handle_invoice_failed,
        }
        
        handler = handlers.get(event_type, self.handle_unknown_event)
        return handler(event)
    
    def handle_payment_success(self, event: Dict) -> Dict:
        """Handle successful payment intent"""
        payment_intent = event['data']['object']
        
        self.logger.info(
            f"Payment succeeded: {payment_intent['id']} - "
            f"${payment_intent['amount']/100:.2f} {payment_intent['currency'].upper()}"
        )
        
        # TODO: Update your database
        # - Mark order as paid
        # - Send confirmation email
        # - Trigger fulfillment
        
        return {
            'status': 'success',
            'action': 'payment_confirmed',
            'payment_id': payment_intent['id']
        }
    
    def handle_payment_failure(self, event: Dict) -> Dict:
        """Handle failed payment intent"""
        payment_intent = event['data']['object']
        
        self.logger.warning(
            f"Payment failed: {payment_intent['id']} - "
            f"Reason: {payment_intent.get('last_payment_error', {}).get('message', 'Unknown')}"
        )
        
        # TODO: Handle payment failure
        # - Notify customer
        # - Retry payment
        # - Cancel order if needed
        
        return {
            'status': 'failed',
            'action': 'payment_retry_needed',
            'payment_id': payment_intent['id']
        }
    
    def handle_charge_success(self, event: Dict) -> Dict:
        """Handle successful charge"""
        charge = event['data']['object']
        
        self.logger.info(
            f"Charge succeeded: {charge['id']} - "
            f"${charge['amount']/100:.2f} {charge['currency'].upper()}"
        )
        
        return {
            'status': 'success',
            'action': 'charge_recorded',
            'charge_id': charge['id']
        }
    
    def handle_charge_failure(self, event: Dict) -> Dict:
        """Handle failed charge"""
        charge = event['data']['object']
        
        self.logger.warning(
            f"Charge failed: {charge['id']} - "
            f"Reason: {charge.get('failure_message', 'Unknown')}"
        )
        
        return {
            'status': 'failed',
            'action': 'charge_declined',
            'charge_id': charge['id']
        }
    
    def handle_subscription_created(self, event: Dict) -> Dict:
        """Handle new subscription"""
        subscription = event['data']['object']
        
        self.logger.info(
            f"Subscription created: {subscription['id']} - "
            f"Customer: {subscription['customer']}"
        )
        
        return {
            'status': 'success',
            'action': 'subscription_activated',
            'subscription_id': subscription['id']
        }
    
    def handle_subscription_updated(self, event: Dict) -> Dict:
        """Handle subscription update"""
        subscription = event['data']['object']
        
        self.logger.info(
            f"Subscription updated: {subscription['id']} - "
            f"Status: {subscription['status']}"
        )
        
        return {
            'status': 'success',
            'action': 'subscription_updated',
            'subscription_id': subscription['id']
        }
    
    def handle_subscription_deleted(self, event: Dict) -> Dict:
        """Handle subscription cancellation"""
        subscription = event['data']['object']
        
        self.logger.info(
            f"Subscription cancelled: {subscription['id']}"
        )
        
        return {
            'status': 'success',
            'action': 'subscription_cancelled',
            'subscription_id': subscription['id']
        }
    
    def handle_invoice_paid(self, event: Dict) -> Dict:
        """Handle paid invoice"""
        invoice = event['data']['object']
        
        self.logger.info(
            f"Invoice paid: {invoice['id']} - "
            f"${invoice['amount_paid']/100:.2f} {invoice['currency'].upper()}"
        )
        
        return {
            'status': 'success',
            'action': 'invoice_paid',
            'invoice_id': invoice['id']
        }
    
    def handle_invoice_failed(self, event: Dict) -> Dict:
        """Handle failed invoice payment"""
        invoice = event['data']['object']
        
        self.logger.warning(
            f"Invoice payment failed: {invoice['id']}"
        )
        
        return {
            'status': 'failed',
            'action': 'invoice_retry_needed',
            'invoice_id': invoice['id']
        }
    
    def handle_unknown_event(self, event: Dict) -> Dict:
        """Handle unknown event type"""
        event_type = event['type']
        
        self.logger.info(f"Unknown event type: {event_type}")
        
        return {
            'status': 'success',
            'action': 'event_logged',
            'event_type': event_type
        }


def create_flask_app(webhook_handler: StripeWebhookHandler) -> Flask:
    """Create Flask app with webhook endpoint"""
    app = Flask(__name__)
    
    @app.route('/webhooks/stripe', methods=['POST'])
    def stripe_webhook():
        """Stripe webhook endpoint"""
        # Get request data
        payload = request.get_data()
        signature = request.headers.get('Stripe-Signature')
        
        if not signature:
            return jsonify({'error': 'Missing signature'}), 400
        
        # Check rate limit
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if not webhook_handler.check_rate_limit(client_ip):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        # Verify signature
        if not webhook_handler.verify_signature(payload, signature):
            return jsonify({'error': 'Invalid signature'}), 400
        
        # Parse event
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON'}), 400
        
        # Check for duplicate
        if webhook_handler.is_duplicate_event(event['id']):
            return jsonify({'received': True, 'note': 'Duplicate event'}), 200
        
        # Process event
        try:
            result = webhook_handler.process_event(event)
            return jsonify({'received': True, 'result': result}), 200
        except Exception as e:
            webhook_handler.logger.error(f"Event processing error: {e}")
            return jsonify({'error': 'Processing failed'}), 500
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'stripe_available': STRIPE_AVAILABLE
        }), 200
    
    @app.route('/webhooks/stripe/test', methods=['POST'])
    def test_webhook():
        """Test webhook endpoint (development only)"""
        if os.getenv('FLASK_ENV') == 'production':
            return jsonify({'error': 'Not available in production'}), 403
        
        return jsonify({
            'message': 'Test endpoint working',
            'timestamp': datetime.now().isoformat()
        }), 200
    
    return app


def find_available_port(start_port: int = 5000, max_attempts: int = 100) -> Optional[int]:
    """Find an available port by scanning sequentially from start_port"""
    import socket
    
    for port in range(start_port, start_port + max_attempts):
        try:
            # Try to bind to the port
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('', port))
                return port
        except OSError:
            # Port is in use, try next
            continue
    
    return None


def main():
    parser = argparse.ArgumentParser(description="Stripe webhook handler server")
    parser.add_argument('--port', type=int, default=None, help='Server port (default: auto-discover from 5000)')
    parser.add_argument('--host', default='*******', help='Server host')
    parser.add_argument('--log-dir', default='logs', help='Log directory')
    parser.add_argument('--no-auto-port', action='store_true', help='Disable automatic port discovery (fail if port unavailable)')
    
    args = parser.parse_args()
    
    # Determine port
    if args.port is None:
        # Auto-discover from 5000
        port = find_available_port(5000)
        if port is None:
            print("❌ No available ports found in range 5000-5099")
            sys.exit(1)
        print(f"ℹ️  Auto-discovered available port: {port}")
    else:
        # User specified port
        if args.no_auto_port:
            port = args.port
        else:
            # Try specified port, fall back to auto-discover
            test_port = find_available_port(args.port, 1)
            if test_port == args.port:
                port = args.port
            else:
                print(f"⚠️  Port {args.port} is in use")
                port = find_available_port(args.port + 1)
                if port is None:
                    print(f"❌ No available ports found starting from {args.port + 1}")
                    sys.exit(1)
                print(f"ℹ️  Using alternate port: {port}")
    
    # Check dependencies
    if not STRIPE_AVAILABLE or not FLASK_AVAILABLE:
        print("❌ Missing required packages")
        print("   Install with: pip3 install stripe flask")
        sys.exit(1)
    
    # Get webhook secret
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    if not webhook_secret:
        print("❌ STRIPE_WEBHOOK_SECRET not set")
        print("   export STRIPE_WEBHOOK_SECRET='whsec_...'")
        sys.exit(1)
    
    # Set Stripe API key (for retrieving event details if needed)
    stripe_key = os.getenv('STRIPE_TEST_SECRET_KEY') or os.getenv('STRIPE_SECRET_KEY')
    if stripe_key:
        stripe.api_key = stripe_key
    
    # Create handler and app
    webhook_handler = StripeWebhookHandler(webhook_secret, args.log_dir)
    app = create_flask_app(webhook_handler)
    
    print("\n🚀 Starting Stripe webhook handler")
    print(f"   Endpoint: http://{args.host}:{port}/webhooks/stripe")
    print(f"   Health check: http://{args.host}:{port}/health")
    print(f"   Logs: {args.log_dir}/")
    print("\n💡 Configure in Stripe Dashboard:")
    print(f"   Webhook URL: https://go.rooz.live/webhooks/stripe")
    print(f"   OR: https://interface.rooz.live/webhooks/stripe")
    print("\n🔒 Security features enabled:")
    print("   ✅ Signature verification")
    print("   ✅ Rate limiting (100 req/min per IP)")
    print("   ✅ Idempotency checks")
    print("   ✅ Event logging")
    print("\nPress Ctrl+C to stop\n")
    
    # Run server
    app.run(
        host=args.host,
        port=port,
        debug=(os.getenv('FLASK_ENV') == 'development')
    )


if __name__ == "__main__":
    main()

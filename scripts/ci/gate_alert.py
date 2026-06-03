#!/usr/bin/env python3
"""
CI/CD Promotion Gate Alert Script

Sends webhook notifications for gate failures.
Configuration loaded from environment variables or config file.
"""

import os
import sys
import json
import requests
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_config():
    """Load configuration from environment or config file."""
    config = {
        'webhook_url': os.getenv('GATE_ALERT_WEBHOOK_URL'),
        'slack_webhook_url': os.getenv('SLACK_WEBHOOK_URL'),
        'alert_thresholds': {
            'failure_rate': float(os.getenv('ALERT_FAILURE_RATE', '0.2')),
            'override_freq': int(os.getenv('ALERT_OVERRIDE_FREQ', '5')),
            'p0_triggers': int(os.getenv('ALERT_P0_TRIGGERS', '10'))
        }
    }

    # Load from config file if exists
    config_file = os.path.join(os.path.dirname(__file__), '../../config/promotion_monitoring.yml')
    if os.path.exists(config_file):
        try:
            import yaml
            with open(config_file, 'r') as f:
                file_config = yaml.safe_load(f)
                config.update(file_config)
        except ImportError:
            logger.warning("PyYAML not available, skipping config file")
        except Exception as e:
            logger.error(f"Error loading config file: {e}")

    return config

def send_webhook_notification(failure_details, config):
    """Send webhook notification for gate failure."""
    if not config.get('webhook_url'):
        logger.warning("No webhook URL configured, skipping notification")
        return False

    payload = {
        'timestamp': datetime.utcnow().isoformat(),
        'event': 'gate_failure',
        'details': failure_details,
        'alert_type': 'immediate' if failure_details.get('severity') == 'critical' else 'standard'
    }

    try:
        response = requests.post(
            config['webhook_url'],
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
        logger.info("Webhook notification sent successfully")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send webhook notification: {e}")
        return False

def send_slack_notification(failure_details, config):
    """Send Slack notification for gate failure."""
    if not config.get('slack_webhook_url'):
        return False

    message = {
        'text': f"🚨 CI/CD Gate Failure Alert\n{failure_details.get('message', 'Gate failure detected')}",
        'attachments': [{
            'color': 'danger',
            'fields': [
                {'title': 'Gate', 'value': failure_details.get('gate_name', 'Unknown'), 'short': True},
                {'title': 'Severity', 'value': failure_details.get('severity', 'Unknown'), 'short': True},
                {'title': 'Time', 'value': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'), 'short': True}
            ]
        }]
    }

    try:
        response = requests.post(
            config['slack_webhook_url'],
            json=message,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
        logger.info("Slack notification sent successfully")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send Slack notification: {e}")
        return False

def check_alert_thresholds(failure_details, config):
    """Check if failure meets alert thresholds."""
    thresholds = config.get('alert_thresholds', {})

    # Check failure rate
    if failure_details.get('failure_rate', 0) > thresholds.get('failure_rate', 0.2):
        failure_details['severity'] = 'critical'
        failure_details['message'] = f"Gate failure rate {failure_details['failure_rate']:.1%} exceeds threshold {thresholds['failure_rate']:.1%}"
        return True

    # Check override frequency
    if failure_details.get('override_count', 0) > thresholds.get('override_freq', 5):
        failure_details['severity'] = 'high'
        failure_details['message'] = f"Override frequency {failure_details['override_count']} exceeds threshold {thresholds['override_freq']}"
        return True

    # Check P0 triggers
    if failure_details.get('p0_count', 0) > thresholds.get('p0_triggers', 10):
        failure_details['severity'] = 'high'
        failure_details['message'] = f"P0 gate triggers {failure_details['p0_count']} exceeds threshold {thresholds['p0_triggers']}"
        return True

    return False

def main():
    """Main function to handle gate failure alerts."""
    if len(sys.argv) < 2:
        print("Usage: python gate_alert.py <failure_details_json>")
        sys.exit(1)

    try:
        failure_details = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        logger.error("Invalid JSON provided")
        sys.exit(1)

    config = load_config()

    if not check_alert_thresholds(failure_details, config):
        logger.info("Failure does not meet alert thresholds, skipping notification")
        return

    # Send notifications
    webhook_success = send_webhook_notification(failure_details, config)
    slack_success = send_slack_notification(failure_details, config)

    if webhook_success or slack_success:
        logger.info("Alert notifications sent")
    else:
        logger.error("Failed to send any alert notifications")
        sys.exit(1)

if __name__ == '__main__':
    main()

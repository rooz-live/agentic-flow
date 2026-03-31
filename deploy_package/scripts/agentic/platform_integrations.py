#!/usr/bin/env python3
"""
Platform Integration Hooks
Webhook handlers for Symfony/Oro, StarlingX, HostBill, WordPress/Flarum, 
Multitenant Affiliate, Risk Analytics, Inbox Zero
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

# Circle-specific revenue impact (from revenue_attribution.py)
CIRCLE_REVENUE_IMPACT = {
    'innovator': 5000,
    'analyst': 3500,
    'orchestrator': 2500,
    'assessor': 2000,
    'intuitive': 1000,
    'seeker': 500,
    'testing': 250
}

class PlatformIntegration:
    """Base class for platform webhook integrations."""
    
    def __init__(self, platform: str, circle: str, tenant_id: str = "default"):
        self.platform = platform
        self.circle = circle
        self.tenant_id = tenant_id
        self.logger = PatternLogger(
            mode="advisory",
            circle=circle,
            run_id=f"{platform}-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id,
            tenant_platform=platform
        )
        self.revenue_impact = CIRCLE_REVENUE_IMPACT.get(circle, 0)
    
    def handle_webhook(self, event_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming webhook event."""
        pattern = self._map_event_to_pattern(event_type)
        
        # Log to pattern metrics
        self.logger.log(pattern, {
            'platform_event': event_type,
            'revenue_impact': self.revenue_impact,
            'data': data,
            'integration': self.platform
        }, gate="platform")
        
        return {'status': 'logged', 'pattern': pattern}
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        """Map platform event to pattern."""
        # Default mapping - override in subclasses
        return event_type.replace('.', '_')


class SymfonyOroIntegration(PlatformIntegration):
    """Symfony/Oro CRM integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("symfony_oro", "analyst", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'lead.created': 'wsjf_prioritization',
            'opportunity.won': 'backlog_item_scored',
            'account.updated': 'observability_first'
        }
        return mapping.get(event_type, event_type)


class StarlingXIntegration(PlatformIntegration):
    """StarlingX device provisioning integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("starlingx", "orchestrator", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'device.provisioned': 'safe_degrade',
            'device.health_check': 'observability_first',
            'device.failed': 'guardrail_lock'
        }
        return mapping.get(event_type, event_type)


class HostBillIntegration(PlatformIntegration):
    """HostBill billing integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("hostbill", "assessor", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'invoice.paid': 'backlog_item_scored',
            'service.activated': 'wsjf_prioritization',
            'payment.failed': 'failure_strategy'
        }
        return mapping.get(event_type, event_type)


class WordPressFlarumIntegration(PlatformIntegration):
    """WordPress/Flarum user action integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("wordpress_flarum", "testing", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'post.published': 'backtest_result',
            'comment.created': 'observability_first',
            'user.registered': 'wsjf_prioritization'
        }
        return mapping.get(event_type, event_type)


class MultitenantAffiliateIntegration(PlatformIntegration):
    """Multitenant affiliate platform integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("affiliate", "innovator", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'commission.earned': 'backlog_item_scored',
            'affiliate.registered': 'wsjf_prioritization',
            'conversion.tracked': 'observability_first'
        }
        return mapping.get(event_type, event_type)


class RiskAnalyticsIntegration(PlatformIntegration):
    """Risk analytics alert integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("risk_analytics", "assessor", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'alert.threshold': 'circle_risk_focus',
            'anomaly.detected': 'guardrail_lock',
            'risk.escalated': 'failure_strategy'
        }
        return mapping.get(event_type, event_type)


class InboxZeroIntegration(PlatformIntegration):
    """Inbox zero email processing integration."""
    
    def __init__(self, tenant_id: str = "default"):
        super().__init__("inbox_zero", "orchestrator", tenant_id)
    
    def _map_event_to_pattern(self, event_type: str) -> str:
        mapping = {
            'email.processed': 'wsjf_prioritization',
            'task.created': 'backlog_item_scored',
            'workflow.completed': 'safe_degrade'
        }
        return mapping.get(event_type, event_type)


# Factory function
def get_integration(platform: str, tenant_id: str = "default") -> PlatformIntegration:
    """Get integration handler for platform."""
    integrations = {
        'symfony_oro': SymfonyOroIntegration,
        'starlingx': StarlingXIntegration,
        'hostbill': HostBillIntegration,
        'wordpress_flarum': WordPressFlarumIntegration,
        'affiliate': MultitenantAffiliateIntegration,
        'risk_analytics': RiskAnalyticsIntegration,
        'inbox_zero': InboxZeroIntegration
    }
    
    integration_class = integrations.get(platform)
    if not integration_class:
        raise ValueError(f"Unknown platform: {platform}")
    
    return integration_class(tenant_id)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Platform Integration Webhook Handler')
    parser.add_argument('platform', choices=[
        'symfony_oro', 'starlingx', 'hostbill', 'wordpress_flarum',
        'affiliate', 'risk_analytics', 'inbox_zero'
    ], help='Platform name')
    parser.add_argument('event_type', help='Event type (e.g., lead.created)')
    parser.add_argument('--tenant-id', default='default', help='Tenant ID')
    parser.add_argument('--data', help='JSON data payload')
    
    args = parser.parse_args()
    
    integration = get_integration(args.platform, args.tenant_id)
    
    data = {}
    if args.data:
        try:
            data = json.loads(args.data)
        except json.JSONDecodeError:
            print(f"Invalid JSON data: {args.data}", file=sys.stderr)
            sys.exit(1)
    
    result = integration.handle_webhook(args.event_type, data)
    
    print(f"✅ Logged {args.platform} event '{args.event_type}' to pattern metrics")
    print(f"   Pattern: {result['pattern']}")
    print(f"   Revenue impact: ${integration.revenue_impact}/mo")
    print(f"   Circle: {integration.circle}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Multitenant Platform Integration Adapters
Connects Symfony/Oro, StarlingX, HostBill, WordPress, Flarum to Agentic Flow
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agentic.pattern_logger import PatternLogger
from typing import Dict, Any, Optional
import json


class PlatformAdapter:
    """Base adapter for platform integrations"""
    
    def __init__(self, tenant_id: str, platform_name: str):
        self.tenant_id = tenant_id
        self.platform_name = platform_name
        self.logger = PatternLogger(
            tenant_id=tenant_id,
            tenant_platform=platform_name,
            circle="integration",
            depth=0
        )
    
    def log_event(self, pattern: str, data: Dict[str, Any], economic: Optional[Dict] = None):
        """Log platform event with tenant context"""
        self.logger.log(
            pattern_name=pattern,
            data=data,
            economic=economic or {"cod": 0, "wsjf_score": 0},
            run_type=f"{self.platform_name}-integration"
        )


class SymfonyOroAdapter(PlatformAdapter):
    """
    Symfony/Oro CRM Integration
    Use case: Customer tickets → Backlog items with WSJF
    """
    
    def __init__(self, tenant_id: str, oro_instance_url: str):
        super().__init__(tenant_id, "symfony-oro")
        self.oro_instance_url = oro_instance_url
    
    def ticket_created(self, ticket_data: Dict[str, Any]):
        """
        Handle Oro ticket creation event
        
        Args:
            ticket_data: {
                'id': 'TKT-12345',
                'title': 'Critical: Payment gateway down',
                'priority': 'critical',  # critical, high, medium, low
                'customer_id': 'CUST-789',
                'created_at': '2025-12-11T15:00:00Z',
                'estimated_hours': 4
            }
        """
        # Calculate CoD based on priority
        cod_map = {
            'critical': 150,
            'high': 75,
            'medium': 30,
            'low': 10
        }
        
        cod = cod_map.get(ticket_data.get('priority', 'medium'), 30)
        estimated_hours = ticket_data.get('estimated_hours', 2)
        wsjf_score = round(cod / estimated_hours, 2) if estimated_hours > 0 else 0
        
        self.log_event(
            pattern="customer_ticket_created",
            data={
                "ticket_id": ticket_data['id'],
                "title": ticket_data['title'],
                "priority": ticket_data['priority'],
                "customer_id": ticket_data.get('customer_id'),
                "action": "auto-create-backlog-item",
                "tags": ["customer-request", "symfony", "oro-crm"]
            },
            economic={
                "cod": cod,
                "wsjf_score": wsjf_score,
                "user_business_value": cod * 0.6,
                "time_criticality": cod * 0.3,
                "risk_reduction": cod * 0.1,
                "job_duration": estimated_hours
            }
        )
        
        return {
            "backlog_item": f"ORO-{ticket_data['id']}",
            "wsjf_score": wsjf_score,
            "recommended_circle": "orchestrator" if ticket_data['priority'] == 'critical' else "analyst"
        }
    
    def ticket_resolved(self, ticket_id: str, resolution_time_hours: float):
        """Track ticket resolution for velocity metrics"""
        self.log_event(
            pattern="customer_ticket_resolved",
            data={
                "ticket_id": ticket_id,
                "resolution_time_hours": resolution_time_hours,
                "action": "mark-complete",
                "tags": ["customer-satisfaction", "resolution"]
            },
            economic={"cod": 0, "wsjf_score": 0}  # CoD eliminated
        )


class StarlingXAdapter(PlatformAdapter):
    """
    OpenStack StarlingX Integration
    Use case: Infrastructure deployment tracking
    """
    
    def __init__(self, tenant_id: str, openstack_endpoint: str):
        super().__init__(tenant_id, "starlingx")
        self.openstack_endpoint = openstack_endpoint
    
    def device_provisioning_started(self, device_data: Dict[str, Any]):
        """
        Handle StarlingX device provisioning
        
        Args:
            device_data: {
                'device_id': '24460',
                'device_type': 'bare-metal',
                'location': 'us-west-1',
                'requested_by': 'customer-123',
                'provisioning_time_estimate': 2.5  # hours
            }
        """
        # High CoD for infrastructure delays (blocks customer)
        cod = 100  # Base CoD for infrastructure
        estimated_hours = device_data.get('provisioning_time_estimate', 2)
        wsjf_score = round(cod / estimated_hours, 2)
        
        self.log_event(
            pattern="device_provisioning_started",
            data={
                "device_id": device_data['device_id'],
                "device_type": device_data['device_type'],
                "location": device_data.get('location'),
                "action": "provision-device",
                "tags": ["infrastructure", "starlingx", "openstack"]
            },
            economic={
                "cod": cod,
                "wsjf_score": wsjf_score,
                "user_business_value": 60,
                "time_criticality": 30,
                "risk_reduction": 10,
                "job_duration": estimated_hours
            }
        )
        
        return {
            "backlog_item": f"STX-{device_data['device_id']}",
            "wsjf_score": wsjf_score
        }
    
    def device_provisioning_failed(self, device_id: str, error: str):
        """Track provisioning failures as blockers"""
        self.log_event(
            pattern="device_provisioning_failed",
            data={
                "device_id": device_id,
                "error": error,
                "action": "escalate-blocker",
                "tags": ["blocker", "infrastructure-failure"]
            },
            economic={"cod": 150, "wsjf_score": 0}  # High CoD, no progress
        )


class HostBillAdapter(PlatformAdapter):
    """
    HostBill Billing Integration
    Use case: Invoice/billing events → Economic prioritization
    """
    
    def __init__(self, tenant_id: str, hostbill_api_url: str):
        super().__init__(tenant_id, "hostbill")
        self.hostbill_api_url = hostbill_api_url
    
    def invoice_overdue(self, invoice_data: Dict[str, Any]):
        """
        Handle overdue invoice event
        
        Args:
            invoice_data: {
                'invoice_id': 'INV-5678',
                'customer_id': 'CUST-123',
                'amount': 2500.00,
                'days_overdue': 15,
                'service_suspended': False
            }
        """
        # CoD increases with overdue duration and amount
        base_cod = invoice_data['amount'] * 0.05  # 5% of invoice value
        days_overdue = invoice_data.get('days_overdue', 0)
        cod = base_cod * (1 + days_overdue * 0.1)  # 10% increase per day
        
        self.log_event(
            pattern="invoice_overdue",
            data={
                "invoice_id": invoice_data['invoice_id'],
                "customer_id": invoice_data['customer_id'],
                "amount": invoice_data['amount'],
                "days_overdue": days_overdue,
                "action": "trigger-collection-workflow",
                "tags": ["billing", "revenue-risk", "hostbill"]
            },
            economic={
                "cod": round(cod, 2),
                "wsjf_score": round(cod / 0.5, 2),  # Assume 30min effort
                "user_business_value": invoice_data['amount'],
                "time_criticality": days_overdue * 10,
                "risk_reduction": 20,
                "job_duration": 0.5
            }
        )


class WordPressAdapter(PlatformAdapter):
    """
    WordPress Integration
    Use case: Content publishing workflows
    """
    
    def __init__(self, tenant_id: str, wp_site_url: str):
        super().__init__(tenant_id, "wordpress")
        self.wp_site_url = wp_site_url
    
    def post_published(self, post_data: Dict[str, Any]):
        """Track WordPress post publication"""
        self.log_event(
            pattern="content_published",
            data={
                "post_id": post_data['post_id'],
                "post_title": post_data['title'],
                "post_type": post_data.get('post_type', 'post'),
                "action": "publish",
                "tags": ["content", "wordpress", "marketing"]
            },
            economic={"cod": 5, "wsjf_score": 0.5}  # Low CoD for content
        )


class FlarumAdapter(PlatformAdapter):
    """
    Flarum Forum Integration
    Use case: Community engagement tracking
    """
    
    def __init__(self, tenant_id: str, flarum_url: str):
        super().__init__(tenant_id, "flarum")
        self.flarum_url = flarum_url
    
    def discussion_created(self, discussion_data: Dict[str, Any]):
        """Track Flarum discussion creation"""
        self.log_event(
            pattern="community_discussion_created",
            data={
                "discussion_id": discussion_data['id'],
                "title": discussion_data['title'],
                "user_id": discussion_data['user_id'],
                "action": "monitor",
                "tags": ["community", "flarum", "engagement"]
            },
            economic={"cod": 2, "wsjf_score": 0.2}  # Very low CoD
        )


class AffiliateAdapter(PlatformAdapter):
    """
    Affiliate Platform Integration
    Use case: Commission tracking and payouts
    """
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id, "affiliate")
    
    def commission_due(self, commission_data: Dict[str, Any]):
        """Track affiliate commissions due for payout"""
        amount = commission_data.get('amount', 0)
        cod = amount * 0.1  # 10% of commission value as CoD
        
        self.log_event(
            pattern="commission_due",
            data={
                "affiliate_id": commission_data['affiliate_id'],
                "commission_amount": amount,
                "sale_date": commission_data.get('sale_date'),
                "action": "schedule-payout",
                "tags": ["affiliate", "financial", "commission"]
            },
            economic={
                "cod": cod,
                "wsjf_score": round(cod / 0.25, 2),  # 15min payout process
                "job_duration": 0.25
            }
        )


class RiskAnalyticsAdapter(PlatformAdapter):
    """
    Risk Analytics Integration
    Use case: Risk event tracking and prioritization
    """
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id, "risk-analytics")
    
    def risk_event_detected(self, risk_data: Dict[str, Any]):
        """
        Track risk events for immediate action
        
        Args:
            risk_data: {
                'risk_id': 'RISK-789',
                'risk_level': 'high',  # critical, high, medium, low
                'risk_type': 'security',  # security, financial, operational
                'impact_score': 85,
                'probability': 0.7
            }
        """
        impact = risk_data.get('impact_score', 50)
        probability = risk_data.get('probability', 0.5)
        cod = impact * probability  # Expected loss
        
        self.log_event(
            pattern="risk_event_detected",
            data={
                "risk_id": risk_data['risk_id'],
                "risk_level": risk_data['risk_level'],
                "risk_type": risk_data['risk_type'],
                "impact_score": impact,
                "probability": probability,
                "action": "trigger-mitigation",
                "tags": ["risk", "security", "compliance"]
            },
            economic={
                "cod": round(cod, 2),
                "wsjf_score": round(cod / 1, 2),  # 1 hour mitigation
                "risk_reduction": impact,
                "job_duration": 1
            }
        )


class InboxZeroAdapter(PlatformAdapter):
    """
    Inbox Zero Integration
    Use case: Email workflow tracking
    """
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id, "inbox-zero")
    
    def high_priority_email(self, email_data: Dict[str, Any]):
        """Track high-priority emails requiring action"""
        self.log_event(
            pattern="high_priority_email",
            data={
                "email_id": email_data['email_id'],
                "sender": email_data.get('sender'),
                "subject": email_data.get('subject'),
                "action": "triage",
                "tags": ["email", "inbox-zero", "communication"]
            },
            economic={
                "cod": 15,  # Cost of delayed response
                "wsjf_score": 15,  # Should be handled quickly
                "job_duration": 0.25
            }
        )


# Example usage and integration helper
def create_adapter(platform: str, tenant_id: str, **config):
    """
    Factory function to create platform adapters
    
    Usage:
        oro_adapter = create_adapter('symfony-oro', 'tenant-123', oro_instance_url='https://crm.example.com')
        oro_adapter.ticket_created({...})
    """
    adapters = {
        'symfony-oro': SymfonyOroAdapter,
        'starlingx': StarlingXAdapter,
        'hostbill': HostBillAdapter,
        'wordpress': WordPressAdapter,
        'flarum': FlarumAdapter,
        'affiliate': AffiliateAdapter,
        'risk-analytics': RiskAnalyticsAdapter,
        'inbox-zero': InboxZeroAdapter
    }
    
    adapter_class = adapters.get(platform)
    if not adapter_class:
        raise ValueError(f"Unknown platform: {platform}")
    
    return adapter_class(tenant_id, **config)


if __name__ == "__main__":
    # Example: Test Symfony/Oro integration
    print("Testing multitenant platform adapters...")
    
    # Symfony/Oro example
    oro = create_adapter('symfony-oro', 'tenant-acme', oro_instance_url='https://crm.acme.com')
    result = oro.ticket_created({
        'id': 'TKT-12345',
        'title': 'Critical: Payment gateway down',
        'priority': 'critical',
        'customer_id': 'CUST-789',
        'estimated_hours': 4
    })
    print(f"✅ Oro ticket logged: {result}")
    
    # StarlingX example
    stx = create_adapter('starlingx', 'tenant-acme', openstack_endpoint='https://openstack.acme.com')
    result = stx.device_provisioning_started({
        'device_id': '24460',
        'device_type': 'bare-metal',
        'provisioning_time_estimate': 2.5
    })
    print(f"✅ StarlingX provisioning logged: {result}")
    
    print("\n📊 Check .goalie/pattern_metrics.jsonl for tenant-tagged events")

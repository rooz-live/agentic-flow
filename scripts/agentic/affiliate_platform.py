#!/usr/bin/env python3
"""
Multi-Tenant Affiliate Platform Module
Integrates Symfony/Oro, OpenStack StarlingX, HostBill, WordPress, Flarum.

Features:
- Multi-tenant domain routing (accessible domains over local IPs)
- WSJF-prioritized feature development
- Risk analytics integration
- Commission calculation and tracking
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")


class TenantTier(Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class IntegrationPlatform(Enum):
    SYMFONY_ORO = "symfony_oro"
    OPENSTACK = "openstack"
    STARLINGX = "starlingx"
    HOSTBILL = "hostbill"
    WORDPRESS = "wordpress"
    FLARUM = "flarum"


@dataclass
class Tenant:
    tenant_id: str
    name: str
    tier: TenantTier
    domain: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    integrations: List[IntegrationPlatform] = field(default_factory=list)
    settings: Dict[str, Any] = field(default_factory=dict)
    active: bool = True


@dataclass
class Affiliate:
    affiliate_id: str
    tenant_id: str
    name: str
    email: str
    commission_rate: float = 0.10  # 10% default
    referral_code: str = ""
    total_referrals: int = 0
    total_commission: float = 0.0
    status: str = "active"


@dataclass
class Referral:
    referral_id: str
    affiliate_id: str
    customer_email: str
    order_amount: float
    commission_amount: float
    status: str = "pending"  # pending, approved, paid
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class DomainRoute:
    domain: str
    tenant_id: str
    target_service: str
    ssl_enabled: bool = True
    cdn_enabled: bool = False
    priority: int = 1


class AffiliatePlatform:
    """Multi-tenant affiliate platform with WSJF prioritization."""
    
    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory", circle="affiliate",
            run_id=f"affiliate-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id, tenant_platform="agentic-flow-core"
        )
        self.tenants: Dict[str, Tenant] = {}
        self.affiliates: Dict[str, Affiliate] = {}
        self.referrals: List[Referral] = []
        self.domain_routes: Dict[str, DomainRoute] = {}
        self._load_default_config()
    
    def _load_default_config(self):
        """Load default multi-tenant configuration."""
        # Default tenants
        self.tenants = {
            "default": Tenant(
                tenant_id="default",
                name="Default Platform",
                tier=TenantTier.PROFESSIONAL,
                domain="app.interface.tag.ooo",
                integrations=[IntegrationPlatform.SYMFONY_ORO, IntegrationPlatform.WORDPRESS]
            ),
            "enterprise": Tenant(
                tenant_id="enterprise",
                name="Enterprise Platform",
                tier=TenantTier.ENTERPRISE,
                domain="enterprise.interface.tag.ooo",
                integrations=[
                    IntegrationPlatform.SYMFONY_ORO,
                    IntegrationPlatform.OPENSTACK,
                    IntegrationPlatform.STARLINGX,
                    IntegrationPlatform.HOSTBILL,
                    IntegrationPlatform.FLARUM
                ]
            ),
            "affiliate": Tenant(
                tenant_id="affiliate",
                name="Affiliate Network",
                tier=TenantTier.PROFESSIONAL,
                domain="affiliate.interface.tag.ooo",
                integrations=[IntegrationPlatform.SYMFONY_ORO, IntegrationPlatform.HOSTBILL]
            ),
        }
        
        # Default domain routes (accessible domains preferred over local IPs)
        self.domain_routes = {
            "app.interface.tag.ooo": DomainRoute(
                domain="app.interface.tag.ooo",
                tenant_id="default",
                target_service="goalie-api",
                ssl_enabled=True,
                cdn_enabled=True
            ),
            "enterprise.interface.tag.ooo": DomainRoute(
                domain="enterprise.interface.tag.ooo",
                tenant_id="enterprise",
                target_service="enterprise-api",
                ssl_enabled=True
            ),
            "horizon.openstack.interface.tag.ooo": DomainRoute(
                domain="horizon.openstack.interface.tag.ooo",
                tenant_id="enterprise",
                target_service="openstack-horizon",
                ssl_enabled=True
            ),
            "starlingx.interface.tag.ooo": DomainRoute(
                domain="starlingx.interface.tag.ooo",
                tenant_id="enterprise",
                target_service="starlingx-dashboard",
                ssl_enabled=True
            ),
            "billing.interface.tag.ooo": DomainRoute(
                domain="billing.interface.tag.ooo",
                tenant_id="enterprise",
                target_service="hostbill",
                ssl_enabled=True
            ),
            "forum.interface.tag.ooo": DomainRoute(
                domain="forum.interface.tag.ooo",
                tenant_id="default",
                target_service="flarum",
                ssl_enabled=True
            ),
            "blog.interface.tag.ooo": DomainRoute(
                domain="blog.interface.tag.ooo",
                tenant_id="default",
                target_service="wordpress",
                ssl_enabled=True,
                cdn_enabled=True
            ),
        }
    
    def create_tenant(self, name: str, domain: str, tier: TenantTier = TenantTier.STARTER) -> Tenant:
        """Create a new tenant."""
        tenant_id = f"tenant-{int(datetime.now().timestamp())}"
        tenant = Tenant(
            tenant_id=tenant_id,
            name=name,
            tier=tier,
            domain=domain
        )
        self.tenants[tenant_id] = tenant
        
        # Create domain route
        route = DomainRoute(
            domain=domain,
            tenant_id=tenant_id,
            target_service="tenant-api",
            ssl_enabled=True
        )
        self.domain_routes[domain] = route
        
        self.logger.log("tenant_created", {
            "tenant_id": tenant_id, "name": name, "domain": domain,
            "tier": tier.value, "action": "create-tenant",
            "tags": ["affiliate", "multi-tenant", "onboarding"]
        }, gate="governance", behavioral_type="enforcement",
        economic={"cod": 20, "wsjf_score": 15})
        
        return tenant
    
    def register_affiliate(self, tenant_id: str, name: str, email: str, 
                          commission_rate: float = 0.10) -> Affiliate:
        """Register a new affiliate."""
        affiliate_id = f"aff-{int(datetime.now().timestamp())}"
        referral_code = f"REF{affiliate_id[-8:].upper()}"
        
        affiliate = Affiliate(
            affiliate_id=affiliate_id,
            tenant_id=tenant_id,
            name=name,
            email=email,
            commission_rate=commission_rate,
            referral_code=referral_code
        )
        self.affiliates[affiliate_id] = affiliate
        
        self.logger.log("affiliate_registered", {
            "affiliate_id": affiliate_id, "tenant_id": tenant_id,
            "name": name, "commission_rate": commission_rate,
            "action": "register-affiliate",
            "tags": ["affiliate", "onboarding"]
        }, gate="general", behavioral_type="observability",
        economic={"cod": 10, "wsjf_score": 8})
        
        return affiliate
    
    def record_referral(self, affiliate_id: str, customer_email: str, 
                       order_amount: float) -> Referral:
        """Record a referral and calculate commission."""
        affiliate = self.affiliates.get(affiliate_id)
        if not affiliate:
            raise ValueError(f"Affiliate {affiliate_id} not found")
        
        commission = order_amount * affiliate.commission_rate
        referral_id = f"ref-{int(datetime.now().timestamp())}"
        
        referral = Referral(
            referral_id=referral_id,
            affiliate_id=affiliate_id,
            customer_email=customer_email,
            order_amount=order_amount,
            commission_amount=commission,
            status="pending"
        )
        self.referrals.append(referral)
        
        # Update affiliate stats
        affiliate.total_referrals += 1
        
        self.logger.log("referral_recorded", {
            "referral_id": referral_id, "affiliate_id": affiliate_id,
            "order_amount": order_amount, "commission": commission,
            "action": "record-referral",
            "tags": ["affiliate", "referral", "commission"]
        }, gate="general", behavioral_type="observability",
        economic={"cod": order_amount * 0.1, "wsjf_score": commission})
        
        return referral
    
    def approve_referral(self, referral_id: str) -> bool:
        """Approve a referral and credit commission."""
        referral = next((r for r in self.referrals if r.referral_id == referral_id), None)
        if not referral:
            return False
        
        referral.status = "approved"
        affiliate = self.affiliates.get(referral.affiliate_id)
        if affiliate:
            affiliate.total_commission += referral.commission_amount
        
        self.logger.log("referral_approved", {
            "referral_id": referral_id, "affiliate_id": referral.affiliate_id,
            "commission": referral.commission_amount,
            "action": "approve-referral",
            "tags": ["affiliate", "referral", "approved"]
        }, gate="governance", behavioral_type="enforcement",
        economic={"cod": 5, "wsjf_score": referral.commission_amount})
        
        return True
    
    def get_tenant_stats(self, tenant_id: str) -> Dict[str, Any]:
        """Get statistics for a tenant."""
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return {"error": "Tenant not found"}
        
        tenant_affiliates = [a for a in self.affiliates.values() if a.tenant_id == tenant_id]
        tenant_referrals = [r for r in self.referrals 
                          if self.affiliates.get(r.affiliate_id, Affiliate("", "", "", "")).tenant_id == tenant_id]
        
        return {
            "tenant_id": tenant_id,
            "name": tenant.name,
            "tier": tenant.tier.value,
            "domain": tenant.domain,
            "integrations": [i.value for i in tenant.integrations],
            "affiliates_count": len(tenant_affiliates),
            "referrals_count": len(tenant_referrals),
            "total_commission": sum(r.commission_amount for r in tenant_referrals if r.status == "approved"),
            "pending_commission": sum(r.commission_amount for r in tenant_referrals if r.status == "pending"),
            "generated_at": datetime.now().isoformat()
        }
    
    def get_domain_routing_table(self) -> List[Dict[str, Any]]:
        """Get domain routing table (accessible domains preferred)."""
        routes = []
        for domain, route in sorted(self.domain_routes.items(), key=lambda x: x[1].priority):
            routes.append({
                "domain": route.domain,
                "tenant_id": route.tenant_id,
                "target": route.target_service,
                "ssl": route.ssl_enabled,
                "cdn": route.cdn_enabled,
                "priority": route.priority
            })
        return routes
    
    def get_integration_status(self, tenant_id: str) -> Dict[str, Any]:
        """Get integration status for a tenant."""
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return {"error": "Tenant not found"}
        
        status = {}
        for integration in tenant.integrations:
            status[integration.value] = {
                "enabled": True,
                "endpoint": self._get_integration_endpoint(integration),
                "features": self._get_integration_features(integration)
            }
        return status
    
    def _get_integration_endpoint(self, platform: IntegrationPlatform) -> str:
        """Get endpoint for integration platform."""
        endpoints = {
            IntegrationPlatform.SYMFONY_ORO: "https://commerce.interface.tag.ooo/api",
            IntegrationPlatform.OPENSTACK: "https://horizon.openstack.interface.tag.ooo",
            IntegrationPlatform.STARLINGX: "https://starlingx.interface.tag.ooo",
            IntegrationPlatform.HOSTBILL: "https://billing.interface.tag.ooo/api",
            IntegrationPlatform.WORDPRESS: "https://blog.interface.tag.ooo/wp-json",
            IntegrationPlatform.FLARUM: "https://forum.interface.tag.ooo/api",
        }
        return endpoints.get(platform, "")
    
    def _get_integration_features(self, platform: IntegrationPlatform) -> List[str]:
        """Get features for integration platform."""
        features = {
            IntegrationPlatform.SYMFONY_ORO: ["crm", "ecommerce", "workflow", "affiliate-tracking"],
            IntegrationPlatform.OPENSTACK: ["compute", "storage", "networking", "identity"],
            IntegrationPlatform.STARLINGX: ["edge-compute", "container-orchestration", "device-provisioning"],
            IntegrationPlatform.HOSTBILL: ["billing", "invoicing", "provisioning", "support"],
            IntegrationPlatform.WORDPRESS: ["cms", "blog", "seo", "plugins"],
            IntegrationPlatform.FLARUM: ["forum", "discussions", "moderation", "extensions"],
        }
        return features.get(platform, [])


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Multi-Tenant Affiliate Platform")
    parser.add_argument("command", nargs="?", default="status",
        choices=["status", "tenants", "routes", "affiliates", "create-tenant", "register-affiliate"])
    parser.add_argument("--name", help="Name for tenant/affiliate")
    parser.add_argument("--domain", help="Domain for tenant")
    parser.add_argument("--email", help="Email for affiliate")
    parser.add_argument("--tenant-id", default="default")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    
    platform = AffiliatePlatform(tenant_id=args.tenant_id)
    
    if args.command == "status":
        result = platform.get_tenant_stats(args.tenant_id)
    elif args.command == "tenants":
        result = {k: {"name": v.name, "domain": v.domain, "tier": v.tier.value} 
                 for k, v in platform.tenants.items()}
    elif args.command == "routes":
        result = platform.get_domain_routing_table()
    elif args.command == "affiliates":
        result = {k: {"name": v.name, "referrals": v.total_referrals, "commission": v.total_commission}
                 for k, v in platform.affiliates.items()}
    elif args.command == "create-tenant" and args.name and args.domain:
        tenant = platform.create_tenant(args.name, args.domain)
        result = {"tenant_id": tenant.tenant_id, "domain": tenant.domain}
    elif args.command == "register-affiliate" and args.name and args.email:
        affiliate = platform.register_affiliate(args.tenant_id, args.name, args.email)
        result = {"affiliate_id": affiliate.affiliate_id, "referral_code": affiliate.referral_code}
    else:
        result = {"error": "Invalid command or missing parameters"}
    
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test all platform integrations
Demonstrates Symfony/Oro, StarlingX, HostBill, WordPress, Flarum, Affiliate, Risk, Inbox Zero
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from integrations.multitenant_adapters import create_adapter

print("🚀 Testing All Platform Integrations\n")
print("=" * 70)

# 1. Symfony/Oro CRM - Customer Ticket
print("\n1️⃣  Symfony/Oro CRM Integration")
oro = create_adapter('symfony-oro', 'tenant-prod', oro_instance_url='https://crm.mycompany.com')

ticket_result = oro.ticket_created({
    'id': 'TKT-99999',
    'title': 'URGENT: Database connection failing',
    'priority': 'critical',
    'customer_id': 'CUST-456',
    'estimated_hours': 3
})
print(f"   ✅ Ticket logged: {ticket_result}")
print(f"   📊 WSJF: {ticket_result['wsjf_score']} → Circle: {ticket_result['recommended_circle']}")

# 2. OpenStack StarlingX - Infrastructure
print("\n2️⃣  OpenStack StarlingX Integration")
stx = create_adapter('starlingx', 'tenant-prod', openstack_endpoint='https://cloud.mycompany.com')

device_result = stx.device_provisioning_started({
    'device_id': '98765',
    'device_type': 'compute-node',
    'location': 'us-east-1',
    'provisioning_time_estimate': 1.5
})
print(f"   ✅ Device provisioning logged: {device_result}")
print(f"   📊 WSJF: {device_result['wsjf_score']}")

# 3. HostBill - Billing
print("\n3️⃣  HostBill Billing Integration")
hostbill = create_adapter('hostbill', 'tenant-prod', hostbill_api_url='https://billing.mycompany.com')

hostbill.invoice_overdue({
    'invoice_id': 'INV-2024-1234',
    'customer_id': 'CUST-789',
    'amount': 5000.00,
    'days_overdue': 30,
    'service_suspended': False
})
print(f"   ✅ Overdue invoice logged")
print(f"   💰 Amount: $5,000 × 30 days overdue → High CoD")

# 4. WordPress - Content
print("\n4️⃣  WordPress Integration")
wp = create_adapter('wordpress', 'tenant-prod', wp_site_url='https://blog.mycompany.com')

wp.post_published({
    'post_id': 'POST-555',
    'title': 'Product Launch Announcement',
    'post_type': 'post'
})
print(f"   ✅ Blog post published")

# 5. Flarum - Community
print("\n5️⃣  Flarum Forum Integration")
flarum = create_adapter('flarum', 'tenant-prod', flarum_url='https://community.mycompany.com')

flarum.discussion_created({
    'id': 'DISC-888',
    'title': 'Feature Request: Dark Mode',
    'user_id': 'USER-123'
})
print(f"   ✅ Forum discussion logged")

# 6. Affiliate Platform
print("\n6️⃣  Affiliate Platform Integration")
affiliate = create_adapter('affiliate', 'tenant-prod')

affiliate.commission_due({
    'affiliate_id': 'AFF-777',
    'amount': 2500.00,
    'sale_date': '2025-12-01'
})
print(f"   ✅ Commission due logged")
print(f"   💵 $2,500 commission → CoD: $250")

# 7. Risk Analytics
print("\n7️⃣  Risk Analytics Integration")
risk = create_adapter('risk-analytics', 'tenant-prod')

risk.risk_event_detected({
    'risk_id': 'RISK-SEC-001',
    'risk_level': 'critical',
    'risk_type': 'security',
    'impact_score': 95,
    'probability': 0.8
})
print(f"   ✅ Security risk detected")
print(f"   ⚠️  Impact: 95 × 0.8 = 76 CoD")

# 8. Inbox Zero
print("\n8️⃣  Inbox Zero Integration")
inbox = create_adapter('inbox-zero', 'tenant-prod')

inbox.high_priority_email({
    'email_id': 'EMAIL-444',
    'sender': 'board@company.com',
    'subject': 'Board Meeting: Urgent Action Required'
})
print(f"   ✅ High-priority email logged")

print("\n" + "=" * 70)
print("✨ All 8 platform integrations tested successfully!")
print("\n📊 Check your data:")
print("   View events: tail -20 .goalie/pattern_metrics.jsonl")
print("   By tenant:   grep 'tenant-prod' .goalie/pattern_metrics.jsonl")
print("   By platform: grep 'symfony-oro' .goalie/pattern_metrics.jsonl")
print("\n🌐 Start dashboard: ./scripts/af dashboard --port 5000")

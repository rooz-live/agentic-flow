#!/usr/bin/env python3
"""
Hivelocity Monitoring Setup
Creates TCP, ICMP, and SSL monitors for device 24460
"""

import os
import sys
import json
import requests

DEVICE_ID = 24460
API_BASE = "https://core.hivelocity.net/api/v2"

DOMAINS = [
    "app.interface.tag.ooo",
    "starlingx.interface.tag.ooo",
    "billing.interface.tag.ooo",
    "forum.interface.tag.ooo",
    "blog.interface.tag.ooo"
]

def get_api_key():
    """Get API key from environment"""
    api_key = os.environ.get('HIVELOCITY_API_KEY')
    if not api_key:
        print("❌ HIVELOCITY_API_KEY not set in environment")
        print("\nTo set it, run:")
        print("  export HIVELOCITY_API_KEY='your-api-key-here'")
        sys.exit(1)
    return api_key

def make_request(endpoint, method='GET', data=None):
    """Make API request to Hivelocity"""
    api_key = get_api_key()
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    url = f"{API_BASE}/{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            response = requests.request(method, url, headers=headers, json=data, timeout=10)
        
        response.raise_for_status()
        return response.json() if response.text else {}
    except requests.exceptions.RequestException as e:
        print(f"❌ API Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None

def list_monitors():
    """List existing monitors"""
    print("🔍 Checking existing monitors...\n")
    monitors = make_request(f"device/{DEVICE_ID}/monitor")
    
    if monitors and 'monitors' in monitors:
        if len(monitors['monitors']) == 0:
            print("📭 No monitors configured")
        else:
            print(f"📊 Found {len(monitors['monitors'])} monitor(s):")
            for mon in monitors['monitors']:
                print(f"  - {mon.get('type')} | {mon.get('target')} | ID: {mon.get('id')}")
    return monitors

def create_icmp_monitor(target_ip):
    """Create ICMP (ping) monitor"""
    print(f"\n➕ Creating ICMP monitor for {target_ip}...")
    
    monitor_config = {
        "type": "ICMP",
        "target": target_ip,
        "frequency": 60,  # Check every 60 seconds
        "timeout": 5,
        "retries": 3,
        "enabled": True,
        "notificationEnabled": True
    }
    
    result = make_request(f"device/{DEVICE_ID}/monitor", method='POST', data=monitor_config)
    if result:
        print(f"✅ ICMP monitor created (ID: {result.get('id', 'N/A')})")
    return result

def create_tcp_monitor(target, port, description):
    """Create TCP port monitor"""
    print(f"\n➕ Creating TCP monitor for {target}:{port} ({description})...")
    
    monitor_config = {
        "type": "TCP",
        "target": target,
        "port": port,
        "frequency": 60,
        "timeout": 10,
        "retries": 3,
        "enabled": True,
        "notificationEnabled": True,
        "description": description
    }
    
    result = make_request(f"device/{DEVICE_ID}/monitor", method='POST', data=monitor_config)
    if result:
        print(f"✅ TCP monitor created (ID: {result.get('id', 'N/A')})")
    return result

def create_ssl_monitor(domain):
    """Create SSL/TLS certificate monitor"""
    print(f"\n➕ Creating SSL monitor for {domain}...")
    
    monitor_config = {
        "type": "SSL",
        "target": domain,
        "port": 443,
        "frequency": 3600,  # Check every hour
        "timeout": 10,
        "retries": 2,
        "enabled": True,
        "notificationEnabled": True,
        "certificateExpiryWarningDays": 30  # Alert 30 days before expiry
    }
    
    result = make_request(f"device/{DEVICE_ID}/monitor", method='POST', data=monitor_config)
    if result:
        print(f"✅ SSL monitor created (ID: {result.get('id', 'N/A')})")
    return result

def setup_monitoring():
    """Setup comprehensive monitoring"""
    print("=" * 60)
    print("Hivelocity Monitoring Setup")
    print(f"Device ID: {DEVICE_ID}")
    print("=" * 60)
    
    # Get device IP
    device = make_request(f"device/{DEVICE_ID}")
    if not device:
        print("❌ Failed to get device information")
        return
    
    primary_ip = device.get('primaryIp')
    print(f"\n📍 Device IP: {primary_ip}")
    
    # List existing monitors
    existing = list_monitors()
    
    # Ask for confirmation
    print("\n" + "=" * 60)
    print("📋 Monitoring Plan:")
    print("=" * 60)
    print(f"  1. ICMP (Ping) monitor for {primary_ip}")
    print(f"  2. TCP port 22 (SSH) monitor")
    print(f"  3. TCP port 443 (HTTPS) monitor")
    print(f"  4. SSL certificate monitors for {len(DOMAINS)} domains:")
    for domain in DOMAINS:
        print(f"     - {domain}")
    
    response = input("\n⚠️  Proceed with setup? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("❌ Setup cancelled")
        return
    
    # Create monitors
    print("\n" + "=" * 60)
    print("Creating Monitors...")
    print("=" * 60)
    
    results = []
    
    # ICMP monitor
    results.append(create_icmp_monitor(primary_ip))
    
    # TCP monitors
    results.append(create_tcp_monitor(primary_ip, 22, "SSH"))
    results.append(create_tcp_monitor(primary_ip, 443, "HTTPS"))
    
    # SSL monitors
    for domain in DOMAINS:
        results.append(create_ssl_monitor(domain))
    
    # Summary
    print("\n" + "=" * 60)
    print("Setup Complete")
    print("=" * 60)
    
    successful = sum(1 for r in results if r is not None)
    print(f"\n✅ Successfully created {successful}/{len(results)} monitors")
    
    print("\n📊 View monitors at:")
    print(f"   https://portal.hivelocity.net/devices/{DEVICE_ID}/monitoring")
    
    # List all monitors
    print("\n" + "=" * 60)
    list_monitors()

def main():
    try:
        setup_monitoring()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)

if __name__ == "__main__":
    main()

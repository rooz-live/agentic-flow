#!/usr/bin/env python3
"""
Hivelocity Device Status Checker
Queries device 24460 status and retrieves IPMI/console access information
"""

import os
import sys
import json
import requests
from datetime import datetime

DEVICE_ID = 24460
API_BASE = "https://core.hivelocity.net/api/v2"

def get_api_key():
    """Get API key from environment"""
    api_key = os.environ.get('HIVELOCITY_API_KEY')
    if not api_key:
        print("❌ HIVELOCITY_API_KEY not set in environment")
        print("\nTo set it, run:")
        print("  export HIVELOCITY_API_KEY='your-api-key-here'")
        print("\nGet your API key from: https://portal.hivelocity.net/account/api")
        sys.exit(1)
    return api_key

def make_request(endpoint, method='GET'):
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
        else:
            response = requests.request(method, url, headers=headers, timeout=10)
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ API Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        sys.exit(1)

def check_device_status():
    """Check device status"""
    print(f"🔍 Checking device {DEVICE_ID} status...\n")
    
    # Get device details
    device = make_request(f"device/{DEVICE_ID}")
    
    print("=" * 60)
    print(f"Device Information - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Basic info
    print(f"\n📋 Basic Information:")
    print(f"  Device ID: {device.get('deviceId', 'N/A')}")
    print(f"  Hostname: {device.get('hostname', 'N/A')}")
    print(f"  Location: {device.get('locationName', 'N/A')}")
    print(f"  Product: {device.get('productName', 'N/A')}")
    
    # Network info
    print(f"\n🌐 Network Information:")
    primary_ip = device.get('primaryIp', 'N/A')
    print(f"  Primary IP: {primary_ip}")
    print(f"  IPMI IP: {device.get('ipmiIp', 'N/A')}")
    
    # Power status
    power_status = device.get('powerStatus', 'UNKNOWN')
    power_icon = "🟢" if power_status == "ON" else "🔴" if power_status == "OFF" else "⚠️"
    print(f"\n{power_icon} Power Status: {power_status}")
    
    # Operating System
    print(f"\n💻 Operating System:")
    print(f"  OS: {device.get('osName', 'N/A')}")
    print(f"  Provisioning Status: {device.get('provisionStatus', 'N/A')}")
    
    # IPMI/Console Access
    ipmi_ip = device.get('ipmiIp')
    if ipmi_ip:
        print(f"\n🔧 IPMI/Console Access:")
        print(f"  IPMI IP: {ipmi_ip}")
        print(f"  Console URL: https://portal.hivelocity.net/devices/{DEVICE_ID}/console")
        print(f"  IPMI Web: https://{ipmi_ip} (if configured)")
    
    # Bandwidth
    if 'bandwidth' in device:
        bw = device['bandwidth']
        print(f"\n📊 Bandwidth Usage:")
        print(f"  Used: {bw.get('used', 'N/A')} GB")
        print(f"  Quota: {bw.get('quota', 'N/A')} GB")
    
    print("\n" + "=" * 60)
    
    # Connectivity test
    print(f"\n🔌 Testing connectivity to {primary_ip}...")
    import subprocess
    result = subprocess.run(['ping', '-c', '3', '-W', '2', str(primary_ip)], 
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ Server is responding to ping")
    else:
        print("❌ Server is NOT responding to ping")
        print("\n⚠️  Server appears to be down or unreachable")
        print("    Recommended actions:")
        print("    1. Check power status via IPMI console")
        print("    2. Review firewall rules")
        print("    3. Contact Hivelocity support")
    
    return device

def get_power_operations():
    """Show available power operations"""
    print("\n⚡ Available Power Operations:")
    print("  - Power On:  POST /device/{deviceId}/power/on")
    print("  - Power Off: POST /device/{deviceId}/power/off")
    print("  - Reboot:    POST /device/{deviceId}/power/reboot")
    print("  - Reset:     POST /device/{deviceId}/power/reset")

def main():
    try:
        device = check_device_status()
        get_power_operations()
        
        # Save full response
        output_file = f"device_{DEVICE_ID}_status.json"
        with open(output_file, 'w') as f:
            json.dump(device, f, indent=2)
        print(f"\n💾 Full device info saved to: {output_file}")
        
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)

if __name__ == "__main__":
    main()

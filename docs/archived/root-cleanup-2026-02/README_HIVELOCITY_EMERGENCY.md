# Hivelocity Emergency Response Guide

## Quick Start

### 1. Get Your Hivelocity API Key

1. Visit: https://portal.hivelocity.net/account/api
2. Generate or copy your API key
3. Set it in your environment:

```bash
export HIVELOCITY_API_KEY='your-api-key-here'
```

**Optional:** Add to your shell profile for persistence:
```bash
echo "export HIVELOCITY_API_KEY='your-api-key-here'" >> ~/.bashrc
source ~/.bashrc
```

---

## 2. Check Device Status

Run the device status checker to get current server state and IPMI access:

```bash
python3 hivelocity_device_check.py
```

**What it does:**
- ✅ Retrieves device 24460 current status
- ✅ Shows power state (ON/OFF)
- ✅ Displays IPMI IP address for console access
- ✅ Tests network connectivity with ping
- ✅ Lists available power operations
- ✅ Saves full device info to JSON file

**Expected Output:**
```
🔍 Checking device 24460 status...

============================================================
Device Information - 2025-12-11 23:14:57
============================================================

📋 Basic Information:
  Device ID: 24460
  Hostname: stx-aio-0
  Location: Tampa, FL
  Product: Dedicated Server

🌐 Network Information:
  Primary IP: 10.9.198.210
  IPMI IP: 10.9.198.211

🟢 Power Status: ON

🔧 IPMI/Console Access:
  IPMI IP: 10.9.198.211
  Console URL: https://portal.hivelocity.net/devices/24460/console
  IPMI Web: https://10.9.198.211

🔌 Testing connectivity to 10.9.198.210...
❌ Server is NOT responding to ping

⚠️  Server appears to be down or unreachable
    Recommended actions:
    1. Check power status via IPMI console
    2. Review firewall rules
    3. Contact Hivelocity support
```

---

## 3. Access IPMI Console

If server is unreachable but powered on, use IPMI console:

### Option A: Portal Console (Recommended)
```
https://portal.hivelocity.net/devices/24460/console
```

### Option B: Direct IPMI Web Interface
```
https://[IPMI_IP_FROM_SCRIPT]
```
Login with IPMI credentials from your portal.

### Option C: IPMI Tool (Command Line)
```bash
# Power status
ipmitool -I lanplus -H [IPMI_IP] -U [username] -P [password] power status

# Power on
ipmitool -I lanplus -H [IPMI_IP] -U [username] -P [password] power on

# View console
ipmitool -I lanplus -H [IPMI_IP] -U [username] -P [password] sol activate
```

---

## 4. Setup Monitoring (After Recovery)

Prevent future outages by setting up comprehensive monitoring:

```bash
python3 hivelocity_setup_monitoring.py
```

**What it creates:**
- ✅ ICMP (Ping) monitor - checks server reachability every 60s
- ✅ TCP port 22 (SSH) monitor - ensures SSH access
- ✅ TCP port 443 (HTTPS) monitor - ensures web services
- ✅ SSL certificate monitors - tracks expiration for all 5 domains
  - app.interface.tag.ooo
  - starlingx.interface.tag.ooo
  - billing.interface.tag.ooo
  - forum.interface.tag.ooo
  - blog.interface.tag.ooo

**Benefits:**
- Email/SMS alerts when services go down
- SSL certificate expiration warnings (30 days advance)
- Historical uptime tracking
- Automated incident detection

View monitors at: https://portal.hivelocity.net/devices/24460/monitoring

---

## 5. Submit Support Ticket

If you cannot resolve via IPMI, submit the pre-formatted support ticket:

1. **Open the ticket file:**
   ```bash
   open hivelocity_support_ticket.md
   ```

2. **Fill in the placeholders:**
   - `[Email/Phone/Portal]` - Your preferred contact method
   - `[Primary IP from portal]` - Get from device checker script
   - `[Data center location]` - Get from device checker script
   - `[Your user count]` - Estimated affected users
   - `[Revenue Impact]` - If applicable
   - `[time when you first noticed issue]` - When problem started
   - `[Your Name/Company/Email/Phone/Timezone]` - Your contact info

3. **Submit via:**
   - **Portal:** https://portal.hivelocity.net/support/tickets/new
   - **Email:** support@hivelocity.net
   - **Phone:** Check portal for emergency support number

---

## Common Issues & Solutions

### Issue: "HIVELOCITY_API_KEY not set"
**Solution:** Export your API key (see step 1)

### Issue: "API Request failed: 401 Unauthorized"
**Solution:** Your API key is invalid or expired. Generate a new one from portal.

### Issue: "Server is OFF"
**Solution:** 
```bash
# Use IPMI console to power on
# Or contact support if power button doesn't respond
```

### Issue: "Server is ON but not responding"
**Possible causes:**
- Network interface down
- Firewall blocking traffic
- System kernel panic/crash
- Hardware failure

**Next steps:**
1. Access IPMI console to view system logs
2. Check network interface status
3. Review kernel messages
4. If unresponsive, submit support ticket

---

## Emergency Contact Information

- **Portal:** https://portal.hivelocity.net
- **Support Email:** support@hivelocity.net
- **Account Management:** https://portal.hivelocity.net/account
- **API Documentation:** https://developers.hivelocity.net
- **Knowledge Base:** https://www.hivelocity.net/kb/

---

## Files in This Package

| File | Purpose |
|------|---------|
| `hivelocity_device_check.py` | Check device status and get IPMI access |
| `hivelocity_setup_monitoring.py` | Configure comprehensive monitoring |
| `hivelocity_support_ticket.md` | Pre-formatted urgent support ticket |
| `README_HIVELOCITY_EMERGENCY.md` | This guide |

---

## Post-Incident Checklist

After server is recovered:

- [ ] Run monitoring setup script
- [ ] Verify all services are online
- [ ] Check SSL certificate expiration dates
- [ ] Review system logs for root cause
- [ ] Update firewall rules if needed
- [ ] Test failover procedures
- [ ] Document incident and resolution
- [ ] Schedule preventive maintenance

---

## Tips for Faster Resolution

1. **Always check portal first** - May show hardware alerts
2. **Use IPMI console** - Out-of-band access is your friend
3. **Save script outputs** - Attach to support tickets
4. **Set up monitoring** - Catch issues before customers do
5. **Keep API key secure** - Store in password manager
6. **Test recovery procedures** - Don't wait for an emergency

---

*Last Updated: December 11, 2025*

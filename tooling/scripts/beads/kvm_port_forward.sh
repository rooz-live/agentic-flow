#!/bin/bash
# =========================================================================
# SYSTEMIC.OS - ALMALINUX KVM PORT FORWARDING (NAT -> PUBLIC IP)
# =========================================================================
# The Deep RCA: The KVM was provisioned on the `default` libvirt NAT network 
# (192.168.122.x). While DNS points to the public STX IP (23.92.79.2), the host
# node was physically dropping the packets because there were no iptables/firewalld 
# rules forwarding external traffic to the internal KVM.
# =========================================================================

set -euo pipefail

PUBLIC_IP="23.92.79.2"
KVM_IP="192.168.122.237"
PUBLIC_INTERFACE="bond0" # Update to the actual physical interface (e.g., eno1, eth0)

echo "🚨 [KVM NAT HEALER] Initiating Sovereign Port Forwarding to $KVM_IP..."

# Enable IP Forwarding on the Host
echo "--> Enabling sysctl net.ipv4.ip_forward..."
sudo sysctl -w net.ipv4.ip_forward=1

# List of critical cPanel / WHM / Web ports
PORTS=("80" "443" "2082" "2083" "2086" "2087" "2095" "2096" "21" "25" "53" "110" "143" "465" "587" "993" "995" "3306")

echo "--> Injecting iptables PREROUTING & FORWARD rules..."
for PORT in "${PORTS[@]}"; do
    # Forward incoming TCP traffic on PUBLIC_IP to KVM_IP
    sudo iptables -t nat -A PREROUTING -p tcp -d "$PUBLIC_IP" --dport "$PORT" -j DNAT --to-destination "$KVM_IP:$PORT"
    
    # Forward incoming UDP traffic (specifically for DNS/53)
    sudo iptables -t nat -A PREROUTING -p udp -d "$PUBLIC_IP" --dport "$PORT" -j DNAT --to-destination "$KVM_IP:$PORT"

    # Allow forwarding through the firewall
    sudo iptables -I FORWARD -p tcp -d "$KVM_IP" --dport "$PORT" -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT
    sudo iptables -I FORWARD -p udp -d "$KVM_IP" --dport "$PORT" -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT
done

# Setup MASQUERADE for outbound traffic from KVM to appear as PUBLIC_IP
sudo iptables -t nat -A POSTROUTING -s 192.168.122.0/24 -o "$PUBLIC_INTERFACE" -j MASQUERADE

echo "✅ [SUCCESS] NAT Port Forwarding Rules Engaged."
echo "yo.tag.ooo/whm will now physically route from 23.92.79.2:2087 -> 192.168.122.237:2087."

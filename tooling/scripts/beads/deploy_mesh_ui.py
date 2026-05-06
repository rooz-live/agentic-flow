#!/usr/bin/env python3
"""
Sovereign Swarm Mesh Publisher (React/Vite Production Deployment)
Responsibility: Vertically integrates the physical Sovereign Command Console
(dashboard/dist) into the bare-metal KVM across all specialized `mesh.*` sub-meshes.
"""
import os
import subprocess

SOVEREIGN_IP = "192.168.122.237"
DOMAINS = ["yocloud.com", "tag.ooo", "rooz.live", "bhopti.com", "tag.vote", "yo.life", "720.chat"]

def deploy_to_kvm():
    print(f"--> ⚡ Sovereign Mesh Publisher: Deploying Command Console to {SOVEREIGN_IP}...")
    
    # Path to the compiled React/Vite dashboard
    dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../dashboard/dist'))
    if not os.path.exists(dist_dir):
        print("❌ [FAULT] dashboard/dist/ not found. Did you run 'npm run build'?")
        return False
        
    print("  --> [PHASE 1] Pushing compiled React/Vite application layer via SCP...")
    # Create the central mesh directory
    setup_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} 'mkdir -p /var/www/html/mesh'"
    subprocess.run(setup_cmd, shell=True)
    
    # Rsync the dist directory to the server
    rsync_cmd = f"rsync -avz -e 'ssh -J stx -o StrictHostKeyChecking=no' {dist_dir}/ root@{SOVEREIGN_IP}:/var/www/html/mesh/"
    result = subprocess.run(rsync_cmd, shell=True)
    
    if result.returncode != 0:
        print("❌ [FAULT] Failed to sync UI assets.")
        return False
        
    print("  --> [PHASE 2] Cross-Wiring Apache/Nginx DocumentRoots for ALL domains...")
    # This loop maps the central /var/www/html/mesh folder to the cPanel/Apache VirtualHosts
    # for all the `mesh.*` sub-meshes we created in the BIND zones.
    for d in DOMAINS:
        mesh_domain = f"mesh.{d}"
        print(f"      Linking {mesh_domain} -> /var/www/html/mesh")
        
        # We can physically inject this into httpd.conf or create a lightweight vhost
        vhost_injection = f"""
cat << 'EOF' > /etc/apache2/conf.d/userdata/std/2_4/root/{mesh_domain}.conf
<VirtualHost *:80>
    ServerName {mesh_domain}
    DocumentRoot /var/www/html/mesh
    <Directory /var/www/html/mesh>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF
"""
        ssh_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} '{vhost_injection}'"
        subprocess.run(ssh_cmd, shell=True, stderr=subprocess.DEVNULL)
        
    WHM_TOKEN = "R41YFU51UMU75BCTIFNQBPRYT6S5S9NN"
    print("  --> [PHASE 2.5] Injecting DNS A Records via WHM JSON API...")
    for d in DOMAINS:
        print(f"      Ensuring DNS record: mesh.{d} -> {SOVEREIGN_IP}")
        # UAPI call to add the DNS record (if using a cPanel account, else WHM api massdns)
        dns_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} \"curl -sk -H 'Authorization: whm root:{WHM_TOKEN}' 'https://127.0.0.1:2087/json-api/addzonerecord?api.version=1&domain={d}&name=mesh&class=IN&ptype=A&address={SOVEREIGN_IP}'\""
        subprocess.run(dns_cmd, shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

    print("  --> [PHASE 3] Restarting HTTPD to lock in the mesh routing...")
    subprocess.run(f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} '/scripts/rebuildhttpdconf && systemctl restart httpd'", shell=True)

    print("  --> [PHASE 4] Triggering AutoSSL via WHM JSON API to secure HTTPS...")
    # Note: To avoid common name invalid errors, we run the native WHM autossl checker across the users.
    ssl_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@{SOVEREIGN_IP} \"curl -sk -H 'Authorization: whm root:{WHM_TOKEN}' 'https://127.0.0.1:2087/json-api/start_autossl_check_for_all_users?api.version=1'\""
    subprocess.run(ssl_cmd, shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    print("      [API] AutoSSL cycle initiated. Certs will provision shortly.")

    print(f"\n--> 🎯 Deployment Complete. The Sovereign Command Console is now physically active on:")
    for d in DOMAINS:
        print(f"    - https://mesh.{d} (Pending SSL propagation)")
        
    return True

if __name__ == "__main__":
    success = deploy_to_kvm()
    exit(0 if success else 1)

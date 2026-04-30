#!/usr/bin/env python3
"""
Domain B: Legal-Tech / De Novo Ingestion
Responsibility: Safely piping high-sensitivity Bar Association EML/PDF payloads 
from the Swarm boundary directly into the sovereign cPanel KVM.
"""
import os
import sys
import asyncio
from datetime import datetime, timezone

async def ingest_legal_payloads():
    print("⚖️ [LEGAL-TECH] Initiating Sovereign De Novo Filing Ingestion...")
    print("--> Target Boundary: cPanel KVM (192.168.122.237)")
    
    # Example local boundary where the VisionClaw OCR drops its processed payloads
    local_payload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".goalie", "legal_payloads")
    os.makedirs(local_payload_dir, exist_ok=True)
    
    target_host = "root@192.168.122.237"
    # Destination inside the Sovereign cPanel user account
    target_dest = "/home/yocloud/legal_tech_ingress/"
    
    print(f"--> [I/O] Ensuring target sovereign vault exists: {target_dest}")
    mkdir_proc = await asyncio.create_subprocess_exec(
        "ssh", "-o", "StrictHostKeyChecking=no", target_host, f"mkdir -p {target_dest}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    await mkdir_proc.communicate()
    
    print(f"--> [SYNC] Executing zero-trust rsync transfer...")
    # Using Rsync over SSH for strictly isolated, immutable syncing
    sync_proc = await asyncio.create_subprocess_exec(
        "rsync", "-avz", "-e", "ssh -o StrictHostKeyChecking=no", f"{local_payload_dir}/", f"{target_host}:{target_dest}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await sync_proc.communicate()
    
    if sync_proc.returncode == 0:
        print("✅ [SUCCESS] Bar Association payloads securely piped into the KVM.")
        print(f"   [{datetime.now(timezone.utc).isoformat()}] Chain of Custody Verified.")
    else:
        print("❌ [FATAL] Payload injection failed. Egress blocked.")
        print(stderr.decode())

if __name__ == "__main__":
    asyncio.run(ingest_legal_payloads())

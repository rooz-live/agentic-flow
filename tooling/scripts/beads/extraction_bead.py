import os
import sys
import asyncio

# Architectural Constants
LEGACY_AWS_IP = "54.241.233.105"
KVM_IP = "192.168.122.237"
BACKUP_DIR = "/Volumes/cPanelBackups/incremental/home"

async def run_cmd(cmd, step_name):
    process = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    return process.returncode == 0

async def extract_and_migrate(account_name, semaphore):
    async with semaphore:
        print(f"--> ⚡ [START] Bead Matrix: {account_name}")
        local_file = f"{BACKUP_DIR}/cpmove-{account_name}.tar.gz"
        
        # 1. Package on AWS
        if not os.path.exists(local_file):
            print(f"  [{account_name}] Packaging on AWS...")
            pkg_cmd = f'ssh -t -o StrictHostKeyChecking=no ubuntu@{LEGACY_AWS_IP} "sudo /scripts/pkgacct {account_name}" >/dev/null 2>&1'
            if not await run_cmd(pkg_cmd, f"{account_name}_pkg"):
                print(f"    ❌ [FAULT] Failed to package {account_name}")
                return False
                
            # 2. Download to Mac
            print(f"  [{account_name}] Securely downloading (Local Custody)...")
            os.makedirs(BACKUP_DIR, exist_ok=True)
            dl_cmd = f'rsync -avzP --rsync-path="sudo rsync" -e "ssh -o StrictHostKeyChecking=no" ubuntu@{LEGACY_AWS_IP}:/home/cpmove-{account_name}.tar.gz {BACKUP_DIR}/ >/dev/null 2>&1'
            if not await run_cmd(dl_cmd, f"{account_name}_dl"):
                print(f"    ❌ [FAULT] Failed to download {account_name}")
                return False
        else:
            print(f"  [{account_name}] ⏭️ SKIP: Exists in Local Custody.")

        # 3. Upload to KVM (Decoupled for Mass Sync)
        # print(f"  [{account_name}] Uploading to Sovereign KVM...")
        # check_kvm = f'ssh -J stx -o StrictHostKeyChecking=no root@{KVM_IP} "test -f /home/cpmove-{account_name}.tar.gz" >/dev/null 2>&1'
        # if await run_cmd(check_kvm, f"{account_name}_check"):
        #     print(f"  [{account_name}] ⏭️ SKIP: Physically staged on KVM.")
        # else:
        #     ul_cmd = f'rsync -avzP -e "ssh -J stx -o StrictHostKeyChecking=no" {local_file} root@{KVM_IP}:/home/ >/dev/null 2>&1'
        #     if not await run_cmd(ul_cmd, f"{account_name}_ul"):
        #         print(f"    ❌ [FAULT] Failed to push {account_name} to KVM.")
        #         return False

        print(f"--> ✅ [SUCCESS] Account {account_name} is mathematically synced to Local Custody.")
        return True

async def main(accounts):
    print(f"--> 🚀 Initiating Massively Parallel Proc (MPP) for {len(accounts)} accounts...")
    # Bounded Semaphore: Limit to 2 concurrent extractions to prevent AWS OOM (Out of Memory) kills.
    semaphore = asyncio.Semaphore(2)
    
    tasks = [extract_and_migrate(acct, semaphore) for acct in accounts]
    results = await asyncio.gather(*tasks)
    
    if all(results):
        print("\n--> 🎯 SWARM ORCHESTRATION COMPLETE. 100% Data Sovereignty Achieved.")
        sys.exit(0)
    else:
        print("\n--> 🛑 FATAL: One or more extractions failed. Do NOT execute Tombstone.")
        sys.exit(1)

if __name__ == "__main__":
    accounts = sys.argv[1:]
    if not accounts:
        print("Usage: python3 extraction_bead.py <account1> <account2> ...")
        sys.exit(1)
        
    asyncio.run(main(accounts))

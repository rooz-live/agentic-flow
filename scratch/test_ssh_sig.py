import subprocess
import tempfile
import os

def test_sig():
    # 1. Create a temporary SSH key
    key_path = "/tmp/test_key"
    if os.path.exists(key_path):
        os.remove(key_path)
    if os.path.exists(key_path + ".pub"):
        os.remove(key_path + ".pub")
        
    subprocess.run(["ssh-keygen", "-t", "ed25519", "-C", "test@rooz.live", "-f", key_path, "-N", ""], check=True)
    
    # 2. Sign a message
    message = "abc123commit"
    msg_file = "/tmp/msg.txt"
    with open(msg_file, "w") as f:
        f.write(message)
        
    sig_file = "/tmp/msg.txt.sig"
    if os.path.exists(sig_file):
        os.remove(sig_file)
        
    # Sign using ssh-keygen
    subprocess.run(["ssh-keygen", "-Y", "sign", "-f", key_path, "-n", "scorecard-gate", msg_file], check=True)
    
    # 3. Create allowed_signers file
    with open(key_path + ".pub", "r") as f:
        pubkey = f.read().split()[1]
    allowed_signers = f"test@rooz.live ssh-ed25519 {pubkey}\n"
    
    allowed_file = "/tmp/allowed_signers"
    with open(allowed_file, "w") as f:
        f.write(allowed_signers)
        
    # 4. Verify the signature via stdin
    proc = subprocess.run(
        ["ssh-keygen", "-Y", "verify", "-f", allowed_file, "-I", "test@rooz.live", "-n", "scorecard-gate", "-s", sig_file],
        input=message.encode("utf-8"),
        capture_output=True
    )
    
    print("Return code:", proc.returncode)
    print("Stdout:", proc.stdout.decode())
    print("Stderr:", proc.stderr.decode())

if __name__ == "__main__":
    test_sig()

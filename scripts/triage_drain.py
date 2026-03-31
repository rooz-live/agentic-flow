import os
import time
import subprocess
import signal

def get_pids(pattern):
    try:
        output = subprocess.check_output(['pgrep', '-f', pattern]).decode('utf-8')
        return [int(p) for p in output.split()]
    except subprocess.CalledProcessError:
        return []

def drain_swarm():
    print("Gathering targets...")
    agent_pids = get_pids('persistent-agent-wrapper')
    print(f"Found {len(agent_pids)} agent wrappers.")
    
    batch_size = 50
    for i in range(0, len(agent_pids), batch_size):
        batch = agent_pids[i:i+batch_size]
        print(f"Draining batch {i//batch_size + 1}: {len(batch)} processes...")
        
        # Wake and terminate
        for pid in batch:
            try:
                os.kill(pid, signal.SIGCONT)
                os.kill(pid, signal.SIGTERM)
            except OSError:
                pass
                
        time.sleep(1) # give them time to flush WAL
        
        # Kill stubborn
        for pid in batch:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
                
    print("Agent drain complete. Gathering orphan bash scripts...")
    bash_pids = get_pids('bash')
    # Kill bash aggressively as they don't hold sqlite connections
    for pid in bash_pids:
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass

    print("Bash drain complete.")
    
if __name__ == '__main__':
    drain_swarm()

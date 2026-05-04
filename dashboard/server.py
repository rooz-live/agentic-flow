from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import sys

app = Flask(__name__)
CORS(app)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
BEADS_DIR = os.path.join(ROOT_DIR, 'tooling/scripts/beads')

@app.route('/api/execute', methods=['POST'])
def execute_swarm():
    data = request.json
    swarm_type = data.get('swarm')
    config = data.get('config', {})
    
    print(f"--> 📡 Received DBOS Swarm Execution Request: {swarm_type}")
    
    try:
        # Route the physical execution to the appropriate bead
        output = ""
        error = ""
        if swarm_type == "PLAYWRIGHT_E2E" or swarm_type == "PLAYWRIGHT_SNAPSHOT":
            target = config.get("target", "de_novo_intake_portal")
            bead_path = os.path.join(BEADS_DIR, 'scd_browser_subagent.py')
            print(f"  --> Triggering Playwright Headless Probe against {target}")
            # Execute robustly and wait for physical output
            res = subprocess.run([sys.executable, bead_path, target], capture_output=True, text=True, timeout=120)
            output = res.stdout
            error = res.stderr
            
        elif swarm_type == "KVM_LIQUIDATION":
            bead_path = os.path.join(BEADS_DIR, 'domain_onboarder_baremetal.py')
            print(f"  --> Triggering Hardware Capital Liquidation / Provisioning")
            res = subprocess.run([sys.executable, bead_path, "liquidate_or_provision"], capture_output=True, text=True, timeout=120)
            output = res.stdout
            error = res.stderr
            
        elif swarm_type == "AST_SEMANTIC_INDEXER" or swarm_type == "AST_INSPECT":
            bead_path = os.path.join(BEADS_DIR, 'ast_semantic_indexer.py')
            target = config.get('target', '')
            print(f"  --> Triggering AST Semantic Re-indexing via Ollama for {target}")
            res = subprocess.run([sys.executable, bead_path, target], capture_output=True, text=True, timeout=120)
            output = res.stdout
            error = res.stderr
            
        elif swarm_type == "vibecast_pulse":
            bead_path = os.path.join(BEADS_DIR, 'vibecast_ingress_portal.py')
            print(f"  --> Triggering Vibecast Pulse (O-GOV Ingress)")
            res = subprocess.run([sys.executable, bead_path, "vibecast_pulse"], capture_output=True, text=True, timeout=30)
            output = res.stdout
            error = res.stderr

        elif swarm_type == "crisis_arbitrage":
            bead_path = os.path.join(BEADS_DIR, 'vibecast_ingress_portal.py')
            print(f"  --> Engaging Crisis Arbitrage Lock (O-GOV Ingress)")
            res = subprocess.run([sys.executable, bead_path, "crisis_arbitrage"], capture_output=True, text=True, timeout=30)
            output = res.stdout
            error = res.stderr

        else:
            print(f"  --> [WARNING] Unknown Swarm Action: {swarm_type}")
            return jsonify({"status": "error", "message": "Unknown Action"}), 400

        return jsonify({"status": "success", "message": f"{swarm_type} Executed.", "output": output, "error": error})

    except Exception as e:
        print(f"  ❌ Execution API Failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 Sovereign DBOS Execution API running on port 8123...")
    app.run(port=8123, host='0.0.0.0')

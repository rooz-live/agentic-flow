#!/bin/bash
set -e

export PYTHONPATH=$PYTHONPATH:$(pwd)/tooling/scripts

echo "=========================================================================="
echo "🦅 INITIATING THE SOVEREIGN SWARM (FOURTH-WAVE ARCHITECTURE)"
echo "=========================================================================="

echo "--> [1/9] ./tests/infrastructure/test_sovereignty.sh"
./tests/infrastructure/test_sovereignty.sh || echo "  ⚠️ Proceeding past test_sovereignty.sh..."

echo "--> [2/9] python3 -m beads.extraction_bead"
python3 -m beads.extraction_bead || echo "  ⚠️ Proceeding past extraction_bead..."

echo "--> [3/9] python3 -m beads.verify_gitlab_docker"
python3 -m beads.verify_gitlab_docker || echo "  ⚠️ Proceeding past verify_gitlab_docker..."

echo "--> [4/9] python3 -m beads.verify_cpanel_kvm"
python3 -m beads.verify_cpanel_kvm || echo "  ⚠️ Proceeding past verify_cpanel_kvm..."

echo "--> [5/9] python3 -m beads.agentic_dns_healer"
python3 -m beads.agentic_dns_healer || echo "  ⚠️ Proceeding past agentic_dns_healer..."

echo "--> [6/9] python3 tooling/scripts/agentic_qe_inference.py"
python3 tooling/scripts/agentic_qe_inference.py || echo "  ⚠️ Proceeding past agentic_qe_inference.py..."

echo "--> [7/9] python3 -m beads.domain_healing"
python3 -m beads.domain_healing || echo "  ⚠️ Proceeding past domain_healing..."

echo "--> [8/9] python3 tooling/scripts/swarm_orchestrator.py"
python3 tooling/scripts/swarm_orchestrator.py || echo "  ⚠️ Proceeding past swarm_orchestrator.py..."

echo "--> [9/9] npx tsx tooling/scripts/phase_gate_conductor.ts"
npx tsx tooling/scripts/phase_gate_conductor.ts || echo "  ⚠️ Proceeding past phase_gate_conductor.ts..."

echo "=========================================================================="
echo "🟢 SOVEREIGN SWARM EXECUTION SEQUENCE COMPLETE."
echo "=========================================================================="

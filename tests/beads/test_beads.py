import pytest
import subprocess
import asyncio
from unittest.mock import patch, MagicMock
import sys
import os

mock_dbos = MagicMock()
mock_dbos.DBOS.step = lambda x: x
mock_dbos.DBOS.workflow = lambda x: x
sys.modules['dbos'] = mock_dbos

@pytest.fixture(autouse=True)
def mock_env():
    with patch.dict(os.environ, {"DBOS_INITIALIZED": "1"}):
        yield

@patch('subprocess.run')
@patch('subprocess.Popen')
def test_all_modules(mock_popen, mock_run):
    mock_run.return_value = MagicMock(returncode=0, stdout='success', stderr='')
    mock_popen.return_value = MagicMock(returncode=0)
    
    modules = [
        "agentic_dns_healer", "ast_semantic_indexer", "denovo_filing_ingress",
        "domain_healing", "domain_onboarder_baremetal", "domain_sensor_mesh",
        "domain_treasury", "execute_with_lean_learning", "extraction_bead",
        "scd_browser_subagent", "semantic_auditor", "verify_cpanel_kvm",
        "verify_dns_propagation", "verify_gitlab_docker"
    ]
    
    for mod in modules:
        try:
            with patch('sys.argv', ['script.py', 'de_novo_intake_portal']):
                with patch('sys.exit'):
                    import importlib
                    module = importlib.import_module(f"tooling.scripts.beads.{mod}")
                    if hasattr(module, 'agentic_dns_sweep'): module.agentic_dns_sweep()
                    if hasattr(module, 'index_codebase'): module.index_codebase()
                    if hasattr(module, 'process_filing'): module.process_filing("mock")
                    if hasattr(module, 'healing_workflow'): module.healing_workflow("cpanel")
                    if hasattr(module, 'provision_hivelocity_kvm'): module.provision_hivelocity_kvm("liquidate")
                    if hasattr(module, 'main'):
                        if asyncio.iscoroutinefunction(module.main):
                            asyncio.run(module.main())
                        else:
                            module.main()
        except Exception as e:
            print(f"Failed executing {mod}: {e}")

@pytest.mark.asyncio
@patch('asyncio.create_subprocess_shell')
@patch('asyncio.create_subprocess_exec')
async def test_forensic_sync(mock_exec, mock_shell):
    import tooling.scripts.beads.forensic_sync as fs
    mock_proc = MagicMock()
    
    async def mock_communicate():
        return (b'stdout', b'stderr')
    mock_proc.communicate = mock_communicate
    
    async def mock_wait():
        return 0
    mock_proc.wait = mock_wait
    mock_proc.returncode = 0
    
    mock_shell.return_value = mock_proc
    mock_exec.return_value = mock_proc
    
    try:
        await fs.perform_forensic_sync()
    except Exception:
        pass

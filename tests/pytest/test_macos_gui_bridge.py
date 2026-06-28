import pytest
from unittest.mock import patch, MagicMock
import subprocess
from src.gateways.macos_gui_bridge import MacOSGUIBridge

@patch('subprocess.run')
def test_secure_prompt(mock_run):
    mock_run.return_value = MagicMock(stdout="button returned:OK, text returned:secret123\n")
    
    result = MacOSGUIBridge.secure_prompt("Enter password")
    
    assert result == "secret123"
    mock_run.assert_called_once()
    cmd_args = mock_run.call_args[0][0]
    assert cmd_args[0] == 'osascript'
    assert 'display dialog "Enter password"' in cmd_args[2]

@patch('subprocess.Popen')
def test_copy_to_clipboard(mock_popen):
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_popen.return_value = mock_process
    
    MacOSGUIBridge.copy_to_clipboard("test_string")
    
    mock_popen.assert_called_once_with(['pbcopy'], stdin=subprocess.PIPE)
    mock_process.communicate.assert_called_once_with(input=b"test_string")

@patch('subprocess.run')
def test_paste_from_clipboard(mock_run):
    mock_run.return_value = MagicMock(stdout="clipboard_content")
    
    result = MacOSGUIBridge.paste_from_clipboard()
    
    assert result == "clipboard_content"
    mock_run.assert_called_once_with(['pbpaste'], capture_output=True, text=True, check=True)

@patch('subprocess.run')
@patch.object(MacOSGUIBridge, 'secure_prompt')
def test_op_signin_bridge(mock_secure_prompt, mock_run):
    mock_secure_prompt.return_value = "my_master_password"
    mock_run.return_value = MagicMock(stdout="session_token_xyz")
    
    result = MacOSGUIBridge.op_signin_bridge()
    
    assert result == "session_token_xyz"
    mock_secure_prompt.assert_called_once()
    mock_run.assert_called_once_with(['op', 'signin', '--raw'], input="my_master_password", capture_output=True, text=True, check=True)

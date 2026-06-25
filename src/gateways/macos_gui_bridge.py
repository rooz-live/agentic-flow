import subprocess
import shlex

class MacOSGUIBridge:
    """
    A gateway bridge connecting headless background processes (like AI agents) 
    to native macOS graphical environments and the system clipboard.
    
    This enforces the Zero Trust boundary by preventing credentials and 
    environment variables from being logged in chat transcripts.
    """
    
    @staticmethod
    def secure_prompt(prompt_text: str, title: str = "Agentic Flow", hidden: bool = True) -> str:
        """
        Spawns a native macOS dialog to request sensitive input.
        Bypasses chat logs by piping input directly into the runtime.
        """
        # Escape quotes for AppleScript
        safe_prompt = prompt_text.replace('"', '\\"')
        safe_title = title.replace('"', '\\"')
        
        script = f'display dialog "{safe_prompt}" with title "{safe_title}" default answer ""'
        if hidden:
            script += ' with hidden answer'
            
        cmd = ['osascript', '-e', script]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            # osascript returns: button returned:OK, text returned:THE_INPUT
            output = result.stdout.strip()
            if "text returned:" in output:
                return output.split("text returned:", 1)[1].strip()
            return ""
        except subprocess.CalledProcessError as e:
            # User likely clicked Cancel (exit code 1)
            raise RuntimeError(f"User canceled or dialog failed: {e.stderr.strip()}")

    @staticmethod
    def alert(message: str, title: str = "Agentic Flow") -> None:
        """
        Spawns a native macOS informational alert dialog.
        """
        safe_msg = message.replace('"', '\\"')
        safe_title = title.replace('"', '\\"')
        
        script = f'display dialog "{safe_msg}" with title "{safe_title}" buttons {{"OK"}} default button 1'
        cmd = ['osascript', '-e', script]
        subprocess.run(cmd, capture_output=True, check=True)

    @staticmethod
    def copy_to_clipboard(text: str) -> None:
        """
        Injects arbitrary text into the user's macOS clipboard via pbcopy.
        """
        process = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
        process.communicate(input=text.encode('utf-8'))
        if process.returncode != 0:
            raise RuntimeError("pbcopy failed to write to clipboard.")

    @staticmethod
    def paste_from_clipboard() -> str:
        """
        Retrieves text from the user's macOS clipboard via pbpaste.
        """
        result = subprocess.run(['pbpaste'], capture_output=True, text=True, check=True)
        return result.stdout

    @staticmethod
    def op_signin_bridge() -> str:
        """
        Specialized macro that prompts for the 1Password master password 
        and pipes it securely to `op signin --raw`, returning the session token.
        """
        password = MacOSGUIBridge.secure_prompt(
            prompt_text="Enter 1Password Master Password:", 
            title="1Password Unlock (Headless Bridge)",
            hidden=True
        )
        
        cmd = ['op', 'signin', '--raw']
        
        try:
            process = subprocess.run(cmd, input=password, capture_output=True, text=True, check=True)
            return process.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"1Password signin failed: {e.stderr.strip()}")

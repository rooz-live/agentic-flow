# env python3
import fcntl
import os
from pathlib import Path
from typing import Optional

class DecentralizedLock:
    """A cross-platform non-blocking file lock for coordinate decentralized workers."""
    
    def __init__(self, lock_dir: Path, resource_id: str):
        self.lock_dir = lock_dir
        self.resource_id = resource_id
        # Sanitize resource_id for filename use
        safe_id = "".join(c for c in resource_id if c.isalnum() or c in "._-").rstrip()
        self.lock_path = lock_dir / f"{safe_id}.lock"
        self.fd: Optional[int] = None

    def acquire(self) -> bool:
        """Attempt to acquire the lock without blocking. Returns True if successful."""
        try:
            self.lock_dir.mkdir(parents=True, exist_ok=True)
            # Open for writing and attempt an exclusive, non-blocking lock
            self.fd = os.open(self.lock_path, os.O_CREAT | os.O_WRONLY, 0o600)
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except (IOError, OSError):
            if self.fd is not None:
                try:
                    os.close(self.fd)
                except Exception:
                    pass
                self.fd = None
            return False

    def release(self) -> None:
        """Release the acquired lock and close the file descriptor."""
        if self.fd is not None:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
                os.close(self.fd)
            except Exception:
                pass
            finally:
                self.fd = None
                # Clean up lock file if possible (transient, ignore errors if other processes exist)
                try:
                    os.unlink(self.lock_path)
                except Exception:
                    pass

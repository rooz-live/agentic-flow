#!/usr/bin/env python3
"""
AF CLI Wrapper - Backward compatible entry point
Routes to unified CLI while maintaining existing interface
"""

import sys
import os
from pathlib import Path

# Add src to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from unified_af_cli import UnifiedAFCli


def main():
    """Main wrapper entry point"""
    # Set up environment
    project_root = Path(__file__).parent.parent.parent
    os.environ["PROJECT_ROOT"] = str(project_root)
    
    # Route to unified CLI
    cli = UnifiedAFCli()
    return cli.run()


if __name__ == "__main__":
    sys.exit(main())
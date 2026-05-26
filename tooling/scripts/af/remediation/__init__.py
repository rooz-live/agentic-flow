#!/usr/bin/env python3
"""
Agentic Flow Remediation Planning System

This module provides intelligent remediation workflows with:
- Automatic package manager detection
- Kubelet state diagnosis
- Platform-appropriate fix commands
- Rollback procedures
- Break glass integration

Example usage:
    from scripts.af.remediation import (
        PackageManagerDetector,
        KubeletDiagnostics,
        RemediationCLI
    )
    
    # Detect package manager
    detector = PackageManagerDetector()
    pm = detector.detect()
    print(f"Package Manager: {pm.value}")
    
    # Run kubelet diagnostics
    diag = KubeletDiagnostics()
    results = diag.run_full_diagnosis()
    plan = diag.generate_remediation_plan()
    
    # Generate install command
    cmd = detector.generate_install_command(['kubelet', 'kubernetes-cni'])
    print(f"Install command: {cmd}")
"""

from .package_manager import (
    PackageManager,
    PackageCommand,
    RemediationStep as PackageRemediationStep,
    PackageManagerDetector
)

from .kubelet_diagnosis import (
    KubeletFailureMode,
    RemediationStep,
    DiagnosisResult,
    KubeletDiagnostics
)

from .cli import (
    BreakGlassManager,
    RemediationCLI
)

__version__ = "1.0.0"
__author__ = "Agentic Flow Team"

__all__ = [
    # Package Manager
    "PackageManager",
    "PackageCommand",
    "PackageRemediationStep",
    "PackageManagerDetector",
    
    # Kubelet Diagnosis
    "KubeletFailureMode",
    "RemediationStep",
    "DiagnosisResult",
    "KubeletDiagnostics",
    
    # CLI
    "BreakGlassManager",
    "RemediationCLI",
]

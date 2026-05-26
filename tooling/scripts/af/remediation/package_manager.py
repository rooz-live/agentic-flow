#!/usr/bin/env python3
"""
Package Manager Detection - Cross-Platform Support

Detects and provides unified interface for:
- apt (Debian/Ubuntu)
- yum (RHEL/CentOS 7)
- dnf (RHEL/CentOS 8+, Fedora)
- apk (Alpine)
- brew (macOS)
- zypper (SUSE/openSUSE)
"""

import subprocess
import shutil
import os
import json
import sys
from enum import Enum
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, asdict


class PackageManager(Enum):
    APT = "apt"
    YUM = "yum"
    DNF = "dnf"
    APK = "apk"
    BREW = "brew"
    ZYPPER = "zypper"
    UNKNOWN = "unknown"


@dataclass
class PackageCommand:
    """Represents a package management command"""
    install: str
    remove: str
    update: str
    search: str
    info: str
    list_installed: str
    
    def to_dict(self) -> Dict[str, str]:
        return asdict(self)


@dataclass
class RemediationStep:
    """A single remediation step with rollback"""
    description: str
    command: str
    rollback_command: Optional[str]
    requires_break_glass: bool
    risk_level: str  # low, medium, high
    
    def to_dict(self) -> Dict:
        return {
            "description": self.description,
            "command": self.command,
            "rollback_command": self.rollback_command,
            "requires_break_glass": self.requires_break_glass,
            "risk_level": self.risk_level
        }


class PackageManagerDetector:
    """Detects and provides interface to system package manager"""
    
    PACKAGE_MANAGERS: Dict[PackageManager, PackageCommand] = {
        PackageManager.APT: PackageCommand(
            install="apt-get install -y",
            remove="apt-get remove -y",
            update="apt-get update && apt-get upgrade -y",
            search="apt-cache search",
            info="apt-cache show",
            list_installed="dpkg -l"
        ),
        PackageManager.DNF: PackageCommand(
            install="dnf install -y",
            remove="dnf remove -y",
            update="dnf update -y",
            search="dnf search",
            info="dnf info",
            list_installed="dnf list installed"
        ),
        PackageManager.YUM: PackageCommand(
            install="yum install -y",
            remove="yum remove -y",
            update="yum update -y",
            search="yum search",
            info="yum info",
            list_installed="yum list installed"
        ),
        PackageManager.APK: PackageCommand(
            install="apk add",
            remove="apk del",
            update="apk update && apk upgrade",
            search="apk search",
            info="apk info",
            list_installed="apk info -v"
        ),
        PackageManager.BREW: PackageCommand(
            install="brew install",
            remove="brew uninstall",
            update="brew update && brew upgrade",
            search="brew search",
            info="brew info",
            list_installed="brew list --versions"
        ),
        PackageManager.ZYPPER: PackageCommand(
            install="zypper install -y",
            remove="zypper remove -y",
            update="zypper refresh && zypper update -y",
            search="zypper search",
            info="zypper info",
            list_installed="zypper packages --installed-only"
        )
    }
    
    # Package name mapping across different package managers
    PACKAGE_ALIASES: Dict[str, Dict[PackageManager, str]] = {
        "kubernetes-cni": {
            PackageManager.APT: "kubernetes-cni",
            PackageManager.YUM: "kubernetes-cni",
            PackageManager.DNF: "kubernetes-cni",
            PackageManager.APK: "cni-plugins",
            PackageManager.BREW: "kubernetes-cli",
            PackageManager.ZYPPER: "kubernetes-cni"
        },
        "containerd": {
            PackageManager.APT: "containerd.io",
            PackageManager.YUM: "containerd.io",
            PackageManager.DNF: "containerd.io",
            PackageManager.APK: "containerd",
            PackageManager.BREW: "containerd",
            PackageManager.ZYPPER: "containerd"
        },
        "kubelet": {
            PackageManager.APT: "kubelet",
            PackageManager.YUM: "kubelet",
            PackageManager.DNF: "kubelet",
            PackageManager.APK: "kubelet",
            PackageManager.BREW: "kubernetes-cli",
            PackageManager.ZYPPER: "kubelet"
        }
    }
    
    def __init__(self):
        self._detected: Optional[PackageManager] = None
        self._os_info: Dict[str, str] = {}
    
    def detect(self) -> PackageManager:
        """Detect the system's package manager"""
        if self._detected:
            return self._detected
        
        # Check each package manager in order of preference
        # DNF is checked before YUM because RHEL 8+ has both but prefers DNF
        detection_order = [
            (PackageManager.DNF, "dnf"),
            (PackageManager.APT, "apt-get"),
            (PackageManager.YUM, "yum"),
            (PackageManager.APK, "apk"),
            (PackageManager.BREW, "brew"),
            (PackageManager.ZYPPER, "zypper")
        ]
        
        for pm, binary in detection_order:
            if shutil.which(binary):
                self._detected = pm
                return pm
        
        self._detected = PackageManager.UNKNOWN
        return self._detected
    
    def get_os_info(self) -> Dict[str, str]:
        """Get OS information for context"""
        if self._os_info:
            return self._os_info
        
        info = {}
        
        # Try /etc/os-release (Linux)
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release") as f:
                    for line in f:
                        if "=" in line:
                            key, value = line.strip().split("=", 1)
                            info[key] = value.strip('"')
            except Exception:
                pass
        
        # Try sw_vers (macOS)
        if not info:
            try:
                result = subprocess.run(
                    ["sw_vers"], 
                    capture_output=True, 
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    for line in result.stdout.strip().split("\n"):
                        if ":" in line:
                            key, value = line.split(":", 1)
                            info[key.strip()] = value.strip()
            except Exception:
                pass
        
        # Fallback to uname
        try:
            result = subprocess.run(
                ["uname", "-a"], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            info["UNAME"] = result.stdout.strip()
        except Exception:
            pass
        
        self._os_info = info
        return info
    
    def get_commands(self) -> Optional[PackageCommand]:
        """Get commands for detected package manager"""
        pm = self.detect()
        return self.PACKAGE_MANAGERS.get(pm)
    
    def resolve_package_name(self, generic_name: str) -> str:
        """Resolve a generic package name to the platform-specific name"""
        pm = self.detect()
        if generic_name in self.PACKAGE_ALIASES:
            return self.PACKAGE_ALIASES[generic_name].get(pm, generic_name)
        return generic_name
    
    def generate_install_command(self, packages: List[str], use_sudo: bool = True) -> str:
        """Generate install command for given packages"""
        commands = self.get_commands()
        if not commands:
            return f"# Unknown package manager - install manually: {' '.join(packages)}"
        
        # Resolve package names for this platform
        resolved_packages = [self.resolve_package_name(p) for p in packages]
        
        sudo_prefix = "sudo " if use_sudo and self.detect() != PackageManager.BREW else ""
        return f"{sudo_prefix}{commands.install} {' '.join(resolved_packages)}"
    
    def generate_remove_command(self, packages: List[str], use_sudo: bool = True) -> str:
        """Generate remove command for rollback"""
        commands = self.get_commands()
        if not commands:
            return f"# Unknown package manager - remove manually: {' '.join(packages)}"
        
        resolved_packages = [self.resolve_package_name(p) for p in packages]
        sudo_prefix = "sudo " if use_sudo and self.detect() != PackageManager.BREW else ""
        return f"{sudo_prefix}{commands.remove} {' '.join(resolved_packages)}"
    
    def generate_update_command(self, use_sudo: bool = True) -> str:
        """Generate system update command"""
        commands = self.get_commands()
        if not commands:
            return "# Unknown package manager - update manually"
        
        sudo_prefix = "sudo " if use_sudo and self.detect() != PackageManager.BREW else ""
        return f"{sudo_prefix}{commands.update}"
    
    def check_package_installed(self, package: str) -> Tuple[bool, str]:
        """Check if a package is installed"""
        pm = self.detect()
        resolved_package = self.resolve_package_name(package)
        
        check_commands = {
            PackageManager.APT: f"dpkg -l {resolved_package}",
            PackageManager.DNF: f"dnf list installed {resolved_package}",
            PackageManager.YUM: f"yum list installed {resolved_package}",
            PackageManager.APK: f"apk info -e {resolved_package}",
            PackageManager.BREW: f"brew list {resolved_package}",
            PackageManager.ZYPPER: f"zypper se -i {resolved_package}"
        }
        
        cmd = check_commands.get(pm)
        if not cmd:
            return False, "Unknown package manager"
        
        try:
            result = subprocess.run(
                cmd.split(),
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.returncode == 0, result.stdout
        except Exception as e:
            return False, str(e)
    
    def generate_remediation_steps(
        self, 
        packages: List[str], 
        action: str = "install"
    ) -> List[RemediationStep]:
        """Generate remediation steps with rollback for package operations"""
        steps = []
        
        if action == "install":
            # Step 1: Update package cache
            steps.append(RemediationStep(
                description="Update package manager cache",
                command=self._get_cache_update_command(),
                rollback_command=None,
                requires_break_glass=False,
                risk_level="low"
            ))
            
            # Step 2: Install packages
            steps.append(RemediationStep(
                description=f"Install packages: {', '.join(packages)}",
                command=self.generate_install_command(packages),
                rollback_command=self.generate_remove_command(packages),
                requires_break_glass=True,
                risk_level="medium"
            ))
            
            # Step 3: Verify installation
            for pkg in packages:
                steps.append(RemediationStep(
                    description=f"Verify {pkg} installation",
                    command=self._get_verify_command(pkg),
                    rollback_command=None,
                    requires_break_glass=False,
                    risk_level="low"
                ))
        
        elif action == "update":
            steps.append(RemediationStep(
                description="Update all packages",
                command=self.generate_update_command(),
                rollback_command="# Manual rollback required - check package versions",
                requires_break_glass=True,
                risk_level="high"
            ))
        
        return steps
    
    def _get_cache_update_command(self) -> str:
        """Get cache update command for the package manager"""
        pm = self.detect()
        cache_commands = {
            PackageManager.APT: "sudo apt-get update",
            PackageManager.DNF: "sudo dnf makecache",
            PackageManager.YUM: "sudo yum makecache",
            PackageManager.APK: "sudo apk update",
            PackageManager.BREW: "brew update",
            PackageManager.ZYPPER: "sudo zypper refresh"
        }
        return cache_commands.get(pm, "# Unknown package manager")
    
    def _get_verify_command(self, package: str) -> str:
        """Get verification command for installed package"""
        pm = self.detect()
        resolved = self.resolve_package_name(package)
        verify_commands = {
            PackageManager.APT: f"dpkg -s {resolved}",
            PackageManager.DNF: f"rpm -q {resolved}",
            PackageManager.YUM: f"rpm -q {resolved}",
            PackageManager.APK: f"apk info {resolved}",
            PackageManager.BREW: f"brew info {resolved}",
            PackageManager.ZYPPER: f"rpm -q {resolved}"
        }
        return verify_commands.get(pm, f"# Verify {resolved} manually")
    
    def to_json(self) -> str:
        """Export detector state as JSON"""
        pm = self.detect()
        commands = self.get_commands()
        
        return json.dumps({
            "package_manager": pm.value,
            "os_info": self.get_os_info(),
            "commands": commands.to_dict() if commands else None,
            "supported_managers": [m.value for m in PackageManager if m != PackageManager.UNKNOWN]
        }, indent=2)


def main():
    """CLI interface for package manager detection"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Package Manager Detection and Command Generation"
    )
    parser.add_argument(
        "--json", 
        action="store_true", 
        help="Output as JSON"
    )
    parser.add_argument(
        "--install", 
        nargs="+", 
        metavar="PACKAGE",
        help="Generate install command for packages"
    )
    parser.add_argument(
        "--remove", 
        nargs="+", 
        metavar="PACKAGE",
        help="Generate remove command for packages"
    )
    parser.add_argument(
        "--check", 
        metavar="PACKAGE",
        help="Check if package is installed"
    )
    parser.add_argument(
        "--remediation-plan",
        nargs="+",
        metavar="PACKAGE",
        help="Generate remediation plan for installing packages"
    )
    
    args = parser.parse_args()
    
    detector = PackageManagerDetector()
    
    if args.json:
        print(detector.to_json())
        return
    
    if args.install:
        print(detector.generate_install_command(args.install))
        return
    
    if args.remove:
        print(detector.generate_remove_command(args.remove))
        return
    
    if args.check:
        installed, output = detector.check_package_installed(args.check)
        status = "installed" if installed else "not installed"
        print(f"{args.check}: {status}")
        if output:
            print(output)
        sys.exit(0 if installed else 1)
    
    if args.remediation_plan:
        steps = detector.generate_remediation_steps(args.remediation_plan)
        print("\n=== Remediation Plan ===\n")
        for i, step in enumerate(steps, 1):
            bg = " [BREAK_GLASS]" if step.requires_break_glass else ""
            print(f"{i}. [{step.risk_level.upper()}]{bg} {step.description}")
            print(f"   Command: {step.command}")
            if step.rollback_command:
                print(f"   Rollback: {step.rollback_command}")
            print()
        return
    
    # Default: show detection info
    pm = detector.detect()
    os_info = detector.get_os_info()
    commands = detector.get_commands()
    
    print("\n=== Package Manager Detection ===\n")
    print(f"Detected: {pm.value}")
    print(f"\nOS Information:")
    for key, value in os_info.items():
        print(f"  {key}: {value}")
    
    if commands:
        print(f"\nAvailable Commands:")
        print(f"  Install: {commands.install}")
        print(f"  Remove:  {commands.remove}")
        print(f"  Update:  {commands.update}")
        print(f"  Search:  {commands.search}")
        print(f"  Info:    {commands.info}")
        print(f"  List:    {commands.list_installed}")
    else:
        print("\nNo package manager detected!")


if __name__ == "__main__":
    main()

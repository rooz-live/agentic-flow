#!/usr/bin/env python3
"""
Extended StarlingX Health Diagnostics

Phase 0 (read-only) diagnostics to establish STX state before any modifications.
Includes:
- Package manager & repos
- Installed packages (cri-tools, kubelet, kubeadm, kubectl, containerd, docker)
- Control plane processes
- Kubelet/kubeconfig status
- Kubernetes manifests
"""

import subprocess
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

# Default SSH configuration for StarlingX
# Use SSH config alias from ~/.ssh/config
DEFAULT_STX_HOST = "stx-ubuntu"  # SSH config alias
DEFAULT_STX_PORT = "2222"
DEFAULT_STX_USER = "ubuntu"


@dataclass
class STXHealthResult:
    """Health check result for StarlingX"""
    timestamp: str
    host: str
    package_manager: str
    repos: List[str]
    installed_packages: Dict[str, str]
    control_plane_processes: List[str]
    kubelet_status: str
    kubeconfig_exists: bool
    manifests_exist: bool
    k8s_nodes: Optional[str]
    k8s_pods: Optional[str]
    errors: List[str]


def ssh_command(cmd: str, host: str = "stx-ubuntu", port: str = DEFAULT_STX_PORT) -> Tuple[str, int]:
    """Execute SSH command on StarlingX (read-only)"""
    # Use SSH config alias for simplified connection
    ssh_cmd = ["ssh", host, cmd]
    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=60)
        return result.stdout + result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "SSH command timed out", 1
    except Exception as e:
        return str(e), 1


def check_package_manager() -> Tuple[str, List[str]]:
    """Check package manager and list repos"""
    # Check for dnf (RHEL/AlmaLinux)
    output, rc = ssh_command("command -v dnf && dnf repolist 2>/dev/null")
    if rc == 0 and "dnf" in output:
        repos = [line.split()[0] for line in output.split("\n") if line and not line.startswith("/")]
        return "dnf", repos
    
    # Check for apt (Ubuntu/Debian)
    output, rc = ssh_command("command -v apt && apt policy 2>/dev/null | head -20")
    if rc == 0 and "apt" in output:
        return "apt", []
    
    return "unknown", []


def check_installed_packages() -> Dict[str, str]:
    """Check installed K8s-related packages"""
    packages = {}
    pkg_list = ["cri-tools", "kubelet", "kubeadm", "kubectl", "containerd.io", "docker-ce"]
    
    for pkg in pkg_list:
        output, rc = ssh_command(f"rpm -q {pkg} 2>/dev/null || dpkg -l {pkg} 2>/dev/null | tail -1")
        if rc == 0 and "not installed" not in output.lower():
            version = output.strip().split("\n")[0]
            packages[pkg] = version
        else:
            packages[pkg] = "not installed"
    
    return packages


def check_control_plane_processes() -> List[str]:
    """Check running control plane processes"""
    output, rc = ssh_command(
        "ps aux | egrep 'kube-apiserver|kube-controller|kube-scheduler|etcd' | grep -v egrep"
    )
    if rc == 0 and output.strip():
        return [line.split()[-1] for line in output.strip().split("\n") if line]
    return []


def check_kubelet_status() -> str:
    """Check kubelet service status"""
    output, rc = ssh_command("systemctl is-active kubelet 2>/dev/null")
    return output.strip() if rc == 0 else "unknown"


def check_kubeconfig() -> bool:
    """Check if admin.conf exists"""
    output, rc = ssh_command("test -f /etc/kubernetes/admin.conf && echo 'exists'")
    return "exists" in output


def check_manifests() -> bool:
    """Check if K8s static pod manifests exist"""
    output, rc = ssh_command("ls /etc/kubernetes/manifests/*.yaml 2>/dev/null | wc -l")
    try:
        return int(output.strip()) > 0
    except:
        return False


def check_k8s_status() -> Tuple[Optional[str], Optional[str]]:
    """Get K8s nodes and pods status"""
    nodes_out, nodes_rc = ssh_command(
        "export KUBECONFIG=/etc/kubernetes/admin.conf && kubectl get nodes -o wide 2>/dev/null"
    )
    pods_out, pods_rc = ssh_command(
        "export KUBECONFIG=/etc/kubernetes/admin.conf && kubectl get pods -A 2>/dev/null | head -20"
    )
    
    return (
        nodes_out.strip() if nodes_rc == 0 else None,
        pods_out.strip() if pods_rc == 0 else None
    )


def run_extended_health_check(host: str = DEFAULT_STX_HOST, json_output: bool = False) -> STXHealthResult:
    """Run all extended health checks"""
    errors = []
    
    # Test SSH connectivity first
    output, rc = ssh_command("echo 'SSH OK'", host)
    if rc != 0:
        errors.append(f"SSH connection failed: {output}")
        result = STXHealthResult(
            timestamp=datetime.now().isoformat() + "Z",
            host=host,
            package_manager="unknown",
            repos=[],
            installed_packages={},
            control_plane_processes=[],
            kubelet_status="unknown",
            kubeconfig_exists=False,
            manifests_exist=False,
            k8s_nodes=None,
            k8s_pods=None,
            errors=errors
        )
        return result
    
    pkg_manager, repos = check_package_manager()
    installed = check_installed_packages()
    control_plane = check_control_plane_processes()
    kubelet = check_kubelet_status()
    kubeconfig = check_kubeconfig()
    manifests = check_manifests()
    nodes, pods = check_k8s_status()
    
    result = STXHealthResult(
        timestamp=datetime.now().isoformat() + "Z",
        host=host,
        package_manager=pkg_manager,
        repos=repos,
        installed_packages=installed,
        control_plane_processes=control_plane,
        kubelet_status=kubelet,
        kubeconfig_exists=kubeconfig,
        manifests_exist=manifests,
        k8s_nodes=nodes,
        k8s_pods=pods,
        errors=errors
    )

    return result


def print_health_report(result: STXHealthResult) -> None:
    """Print formatted health report"""
    print("=" * 60)
    print("STARLINGX EXTENDED HEALTH DIAGNOSTICS (Read-Only)")
    print("=" * 60)
    print(f"Timestamp: {result.timestamp}")
    print(f"Host: {result.host}")
    print()

    print("📦 Package Manager:")
    print(f"  Type: {result.package_manager}")
    if result.repos:
        print(f"  Repos: {len(result.repos)}")
        for repo in result.repos[:5]:
            print(f"    - {repo}")
    print()

    print("📋 Installed Packages:")
    for pkg, version in result.installed_packages.items():
        status = "✅" if "not installed" not in version else "❌"
        print(f"  {status} {pkg}: {version}")
    print()

    print("🔧 Control Plane Processes:")
    if result.control_plane_processes:
        for proc in result.control_plane_processes:
            print(f"  ✅ {proc}")
    else:
        print("  ❌ No control plane processes found")
    print()

    print("⚙️  Kubelet Status:")
    kubelet_ok = result.kubelet_status == "active"
    print(f"  {'✅' if kubelet_ok else '❌'} {result.kubelet_status}")
    print()

    print("📁 Configuration:")
    print(f"  {'✅' if result.kubeconfig_exists else '❌'} /etc/kubernetes/admin.conf")
    print(f"  {'✅' if result.manifests_exist else '❌'} /etc/kubernetes/manifests/")
    print()

    if result.k8s_nodes:
        print("🖥️  Kubernetes Nodes:")
        for line in result.k8s_nodes.split("\n")[:5]:
            print(f"  {line}")
        print()

    if result.k8s_pods:
        print("🐳 Kubernetes Pods:")
        for line in result.k8s_pods.split("\n")[:10]:
            print(f"  {line}")
        print()

    if result.errors:
        print("❌ Errors:")
        for err in result.errors:
            print(f"  - {err}")
        print()

    # Summary
    print("=" * 60)
    print("SUMMARY:")
    k8s_ready = (
        result.kubelet_status == "active" and
        result.kubeconfig_exists and
        len(result.control_plane_processes) >= 3
    )
    print(f"  K8s Ready: {'✅ Yes' if k8s_ready else '❌ No'}")
    print(f"  Package Manager: {result.package_manager}")
    print("=" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="StarlingX Extended Health Diagnostics")
    parser.add_argument("--host", default=DEFAULT_STX_HOST, help="StarlingX host")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    result = run_extended_health_check(args.host, args.json)

    if args.json:
        print(json.dumps(asdict(result), indent=2))
    else:
        print_health_report(result)


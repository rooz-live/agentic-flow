#!/usr/bin/env python3
"""
Kubelet State Diagnosis - Common Failure Mode Detection

Identifies and provides remediation for:
- Certificate expiry
- CNI misconfiguration
- Resource exhaustion
- API server connectivity
- Container runtime issues
- Node registration failures
"""

import subprocess
import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum


class KubeletFailureMode(Enum):
    CERTIFICATE_EXPIRED = "certificate_expired"
    CERTIFICATE_EXPIRING_SOON = "certificate_expiring_soon"
    CNI_NOT_READY = "cni_not_ready"
    CNI_MISCONFIGURED = "cni_misconfigured"
    RESOURCE_EXHAUSTION_CPU = "resource_exhaustion_cpu"
    RESOURCE_EXHAUSTION_MEMORY = "resource_exhaustion_memory"
    RESOURCE_EXHAUSTION_DISK = "resource_exhaustion_disk"
    RESOURCE_EXHAUSTION_INODE = "resource_exhaustion_inode"
    RESOURCE_EXHAUSTION_PID = "resource_exhaustion_pid"
    API_SERVER_UNREACHABLE = "api_server_unreachable"
    CONTAINER_RUNTIME_DOWN = "container_runtime_down"
    KUBELET_NOT_RUNNING = "kubelet_not_running"
    KUBECONFIG_MISSING = "kubeconfig_missing"
    KUBECONFIG_INVALID = "kubeconfig_invalid"
    NODE_NOT_REGISTERED = "node_not_registered"
    NETWORK_PLUGIN_ERROR = "network_plugin_error"
    IMAGE_PULL_ERROR = "image_pull_error"
    EVICTION_THRESHOLD_MET = "eviction_threshold_met"


@dataclass
class RemediationStep:
    """Single remediation step with rollback"""
    order: int
    description: str
    command: str
    rollback_command: Optional[str]
    requires_break_glass: bool
    estimated_duration: str
    
    def to_dict(self) -> Dict:
        return {
            "order": self.order,
            "description": self.description,
            "command": self.command,
            "rollback": self.rollback_command,
            "requires_break_glass": self.requires_break_glass,
            "duration": self.estimated_duration
        }


@dataclass
class DiagnosisResult:
    """Result of a kubelet diagnosis"""
    failure_mode: KubeletFailureMode
    severity: str  # critical, high, medium, low
    description: str
    evidence: Dict[str, Any]
    remediation_steps: List[RemediationStep]
    
    def to_dict(self) -> Dict:
        return {
            "failure_mode": self.failure_mode.value,
            "severity": self.severity,
            "description": self.description,
            "evidence": self.evidence,
            "remediation_steps": [s.to_dict() for s in self.remediation_steps]
        }


class KubeletDiagnostics:
    """Diagnose kubelet failures and generate remediation plans"""
    
    KUBECONFIG_PATHS = [
        "/etc/kubernetes/admin.conf",
        "/etc/kubernetes/kubelet.conf",
        os.path.expanduser("~/.kube/config")
    ]
    
    MANIFEST_PATH = Path("/etc/kubernetes/manifests")
    CERT_PATHS = [
        Path("/etc/kubernetes/pki"),
        Path("/var/lib/kubelet/pki")
    ]
    
    CNI_CONFIG_PATH = Path("/etc/cni/net.d")
    CNI_BIN_PATH = Path("/opt/cni/bin")
    
    # Eviction thresholds (defaults)
    EVICTION_THRESHOLDS = {
        "memory.available": "100Mi",
        "nodefs.available": "10%",
        "nodefs.inodesFree": "5%",
        "imagefs.available": "15%",
        "pid.available": "100"
    }
    
    def __init__(self):
        self.results: List[DiagnosisResult] = []
        self._cache: Dict[str, Any] = {}
    
    def run_full_diagnosis(self) -> List[DiagnosisResult]:
        """Run all diagnostic checks"""
        self.results = []
        
        # Check kubelet service status
        self._check_kubelet_service()
        
        # Check kubeconfig
        self._check_kubeconfig()
        
        # Check certificates
        self._check_certificates()
        
        # Check CNI
        self._check_cni()
        
        # Check resources
        self._check_resources()
        
        # Check API server connectivity
        self._check_api_server()
        
        # Check container runtime
        self._check_container_runtime()
        
        # Check for common kubelet log errors
        self._check_kubelet_logs()
        
        return self.results
    
    def _run_command(
        self, 
        cmd: List[str], 
        timeout: int = 30
    ) -> Tuple[int, str, str]:
        """Run a command and return (returncode, stdout, stderr)"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except FileNotFoundError:
            return -2, "", f"Command not found: {cmd[0]}"
        except Exception as e:
            return -3, "", str(e)
    
    def _check_kubelet_service(self):
        """Check if kubelet service is running"""
        returncode, stdout, stderr = self._run_command(
            ["systemctl", "is-active", "kubelet"]
        )
        
        if returncode != 0:
            # Get more details about the failure
            _, status_output, _ = self._run_command(
                ["systemctl", "status", "kubelet", "--no-pager", "-l"]
            )
            
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.KUBELET_NOT_RUNNING,
                severity="critical",
                description="Kubelet service is not running",
                evidence={
                    "status": stdout or "inactive",
                    "stderr": stderr,
                    "systemctl_status": status_output[:1000] if status_output else ""
                },
                remediation_steps=[
                    RemediationStep(
                        order=1,
                        description="Check kubelet logs for errors",
                        command="journalctl -u kubelet -n 100 --no-pager",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="30s"
                    ),
                    RemediationStep(
                        order=2,
                        description="Check kubelet configuration",
                        command="cat /var/lib/kubelet/config.yaml",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=3,
                        description="Start kubelet service",
                        command="sudo systemctl start kubelet",
                        rollback_command="sudo systemctl stop kubelet",
                        requires_break_glass=True,
                        estimated_duration="10s"
                    ),
                    RemediationStep(
                        order=4,
                        description="Enable kubelet to start on boot",
                        command="sudo systemctl enable kubelet",
                        rollback_command="sudo systemctl disable kubelet",
                        requires_break_glass=True,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=5,
                        description="Verify kubelet is running",
                        command="systemctl is-active kubelet && kubectl get nodes",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="10s"
                    )
                ]
            ))
    
    def _check_kubeconfig(self):
        """Check kubeconfig files"""
        found_valid = False
        found_files = []
        
        for path in self.KUBECONFIG_PATHS:
            if os.path.exists(path):
                found_files.append(path)
                # Basic validation - try to parse and connect
                returncode, stdout, stderr = self._run_command(
                    ["kubectl", "--kubeconfig", path, "cluster-info"],
                    timeout=10
                )
                if returncode == 0:
                    found_valid = True
                    break
        
        if not found_files:
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.KUBECONFIG_MISSING,
                severity="critical",
                description="No kubeconfig file found",
                evidence={
                    "searched_paths": self.KUBECONFIG_PATHS,
                    "found_files": []
                },
                remediation_steps=[
                    RemediationStep(
                        order=1,
                        description="Check if this is a control plane node",
                        command="ls -la /etc/kubernetes/",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=2,
                        description="Check kubeadm configuration",
                        command="kubeadm config view",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=3,
                        description="If control plane, regenerate admin.conf",
                        command="sudo kubeadm init phase kubeconfig admin",
                        rollback_command=None,
                        requires_break_glass=True,
                        estimated_duration="30s"
                    ),
                    RemediationStep(
                        order=4,
                        description="Copy kubeconfig to user home",
                        command="mkdir -p ~/.kube && sudo cp /etc/kubernetes/admin.conf ~/.kube/config && sudo chown $(id -u):$(id -g) ~/.kube/config",
                        rollback_command="rm -f ~/.kube/config",
                        requires_break_glass=True,
                        estimated_duration="10s"
                    )
                ]
            ))
        elif not found_valid:
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.KUBECONFIG_INVALID,
                severity="high",
                description="Kubeconfig files found but cannot connect to cluster",
                evidence={
                    "found_files": found_files,
                    "validation_error": "cluster-info command failed"
                },
                remediation_steps=[
                    RemediationStep(
                        order=1,
                        description="Validate kubeconfig syntax",
                        command="kubectl config view --raw",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=2,
                        description="Check API server endpoint",
                        command="grep server ~/.kube/config | head -1",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=3,
                        description="Test API server connectivity",
                        command="curl -k $(grep server ~/.kube/config | head -1 | awk '{print $2}')/healthz",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="10s"
                    )
                ]
            ))
    
    def _check_certificates(self):
        """Check certificate expiry"""
        for cert_path in self.CERT_PATHS:
            if not cert_path.exists():
                continue
            
            for cert_file in cert_path.glob("*.crt"):
                returncode, stdout, stderr = self._run_command(
                    ["openssl", "x509", "-enddate", "-noout", "-in", str(cert_file)]
                )
                
                if returncode != 0:
                    continue
                
                if "notAfter=" not in stdout:
                    continue
                
                # Parse expiry date
                date_str = stdout.split("=")[1].strip()
                try:
                    # OpenSSL date format: "Jan  1 00:00:00 2024 GMT"
                    expiry_date = datetime.strptime(
                        date_str, 
                        "%b %d %H:%M:%S %Y %Z"
                    )
                except ValueError:
                    try:
                        # Alternative format
                        expiry_date = datetime.strptime(
                            date_str, 
                            "%b  %d %H:%M:%S %Y %Z"
                        )
                    except ValueError:
                        continue
                
                now = datetime.utcnow()
                days_until_expiry = (expiry_date - now).days
                
                if days_until_expiry <= 0:
                    self.results.append(DiagnosisResult(
                        failure_mode=KubeletFailureMode.CERTIFICATE_EXPIRED,
                        severity="critical",
                        description=f"Certificate expired: {cert_file.name}",
                        evidence={
                            "file": str(cert_file),
                            "expiry": date_str,
                            "days_expired": abs(days_until_expiry)
                        },
                        remediation_steps=self._get_cert_renewal_steps(cert_file.name)
                    ))
                elif days_until_expiry <= 30:
                    self.results.append(DiagnosisResult(
                        failure_mode=KubeletFailureMode.CERTIFICATE_EXPIRING_SOON,
                        severity="high",
                        description=f"Certificate expiring soon: {cert_file.name}",
                        evidence={
                            "file": str(cert_file),
                            "expiry": date_str,
                            "days_remaining": days_until_expiry
                        },
                        remediation_steps=self._get_cert_renewal_steps(cert_file.name)
                    ))
    
    def _get_cert_renewal_steps(self, cert_name: str) -> List[RemediationStep]:
        """Get certificate renewal steps based on cert type"""
        return [
            RemediationStep(
                order=1,
                description="Check current certificate expiry dates",
                command="kubeadm certs check-expiration",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="10s"
            ),
            RemediationStep(
                order=2,
                description="Backup current certificates",
                command="sudo cp -r /etc/kubernetes/pki /etc/kubernetes/pki.backup.$(date +%Y%m%d)",
                rollback_command="sudo rm -rf /etc/kubernetes/pki.backup.*",
                requires_break_glass=True,
                estimated_duration="10s"
            ),
            RemediationStep(
                order=3,
                description="Renew all certificates using kubeadm",
                command="sudo kubeadm certs renew all",
                rollback_command="sudo cp -r /etc/kubernetes/pki.backup.* /etc/kubernetes/pki",
                requires_break_glass=True,
                estimated_duration="60s"
            ),
            RemediationStep(
                order=4,
                description="Restart control plane components",
                command="sudo systemctl restart kubelet",
                rollback_command=None,
                requires_break_glass=True,
                estimated_duration="30s"
            ),
            RemediationStep(
                order=5,
                description="Wait for control plane to stabilize",
                command="sleep 30 && kubectl get nodes",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="60s"
            ),
            RemediationStep(
                order=6,
                description="Verify new certificate dates",
                command="kubeadm certs check-expiration",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="10s"
            )
        ]
    
    def _check_cni(self):
        """Check CNI plugin status"""
        # Check CNI config
        if not self.CNI_CONFIG_PATH.exists():
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.CNI_NOT_READY,
                severity="high",
                description="CNI configuration directory not found",
                evidence={"path": str(self.CNI_CONFIG_PATH)},
                remediation_steps=self._get_cni_install_steps()
            ))
            return
        
        config_files = list(self.CNI_CONFIG_PATH.glob("*.conf*"))
        if not config_files:
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.CNI_NOT_READY,
                severity="high",
                description="No CNI configuration files found",
                evidence={
                    "path": str(self.CNI_CONFIG_PATH),
                    "files_found": []
                },
                remediation_steps=self._get_cni_install_steps()
            ))
            return
        
        # Check CNI binaries
        if not self.CNI_BIN_PATH.exists():
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.CNI_MISCONFIGURED,
                severity="high",
                description="CNI binaries directory not found",
                evidence={"path": str(self.CNI_BIN_PATH)},
                remediation_steps=self._get_cni_install_steps()
            ))
            return
        
        binaries = list(self.CNI_BIN_PATH.glob("*"))
        if not binaries:
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.CNI_MISCONFIGURED,
                severity="high",
                description="No CNI binaries found",
                evidence={
                    "path": str(self.CNI_BIN_PATH),
                    "binaries": []
                },
                remediation_steps=self._get_cni_install_steps()
            ))
    
    def _get_cni_install_steps(self) -> List[RemediationStep]:
        """Get CNI installation steps"""
        return [
            RemediationStep(
                order=1,
                description="Check if CNI plugin is installed",
                command="ls -la /opt/cni/bin/",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="5s"
            ),
            RemediationStep(
                order=2,
                description="Check existing CNI configuration",
                command="ls -la /etc/cni/net.d/",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="5s"
            ),
            RemediationStep(
                order=3,
                description="Install CNI plugins (standard)",
                command="curl -L https://github.com/containernetworking/plugins/releases/download/v1.3.0/cni-plugins-linux-amd64-v1.3.0.tgz | sudo tar -xz -C /opt/cni/bin/",
                rollback_command="sudo rm -rf /opt/cni/bin/*",
                requires_break_glass=True,
                estimated_duration="60s"
            ),
            RemediationStep(
                order=4,
                description="Apply Calico CNI (recommended)",
                command="kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml",
                rollback_command="kubectl delete -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml",
                requires_break_glass=True,
                estimated_duration="120s"
            ),
            RemediationStep(
                order=5,
                description="Wait for CNI pods to be ready",
                command="kubectl wait --for=condition=ready pod -l k8s-app=calico-node -n kube-system --timeout=300s",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="300s"
            ),
            RemediationStep(
                order=6,
                description="Verify node is ready",
                command="kubectl get nodes -o wide",
                rollback_command=None,
                requires_break_glass=False,
                estimated_duration="10s"
            )
        ]
    
    def _check_resources(self):
        """Check system resources"""
        # Check disk space for /var/lib/kubelet
        self._check_disk_space("/var/lib/kubelet")
        self._check_disk_space("/var/lib/containers")
        self._check_disk_space("/var/lib/docker")
        
        # Check memory
        self._check_memory()
        
        # Check CPU
        self._check_cpu()
        
        # Check inodes
        self._check_inodes()
        
        # Check PIDs
        self._check_pids()
    
    def _check_disk_space(self, path: str):
        """Check disk space for a given path"""
        if not os.path.exists(path):
            return
        
        returncode, stdout, stderr = self._run_command(["df", "-h", path])
        if returncode != 0:
            return
        
        lines = stdout.strip().split("\n")
        if len(lines) < 2:
            return
        
        # Parse: Filesystem Size Used Avail Use% Mounted
        parts = lines[1].split()
        if len(parts) < 5:
            return
        
        try:
            usage_str = parts[4].rstrip("%")
            usage = int(usage_str)
        except ValueError:
            return
        
        if usage > 90:
            severity = "critical"
        elif usage > 85:
            severity = "high"
        else:
            return  # No issue
        
        self.results.append(DiagnosisResult(
            failure_mode=KubeletFailureMode.RESOURCE_EXHAUSTION_DISK,
            severity=severity,
            description=f"Disk usage at {usage}% on {path}",
            evidence={
                "usage": f"{usage}%",
                "path": path,
                "filesystem": parts[0],
                "size": parts[1],
                "used": parts[2],
                "available": parts[3]
            },
            remediation_steps=[
                RemediationStep(
                    order=1,
                    description="Identify large files",
                    command=f"sudo du -sh {path}/* | sort -rh | head -20",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="30s"
                ),
                RemediationStep(
                    order=2,
                    description="Clean unused container images",
                    command="sudo crictl rmi --prune",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="120s"
                ),
                RemediationStep(
                    order=3,
                    description="Remove completed pods",
                    command="kubectl delete pods --field-selector=status.phase=Succeeded -A",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="30s"
                ),
                RemediationStep(
                    order=4,
                    description="Remove failed pods",
                    command="kubectl delete pods --field-selector=status.phase=Failed -A",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="30s"
                ),
                RemediationStep(
                    order=5,
                    description="Clean old container logs",
                    command="sudo find /var/log/containers -name '*.log' -mtime +7 -delete",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="60s"
                ),
                RemediationStep(
                    order=6,
                    description="Verify disk space freed",
                    command=f"df -h {path}",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="5s"
                )
            ]
        ))
    
    def _check_memory(self):
        """Check memory usage"""
        returncode, stdout, stderr = self._run_command(["free", "-m"])
        if returncode != 0:
            return
        
        lines = stdout.strip().split("\n")
        if len(lines) < 2:
            return
        
        # Parse: total used free shared buff/cache available
        mem_line = lines[1].split()
        if len(mem_line) < 7:
            return
        
        try:
            total = int(mem_line[1])
            available = int(mem_line[6])
            usage_percent = int((total - available) / total * 100)
        except (ValueError, ZeroDivisionError):
            return
        
        if usage_percent > 95:
            severity = "critical"
        elif usage_percent > 90:
            severity = "high"
        else:
            return
        
        self.results.append(DiagnosisResult(
            failure_mode=KubeletFailureMode.RESOURCE_EXHAUSTION_MEMORY,
            severity=severity,
            description=f"Memory usage at {usage_percent}%",
            evidence={
                "usage": f"{usage_percent}%",
                "total_mb": total,
                "available_mb": available
            },
            remediation_steps=[
                RemediationStep(
                    order=1,
                    description="Identify memory-heavy processes",
                    command="ps aux --sort=-%mem | head -20",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="10s"
                ),
                RemediationStep(
                    order=2,
                    description="Check for memory-intensive pods",
                    command="kubectl top pods -A --sort-by=memory | head -20",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="30s"
                ),
                RemediationStep(
                    order=3,
                    description="Clear page cache (safe)",
                    command="sudo sync && sudo sh -c 'echo 1 > /proc/sys/vm/drop_caches'",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="10s"
                ),
                RemediationStep(
                    order=4,
                    description="Verify memory freed",
                    command="free -m",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="5s"
                )
            ]
        ))
    
    def _check_cpu(self):
        """Check CPU usage"""
        returncode, stdout, stderr = self._run_command(
            ["top", "-bn1"],
            timeout=10
        )
        if returncode != 0:
            return
        
        # Look for CPU idle percentage
        for line in stdout.split("\n"):
            if "Cpu" in line or "cpu" in line:
                # Try to extract idle percentage
                match = re.search(r'(\d+\.?\d*)\s*id', line)
                if match:
                    try:
                        idle = float(match.group(1))
                        usage = 100 - idle
                        
                        if usage > 95:
                            severity = "critical"
                        elif usage > 90:
                            severity = "high"
                        else:
                            return
                        
                        self.results.append(DiagnosisResult(
                            failure_mode=KubeletFailureMode.RESOURCE_EXHAUSTION_CPU,
                            severity=severity,
                            description=f"CPU usage at {usage:.1f}%",
                            evidence={
                                "usage": f"{usage:.1f}%",
                                "idle": f"{idle:.1f}%"
                            },
                            remediation_steps=[
                                RemediationStep(
                                    order=1,
                                    description="Identify CPU-heavy processes",
                                    command="ps aux --sort=-%cpu | head -20",
                                    rollback_command=None,
                                    requires_break_glass=False,
                                    estimated_duration="10s"
                                ),
                                RemediationStep(
                                    order=2,
                                    description="Check for CPU-intensive pods",
                                    command="kubectl top pods -A --sort-by=cpu | head -20",
                                    rollback_command=None,
                                    requires_break_glass=False,
                                    estimated_duration="30s"
                                )
                            ]
                        ))
                    except ValueError:
                        pass
                break
    
    def _check_inodes(self):
        """Check inode usage"""
        returncode, stdout, stderr = self._run_command(["df", "-i", "/var/lib/kubelet"])
        if returncode != 0:
            return
        
        lines = stdout.strip().split("\n")
        if len(lines) < 2:
            return
        
        parts = lines[1].split()
        if len(parts) < 5:
            return
        
        try:
            usage_str = parts[4].rstrip("%")
            usage = int(usage_str)
        except ValueError:
            return
        
        if usage > 95:
            severity = "critical"
        elif usage > 90:
            severity = "high"
        else:
            return
        
        self.results.append(DiagnosisResult(
            failure_mode=KubeletFailureMode.RESOURCE_EXHAUSTION_INODE,
            severity=severity,
            description=f"Inode usage at {usage}%",
            evidence={"usage": f"{usage}%", "path": "/var/lib/kubelet"},
            remediation_steps=[
                RemediationStep(
                    order=1,
                    description="Find directories with many files",
                    command="sudo find /var/lib/kubelet -xdev -type d -exec sh -c 'echo $(find \"$1\" -maxdepth 1 | wc -l) \"$1\"' _ {} \\; | sort -rn | head -20",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="120s"
                ),
                RemediationStep(
                    order=2,
                    description="Clean old log files",
                    command="sudo find /var/log -name '*.log.*' -mtime +7 -delete",
                    rollback_command=None,
                    requires_break_glass=True,
                    estimated_duration="60s"
                )
            ]
        ))
    
    def _check_pids(self):
        """Check PID exhaustion"""
        returncode, stdout, stderr = self._run_command(
            ["cat", "/proc/sys/kernel/pid_max"]
        )
        if returncode != 0:
            return
        
        try:
            pid_max = int(stdout.strip())
        except ValueError:
            return
        
        # Count current processes
        returncode, stdout, stderr = self._run_command(["ps", "aux"])
        if returncode != 0:
            return
        
        process_count = len(stdout.strip().split("\n")) - 1  # Subtract header
        usage_percent = int(process_count / pid_max * 100)
        
        if usage_percent > 90:
            severity = "critical"
        elif usage_percent > 80:
            severity = "high"
        else:
            return
        
        self.results.append(DiagnosisResult(
            failure_mode=KubeletFailureMode.RESOURCE_EXHAUSTION_PID,
            severity=severity,
            description=f"PID usage at {usage_percent}% ({process_count}/{pid_max})",
            evidence={
                "usage": f"{usage_percent}%",
                "process_count": process_count,
                "pid_max": pid_max
            },
            remediation_steps=[
                RemediationStep(
                    order=1,
                    description="Identify processes by user",
                    command="ps aux | awk '{print $1}' | sort | uniq -c | sort -rn | head -20",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="10s"
                ),
                RemediationStep(
                    order=2,
                    description="Look for zombie processes",
                    command="ps aux | awk '$8 ~ /Z/ {print}'",
                    rollback_command=None,
                    requires_break_glass=False,
                    estimated_duration="10s"
                )
            ]
        ))
    
    def _check_api_server(self):
        """Check API server connectivity"""
        returncode, stdout, stderr = self._run_command(
            ["kubectl", "get", "--raw", "/healthz"],
            timeout=10
        )
        
        if returncode != 0 or "ok" not in stdout.lower():
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.API_SERVER_UNREACHABLE,
                severity="critical",
                description="Cannot reach API server",
                evidence={
                    "stdout": stdout,
                    "stderr": stderr,
                    "returncode": returncode
                },
                remediation_steps=[
                    RemediationStep(
                        order=1,
                        description="Check API server pod status",
                        command="sudo crictl pods --name kube-apiserver",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="10s"
                    ),
                    RemediationStep(
                        order=2,
                        description="Check API server container logs",
                        command="sudo crictl logs $(sudo crictl ps --name kube-apiserver -q | head -1) 2>&1 | tail -50",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="30s"
                    ),
                    RemediationStep(
                        order=3,
                        description="Check API server manifest",
                        command="cat /etc/kubernetes/manifests/kube-apiserver.yaml",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=4,
                        description="Check etcd connectivity",
                        command="sudo crictl pods --name etcd",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="10s"
                    ),
                    RemediationStep(
                        order=5,
                        description="Restart kubelet to trigger static pod recreation",
                        command="sudo systemctl restart kubelet",
                        rollback_command=None,
                        requires_break_glass=True,
                        estimated_duration="60s"
                    )
                ]
            ))
    
    def _check_container_runtime(self):
        """Check container runtime status"""
        runtimes = [
            ("containerd", "containerd", "crictl"),
            ("crio", "crio", "crictl"),
            ("docker", "docker", "docker")
        ]
        
        runtime_found = False
        runtime_name = None
        
        for name, service, cli in runtimes:
            returncode, stdout, stderr = self._run_command(
                ["systemctl", "is-active", service]
            )
            if returncode == 0:
                runtime_found = True
                runtime_name = name
                
                # Check if runtime is responsive
                check_cmd = ["crictl", "info"] if cli == "crictl" else ["docker", "info"]
                ret, out, err = self._run_command(check_cmd, timeout=10)
                if ret != 0:
                    self.results.append(DiagnosisResult(
                        failure_mode=KubeletFailureMode.CONTAINER_RUNTIME_DOWN,
                        severity="critical",
                        description=f"{name} is running but not responsive",
                        evidence={
                            "runtime": name,
                            "service_status": "active",
                            "cli_error": err
                        },
                        remediation_steps=[
                            RemediationStep(
                                order=1,
                                description=f"Check {name} logs",
                                command=f"journalctl -u {service} -n 100 --no-pager",
                                rollback_command=None,
                                requires_break_glass=False,
                                estimated_duration="30s"
                            ),
                            RemediationStep(
                                order=2,
                                description=f"Restart {name}",
                                command=f"sudo systemctl restart {service}",
                                rollback_command=None,
                                requires_break_glass=True,
                                estimated_duration="30s"
                            ),
                            RemediationStep(
                                order=3,
                                description="Restart kubelet",
                                command="sudo systemctl restart kubelet",
                                rollback_command=None,
                                requires_break_glass=True,
                                estimated_duration="30s"
                            )
                        ]
                    ))
                break
        
        if not runtime_found:
            self.results.append(DiagnosisResult(
                failure_mode=KubeletFailureMode.CONTAINER_RUNTIME_DOWN,
                severity="critical",
                description="No container runtime is running",
                evidence={
                    "checked_runtimes": [r[0] for r in runtimes]
                },
                remediation_steps=[
                    RemediationStep(
                        order=1,
                        description="Start containerd (preferred runtime)",
                        command="sudo systemctl start containerd",
                        rollback_command="sudo systemctl stop containerd",
                        requires_break_glass=True,
                        estimated_duration="15s"
                    ),
                    RemediationStep(
                        order=2,
                        description="Enable containerd on boot",
                        command="sudo systemctl enable containerd",
                        rollback_command="sudo systemctl disable containerd",
                        requires_break_glass=True,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=3,
                        description="Verify container runtime is ready",
                        command="sudo crictl info",
                        rollback_command=None,
                        requires_break_glass=False,
                        estimated_duration="5s"
                    ),
                    RemediationStep(
                        order=4,
                        description="Restart kubelet",
                        command="sudo systemctl restart kubelet",
                        rollback_command=None,
                        requires_break_glass=True,
                        estimated_duration="30s"
                    )
                ]
            ))
    
    def _check_kubelet_logs(self):
        """Check kubelet logs for common errors"""
        returncode, stdout, stderr = self._run_command(
            ["journalctl", "-u", "kubelet", "-n", "200", "--no-pager"],
            timeout=30
        )
        
        if returncode != 0:
            return
        
        # Check for common error patterns
        error_patterns = [
            (r"network plugin is not ready", KubeletFailureMode.NETWORK_PLUGIN_ERROR),
            (r"failed to pull image", KubeletFailureMode.IMAGE_PULL_ERROR),
            (r"eviction.*threshold", KubeletFailureMode.EVICTION_THRESHOLD_MET),
            (r"node.*not found", KubeletFailureMode.NODE_NOT_REGISTERED),
        ]
        
        for pattern, failure_mode in error_patterns:
            if re.search(pattern, stdout, re.IGNORECASE):
                # Only add if not already diagnosed
                if not any(r.failure_mode == failure_mode for r in self.results):
                    self.results.append(DiagnosisResult(
                        failure_mode=failure_mode,
                        severity="high",
                        description=f"Kubelet logs indicate: {failure_mode.value}",
                        evidence={"pattern": pattern, "log_sample": stdout[:500]},
                        remediation_steps=[
                            RemediationStep(
                                order=1,
                                description="View detailed kubelet logs",
                                command="journalctl -u kubelet -f",
                                rollback_command=None,
                                requires_break_glass=False,
                                estimated_duration="ongoing"
                            )
                        ]
                    ))
    
    def generate_remediation_plan(self) -> Dict:
        """Generate complete remediation plan from diagnosis results"""
        if not self.results:
            return {
                "status": "healthy",
                "summary": {
                    "total_issues": 0,
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0,
                    "break_glass_required": False
                },
                "issues": [],
                "plan": []
            }
        
        # Sort by severity
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_results = sorted(
            self.results, 
            key=lambda x: severity_order.get(x.severity, 99)
        )
        
        # Count severities
        severity_counts = {
            "critical": len([r for r in self.results if r.severity == "critical"]),
            "high": len([r for r in self.results if r.severity == "high"]),
            "medium": len([r for r in self.results if r.severity == "medium"]),
            "low": len([r for r in self.results if r.severity == "low"])
        }
        
        # Check if break glass is required
        break_glass_required = any(
            step.requires_break_glass 
            for r in self.results 
            for step in r.remediation_steps
        )
        
        plan = {
            "status": "needs_remediation",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "summary": {
                "total_issues": len(self.results),
                **severity_counts,
                "break_glass_required": break_glass_required
            },
            "issues": [r.to_dict() for r in sorted_results]
        }
        
        return plan
    
    def run_check(self, check_name: str) -> List[DiagnosisResult]:
        """Run a specific check only"""
        self.results = []
        
        check_map = {
            "kubelet": self._check_kubelet_service,
            "kubeconfig": self._check_kubeconfig,
            "certificates": self._check_certificates,
            "cni": self._check_cni,
            "resources": self._check_resources,
            "api_server": self._check_api_server,
            "container_runtime": self._check_container_runtime,
            "logs": self._check_kubelet_logs
        }
        
        if check_name in check_map:
            check_map[check_name]()
        else:
            raise ValueError(f"Unknown check: {check_name}. Available: {list(check_map.keys())}")
        
        return self.results


def main():
    """CLI interface for kubelet diagnostics"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Kubelet Diagnostics")
    parser.add_argument(
        "--json", 
        action="store_true", 
        help="Output as JSON"
    )
    parser.add_argument(
        "--check", 
        type=str, 
        choices=[
            "kubelet", "kubeconfig", "certificates", "cni", 
            "resources", "api_server", "container_runtime", "logs"
        ],
        help="Run specific check only"
    )
    parser.add_argument(
        "--severity",
        type=str,
        choices=["critical", "high", "medium", "low"],
        help="Filter results by minimum severity"
    )
    
    args = parser.parse_args()
    
    diag = KubeletDiagnostics()
    
    if args.check:
        diag.run_check(args.check)
    else:
        diag.run_full_diagnosis()
    
    # Filter by severity if requested
    if args.severity:
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        min_severity = severity_order[args.severity]
        diag.results = [
            r for r in diag.results 
            if severity_order.get(r.severity, 99) <= min_severity
        ]
    
    plan = diag.generate_remediation_plan()
    
    if args.json:
        print(json.dumps(plan, indent=2))
    else:
        print(f"\n{'='*50}")
        print("         KUBELET DIAGNOSIS REPORT")
        print(f"{'='*50}")
        print(f"\nStatus: {plan['status'].upper()}")
        
        if plan['status'] != 'healthy':
            summary = plan['summary']
            print(f"\nIssues Found: {summary['total_issues']}")
            print(f"  🔴 Critical: {summary['critical']}")
            print(f"  🟠 High:     {summary['high']}")
            print(f"  🟡 Medium:   {summary['medium']}")
            print(f"  🟢 Low:      {summary['low']}")
            print(f"\n⚠️  Break Glass Required: {'YES' if summary['break_glass_required'] else 'NO'}")
            
            print(f"\n{'-'*50}")
            print("                  ISSUES")
            print(f"{'-'*50}")
            
            for i, issue in enumerate(plan['issues'], 1):
                severity_icons = {
                    "critical": "🔴",
                    "high": "🟠",
                    "medium": "🟡",
                    "low": "🟢"
                }
                icon = severity_icons.get(issue['severity'], "⚪")
                
                print(f"\n{i}. {icon} [{issue['severity'].upper()}] {issue['failure_mode']}")
                print(f"   {issue['description']}")
                
                if issue['evidence']:
                    print("   Evidence:")
                    for key, value in issue['evidence'].items():
                        if isinstance(value, str) and len(value) > 100:
                            value = value[:100] + "..."
                        print(f"     - {key}: {value}")
                
                print("\n   Remediation Steps:")
                for step in issue['remediation_steps']:
                    bg = " 🔐" if step['requires_break_glass'] else ""
                    print(f"     {step['order']}. {step['description']}{bg}")
                    print(f"        $ {step['command']}")
                    if step['rollback']:
                        print(f"        ↩ Rollback: {step['rollback']}")
                    print(f"        ⏱  Est. Duration: {step['duration']}")
        else:
            print("\n✅ All checks passed. Kubelet appears healthy.")
        
        print(f"\n{'='*50}\n")


if __name__ == "__main__":
    main()

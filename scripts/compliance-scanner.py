#!/usr/bin/env python3
"""
Compliance Scanner for Ubuntu 22.04
Validates security and configuration compliance
"""

import os
import sys
import json
import subprocess
import datetime


class ComplianceScanner:
    def __init__(self):
        self.results = []
        self.compliance_rules = self.load_rules()


    def load_rules(self):
        """Load compliance rules"""
        return [
            {
                "id": "UBUNTU-22-001",
                "title": "Containerd Version Check",
                "description": "Verify containerd version >= 1.7.x",
                "severity": "critical",
                "check": self.check_containerd_version,
                "remediation": "sudo apt update && sudo apt install containerd.io"
            },
            {
                "id": "UBUNTU-22-002",
                "title": "Containerd Service Status",
                "description": "Ensure containerd service is running",
                "severity": "critical",
                "check": self.check_containerd_service,
                "remediation": "sudo systemctl enable --now containerd"
            },
            {
                "id": "UBUNTU-22-003",
                "title": "Kubernetes Tools Installation",
                "description": "Verify kubeadm, kubelet, kubectl are installed",
                "severity": "high",
                "check": self.check_kubernetes_tools,
                "remediation": "Install from official Kubernetes repository"
            },
            {
                "id": "UBUNTU-22-004",
                "title": "Firewall Configuration",
                "description": "Check if firewall is properly configured",
                "severity": "medium",
                "check": self.check_firewall,
                "remediation": "sudo ufw enable && sudo ufw allow ssh"
            },
            {
                "id": "UBUNTU-22-005",
                "title": "System Updates",
                "description": "Verify system is up to date",
                "severity": "medium",
                "check": self.check_system_updates,
                "remediation": "sudo apt update && sudo apt upgrade"
            },
            {
                "id": "UBUNTU-22-006",
                "title": "SSH Security Configuration",
                "description": "Check SSH security settings",
                "severity": "high",
                "check": self.check_ssh_security,
                "remediation": "Edit /etc/ssh/sshd_config to disable root login"
            },
            {
                "id": "UBUNTU-22-007",
                "title": "File Permissions",
                "description": "Check for world-writable files",
                "severity": "medium",
                "check": self.check_file_permissions,
                "remediation": "Remove world-writable permissions: chmod o-w <file>"
            },
            {
                "id": "UBUNTU-22-008",
                "title": "Audit Service",
                "description": "Ensure auditd is running for compliance",
                "severity": "medium",
                "check": self.check_audit_service,
                "remediation": "sudo apt install auditd && sudo systemctl enable auditd"
            }
        ]


    def run_command(self, command):
        """Run shell command and return result"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)


    def check_containerd_version(self):
        """Check containerd version"""
        success, output, _ = self.run_command("containerd --version")
        if not success:
            return False, "containerd not installed"

        # Extract version number
        if "v2." in output or "v1.7" in output or "v1.8" in output or "v1.9" in output:
            return True, f"containerd version OK: {output.strip()}"
        else:
            return False, f"containerd version too old: {output.strip()}"


    def check_containerd_service(self):
        """Check if containerd service is active"""
        success, output, _ = self.run_command("systemctl is-active containerd")
        if success and "active" in output:
            return True, "containerd service is active"
        else:
            return False, "containerd service is not active"


    def check_kubernetes_tools(self):
        """Check Kubernetes tools installation"""
        tools = ["kubeadm", "kubelet", "kubectl"]
        results = []

        for tool in tools:
            success, _, _ = self.run_command(f"which {tool}")
            if success:
                results.append(f"{tool}: installed")
            else:
                results.append(f"{tool}: missing")

        if all("installed" in r for r in results):
            return True, "All Kubernetes tools installed"
        else:
            return False, "; ".join(results)


    def check_firewall(self):
        """Check firewall status"""
        success, output, _ = self.run_command("ufw status")
        if "Status: active" in output:
            return True, "Firewall is active"
        else:
            return False, "Firewall is not active"


    def check_system_updates(self):
        """Check for system updates"""
        success, output, _ = self.run_command(
            "apt list --upgradable 2>/dev/null | wc -l"
        )
        if success and int(output.strip()) == 0:
            return True, "System is up to date"
        elif success:
            return False, f"{output.strip()} packages need updates"
        else:
            return False, "Could not check for updates"


    def check_ssh_security(self):
        """Check SSH security configuration"""
        success, output, _ = self.run_command(
            "grep -E '^PermitRootLogin|^PasswordAuthentication' /etc/ssh/sshd_config"
        )
        if not success:
            return False, "Could not read SSH config"

        issues = []
        for line in output.split('\n'):
            if 'PermitRootLogin yes' in line:
                issues.append("Root login enabled")
            if 'PasswordAuthentication yes' in line:
                issues.append("Password authentication enabled")

        if not issues:
            return True, "SSH configuration is secure"
        else:
            return False, "; ".join(issues)


    def check_file_permissions(self):
        """Check for world-writable files in critical directories"""
        critical_dirs = ["/bin", "/sbin", "/usr/bin", "/usr/sbin", "/etc"]
        world_writable = []

        for directory in critical_dirs:
            success, output, _ = self.run_command(
                f"find {directory} -type f -perm -o+w 2>/dev/null | wc -l"
            )
            if success and int(output.strip()) > 0:
                world_writable.append(f"{directory}: {output.strip()} files")

        if not world_writable:
            return True, "No world-writable files in critical directories"
        else:
            return False, "; ".join(world_writable)


    def check_audit_service(self):
        """Check if audit service is running"""
        success, output, _ = self.run_command("systemctl is-active auditd")
        if success and "active" in output:
            return True, "Audit service is active"
        else:
            return False, "Audit service is not active"


    def run_scan(self):
        """Run all compliance checks"""
        print("Running compliance scan for Ubuntu 22.04...")
        print("=" * 60)

        for rule in self.compliance_rules:
            print(f"\n[{rule['severity'].upper()}] {rule['title']}")
            print(f"Description: {rule['description']}")

            try:
                passed, message = rule['check']()
                self.results.append({
                    "id": rule['id'],
                    "title": rule['title'],
                    "severity": rule['severity'],
                    "status": "PASS" if passed else "FAIL",
                    "message": message,
                    "remediation": rule['remediation'] if not passed else ""
                })

                status_symbol = "✓" if passed else "✗"
                print(f"Status: {status_symbol} {message}")

                if not passed:
                    print(f"Remediation: {rule['remediation']}")

            except Exception as e:
                self.results.append({
                    "id": rule['id'],
                    "title": rule['title'],
                    "severity": rule['severity'],
                    "status": "ERROR",
                    "message": str(e),
                    "remediation": "Investigate error and re-run scan"
                })
                print(f"Status: ✗ ERROR: {e}")


    def generate_report(self):
        """Generate compliance report"""
        total = len(self.results)
        passed = len([r for r in self.results if r['status'] == 'PASS'])
        failed = len([r for r in self.results if r['status'] == 'FAIL'])
        errors = len([r for r in self.results if r['status'] == 'ERROR'])

        report = {
            "scan_date": datetime.datetime.now().isoformat(),
            "scanner_version": "1.0.0",
            "target_os": "Ubuntu 22.04 LTS",
            "summary": {
                "total_checks": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "compliance_score": round((passed / total) * 100, 2)
                if total > 0 else 0
            },
            "details": self.results
        }

        # Save report
        report_file = "compliance-report-ubuntu22.04.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        # Print summary
        print("\n" + "=" * 60)
        print("COMPLIANCE SCAN SUMMARY")
        print("=" * 60)
        print(f"Total Checks: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Errors: {errors}")
        print(f"Compliance Score: {report['summary']['compliance_score']}%")
        print(f"\nReport saved to: {report_file}")

        # Critical findings
        critical_failures = [
            r for r in self.results
            if r['severity'] == 'critical' and r['status'] == 'FAIL'
        ]
        if critical_failures:
            print("\n⚠️  CRITICAL FAILURES:")
            for failure in critical_failures:
                print(f"  - {failure['title']}: {failure['message']}")

        return report


if __name__ == "__main__":
    # Check if running as root for certain checks
    if os.geteuid() != 0:
        print("Warning: Some checks may require root privileges")

    scanner = ComplianceScanner()
    scanner.run_scan()
    report = scanner.generate_report()

    # Exit with error code if any failures
    if report['summary']['failed'] > 0 or report['summary']['errors'] > 0:
        sys.exit(1)
    else:
        print("\n✅ All compliance checks passed!")
        sys.exit(0)

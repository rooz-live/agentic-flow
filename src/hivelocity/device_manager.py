from enum import Enum
from typing import Dict, List


class PlatformStrategy(Enum):
    DJANGO_PRODUCTION = "django_production"
    HOSTBILL_PRODUCTION = "hostbill_production"
    RAILS_PRODUCTION = "rails_production"
    NEXTJS_PRODUCTION = "nextjs_production"
    LARAVEL_PRODUCTION = "laravel_production"
    SYMFONY_PRODUCTION = "symfony_production"
    AFFILIATE_SYSTEMS_PRODUCTION = "affiliate_systems_production"
    WORDPRESS_PRODUCTION = "wordpress_production"
    FLARUM_PRODUCTION = "flarum_production"
    STX_PRODUCTION = "stx_production"
    DOCKER_SWARM_MANAGER = "docker_swarm_manager"
    DOCKER_SWARM_WORKER = "docker_swarm_worker"


class DeviceManager:
    def __init__(self):
        self.strategies = {
            PlatformStrategy.DJANGO_PRODUCTION: self._get_django_config,
            PlatformStrategy.HOSTBILL_PRODUCTION: self._get_hostbill_config,
            PlatformStrategy.RAILS_PRODUCTION: self._get_rails_config,
            PlatformStrategy.NEXTJS_PRODUCTION: self._get_nextjs_config,
            PlatformStrategy.LARAVEL_PRODUCTION: self._get_laravel_config,
            PlatformStrategy.SYMFONY_PRODUCTION: self._get_symfony_config,
            PlatformStrategy.AFFILIATE_SYSTEMS_PRODUCTION:
                self._get_affiliate_systems_config,
            PlatformStrategy.WORDPRESS_PRODUCTION: self._get_wordpress_config,
            PlatformStrategy.FLARUM_PRODUCTION: self._get_flarum_config,
            PlatformStrategy.STX_PRODUCTION: self._get_stx_config,
            PlatformStrategy.DOCKER_SWARM_MANAGER: self._get_swarm_manager_config,
            PlatformStrategy.DOCKER_SWARM_WORKER: self._get_swarm_worker_config,
        }

    def validatePartitionScheme(self, partition_scheme: List[Dict[str, str]]) -> bool:
        """
        Validates the partition scheme.
        Rules:
        1. Must list partitions.
        2. Root partition (/) must be present.
        3. Sizes must be positive integers or 'rest'.
        4. Check for duplicate mount types.
        """
        if not partition_scheme:
            return False

        has_root = False
        mount_points = set()

        for partition in partition_scheme:
            mount_point = partition.get("mount_point")
            size = partition.get("size")

            if not mount_point or not size:
                return False

            if mount_point in mount_points:
                return False
            mount_points.add(mount_point)

            if mount_point == "/":
                has_root = True

            if isinstance(size, int):
                if size <= 0:
                    return False
            elif isinstance(size, str):
                if size != "rest":
                    return False
            else:
                return False

        return has_root

    def get_strategy_config(self, strategy: PlatformStrategy) -> Dict:
        if strategy not in self.strategies:
            raise ValueError(f"Unknown strategy: {strategy}")
        return self.strategies[strategy]()

    def _get_django_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["python3", "python3-pip", "nginx", "gunicorn"],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"},
                {"mount_point": "/var/log", "size": 10240}  # 10GB for logs
            ]
        }

    def _get_hostbill_config(self) -> Dict:
        return {
            "os": "centos-7",  # Typically legacy
            "packages": ["php", "mysql-server", "httpd"],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_rails_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["ruby-full", "nginx", "passenger"],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_nextjs_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["nodejs", "npm", "pm2", "nginx"],
            "ports": [80, 443, 3000, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_laravel_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["php", "composer", "nginx", "mysql-server"],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_symfony_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["php", "composer", "nginx", "postgresql"],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_affiliate_systems_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": [
                "docker.io",
                "containerd",
                "nginx",
                "postgresql",
                "redis-server",
            ],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": 51200},
                {"mount_point": "/var/lib/docker", "size": "rest"}
            ],
            "resources": {"vcpu": 2, "ram_gb": 4, "disk_gb": 80},
            "security_hardening": {
                "ufw": True,
                "fail2ban": True,
                "unattended_upgrades": True,
            }
        }

    def _get_wordpress_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": [
                "nginx",
                "php-fpm",
                "php-mysql",
                "php-curl",
                "php-xml",
                "php-mbstring",
                "php-zip",
                "mariadb-server",
            ],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": 30720},
                {"mount_point": "/var/log", "size": 5120},
                {"mount_point": "/var/lib/mysql", "size": "rest"}
            ],
            "resources": {"vcpu": 2, "ram_gb": 2, "disk_gb": 60},
            "security_hardening": {
                "ufw": True,
                "fail2ban": True,
                "unattended_upgrades": True,
            }
        }

    def _get_flarum_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": [
                "nginx",
                "php-fpm",
                "php-mysql",
                "php-curl",
                "php-xml",
                "php-mbstring",
                "php-zip",
                "composer",
                "git",
                "mariadb-server",
                "nodejs",
                "npm",
            ],
            "ports": [80, 443, 22],
            "partition_scheme": [
                {"mount_point": "/", "size": 30720},
                {"mount_point": "/var/log", "size": 5120},
                {"mount_point": "/var/lib/mysql", "size": "rest"}
            ],
            "resources": {"vcpu": 2, "ram_gb": 2, "disk_gb": 60},
            "security_hardening": {
                "ufw": True,
                "fail2ban": True,
                "unattended_upgrades": True,
            }
        }

    def _get_stx_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",  # Re-platforming to Ubuntu as per objective
            "packages": ["docker.io", "containerd", "python3-openstackclient"],
            "ports": [22, 5000, 6443],  # OpenStack internal endpoints + k8s
            "partition_scheme": [
                {"mount_point": "/", "size": 51200},
                {"mount_point": "/var/lib/docker", "size": "rest"}
            ]
        }

    def _get_swarm_manager_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["docker.io"],
            "ports": [22, 2377, 7946, 4789],
            "partition_scheme": [
                 {"mount_point": "/", "size": "rest"}
            ]
        }

    def _get_swarm_worker_config(self) -> Dict:
        return {
            "os": "ubuntu-22.04",
            "packages": ["docker.io"],
            "ports": [22, 7946, 4789],
            "partition_scheme": [
                 {"mount_point": "/", "size": "rest"}
            ]
        }

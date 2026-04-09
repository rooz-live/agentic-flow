/**
 * HiveVelocity Bare Metal Device Manager
 *
 * Provides automated partitioning and device management for HiveVelocity bare metal servers.
 * Supports multiple partitioning strategies with encryption options.
 *
 * Includes platform-specific strategies for:
 * - StarlingX (versions 11 and 12) - CPU isolation, network bonding, container runtime
 * - OpenStack infrastructure - Nova, Glance, Cinder separation, Ceph OSD optimization
 * - Hostbill platform - MySQL optimization, backup automation, billing tuning
 * - Kubernetes clusters - Kubelet/Docker separation, PV storage, CNI configuration
 * - Web application stacks (Affiliate platforms, WordPress, Flarum, OroCRM, Symfony, Trading)
 *
 * Security Features:
 * - Full disk encryption (LUKS) with KMS integration
 * - Secure mount options (nodev, nosuid, noexec)
 * - Environment-based configuration (no hardcoded credentials)
 *
 * WSJF Prioritization:
 * - Cost of Delay calculation
 * - Business value assessment
 * - Time criticality weighting
 * - Risk reduction scoring
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface HiveVelocityPartition {
  size: string;
  mount_point: string;
  filesystem: 'ext4' | 'xfs' | 'fat32' | 'swap' | 'btrfs';
  encryption: boolean;
  mount_options?: string;
  label?: string;
  description?: string;
}

export interface HiveVelocityPartitionScheme {
  scheme: string;
  description?: string;
  platform?: 'starlingx' | 'openstack' | 'hostbill' | 'kubernetes' | 'web' | 'general' | 'affiliate' | 'wordpress' | 'flarum';
  encryption: {
    enabled: boolean;
    method?: 'luks' | 'dm-crypt';
    key_management?: 'passphrase' | 'key_file' | 'kms';
    key_size?: number;
  };
  partitions: HiveVelocityPartition[];
  postInstallHooks?: string[];
  kernelParameters?: string[];
  sysctlSettings?: Record<string, string | number>;
}

export interface DeviceReloadRequest {
  os: string;
  partition_scheme: string;
  filesystem?: string;
  encryption?: boolean;
  partitions?: HiveVelocityPartition[];
  hostname?: string;
  ssh_port?: number;
  ssh_keys?: string[];
  post_install_script?: string;
}

export interface DeviceUpdateRequest {
  hostname?: string;
  partition_config?: HiveVelocityPartitionScheme;
  ssh_port?: number;
  tags?: string[];
}

export interface IPMIConfig {
  host: string;
  username: string;
  password: string;
  interface?: 'lanplus' | 'lan' | 'open';
  port?: number;
}

export interface IPMICommand {
  action: 'power_on' | 'power_off' | 'power_cycle' | 'power_reset' | 'power_status' | 'sol_activate' | 'sol_deactivate' | 'boot_pxe' | 'boot_disk' | 'boot_bios';
  timeout?: number;
}

export interface PortConfiguration {
  ssh_port: number;
  additional_ports?: Array<{
    port: number;
    protocol: 'tcp' | 'udp';
    service: string;
    allowed_ips?: string[];
  }>;
  firewall_rules?: string[];
}

export interface WSJFInput {
  user_business_value: number;  // 1-10: How much value does this deliver?
  time_criticality: number;     // 1-10: How time-sensitive is this?
  risk_reduction: number;       // 1-10: How much risk does this reduce?
  job_size: number;             // 1-100: Effort/complexity estimate
  cost_of_delay?: number;       // Calculated: UBV + TC + RR
  deadline?: Date;
  dependencies?: string[];
}

export interface WSJFResult {
  score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  normalized_score: number;
  components: {
    user_business_value: number;
    time_criticality: number;
    risk_reduction: number;
    cost_of_delay: number;
    job_size: number;
  };
  recommendation: string;
  trade_offs: string[];
  contingency_plan: string;
}

export interface DeploymentValidation {
  checks: Array<{
    name: string;
    category: 'network' | 'storage' | 'security' | 'service' | 'performance' | 'tool';
    command: string;
    expected: string | RegExp;
    critical: boolean;
  }>;
  rollback_commands: string[];
}

/**
 * Pre-defined partitioning strategies
 */
export const PARTITION_STRATEGIES: Record<string, HiveVelocityPartitionScheme> = {
  // ============================================================================
  // CORE STRATEGIES
  // ============================================================================

  /**
   * Standard Configuration
   * Simple setup for basic workloads
   */
  standard: {
    scheme: 'standard',
    description: 'Simple setup for basic workloads',
    platform: 'general',
    encryption: { enabled: false },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '8G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: 'remaining', mount_point: '/', filesystem: 'ext4', encryption: false },
    ],
  },

  /**
   * General Purpose Strategy
   * Balanced approach for web/app servers
   */
  general_purpose: {
    scheme: 'general_purpose',
    description: 'Balanced approach for web/app servers',
    platform: 'general',
    encryption: { enabled: false },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '8G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '20G', mount_point: '/', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime' },
      { size: '20G', mount_point: '/var', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid' },
      { size: '10G', mount_point: '/home', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev' },
      { size: '10G', mount_point: '/opt', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev' },
      { size: '5G', mount_point: '/tmp', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid,noexec' },
      { size: 'remaining', mount_point: '/data', filesystem: 'ext4', encryption: false, mount_options: 'defaults,noatime' },
    ],
  },

  /**
   * Database Optimized Strategy
   * Maximum space for data with XFS filesystem
   */
  database_optimized: {
    scheme: 'database_optimized',
    description: 'Maximum space for data with XFS filesystem',
    platform: 'general',
    encryption: { enabled: false },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '20G', mount_point: '/', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime' },
      { size: '10G', mount_point: '/var', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid' },
      { size: '5G', mount_point: '/tmp', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid,noexec' },
      { size: 'remaining', mount_point: '/mnt/data', filesystem: 'xfs', encryption: false, mount_options: 'defaults,noatime' },
    ],
  },

  /**
   * Container Node Strategy
   * Optimized for Kubernetes/Docker workloads
   */
  container_node: {
    scheme: 'container_node',
    description: 'Optimized for Kubernetes/Docker workloads',
    platform: 'kubernetes',
    encryption: { enabled: false },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '8G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime' },
      { size: '20G', mount_point: '/var', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid' },
      { size: '30G', mount_point: '/var/lib', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev' },
      { size: '5G', mount_point: '/tmp', filesystem: 'ext4', encryption: false, mount_options: 'errors=remount-ro,noatime,nodev,nosuid,noexec' },
      { size: 'remaining', mount_point: '/mnt/storage', filesystem: 'ext4', encryption: false, mount_options: 'defaults,noatime' },
    ],
  },

  /**
   * High Security Strategy
   * Full disk encryption for production systems
   */
  high_security: {
    scheme: 'high_security',
    description: 'Full disk encryption for production systems',
    platform: 'general',
    encryption: {
      enabled: true,
      method: 'luks',
      key_management: 'kms',
      key_size: 512,
    },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, mount_options: 'defaults' },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false, mount_options: 'defaults' },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true, mount_options: 'defaults' },
      { size: '20G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime' },
      { size: '20G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime,nodev,nosuid' },
      { size: '10G', mount_point: '/home', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime,nodev' },
      { size: '10G', mount_point: '/opt', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime,nodev' },
      { size: '5G', mount_point: '/tmp', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime,nodev,nosuid,noexec' },
      { size: 'remaining', mount_point: '/data', filesystem: 'xfs', encryption: true, mount_options: 'defaults,noatime' },
    ],
  },

  // ============================================================================
  // STARLINGX PLATFORM STRATEGIES
  // ============================================================================

  /**
   * StarlingX All-in-One (AIO) Controller
   * Optimized for StarlingX edge cloud platform with CPU isolation and container runtime
   */
  starlingx_aio: {
    scheme: 'starlingx_aio',
    description: 'StarlingX All-in-One controller with CPU isolation and container runtime',
    platform: 'starlingx',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, label: 'EFI' },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false, label: 'boot' },
      { size: '32G', mount_point: 'swap', filesystem: 'swap', encryption: true, label: 'swap', description: 'Swap = 2x RAM for edge workloads' },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime', label: 'root' },
      { size: '100G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'var' },
      { size: '50G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec', label: 'varlog' },
      { size: '200G', mount_point: '/var/lib/docker', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'docker', description: 'Container runtime storage' },
      { size: '100G', mount_point: '/opt/platform', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'platform', description: 'StarlingX platform files' },
      { size: 'remaining', mount_point: '/var/lib/nova', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'nova', description: 'VM instance storage' },
    ],
    kernelParameters: [
      'isolcpus=2-7',           // CPU isolation for real-time workloads
      'nohz_full=2-7',          // Tickless kernel for isolated CPUs
      'rcu_nocbs=2-7',          // RCU callbacks on housekeeping CPUs
      'intel_iommu=on',         // Enable IOMMU for SR-IOV
      'iommu=pt',               // IOMMU passthrough mode
      'hugepagesz=1G',          // 1GB huge pages
      'hugepages=16',           // Pre-allocate huge pages
      'default_hugepagesz=1G',
    ],
    sysctlSettings: {
      'vm.nr_hugepages': 16,
      'vm.swappiness': 10,
      'net.core.rmem_max': 134217728,
      'net.core.wmem_max': 134217728,
      'net.ipv4.tcp_rmem': '4096 87380 134217728',
      'net.ipv4.tcp_wmem': '4096 65536 134217728',
    },
    postInstallHooks: [
      'systemctl enable containerd',
      'modprobe br_netfilter',
      'modprobe overlay',
    ],
  },

  /**
   * StarlingX Dedicated Storage Node
   * Optimized for Ceph OSD storage with XFS
   */
  starlingx_storage: {
    scheme: 'starlingx_storage',
    description: 'StarlingX dedicated storage node for Ceph OSDs',
    platform: 'starlingx',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '30G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      // Note: OSD drives configured separately during Ceph deployment
      { size: 'remaining', mount_point: '/var/lib/ceph', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,inode64', label: 'ceph', description: 'Ceph OSD data' },
    ],
    kernelParameters: ['elevator=noop', 'scsi_mod.use_blk_mq=1'],
    sysctlSettings: {
      'fs.file-max': 2097152,
      'fs.aio-max-nr': 1048576,
      'vm.zone_reclaim_mode': 0,
    },
  },

  // ============================================================================
  // OPENSTACK PLATFORM STRATEGIES
  // ============================================================================

  /**
   * OpenStack Controller Node
   * Service-specific partitions for API services, databases, and message queues
   */
  openstack_controller: {
    scheme: 'openstack_controller',
    description: 'OpenStack controller with service-specific partitions',
    platform: 'openstack',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '50G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '30G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '100G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql', description: 'MariaDB/MySQL data' },
      { size: '50G', mount_point: '/var/lib/rabbitmq', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'rabbitmq', description: 'RabbitMQ message queue' },
      { size: '50G', mount_point: '/var/lib/keystone', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'keystone' },
      { size: 'remaining', mount_point: '/var/lib/glance', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'glance', description: 'Glance image storage' },
    ],
    sysctlSettings: {
      'net.ipv4.ip_forward': 1,
      'net.bridge.bridge-nf-call-iptables': 1,
      'net.bridge.bridge-nf-call-ip6tables': 1,
    },
  },

  /**
   * OpenStack Compute Node (Nova)
   * Optimized for VM instances with large ephemeral storage
   */
  openstack_compute: {
    scheme: 'openstack_compute',
    description: 'OpenStack compute node for Nova instances',
    platform: 'openstack',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '64G', mount_point: 'swap', filesystem: 'swap', encryption: true, description: 'Large swap for memory overcommit' },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '30G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: 'remaining', mount_point: '/var/lib/nova', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'nova', description: 'Nova instance ephemeral storage' },
    ],
    kernelParameters: [
      'intel_iommu=on',
      'iommu=pt',
      'hugepagesz=2M',
      'hugepages=2048',
    ],
    sysctlSettings: {
      'net.ipv4.ip_forward': 1,
      'vm.swappiness': 1,
      'vm.dirty_ratio': 10,
      'vm.dirty_background_ratio': 5,
    },
  },

  /**
   * OpenStack Cinder Node
   * Block storage service with LVM backend
   */
  openstack_cinder: {
    scheme: 'openstack_cinder',
    description: 'OpenStack Cinder block storage node',
    platform: 'openstack',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '20G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '10G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      // Note: LVM PVs for cinder-volumes VG created separately
      { size: 'remaining', mount_point: '/var/lib/cinder', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'cinder', description: 'Cinder volume data' },
    ],
    sysctlSettings: {
      'fs.file-max': 1048576,
    },
  },

  // ============================================================================
  // HOSTBILL PLATFORM STRATEGIES
  // ============================================================================

  /**
   * Hostbill Billing Platform
   * MySQL optimization, backup automation, billing platform tuning
   */
  hostbill_primary: {
    scheme: 'hostbill_primary',
    description: 'Hostbill billing platform with MySQL optimization',
    platform: 'hostbill',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '30G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '100G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql', description: 'MySQL data with InnoDB optimization' },
      { size: '50G', mount_point: '/var/www', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'www', description: 'Hostbill application files' },
      { size: '50G', mount_point: '/var/cache', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'cache', description: 'Redis/Memcached cache' },
      { size: 'remaining', mount_point: '/backup', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'backup', description: 'Automated backup storage' },
    ],
    sysctlSettings: {
      'vm.swappiness': 1,
      'fs.file-max': 500000,
      'net.core.somaxconn': 65535,
      'net.ipv4.tcp_max_syn_backlog': 65535,
    },
    postInstallHooks: [
      'mysql_secure_installation',
      'systemctl enable mariadb',
      'systemctl enable redis',
      'systemctl enable nginx',
    ],
  },

  // ============================================================================
  // KUBERNETES PLATFORM STRATEGIES
  // ============================================================================

  /**
   * Kubernetes Master Node
   * etcd and control plane optimized
   */
  kubernetes_master: {
    scheme: 'kubernetes_master',
    description: 'Kubernetes master with etcd and control plane optimization',
    platform: 'kubernetes',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '8G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '50G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '100G', mount_point: '/var/lib/etcd', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'etcd', description: 'etcd data - use fast SSD' },
      { size: '100G', mount_point: '/var/lib/containerd', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'containerd' },
      { size: 'remaining', mount_point: '/var/lib/kubelet', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'kubelet' },
    ],
    kernelParameters: ['cgroup_enable=memory', 'swapaccount=1'],
    sysctlSettings: {
      'net.bridge.bridge-nf-call-iptables': 1,
      'net.bridge.bridge-nf-call-ip6tables': 1,
      'net.ipv4.ip_forward': 1,
      'fs.inotify.max_user_watches': 524288,
    },
  },

  /**
   * Kubernetes Worker Node
   * Container runtime and persistent volume storage
   */
  kubernetes_worker: {
    scheme: 'kubernetes_worker',
    description: 'Kubernetes worker with container and PV storage',
    platform: 'kubernetes',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '50G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '200G', mount_point: '/var/lib/containerd', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'containerd', description: 'Container images and layers' },
      { size: '100G', mount_point: '/var/lib/kubelet', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'kubelet', description: 'Kubelet data and pods' },
      { size: 'remaining', mount_point: '/mnt/pv-storage', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'pv-storage', description: 'Local persistent volumes' },
    ],
    kernelParameters: ['cgroup_enable=memory', 'swapaccount=1'],
    sysctlSettings: {
      'net.bridge.bridge-nf-call-iptables': 1,
      'net.ipv4.ip_forward': 1,
      'vm.max_map_count': 262144,
    },
  },

  // ============================================================================
  // WEB STACK STRATEGIES
  // ============================================================================

  /**
   * WordPress Optimized
   * PHP-FPM, MySQL, and media storage
   */
  web_wordpress: {
    scheme: 'web_wordpress',
    description: 'WordPress with PHP-FPM, MySQL, and media optimization',
    platform: 'web',
    encryption: { enabled: false },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '8G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '20G', mount_point: '/', filesystem: 'ext4', encryption: false, mount_options: 'noatime' },
      { size: '20G', mount_point: '/var', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid' },
      { size: '10G', mount_point: '/var/log', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '50G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: false, mount_options: 'noatime,nodev', label: 'mysql' },
      { size: '30G', mount_point: '/var/www', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev', label: 'www' },
      { size: '20G', mount_point: '/var/cache', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev', label: 'cache', description: 'Redis/OPcache' },
      { size: 'remaining', mount_point: '/var/www/wp-content/uploads', filesystem: 'xfs', encryption: false, mount_options: 'noatime,nodev,noexec', label: 'uploads', description: 'Media uploads' },
    ],
    sysctlSettings: {
      'net.core.somaxconn': 65535,
      'vm.swappiness': 10,
    },
  },

  /**
   * High-Traffic Web Application
   * Nginx, PHP-FPM, Redis, with CDN-ready media storage
   */
  web_high_traffic: {
    scheme: 'web_high_traffic',
    description: 'High-traffic web app with caching and CDN optimization',
    platform: 'web',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '32G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '50G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '30G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '100G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql' },
      { size: '50G', mount_point: '/var/www', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'www' },
      { size: '50G', mount_point: '/var/cache/nginx', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'nginx-cache', description: 'Nginx proxy cache' },
      { size: '30G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'redis' },
      { size: 'remaining', mount_point: '/var/www/media', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,noexec', label: 'media', description: 'Static media files' },
    ],
    sysctlSettings: {
      'net.core.somaxconn': 65535,
      'net.core.netdev_max_backlog': 65535,
      'net.ipv4.tcp_max_syn_backlog': 65535,
      'net.ipv4.tcp_fin_timeout': 30,
      'net.ipv4.tcp_tw_reuse': 1,
      'vm.swappiness': 1,
    },
  },

  // ============================================================================
  // APPLICATION FRAMEWORK STRATEGIES
  // ============================================================================

  /**
   * Django Production
   * Python/Django with PostgreSQL, Redis, Celery worker separation
   */
  django_production: {
    scheme: 'django_production',
    description: 'Python/Django production with PostgreSQL, Redis, Celery workers',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/var/lib/postgresql', filesystem: 'ext4', encryption: true },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/opt/django', filesystem: 'ext4', encryption: true },
      { size: 'remaining', mount_point: '/srv/media', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'apt install -y python3 python3-pip python3-venv postgresql redis-server nginx',
      'pip3 install gunicorn celery django psycopg2-binary redis',
      'systemctl enable postgresql redis-server nginx',
      'mount -o noexec,nodev,nosuid /srv/media',
    ],
    kernelParameters: ['vm.overcommit_memory=1'],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 65535,
    },
  },

  /**
   * Rails Production
   * Ruby on Rails with PostgreSQL, Redis, Sidekiq, asset pipeline
   */
  rails_production: {
    scheme: 'rails_production',
    description: 'Ruby on Rails production with PostgreSQL, Redis, Sidekiq workers',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/var/lib/postgresql', filesystem: 'ext4', encryption: true },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/opt/rails', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/opt/rails/public/assets', filesystem: 'ext4', encryption: false },
      { size: 'remaining', mount_point: '/srv/storage', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'apt install -y ruby ruby-dev postgresql redis-server nginx nodejs npm',
      'gem install bundler puma sidekiq',
      'npm install -g yarn',
      'systemctl enable postgresql redis-server nginx',
    ],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 65535,
    },
  },

  /**
   * Next.js Production
   * Node.js/Next.js with PostgreSQL, Redis cache, static asset CDN preparation
   */
  nextjs_production: {
    scheme: 'nextjs_production',
    description: 'Next.js production with PostgreSQL, Redis, CDN-ready static assets',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '12G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '40G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '15G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '25G', mount_point: '/var/lib/postgresql', filesystem: 'ext4', encryption: true },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/opt/nextjs', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/opt/nextjs/.next/static', filesystem: 'ext4', encryption: false },
      { size: 'remaining', mount_point: '/srv/cdn-origin', filesystem: 'xfs', encryption: false },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
      'apt install -y nodejs postgresql redis-server nginx',
      'npm install -g pm2 yarn',
      'systemctl enable postgresql redis-server nginx',
    ],
    sysctlSettings: {
      'vm.swappiness': 10,
      'fs.file-max': 2097152,
      'net.core.somaxconn': 65535,
    },
  },

  /**
   * Laravel Production
   * PHP Laravel with MySQL, Redis, queue workers, storage optimization
   */
  laravel_production: {
    scheme: 'laravel_production',
    description: 'PHP Laravel production with MySQL, Redis, queue workers',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '40G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/var/www/laravel', filesystem: 'ext4', encryption: true },
      { size: 'remaining', mount_point: '/var/www/laravel/storage', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'apt install -y php8.2-fpm php8.2-mysql php8.2-redis php8.2-mbstring php8.2-xml php8.2-curl',
      'apt install -y mysql-server redis-server nginx composer',
      'systemctl enable mysql redis-server nginx php8.2-fpm',
      'mount -o noexec /var/www/laravel/storage',
    ],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 65535,
    },
  },

  /**
   * Symfony Production
   * PHP Symfony with MySQL, Redis, Messenger queue workers
   */
  symfony_production: {
    scheme: 'symfony_production',
    description: 'PHP Symfony production with MySQL, Redis, Messenger workers',
    platform: 'web',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '40G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/var/www/symfony', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/cache/symfony', filesystem: 'ext4', encryption: false },
      { size: 'remaining', mount_point: '/var/www/symfony/var', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'apt install -y php8.2-fpm php8.2-mysql php8.2-redis php8.2-mbstring php8.2-xml php8.2-curl php8.2-intl',
      'apt install -y mysql-server redis-server nginx composer',
      'composer global require symfony/cli',
      'systemctl enable mysql redis-server nginx php8.2-fpm',
    ],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 65535,
    },
  },

  /**
   * StarlingX Production (STX)
   * Simplified StarlingX production deployment for edge cloud
   */
  stx_production: {
    scheme: 'stx_production',
    description: 'StarlingX production edge cloud deployment',
    platform: 'starlingx',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, label: 'EFI' },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false, label: 'boot' },
      { size: '32G', mount_point: 'swap', filesystem: 'swap', encryption: true, label: 'swap' },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime', label: 'root' },
      { size: '80G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'var' },
      { size: '40G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec', label: 'varlog' },
      { size: '150G', mount_point: '/var/lib/docker', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'docker' },
      { size: '80G', mount_point: '/opt/platform', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'platform' },
      { size: 'remaining', mount_point: '/var/lib/nova', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'nova' },
    ],
    kernelParameters: [
      'isolcpus=2-7',
      'nohz_full=2-7',
      'rcu_nocbs=2-7',
      'intel_iommu=on',
      'iommu=pt',
      'hugepagesz=1G',
      'hugepages=8',
      'default_hugepagesz=1G',
    ],
    sysctlSettings: {
      'vm.nr_hugepages': 8,
      'vm.swappiness': 10,
      'net.core.rmem_max': 134217728,
      'net.core.wmem_max': 134217728,
    },
    postInstallHooks: [
      'systemctl enable containerd',
      'modprobe br_netfilter',
      'modprobe overlay',
    ],
  },

  /**
   * Hostbill Production
   * Hostbill billing platform - production deployment
   */
  hostbill_production: {
    scheme: 'hostbill_production',
    description: 'Hostbill billing platform production with MySQL optimization',
    platform: 'hostbill',
    encryption: { enabled: true, method: 'luks', key_management: 'kms' },
    partitions: [
      { size: '1G', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '2G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true },
      { size: '30G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'noatime' },
      { size: '30G', mount_point: '/var', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec' },
      { size: '100G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql' },
      { size: '50G', mount_point: '/var/www', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'www' },
      { size: '50G', mount_point: '/var/cache', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'cache' },
      { size: 'remaining', mount_point: '/backup', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'backup' },
    ],
    sysctlSettings: {
      'vm.swappiness': 1,
      'fs.file-max': 500000,
      'net.core.somaxconn': 65535,
      'net.ipv4.tcp_max_syn_backlog': 65535,
    },
    postInstallHooks: [
      'mysql_secure_installation',
      'systemctl enable mariadb',
      'systemctl enable redis',
      'systemctl enable nginx',
    ],
  },

  // ============================================================================
  // DOCKER SWARM STRATEGIES
  // ============================================================================

  /**
   * Docker Swarm Manager
   * Swarm manager node with etcd-like consensus storage requirements
   */
  docker_swarm_manager: {
    scheme: 'docker_swarm_manager',
    description: 'Docker Swarm manager with consensus storage and overlay network',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '30G', mount_point: '/var/lib/docker', filesystem: 'xfs', encryption: true },
      { size: '20G', mount_point: '/var/lib/docker/swarm', filesystem: 'ext4', encryption: true },
      { size: 'remaining', mount_point: '/var/lib/docker/volumes', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'curl -fsSL https://get.docker.com | sh',
      'systemctl enable docker',
      'docker swarm init --advertise-addr $(hostname -I | awk \'{print $1}\')',
    ],
    kernelParameters: ['cgroup_enable=memory', 'swapaccount=1'],
    sysctlSettings: {
      'net.bridge.bridge-nf-call-iptables': 1,
      'net.bridge.bridge-nf-call-ip6tables': 1,
      'net.ipv4.ip_forward': 1,
      'fs.inotify.max_user_watches': 524288,
      'fs.inotify.max_user_instances': 512,
    },
  },

  /**
   * Docker Swarm Worker
   * Swarm worker with container image cache and overlay network optimization
   */
  docker_swarm_worker: {
    scheme: 'docker_swarm_worker',
    description: 'Docker Swarm worker with image cache and overlay network optimization',
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
      { size: '40G', mount_point: '/', filesystem: 'ext4', encryption: true },
      { size: '15G', mount_point: '/var/log', filesystem: 'ext4', encryption: true },
      { size: '100G', mount_point: '/var/lib/docker', filesystem: 'xfs', encryption: true },
      { size: '50G', mount_point: '/var/lib/docker/overlay2', filesystem: 'xfs', encryption: false },
      { size: 'remaining', mount_point: '/var/lib/docker/volumes', filesystem: 'xfs', encryption: true },
    ],
    encryption: {
      enabled: true,
      method: 'luks',
      key_size: 512,
      key_management: 'kms',
    },
    postInstallHooks: [
      'curl -fsSL https://get.docker.com | sh',
      'systemctl enable docker',
      'echo "Join swarm with: docker swarm join --token <TOKEN> <MANAGER_IP>:2377"',
    ],
    kernelParameters: ['cgroup_enable=memory', 'swapaccount=1'],
    sysctlSettings: {
      'net.bridge.bridge-nf-call-iptables': 1,
      'net.bridge.bridge-nf-call-ip6tables': 1,
      'net.ipv4.ip_forward': 1,
      'vm.max_map_count': 262144,
      'fs.inotify.max_user_watches': 524288,
    },
  },

  // ============================================================================
  // CMS & FORUM PLATFORM STRATEGIES
  // ============================================================================

  /**
   * WordPress Production
   * WordPress with MySQL/MariaDB, PHP-FPM, Nginx, Redis object cache
   * Optimized for high-traffic multi-site deployments
   */
  wordpress_production: {
    scheme: 'wordpress_production',
    description: 'WordPress production with MySQL, PHP-FPM, Nginx, Redis object cache',
    platform: 'web',
    encryption: { enabled: true, method: 'luks', key_management: 'kms', key_size: 512 },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, label: 'EFI' },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false, label: 'boot' },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true, label: 'swap' },
      { size: '40G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime', label: 'root' },
      { size: '25G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec', label: 'varlog' },
      { size: '60G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql', description: 'MySQL InnoDB data - XFS for performance' },
      { size: '10G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'redis', description: 'Redis object cache persistence' },
      { size: '50G', mount_point: '/var/www/wordpress', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'wordpress', description: 'WordPress core and themes' },
      { size: '80G', mount_point: '/var/www/wordpress/wp-content/uploads', filesystem: 'xfs', encryption: false, mount_options: 'noatime,nodev,nosuid', label: 'uploads', description: 'Media uploads - unencrypted for CDN performance' },
      { size: '20G', mount_point: '/var/cache/nginx', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid,noexec', label: 'nginx-cache', description: 'FastCGI cache - unencrypted for performance' },
      { size: 'remaining', mount_point: '/backup', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'backup', description: 'WordPress backup storage' },
    ],
    postInstallHooks: [
      'apt update && apt install -y nginx mariadb-server redis-server',
      'apt install -y php8.2-fpm php8.2-mysql php8.2-redis php8.2-curl php8.2-gd php8.2-mbstring php8.2-xml php8.2-zip php8.2-imagick',
      'systemctl enable nginx mariadb redis-server php8.2-fpm',
      'mysql_secure_installation',
      'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp',
      'chown -R www-data:www-data /var/www/wordpress',
      'chmod -R 755 /var/www/wordpress && chmod -R 775 /var/www/wordpress/wp-content/uploads',
    ],
    kernelParameters: ['transparent_hugepage=madvise'],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 65535,
      'net.core.netdev_max_backlog': 65536,
      'net.ipv4.tcp_max_syn_backlog': 65535,
      'fs.file-max': 500000,
      'net.ipv4.tcp_tw_reuse': 1,
    },
  },

  /**
   * Flarum Forum Production
   * Flarum forum with MySQL, PHP-FPM, Nginx, Redis sessions, Composer
   * Optimized for community discussions and asset compilation
   */
  flarum_production: {
    scheme: 'flarum_production',
    description: 'Flarum forum production with MySQL, PHP-FPM, Nginx, Composer, asset compilation',
    platform: 'web',
    encryption: { enabled: true, method: 'luks', key_management: 'kms', key_size: 512 },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, label: 'EFI' },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false, label: 'boot' },
      { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: true, label: 'swap' },
      { size: '40G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime', label: 'root' },
      { size: '20G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec', label: 'varlog' },
      { size: '40G', mount_point: '/var/lib/mysql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'mysql', description: 'MySQL InnoDB data' },
      { size: '8G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'redis', description: 'Redis session storage' },
      { size: '30G', mount_point: '/var/www/flarum', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'flarum', description: 'Flarum core and extensions' },
      { size: '15G', mount_point: '/var/www/flarum/public/assets', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid', label: 'assets', description: 'Compiled assets - unencrypted for performance' },
      { size: '30G', mount_point: '/var/www/flarum/storage', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'storage', description: 'User uploads and cache' },
      { size: '10G', mount_point: '/var/cache/composer', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid,noexec', label: 'composer-cache', description: 'Composer package cache' },
      { size: 'remaining', mount_point: '/backup', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'backup', description: 'Flarum backup storage' },
    ],
    postInstallHooks: [
      'apt update && apt install -y nginx mariadb-server redis-server composer nodejs npm',
      'apt install -y php8.2-fpm php8.2-mysql php8.2-redis php8.2-curl php8.2-gd php8.2-mbstring php8.2-xml php8.2-zip php8.2-tokenizer php8.2-dom',
      'systemctl enable nginx mariadb redis-server php8.2-fpm',
      'mysql_secure_installation',
      'npm install -g yarn',
      'mkdir -p /var/www/flarum && cd /var/www/flarum && composer create-project flarum/flarum . --stability=beta',
      'chown -R www-data:www-data /var/www/flarum',
      'chmod -R 755 /var/www/flarum && chmod -R 775 /var/www/flarum/storage /var/www/flarum/public/assets',
      'cd /var/www/flarum && php flarum migrate',
    ],
    kernelParameters: ['transparent_hugepage=madvise'],
    sysctlSettings: {
      'vm.swappiness': 10,
      'net.core.somaxconn': 32768,
      'net.ipv4.tcp_max_syn_backlog': 32768,
      'fs.file-max': 300000,
      'fs.inotify.max_user_watches': 524288,
    },
  },

  /**
   * Affiliate Systems Production
   * Partner tracking, commission management, real-time attribution
   * Optimized for high-volume click tracking and conversion analytics
   */
  affiliate_production: {
    scheme: 'affiliate_production',
    description: 'Affiliate systems with PostgreSQL, Redis, Kafka, partner tracking, commission management',
    platform: 'affiliate',
    encryption: { enabled: true, method: 'luks', key_management: 'kms', key_size: 512 },
    partitions: [
      { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false, label: 'EFI' },
      { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false, label: 'boot' },
      { size: '32G', mount_point: 'swap', filesystem: 'swap', encryption: true, label: 'swap', description: 'Large swap for analytics processing' },
      { size: '50G', mount_point: '/', filesystem: 'ext4', encryption: true, mount_options: 'errors=remount-ro,noatime', label: 'root' },
      { size: '30G', mount_point: '/var/log', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid,noexec', label: 'varlog', description: 'Click and conversion logs' },
      { size: '100G', mount_point: '/var/lib/postgresql', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev,nobarrier', label: 'postgres', description: 'PostgreSQL - partner/commission data' },
      { size: '40G', mount_point: '/var/lib/redis', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev,nosuid', label: 'redis', description: 'Redis - session/click tracking cache' },
      { size: '80G', mount_point: '/var/lib/kafka', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'kafka', description: 'Kafka - event streaming for attribution' },
      { size: '40G', mount_point: '/opt/affiliate', filesystem: 'ext4', encryption: true, mount_options: 'noatime,nodev', label: 'affiliate', description: 'Affiliate platform application' },
      { size: '20G', mount_point: '/opt/affiliate/analytics', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'analytics', description: 'Real-time analytics data' },
      { size: '15G', mount_point: '/var/cache/affiliate', filesystem: 'ext4', encryption: false, mount_options: 'noatime,nodev,nosuid,noexec', label: 'cache', description: 'Attribution cache - unencrypted for speed' },
      { size: 'remaining', mount_point: '/backup', filesystem: 'xfs', encryption: true, mount_options: 'noatime,nodev', label: 'backup', description: 'Commission and partner data backups' },
    ],
    postInstallHooks: [
      'apt update && apt install -y postgresql-15 redis-server openjdk-17-jdk nginx',
      'curl -O https://downloads.apache.org/kafka/3.6.0/kafka_2.13-3.6.0.tgz && tar -xzf kafka*.tgz -C /opt/',
      'systemctl enable postgresql redis-server nginx',
      'sudo -u postgres createuser affiliate_admin && sudo -u postgres createdb affiliate_db -O affiliate_admin',
      'pip3 install psycopg2-binary redis kafka-python celery flower',
      'mkdir -p /opt/affiliate/{analytics,tracking,commissions,partners}',
      'chown -R www-data:www-data /opt/affiliate',
      'echo "max_connections = 300" >> /etc/postgresql/15/main/postgresql.conf',
      'echo "shared_buffers = 4GB" >> /etc/postgresql/15/main/postgresql.conf',
      'echo "effective_cache_size = 12GB" >> /etc/postgresql/15/main/postgresql.conf',
    ],
    kernelParameters: ['transparent_hugepage=never', 'vm.overcommit_memory=1'],
    sysctlSettings: {
      'vm.swappiness': 1,
      'net.core.somaxconn': 65535,
      'net.ipv4.tcp_max_syn_backlog': 65535,
      'net.core.netdev_max_backlog': 65535,
      'fs.file-max': 1000000,
      'net.ipv4.tcp_tw_reuse': 1,
      'net.ipv4.ip_local_port_range': '1024 65535',
    },
  },
};

/**
 * HiveVelocity Device Manager Class
 */
export class HiveVelocityDeviceManager {
  private apiKey: string;
  private baseUrl: string;
  private deviceId: number;

  constructor(apiKey: string, deviceId: number, baseUrl: string = 'https://core.hivelocity.net/api/v2') {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    
    this.apiKey = apiKey;
    this.deviceId = deviceId;
    this.baseUrl = baseUrl;
  }

  /**
   * Reload device with specified OS and partition scheme
   */
  async reloadDevice(request: DeviceReloadRequest): Promise<any> {
    const url = `${this.baseUrl}/device/${this.deviceId}/reload`;
    
    // If partition scheme name provided, use pre-defined strategy
    if (request.partition_scheme && PARTITION_STRATEGIES[request.partition_scheme]) {
      request.partitions = PARTITION_STRATEGIES[request.partition_scheme].partitions;
      request.encryption = PARTITION_STRATEGIES[request.partition_scheme].encryption.enabled;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error reloading device:', error);
      throw error;
    }
  }

  /**
   * Update bare metal device configuration
   */
  async updateDevice(request: DeviceUpdateRequest): Promise<any> {
    const url = `${this.baseUrl}/bare-metal-device/${this.deviceId}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<any> {
    const url = `${this.baseUrl}/device/${this.deviceId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting device status:', error);
      throw error;
    }
  }

  /**
   * Reload device using a pre-defined strategy
   */
  async reloadWithStrategy(
    os: string,
    strategyName: keyof typeof PARTITION_STRATEGIES,
    customOptions?: Partial<DeviceReloadRequest>
  ): Promise<any> {
    const strategy = PARTITION_STRATEGIES[strategyName];
    
    if (!strategy) {
      throw new Error(`Unknown partition strategy: ${strategyName}`);
    }

    const request: DeviceReloadRequest = {
      os,
      partition_scheme: strategyName,
      filesystem: strategy.partitions[0].filesystem,
      encryption: strategy.encryption.enabled,
      partitions: strategy.partitions,
      ...customOptions,
    };

    return this.reloadDevice(request);
  }

  /**
   * Validate partition scheme
   */
  static validatePartitionScheme(scheme: HiveVelocityPartitionScheme): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required partitions
    const requiredMountPoints = ['/boot/efi', '/boot'];
    const existingMountPoints = scheme.partitions.map(p => p.mount_point);

    for (const mountPoint of requiredMountPoints) {
      if (!existingMountPoints.includes(mountPoint)) {
        errors.push(`Missing required partition: ${mountPoint}`);
      }
    }

    // Check for duplicate mount points
    const duplicates = existingMountPoints.filter(
      (item, index) => existingMountPoints.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate mount points found: ${duplicates.join(', ')}`);
    }

    // Check for swap partition
    if (!existingMountPoints.includes('swap')) {
      errors.push('Missing swap partition');
    }

    // Check for root partition
    if (!existingMountPoints.includes('/')) {
      errors.push('Missing root partition (/)');
    }

    // Check encryption consistency
    if (scheme.encryption.enabled) {
      const unencryptedCritical = scheme.partitions.filter(
        p => p.mount_point !== '/boot/efi' && p.mount_point !== '/boot' && !p.encryption
      );
      if (unencryptedCritical.length > 0) {
        errors.push(`Encryption enabled but these partitions are unencrypted: ${unencryptedCritical.map(p => p.mount_point).join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get recommended strategy based on use case
   */
  static getRecommendedStrategy(useCase: string): keyof typeof PARTITION_STRATEGIES {
    const recommendations: Record<string, keyof typeof PARTITION_STRATEGIES> = {
      'web': 'general_purpose',
      'application': 'general_purpose',
      'database': 'database_optimized',
      'storage': 'database_optimized',
      'kubernetes': 'container_node',
      'docker': 'container_node',
      'container': 'container_node',
      'production': 'high_security',
      'security': 'high_security',
      'development': 'standard',
      'testing': 'standard',
      'basic': 'standard',
      // New platform strategies
      'django': 'django_production',
      'python': 'django_production',
      'rails': 'rails_production',
      'ruby': 'rails_production',
      'nextjs': 'nextjs_production',
      'next': 'nextjs_production',
      'react': 'nextjs_production',
      'node': 'nextjs_production',
      'laravel': 'laravel_production',
      'php': 'laravel_production',
      'swarm': 'docker_swarm_manager',
      'swarm_manager': 'docker_swarm_manager',
      'swarm_worker': 'docker_swarm_worker',
      // New platform strategies
      'symfony': 'symfony_production',
      'stx': 'stx_production',
      'starlingx': 'stx_production',
      'hostbill': 'hostbill_production',
      'billing': 'hostbill_production',
      // CMS & Forum strategies
      'wordpress': 'wordpress_production',
      'wp': 'wordpress_production',
      'blog': 'wordpress_production',
      'cms': 'wordpress_production',
      'flarum': 'flarum_production',
      'forum': 'flarum_production',
      'community': 'flarum_production',
      // Affiliate systems
      'affiliate': 'affiliate_production',
      'partner': 'affiliate_production',
      'commission': 'affiliate_production',
      'tracking': 'affiliate_production',
      'attribution': 'affiliate_production',
    };

    return recommendations[useCase.toLowerCase()] || 'general_purpose';
  }

  /**
   * Generate partition summary
   */
  static generatePartitionSummary(scheme: HiveVelocityPartitionScheme): string {
    const lines = [
      `Partition Scheme: ${scheme.scheme}`,
      `Encryption: ${scheme.encryption.enabled ? 'Enabled (' + scheme.encryption.method + ')' : 'Disabled'}`,
      '',
      'Partitions:',
      '─────────────────────────────────────────────────────────────────────',
      'Size          Mount Point      Filesystem      Encryption',
      '─────────────────────────────────────────────────────────────────────',
    ];

    for (const partition of scheme.partitions) {
      lines.push(
        `${partition.size.padEnd(14)} ${partition.mount_point.padEnd(16)} ${partition.filesystem.padEnd(14)} ${partition.encryption ? 'Yes' : 'No'}`
      );
    }

    return lines.join('\n');
  }
}

/**
 * Utility function to create device manager from environment variables
 */
export function createDeviceManagerFromEnv(deviceId: number): HiveVelocityDeviceManager {
  const apiKey = process.env.HIVELOCITY_API_KEY;

  if (!apiKey) {
    throw new Error('HIVELOCITY_API_KEY environment variable is not set');
  }

  return new HiveVelocityDeviceManager(apiKey, deviceId);
}

// ============================================================================
// IPMI INTEGRATION MODULE
// ============================================================================

/**
 * IPMI Manager for remote device access and power control
 * Provides BMC access, serial-over-LAN, and boot device configuration
 */
export class IPMIManager {
  private config: IPMIConfig;

  constructor(config: IPMIConfig) {
    if (!config.host || !config.username || !config.password) {
      throw new Error('IPMI host, username, and password are required');
    }
    this.config = {
      interface: 'lanplus',
      port: 623,
      ...config,
    };
  }

  /**
   * Generate IPMI command string
   */
  private buildCommand(action: string): string {
    const { host, username, password, interface: iface, port } = this.config;
    return `ipmitool -I ${iface} -H ${host} -p ${port} -U ${username} -P "${password}" ${action}`;
  }

  /**
   * Execute IPMI command (returns command for execution)
   */
  getCommand(cmd: IPMICommand): string {
    const commands: Record<IPMICommand['action'], string> = {
      power_on: 'chassis power on',
      power_off: 'chassis power off',
      power_cycle: 'chassis power cycle',
      power_reset: 'chassis power reset',
      power_status: 'chassis power status',
      sol_activate: 'sol activate',
      sol_deactivate: 'sol deactivate',
      boot_pxe: 'chassis bootdev pxe',
      boot_disk: 'chassis bootdev disk',
      boot_bios: 'chassis bootdev bios',
    };

    return this.buildCommand(commands[cmd.action]);
  }

  /**
   * Generate SOL (Serial Over LAN) connection command
   */
  getSOLCommand(): string {
    return this.buildCommand('sol activate');
  }

  /**
   * Generate sensor data command
   */
  getSensorCommand(): string {
    return this.buildCommand('sensor list');
  }

  /**
   * Generate SEL (System Event Log) command
   */
  getSELCommand(): string {
    return this.buildCommand('sel list');
  }

  /**
   * Generate BMC info command
   */
  getBMCInfoCommand(): string {
    return this.buildCommand('bmc info');
  }

  /**
   * Create IPMI configuration from environment variables
   */
  static fromEnv(): IPMIManager {
    const config: IPMIConfig = {
      host: process.env.IPMI_HOST || '',
      username: process.env.IPMI_USERNAME || '',
      password: process.env.IPMI_PASSWORD || '',
      interface: (process.env.IPMI_INTERFACE as 'lanplus' | 'lan' | 'open') || 'lanplus',
      port: parseInt(process.env.IPMI_PORT || '623', 10),
    };

    if (!config.host || !config.username || !config.password) {
      throw new Error('IPMI_HOST, IPMI_USERNAME, and IPMI_PASSWORD environment variables are required');
    }

    return new IPMIManager(config);
  }
}

// ============================================================================
// PORT MANAGEMENT MODULE
// ============================================================================

/**
 * Port Manager for SSH and service port configuration via Hivelocity API
 */
export class PortManager {
  private apiKey: string;
  private baseUrl: string;
  private deviceId: number;

  constructor(apiKey: string, deviceId: number, baseUrl: string = 'https://core.hivelocity.net/api/v2') {
    this.apiKey = apiKey;
    this.deviceId = deviceId;
    this.baseUrl = baseUrl;
  }

  /**
   * Configure SSH port via API (sets custom SSH port in device config)
   */
  async configureSSHPort(port: number): Promise<any> {
    const url = `${this.baseUrl}/bare-metal-device/${this.deviceId}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ssh_port: port }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error configuring SSH port:', error);
      throw error;
    }
  }

  /**
   * Generate post-install script for SSH port hardening
   */
  generateSSHHardeningScript(config: PortConfiguration): string {
    const script = `#!/bin/bash
# SSH Hardening Script - Generated by HiveVelocity Device Manager
# Port: ${config.ssh_port}

set -e

echo "=== SSH Port Hardening ==="

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.\$(date +%Y%m%d)

# Create custom SSH config
cat > /etc/ssh/sshd_config.d/99-hardened.conf << 'SSHCONFIG'
# SSH Hardening Configuration
Port ${config.ssh_port}
Protocol 2
PermitRootLogin prohibit-password
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
MaxSessions 10
MaxStartups 10:30:100
AllowAgentForwarding no
AllowTcpForwarding no
TCPKeepAlive yes
UsePAM yes
Subsystem sftp /usr/lib/openssh/sftp-server
SSHCONFIG

# Configure firewall
if command -v ufw &> /dev/null; then
    ufw allow ${config.ssh_port}/tcp comment 'SSH'
    ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${config.ssh_port}/tcp
    firewall-cmd --reload
fi

# Restart SSH service
systemctl restart sshd

echo "SSH hardening complete. Port: ${config.ssh_port}"
`;

    return script;
  }

  /**
   * Generate firewall rules script
   */
  generateFirewallScript(config: PortConfiguration): string {
    const rules = config.additional_ports?.map(p =>
      `ufw allow ${p.port}/${p.protocol} comment '${p.service}'`
    ).join('\n') || '';

    return `#!/bin/bash
# Firewall Configuration Script
set -e

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ${config.ssh_port}/tcp comment 'SSH'

# Additional ports
${rules}

# Enable UFW
ufw --force enable
ufw status verbose
`;
  }
}

// ============================================================================
// WSJF PRIORITIZATION MODULE
// ============================================================================

/**
 * WSJF Calculator for infrastructure task prioritization
 * Implements Weighted Shortest Job First prioritization framework
 */
export class WSJFCalculator {
  /**
   * Calculate WSJF score for a task
   *
   * Formula: WSJF = Cost of Delay / Job Size
   * Cost of Delay = User Business Value + Time Criticality + Risk Reduction
   */
  static calculate(input: WSJFInput): WSJFResult {
    // Validate inputs
    const validate = (value: number, name: string, min: number, max: number) => {
      if (value < min || value > max) {
        throw new Error(`${name} must be between ${min} and ${max}`);
      }
    };

    validate(input.user_business_value, 'user_business_value', 1, 10);
    validate(input.time_criticality, 'time_criticality', 1, 10);
    validate(input.risk_reduction, 'risk_reduction', 1, 10);
    validate(input.job_size, 'job_size', 1, 100);

    // Calculate Cost of Delay
    const costOfDelay = input.user_business_value + input.time_criticality + input.risk_reduction;

    // Calculate WSJF score
    const score = (costOfDelay / input.job_size) * 100;

    // Normalize to 0-100 scale
    const maxPossibleScore = (30 / 1) * 100; // Max CoD / Min Job Size
    const normalizedScore = Math.min((score / maxPossibleScore) * 100, 100);

    // Determine priority level
    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (normalizedScore >= 75) priority = 'critical';
    else if (normalizedScore >= 50) priority = 'high';
    else if (normalizedScore >= 25) priority = 'medium';
    else priority = 'low';

    // Generate recommendation and trade-offs
    const { recommendation, tradeOffs, contingencyPlan } = this.generateGuidance(input, priority);

    return {
      score,
      priority,
      normalized_score: normalizedScore,
      components: {
        user_business_value: input.user_business_value,
        time_criticality: input.time_criticality,
        risk_reduction: input.risk_reduction,
        cost_of_delay: costOfDelay,
        job_size: input.job_size,
      },
      recommendation,
      trade_offs: tradeOffs,
      contingency_plan: contingencyPlan,
    };
  }

  /**
   * Generate guidance based on WSJF analysis
   */
  private static generateGuidance(input: WSJFInput, priority: string): {
    recommendation: string;
    tradeOffs: string[];
    contingencyPlan: string;
  } {
    const recommendations: Record<string, string> = {
      critical: 'IMMEDIATE ACTION REQUIRED: This task has maximum priority. Execute immediately with full team support.',
      high: 'HIGH PRIORITY: Schedule for next available slot. Consider parallel execution with other high-priority tasks.',
      medium: 'STANDARD PRIORITY: Include in regular sprint planning. Balance with other commitments.',
      low: 'DEFER: This task can be scheduled during lower-demand periods. Consider batching with similar tasks.',
    };

    const tradeOffs: string[] = [];

    // Analyze trade-offs based on input dimensions
    if (input.user_business_value >= 8) {
      tradeOffs.push('High business value justifies resource allocation even if implementation is complex');
    }
    if (input.time_criticality >= 8) {
      tradeOffs.push('Time-sensitive: Consider parallel tracks or MVP approach to meet deadline');
    }
    if (input.risk_reduction >= 8) {
      tradeOffs.push('Critical risk mitigation: Prioritize even if business value appears lower');
    }
    if (input.job_size >= 50) {
      tradeOffs.push('Large effort: Consider breaking into smaller deliverables for faster value delivery');
    }
    if (input.job_size <= 10 && input.user_business_value >= 5) {
      tradeOffs.push('Quick win opportunity: Small effort with good value - execute immediately');
    }

    // Generate contingency plan
    const contingencyPlan = this.generateContingencyPlan(input, priority);

    return {
      recommendation: recommendations[priority],
      tradeOffs,
      contingencyPlan,
    };
  }

  /**
   * Generate contingency plan for risk mitigation
   */
  private static generateContingencyPlan(input: WSJFInput, priority: string): string {
    const plans: string[] = [];

    if (priority === 'critical' || priority === 'high') {
      plans.push('1. Assign dedicated resources with backup personnel identified');
      plans.push('2. Establish daily progress checkpoints');
      plans.push('3. Prepare rollback procedures before execution');
      plans.push('4. Document current state for recovery scenarios');
    }

    if (input.risk_reduction >= 7) {
      plans.push('5. Implement monitoring before changes to establish baseline');
      plans.push('6. Create automated recovery scripts');
    }

    if (input.time_criticality >= 7 && input.deadline) {
      const deadline = new Date(input.deadline);
      plans.push(`7. Deadline: ${deadline.toISOString()} - Build in 20% buffer time`);
    }

    if (input.dependencies && input.dependencies.length > 0) {
      plans.push(`8. Dependencies: ${input.dependencies.join(', ')} - Verify completion before starting`);
    }

    return plans.length > 0 ? plans.join('\n') : 'Standard execution with regular monitoring';
  }

  /**
   * Compare multiple tasks and return sorted by priority
   */
  static prioritize(tasks: Array<{ id: string; name: string; wsjf: WSJFInput }>): Array<{
    id: string;
    name: string;
    result: WSJFResult;
    rank: number;
  }> {
    const results = tasks.map(task => ({
      id: task.id,
      name: task.name,
      result: this.calculate(task.wsjf),
      rank: 0,
    }));

    // Sort by score descending
    results.sort((a, b) => b.result.score - a.result.score);

    // Assign ranks
    results.forEach((r, index) => {
      r.rank = index + 1;
    });

    return results;
  }
}

// ============================================================================
// POST-DEPLOYMENT VALIDATION MODULE
// ============================================================================

/**
 * Deployment Validator for rigorous post-deployment checks
 */
export class DeploymentValidator {
  /**
   * Generate validation checks for a platform
   */
  static getValidationChecks(platform: string): DeploymentValidation {
    type ValidationCheck = DeploymentValidation['checks'][0];

    const baseChecks: ValidationCheck[] = [
      { name: 'SSH Connectivity', category: 'network', command: 'echo "SSH OK"', expected: 'SSH OK', critical: true },
      { name: 'DNS Resolution', category: 'network', command: 'nslookup google.com', expected: /Server:/, critical: true },
      { name: 'Disk Space', category: 'storage', command: 'df -h / | tail -1', expected: /[0-9]+%/, critical: true },
      { name: 'Memory', category: 'performance', command: 'free -h | grep Mem', expected: /Mem:/, critical: true },
      { name: 'Firewall Status', category: 'security', command: 'ufw status || firewall-cmd --state', expected: /active|running/, critical: false },
    ];

    const platformChecks: Record<string, ValidationCheck[]> = {
      starlingx: [
        { name: 'Containerd Status', category: 'service', command: 'systemctl is-active containerd', expected: 'active', critical: true },
        { name: 'CPU Isolation', category: 'performance', command: 'cat /proc/cmdline | grep isolcpus', expected: /isolcpus=/, critical: false },
        { name: 'Huge Pages', category: 'performance', command: 'grep HugePages_Total /proc/meminfo', expected: /HugePages_Total:\s+[1-9]/, critical: false },
        { name: 'IOMMU Status', category: 'performance', command: 'dmesg | grep -i iommu', expected: /IOMMU/, critical: false },
      ],
      openstack: [
        { name: 'MariaDB Status', category: 'service', command: 'systemctl is-active mariadb', expected: 'active', critical: true },
        { name: 'RabbitMQ Status', category: 'service', command: 'systemctl is-active rabbitmq-server', expected: 'active', critical: true },
        { name: 'IP Forward', category: 'network', command: 'sysctl net.ipv4.ip_forward', expected: /= 1/, critical: true },
        { name: 'Bridge NF Call', category: 'network', command: 'sysctl net.bridge.bridge-nf-call-iptables', expected: /= 1/, critical: true },
      ],
      kubernetes: [
        { name: 'Kubelet Status', category: 'service', command: 'systemctl is-active kubelet', expected: 'active', critical: true },
        { name: 'Containerd Status', category: 'service', command: 'systemctl is-active containerd', expected: 'active', critical: true },
        { name: 'etcd Health', category: 'service', command: 'etcdctl endpoint health 2>/dev/null || echo "N/A"', expected: /healthy|N\/A/, critical: false },
        { name: 'CNI Config', category: 'network', command: 'ls /etc/cni/net.d/ 2>/dev/null | head -1 || echo "none"', expected: /.+/, critical: false },
      ],
      hostbill: [
        { name: 'MySQL Status', category: 'service', command: 'systemctl is-active mysql || systemctl is-active mariadb', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server || systemctl is-active redis', expected: 'active', critical: false },
      ],
      web: [
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'HTTP Response', category: 'network', command: 'curl -s -o /dev/null -w "%{http_code}" http://localhost', expected: /[23][0-9][0-9]/, critical: false },
      ],
      django: [
        { name: 'PostgreSQL Status', category: 'service', command: 'systemctl is-active postgresql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'Gunicorn Status', category: 'service', command: 'pgrep -f gunicorn', expected: /[0-9]+/, critical: true },
        { name: 'Celery Status', category: 'service', command: 'pgrep -f celery', expected: /[0-9]+/, critical: false },
        { name: 'Media noexec', category: 'security', command: 'mount | grep /srv/media', expected: /noexec/, critical: false },
      ],
      rails: [
        { name: 'PostgreSQL Status', category: 'service', command: 'systemctl is-active postgresql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'Puma Status', category: 'service', command: 'pgrep -f puma', expected: /[0-9]+/, critical: true },
        { name: 'Sidekiq Status', category: 'service', command: 'pgrep -f sidekiq', expected: /[0-9]+/, critical: false },
        { name: 'Assets Compiled', category: 'storage', command: 'ls /opt/rails/public/assets/*.js 2>/dev/null | head -1', expected: /.+/, critical: false },
      ],
      nextjs: [
        { name: 'PostgreSQL Status', category: 'service', command: 'systemctl is-active postgresql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PM2 Status', category: 'service', command: 'pm2 status | grep online', expected: /online/, critical: true },
        { name: 'Node Process', category: 'service', command: 'pgrep -f node', expected: /[0-9]+/, critical: true },
        { name: 'Static Build', category: 'storage', command: 'ls /opt/nextjs/.next/static 2>/dev/null | head -1', expected: /.+/, critical: false },
      ],
      laravel: [
        { name: 'MySQL Status', category: 'service', command: 'systemctl is-active mysql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Queue Worker', category: 'service', command: 'pgrep -f "artisan queue:work"', expected: /[0-9]+/, critical: false },
        { name: 'Storage noexec', category: 'security', command: 'mount | grep /var/www/laravel/storage', expected: /noexec/, critical: false },
      ],
      docker_swarm_manager: [
        { name: 'Docker Status', category: 'service', command: 'systemctl is-active docker', expected: 'active', critical: true },
        { name: 'Swarm Active', category: 'service', command: 'docker info --format "{{.Swarm.LocalNodeState}}"', expected: 'active', critical: true },
        { name: 'Manager Role', category: 'service', command: 'docker info --format "{{.Swarm.ControlAvailable}}"', expected: 'true', critical: true },
        { name: 'Raft Logs', category: 'storage', command: 'ls /var/lib/docker/swarm/raft 2>/dev/null | head -1', expected: /.+/, critical: true },
        { name: 'IP Forward', category: 'network', command: 'sysctl net.ipv4.ip_forward', expected: /= 1/, critical: true },
      ],
      docker_swarm_worker: [
        { name: 'Docker Status', category: 'service', command: 'systemctl is-active docker', expected: 'active', critical: true },
        { name: 'Swarm Active', category: 'service', command: 'docker info --format "{{.Swarm.LocalNodeState}}"', expected: 'active', critical: true },
        { name: 'Worker Role', category: 'service', command: 'docker info --format "{{.Swarm.ControlAvailable}}"', expected: 'false', critical: true },
        { name: 'Overlay Network', category: 'network', command: 'docker network ls --filter driver=overlay | wc -l', expected: /[1-9]/, critical: false },
        { name: 'IP Forward', category: 'network', command: 'sysctl net.ipv4.ip_forward', expected: /= 1/, critical: true },
      ],
      symfony: [
        { name: 'MySQL Status', category: 'service', command: 'systemctl is-active mysql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Symfony CLI', category: 'service', command: 'symfony version 2>/dev/null || echo "not installed"', expected: /Symfony/, critical: false },
        { name: 'Messenger Worker', category: 'service', command: 'pgrep -f "messenger:consume"', expected: /[0-9]+/, critical: false },
        { name: 'Cache Directory', category: 'storage', command: 'ls /var/cache/symfony 2>/dev/null | head -1', expected: /.+/, critical: false },
      ],
      stx_production: [
        { name: 'Containerd Status', category: 'service', command: 'systemctl is-active containerd', expected: 'active', critical: true },
        { name: 'CPU Isolation', category: 'performance', command: 'cat /proc/cmdline | grep isolcpus', expected: /isolcpus=/, critical: false },
        { name: 'Huge Pages', category: 'performance', command: 'grep HugePages_Total /proc/meminfo', expected: /HugePages_Total:\s+[1-9]/, critical: false },
        { name: 'IOMMU Status', category: 'performance', command: 'dmesg | grep -i iommu', expected: /IOMMU/, critical: false },
        { name: 'Platform Directory', category: 'storage', command: 'ls /opt/platform 2>/dev/null | head -1', expected: /.+/, critical: true },
        { name: 'Docker Storage', category: 'storage', command: 'df -h /var/lib/docker | tail -1', expected: /[0-9]+%/, critical: true },
        { name: 'Nova Storage', category: 'storage', command: 'df -h /var/lib/nova | tail -1', expected: /[0-9]+%/, critical: false },
      ],
      hostbill_production: [
        { name: 'MySQL Status', category: 'service', command: 'systemctl is-active mysql || systemctl is-active mariadb', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server || systemctl is-active redis', expected: 'active', critical: false },
        { name: 'Hostbill Directory', category: 'storage', command: 'ls /var/www/hostbill 2>/dev/null | head -1', expected: /.+/, critical: true },
        { name: 'Backup Mount', category: 'storage', command: 'mount | grep /backup', expected: /backup/, critical: true },
        { name: 'MySQL Connections', category: 'performance', command: 'mysqladmin status 2>/dev/null | grep -o "Threads: [0-9]*"', expected: /Threads:/, critical: false },
      ],
      wordpress_production: [
        { name: 'MySQL/MariaDB Status', category: 'service', command: 'systemctl is-active mysql || systemctl is-active mariadb', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Redis Object Cache', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: false },
        { name: 'WordPress Directory', category: 'storage', command: 'ls /var/www/wordpress/wp-config.php 2>/dev/null', expected: /wp-config/, critical: true },
        { name: 'Uploads Directory', category: 'storage', command: 'df -h /var/www/wordpress/wp-content/uploads | tail -1', expected: /[0-9]+%/, critical: true },
        { name: 'WP-CLI', category: 'tool', command: 'wp --version 2>/dev/null', expected: /WP-CLI/, critical: false },
        { name: 'Nginx Cache', category: 'performance', command: 'ls /var/cache/nginx 2>/dev/null | wc -l', expected: /[0-9]+/, critical: false },
        { name: 'Backup Mount', category: 'storage', command: 'mount | grep /backup', expected: /backup/, critical: true },
      ],
      flarum_production: [
        { name: 'MySQL/MariaDB Status', category: 'service', command: 'systemctl is-active mysql || systemctl is-active mariadb', expected: 'active', critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'PHP-FPM Status', category: 'service', command: 'systemctl is-active php*-fpm', expected: 'active', critical: true },
        { name: 'Redis Sessions', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: false },
        { name: 'Flarum Directory', category: 'storage', command: 'ls /var/www/flarum/flarum 2>/dev/null', expected: /flarum/, critical: true },
        { name: 'Assets Directory', category: 'storage', command: 'ls /var/www/flarum/public/assets 2>/dev/null | head -1', expected: /.+/, critical: true },
        { name: 'Storage Writable', category: 'storage', command: 'test -w /var/www/flarum/storage && echo writable', expected: 'writable', critical: true },
        { name: 'Composer', category: 'tool', command: 'composer --version 2>/dev/null', expected: /Composer/, critical: false },
        { name: 'Node.js', category: 'tool', command: 'node --version 2>/dev/null', expected: /v[0-9]+/, critical: false },
        { name: 'Backup Mount', category: 'storage', command: 'mount | grep /backup', expected: /backup/, critical: true },
      ],
      affiliate_production: [
        { name: 'PostgreSQL Status', category: 'service', command: 'systemctl is-active postgresql', expected: 'active', critical: true },
        { name: 'Redis Status', category: 'service', command: 'systemctl is-active redis-server', expected: 'active', critical: true },
        { name: 'Kafka Status', category: 'service', command: 'systemctl is-active kafka || /opt/kafka*/bin/kafka-server-start.sh --version 2>/dev/null', expected: /active|Kafka/, critical: true },
        { name: 'Nginx Status', category: 'service', command: 'systemctl is-active nginx', expected: 'active', critical: true },
        { name: 'Affiliate Directory', category: 'storage', command: 'ls /opt/affiliate 2>/dev/null | head -1', expected: /.+/, critical: true },
        { name: 'Analytics Directory', category: 'storage', command: 'ls /opt/affiliate/analytics 2>/dev/null', expected: /analytics/, critical: true },
        { name: 'PostgreSQL Connections', category: 'performance', command: 'sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity" 2>/dev/null', expected: /[0-9]+/, critical: false },
        { name: 'Kafka Topics', category: 'service', command: '/opt/kafka*/bin/kafka-topics.sh --list --bootstrap-server localhost:9092 2>/dev/null | wc -l', expected: /[0-9]+/, critical: false },
        { name: 'Redis Memory', category: 'performance', command: 'redis-cli info memory | grep used_memory_human', expected: /used_memory/, critical: false },
        { name: 'Backup Mount', category: 'storage', command: 'mount | grep /backup', expected: /backup/, critical: true },
      ],
    };

    const rollbackCommands = [
      'echo "=== ROLLBACK INITIATED ==="',
      'systemctl stop all-services || true',
      'mount -o remount,ro /',
      'echo "Contact support: IPMI access may be required for full rollback"',
    ];

    return {
      checks: [...baseChecks, ...(platformChecks[platform] || [])],
      rollback_commands: rollbackCommands,
    };
  }

  /**
   * Generate validation script for a platform
   */
  static generateValidationScript(platform: string): string {
    const validation = this.getValidationChecks(platform);

    const checkScripts = validation.checks.map((check, index) => `
# Check ${index + 1}: ${check.name} (${check.category})
echo -n "Checking ${check.name}... "
result=$(${check.command} 2>&1)
if echo "$result" | grep -qE '${check.expected instanceof RegExp ? check.expected.source : check.expected}'; then
    echo "✓ PASS"
else
    echo "✗ FAIL${check.critical ? ' (CRITICAL)' : ''}"
    ${check.critical ? 'CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))' : 'WARNINGS=$((WARNINGS + 1))'}
fi
`).join('\n');

    return `#!/bin/bash
# Post-Deployment Validation Script
# Platform: ${platform}
# Generated: $(date -Iseconds)

set -e

CRITICAL_FAILURES=0
WARNINGS=0

echo "=========================================="
echo "  Post-Deployment Validation: ${platform}"
echo "=========================================="
echo ""

${checkScripts}

echo ""
echo "=========================================="
echo "  Validation Summary"
echo "=========================================="
echo "Critical Failures: $CRITICAL_FAILURES"
echo "Warnings: $WARNINGS"

if [ $CRITICAL_FAILURES -gt 0 ]; then
    echo ""
    echo "❌ VALIDATION FAILED - Critical issues detected"
    exit 1
else
    echo ""
    echo "✓ VALIDATION PASSED"
    exit 0
fi
`;
  }
}

// ============================================================================
// FILESYSTEM RECOMMENDATIONS
// ============================================================================

/**
 * Filesystem recommendations based on use case
 */
export const FILESYSTEM_RECOMMENDATIONS = {
  /**
   * XFS: Best for large files, databases, and high I/O workloads
   */
  xfs: {
    recommended_for: ['databases', 'large_files', 'media_storage', 'ceph', 'nova', 'cinder'],
    mount_options: 'noatime,nodiratime,nobarrier,inode64',
    description: 'XFS excels at parallel I/O and handles large files efficiently. Recommended for databases and storage systems.',
    swap_sizing: 'N/A - XFS does not support swap',
  },

  /**
   * ext4: General purpose, reliable, and widely supported
   */
  ext4: {
    recommended_for: ['root', 'var', 'home', 'boot', 'general_purpose'],
    mount_options: 'errors=remount-ro,noatime,nodiratime',
    description: 'ext4 is stable, well-tested, and suitable for most system partitions. Good balance of performance and reliability.',
    swap_sizing: 'N/A - ext4 does not support swap',
  },

  /**
   * btrfs: Copy-on-write, snapshots, and compression
   */
  btrfs: {
    recommended_for: ['containers', 'snapshots', 'backup_storage'],
    mount_options: 'compress=zstd,noatime',
    description: 'btrfs provides advanced features like snapshots and compression. Good for container storage.',
    swap_sizing: 'N/A - btrfs does not support swap',
  },

  /**
   * Swap sizing guidelines
   */
  swap: {
    guidelines: {
      'less_than_2GB_RAM': 'Swap = 2x RAM',
      '2GB_to_8GB_RAM': 'Swap = RAM size',
      '8GB_to_64GB_RAM': 'Swap = 0.5x RAM (minimum 8GB)',
      'more_than_64GB_RAM': 'Swap = 16-32GB (fixed)',
      'kubernetes_nodes': 'Swap = 8-16GB or disable entirely',
      'database_servers': 'Swap = 1.5x RAM for memory-intensive operations',
      'edge_cloud': 'Swap = 2x RAM for edge workload flexibility',
    },
    description: 'Swap sizing depends on workload. Kubernetes often disables swap, while databases benefit from larger swap.',
  },
};

/**
 * Secure mount options by partition type
 */
export const SECURE_MOUNT_OPTIONS = {
  '/': 'errors=remount-ro,noatime',
  '/boot': 'noatime,nodev,nosuid',
  '/boot/efi': 'umask=0077,shortname=winnt',
  '/home': 'noatime,nodev,nosuid',
  '/opt': 'noatime,nodev',
  '/tmp': 'noatime,nodev,nosuid,noexec',
  '/var': 'noatime,nodev,nosuid',
  '/var/log': 'noatime,nodev,nosuid,noexec',
  '/var/lib/mysql': 'noatime,nodev,nobarrier',
  '/var/lib/docker': 'noatime,nodev',
  '/var/lib/containerd': 'noatime,nodev',
  '/var/lib/nova': 'noatime,nodev',
  '/var/lib/ceph': 'noatime,nodev,inode64',
  '/mnt/data': 'noatime,nodev',
  '/data': 'noatime,nodev',
};

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
    user_business_value: number;
    time_criticality: number;
    risk_reduction: number;
    job_size: number;
    cost_of_delay?: number;
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
export declare const PARTITION_STRATEGIES: Record<string, HiveVelocityPartitionScheme>;
/**
 * HiveVelocity Device Manager Class
 */
export declare class HiveVelocityDeviceManager {
    private apiKey;
    private baseUrl;
    private deviceId;
    constructor(apiKey: string, deviceId: number, baseUrl?: string);
    /**
     * Reload device with specified OS and partition scheme
     */
    reloadDevice(request: DeviceReloadRequest): Promise<any>;
    /**
     * Update bare metal device configuration
     */
    updateDevice(request: DeviceUpdateRequest): Promise<any>;
    /**
     * Get device status
     */
    getDeviceStatus(): Promise<any>;
    /**
     * Reload device using a pre-defined strategy
     */
    reloadWithStrategy(os: string, strategyName: keyof typeof PARTITION_STRATEGIES, customOptions?: Partial<DeviceReloadRequest>): Promise<any>;
    /**
     * Validate partition scheme
     */
    static validatePartitionScheme(scheme: HiveVelocityPartitionScheme): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get recommended strategy based on use case
     */
    static getRecommendedStrategy(useCase: string): keyof typeof PARTITION_STRATEGIES;
    /**
     * Generate partition summary
     */
    static generatePartitionSummary(scheme: HiveVelocityPartitionScheme): string;
}
/**
 * Utility function to create device manager from environment variables
 */
export declare function createDeviceManagerFromEnv(deviceId: number): HiveVelocityDeviceManager;
/**
 * IPMI Manager for remote device access and power control
 * Provides BMC access, serial-over-LAN, and boot device configuration
 */
export declare class IPMIManager {
    private config;
    constructor(config: IPMIConfig);
    /**
     * Generate IPMI command string
     */
    private buildCommand;
    /**
     * Execute IPMI command (returns command for execution)
     */
    getCommand(cmd: IPMICommand): string;
    /**
     * Generate SOL (Serial Over LAN) connection command
     */
    getSOLCommand(): string;
    /**
     * Generate sensor data command
     */
    getSensorCommand(): string;
    /**
     * Generate SEL (System Event Log) command
     */
    getSELCommand(): string;
    /**
     * Generate BMC info command
     */
    getBMCInfoCommand(): string;
    /**
     * Create IPMI configuration from environment variables
     */
    static fromEnv(): IPMIManager;
}
/**
 * Port Manager for SSH and service port configuration via Hivelocity API
 */
export declare class PortManager {
    private apiKey;
    private baseUrl;
    private deviceId;
    constructor(apiKey: string, deviceId: number, baseUrl?: string);
    /**
     * Configure SSH port via API (sets custom SSH port in device config)
     */
    configureSSHPort(port: number): Promise<any>;
    /**
     * Generate post-install script for SSH port hardening
     */
    generateSSHHardeningScript(config: PortConfiguration): string;
    /**
     * Generate firewall rules script
     */
    generateFirewallScript(config: PortConfiguration): string;
}
/**
 * WSJF Calculator for infrastructure task prioritization
 * Implements Weighted Shortest Job First prioritization framework
 */
export declare class WSJFCalculator {
    /**
     * Calculate WSJF score for a task
     *
     * Formula: WSJF = Cost of Delay / Job Size
     * Cost of Delay = User Business Value + Time Criticality + Risk Reduction
     */
    static calculate(input: WSJFInput): WSJFResult;
    /**
     * Generate guidance based on WSJF analysis
     */
    private static generateGuidance;
    /**
     * Generate contingency plan for risk mitigation
     */
    private static generateContingencyPlan;
    /**
     * Compare multiple tasks and return sorted by priority
     */
    static prioritize(tasks: Array<{
        id: string;
        name: string;
        wsjf: WSJFInput;
    }>): Array<{
        id: string;
        name: string;
        result: WSJFResult;
        rank: number;
    }>;
}
/**
 * Deployment Validator for rigorous post-deployment checks
 */
export declare class DeploymentValidator {
    /**
     * Generate validation checks for a platform
     */
    static getValidationChecks(platform: string): DeploymentValidation;
    /**
     * Generate validation script for a platform
     */
    static generateValidationScript(platform: string): string;
}
/**
 * Filesystem recommendations based on use case
 */
export declare const FILESYSTEM_RECOMMENDATIONS: {
    /**
     * XFS: Best for large files, databases, and high I/O workloads
     */
    xfs: {
        recommended_for: string[];
        mount_options: string;
        description: string;
        swap_sizing: string;
    };
    /**
     * ext4: General purpose, reliable, and widely supported
     */
    ext4: {
        recommended_for: string[];
        mount_options: string;
        description: string;
        swap_sizing: string;
    };
    /**
     * btrfs: Copy-on-write, snapshots, and compression
     */
    btrfs: {
        recommended_for: string[];
        mount_options: string;
        description: string;
        swap_sizing: string;
    };
    /**
     * Swap sizing guidelines
     */
    swap: {
        guidelines: {
            less_than_2GB_RAM: string;
            '2GB_to_8GB_RAM': string;
            '8GB_to_64GB_RAM': string;
            more_than_64GB_RAM: string;
            kubernetes_nodes: string;
            database_servers: string;
            edge_cloud: string;
        };
        description: string;
    };
};
/**
 * Secure mount options by partition type
 */
export declare const SECURE_MOUNT_OPTIONS: {
    '/': string;
    '/boot': string;
    '/boot/efi': string;
    '/home': string;
    '/opt': string;
    '/tmp': string;
    '/var': string;
    '/var/log': string;
    '/var/lib/mysql': string;
    '/var/lib/docker': string;
    '/var/lib/containerd': string;
    '/var/lib/nova': string;
    '/var/lib/ceph': string;
    '/mnt/data': string;
    '/data': string;
};
//# sourceMappingURL=hivelocity-device-manager.d.ts.map
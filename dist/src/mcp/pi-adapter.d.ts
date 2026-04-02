/**
 * @business-context WSJF-95: PI MCP Adapter - Critical infrastructure for Raspberry Pi integration
 * @adr ADR-006: Dependency injection for testability without bypass logic
 * @constraint DDD-PI-ADAPTER: Bounded context for hardware abstraction layer
 * @planned-change R-2026-021: Extend with STX ipmitool baseline integration
 */
interface PiSystemInfo {
    model: string;
    serial: string;
    temperature: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
}
interface SensorReading {
    timestamp: number;
    sensor_id: string;
    value: number;
    unit: string;
    status: 'ok' | 'warning' | 'critical';
}
declare class PiHardwareInterface {
    private readonly configPath;
    constructor(configPath?: string);
    /**
     * Guard clause: Validates system is actually a Raspberry Pi
     * @throws Error if not running on Raspberry Pi hardware
     */
    private validatePiEnvironment;
    /**
     * Early exit pattern: Return immediately if critical thresholds exceeded
     */
    private checkCriticalThresholds;
    /**
     * Dependency injection point for sensor readings
     * Allows test doubles without mocking OS calls directly
     */
    getSystemInfo(): PiSystemInfo;
    private extractModel;
    private extractSerial;
    private getCpuUsage;
    private calculateMemoryUsage;
    private parseMemValue;
    private getDiskUsage;
    /**
     * Strategy pattern: Different sensor types can be added without modifying core logic
     */
    readSensor(sensorId: string): SensorReading;
    private determineStatus;
    private getSensorUnit;
    /**
     * Feature slice: GPIO operations grouped together
     */
    controlGPIO(pin: number, state: 'high' | 'low' | 'input'): Promise<void>;
    /**
     * Rules Design Pattern: Each validation rule encapsulated
     */
    validateSystemHealth(): {
        status: 'healthy' | 'warning' | 'critical';
        issues: string[];
    };
}
export type { PiSystemInfo, SensorReading };
export { PiHardwareInterface };
//# sourceMappingURL=pi-adapter.d.ts.map
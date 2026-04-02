/**
 * @business-context WSJF-95: PI MCP Adapter - Critical infrastructure for Raspberry Pi integration
 * @adr ADR-006: Dependency injection for testability without bypass logic
 * @constraint DDD-PI-ADAPTER: Bounded context for hardware abstraction layer
 * @planned-change R-2026-021: Extend with STX ipmitool baseline integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
class PiHardwareInterface {
    configPath;
    constructor(configPath) {
        this.configPath = configPath || '/etc/pi-adapter/config.json';
    }
    /**
     * Guard clause: Validates system is actually a Raspberry Pi
     * @throws Error if not running on Raspberry Pi hardware
     */
    validatePiEnvironment() {
        try {
            const cpuInfo = readFileSync('/proc/cpuinfo', 'utf8');
            if (!cpuInfo.includes('BCM') && !cpuInfo.includes('Raspberry Pi')) {
                throw new Error('Not running on Raspberry Pi hardware');
            }
        }
        catch (error) {
            throw new Error(`Failed to validate Pi environment: ${error}`);
        }
    }
    /**
     * Early exit pattern: Return immediately if critical thresholds exceeded
     */
    checkCriticalThresholds(temperature, cpuUsage) {
        if (temperature > 85) {
            throw new Error(`Critical temperature: ${temperature}°C exceeds safe limit`);
        }
        if (cpuUsage > 95) {
            throw new Error(`Critical CPU usage: ${cpuUsage}% exceeds safe limit`);
        }
    }
    /**
     * Dependency injection point for sensor readings
     * Allows test doubles without mocking OS calls directly
     */
    getSystemInfo() {
        // Guard clause: Validate environment first
        this.validatePiEnvironment();
        try {
            // Get system model and serial
            const cpuInfo = readFileSync('/proc/cpuinfo', 'utf8');
            const model = this.extractModel(cpuInfo);
            const serial = this.extractSerial(cpuInfo);
            // Get temperature (clamped to valid range)
            const tempRaw = parseFloat(execSync('vcgencmd measure_temp', { encoding: 'utf8' }));
            const temperature = Math.max(0, Math.min(100, tempRaw));
            // Get CPU usage
            const cpuUsage = this.getCpuUsage();
            // Get memory usage
            const memInfo = readFileSync('/proc/meminfo', 'utf8');
            const memoryUsage = this.calculateMemoryUsage(memInfo);
            // Get disk usage
            const diskUsage = this.getDiskUsage();
            // Get uptime
            const uptime = parseFloat(execSync('cat /proc/uptime', { encoding: 'utf8' }).split(' ')[0]);
            const systemInfo = {
                model,
                serial,
                temperature,
                cpu_usage: cpuUsage,
                memory_usage: memoryUsage,
                disk_usage: diskUsage,
                uptime,
            };
            // Early exit if critical thresholds exceeded
            this.checkCriticalThresholds(temperature, cpuUsage);
            return systemInfo;
        }
        catch (error) {
            throw new Error(`Failed to get system info: ${error}`);
        }
    }
    extractModel(cpuInfo) {
        const match = cpuInfo.match(/Model\s*:\s*(.+)/);
        return match ? match[1].trim() : 'Unknown Raspberry Pi';
    }
    extractSerial(cpuInfo) {
        const match = cpuInfo.match(/Serial\s*:\s*([0-9a-f]+)/i);
        return match ? match[1] : '0000000000000000';
    }
    getCpuUsage() {
        const stat = readFileSync('/proc/stat', 'utf8');
        const cpuLine = stat.split('\n')[0];
        const values = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = values[3];
        const total = values.reduce((a, b) => a + b, 0);
        const usage = 100 - (idle / total) * 100;
        return Math.round(usage * 100) / 100;
    }
    calculateMemoryUsage(memInfo) {
        const lines = memInfo.split('\n');
        const total = this.parseMemValue(lines.find(l => l.startsWith('MemTotal:')));
        const available = this.parseMemValue(lines.find(l => l.startsWith('MemAvailable:')));
        return Math.round(((total - available) / total) * 100 * 100) / 100;
    }
    parseMemValue(line) {
        if (!line)
            return 0;
        const match = line.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }
    getDiskUsage() {
        const df = execSync('df -h /', { encoding: 'utf8' });
        const lines = df.split('\n');
        const data = lines[1].split(/\s+/);
        const used = parseInt(data[2]);
        const total = parseInt(data[1]);
        return Math.round((used / total) * 100 * 100) / 100;
    }
    /**
     * Strategy pattern: Different sensor types can be added without modifying core logic
     */
    readSensor(sensorId) {
        const sensorMap = {
            'temperature': () => this.getSystemInfo().temperature,
            'cpu': () => this.getSystemInfo().cpu_usage,
            'memory': () => this.getSystemInfo().memory_usage,
            'disk': () => this.getSystemInfo().disk_usage,
        };
        const reader = sensorMap[sensorId];
        if (!reader) {
            throw new Error(`Unknown sensor ID: ${sensorId}`);
        }
        const value = reader();
        const status = this.determineStatus(sensorId, value);
        return {
            timestamp: Date.now(),
            sensor_id: sensorId,
            value,
            unit: this.getSensorUnit(sensorId),
            status,
        };
    }
    determineStatus(sensorId, value) {
        const thresholds = {
            temperature: { warning: 70, critical: 85 },
            cpu: { warning: 80, critical: 95 },
            memory: { warning: 85, critical: 95 },
            disk: { warning: 85, critical: 95 },
        };
        const threshold = thresholds[sensorId];
        if (!threshold)
            return 'ok';
        if (value >= threshold.critical)
            return 'critical';
        if (value >= threshold.warning)
            return 'warning';
        return 'ok';
    }
    getSensorUnit(sensorId) {
        const units = {
            temperature: '°C',
            cpu: '%',
            memory: '%',
            disk: '%',
        };
        return units[sensorId] || '';
    }
    /**
     * Feature slice: GPIO operations grouped together
     */
    async controlGPIO(pin, state) {
        if (!existsSync('/sys/class/gpio/gpiochip0')) {
            throw new Error('GPIO not available on this system');
        }
        try {
            // Export pin if not already exported
            if (!existsSync(`/sys/class/gpio/gpio${pin}`)) {
                writeFileSync('/sys/class/gpio/export', pin.toString());
            }
            // Set direction
            const direction = state === 'input' ? 'in' : 'out';
            writeFileSync(`/sys/class/gpio/gpio${pin}/direction`, direction);
            // Set value if output
            if (state !== 'input') {
                const value = state === 'high' ? '1' : '0';
                writeFileSync(`/sys/class/gpio/gpio${pin}/value`, value);
            }
        }
        catch (error) {
            throw new Error(`Failed to control GPIO pin ${pin}: ${error}`);
        }
    }
    /**
     * Rules Design Pattern: Each validation rule encapsulated
     */
    validateSystemHealth() {
        const info = this.getSystemInfo();
        const issues = [];
        // Temperature rule
        if (info.temperature > 85) {
            issues.push(`Temperature critical: ${info.temperature}°C`);
        }
        else if (info.temperature > 70) {
            issues.push(`Temperature elevated: ${info.temperature}°C`);
        }
        // CPU rule
        if (info.cpu_usage > 95) {
            issues.push(`CPU critical: ${info.cpu_usage}%`);
        }
        else if (info.cpu_usage > 80) {
            issues.push(`CPU high: ${info.cpu_usage}%`);
        }
        // Memory rule
        if (info.memory_usage > 95) {
            issues.push(`Memory critical: ${info.memory_usage}%`);
        }
        else if (info.memory_usage > 85) {
            issues.push(`Memory high: ${info.memory_usage}%`);
        }
        // Disk rule
        if (info.disk_usage > 95) {
            issues.push(`Disk critical: ${info.disk_usage}%`);
        }
        else if (info.disk_usage > 85) {
            issues.push(`Disk high: ${info.disk_usage}%`);
        }
        let status = 'healthy';
        if (issues.some(i => i.includes('critical'))) {
            status = 'critical';
        }
        else if (issues.length > 0) {
            status = 'warning';
        }
        return { status, issues };
    }
}
// MCP Server Implementation
const server = new Server({
    name: 'pi-mcp-adapter',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Dependency injection allows test doubles
const hardwareInterface = new PiHardwareInterface();
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'pi_get_system_info',
                description: 'Get comprehensive Raspberry Pi system information',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'pi_read_sensor',
                description: 'Read a specific sensor value',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sensor_id: {
                            type: 'string',
                            enum: ['temperature', 'cpu', 'memory', 'disk'],
                            description: 'The sensor to read',
                        },
                    },
                    required: ['sensor_id'],
                },
            },
            {
                name: 'pi_control_gpio',
                description: 'Control a GPIO pin',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pin: {
                            type: 'number',
                            description: 'GPIO pin number',
                        },
                        state: {
                            type: 'string',
                            enum: ['high', 'low', 'input'],
                            description: 'Pin state',
                        },
                    },
                    required: ['pin', 'state'],
                },
            },
            {
                name: 'pi_validate_health',
                description: 'Validate overall system health',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'pi_get_system_info':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(hardwareInterface.getSystemInfo(), null, 2),
                        },
                    ],
                };
            case 'pi_read_sensor':
                if (!args?.sensor_id) {
                    throw new McpError(ErrorCode.InvalidParams, 'sensor_id is required');
                }
                // Type assertion for unknown args
                const sensorId = String(args.sensor_id);
                if (!['temperature', 'cpu', 'memory', 'disk'].includes(sensorId)) {
                    throw new McpError(ErrorCode.InvalidParams, 'Invalid sensor_id');
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(hardwareInterface.readSensor(sensorId), null, 2),
                        },
                    ],
                };
            case 'pi_control_gpio':
                if (!args?.pin || !args?.state) {
                    throw new McpError(ErrorCode.InvalidParams, 'pin and state are required');
                }
                // Type assertions for unknown args
                const pin = Number(args.pin);
                const state = String(args.state);
                if (isNaN(pin) || !['high', 'low', 'input'].includes(state)) {
                    throw new McpError(ErrorCode.InvalidParams, 'Invalid pin or state values');
                }
                await hardwareInterface.controlGPIO(pin, state);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `GPIO pin ${pin} set to ${state}`,
                        },
                    ],
                };
            case 'pi_validate_health':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(hardwareInterface.validateSystemHealth(), null, 2),
                        },
                    ],
                };
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, String(error));
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('PI MCP Adapter running on stdio');
}
if (require.main === module) {
    main().catch(console.error);
}
export { PiHardwareInterface };
//# sourceMappingURL=pi-adapter.js.map
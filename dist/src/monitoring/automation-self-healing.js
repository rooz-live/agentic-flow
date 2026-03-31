export class AutomationSelfHealing {
    config;
    eventBus;
    metrics;
    logger;
    securityMonitor;
    activeHealing = new Map();
    healthCheckResults = new Map();
    automationTimers = new Map();
    constructor(config, eventBus, metrics, logger, securityMonitor) {
        this.config = {
            enableAutomation: true,
            enableSelfHealing: true,
            healthChecks: [],
            automationRules: [],
            maintenanceWindows: {
                startHour: 22,
                endHour: 6,
                daysOfWeek: [0, 6] // Weekend
            },
            escalationPolicies: {
                critical: {
                    notifyChannels: ['email', 'slack', 'discord'],
                    autoRemediation: true,
                    escalationDelay: 5
                },
                warning: {
                    notifyChannels: ['email', 'slack'],
                    autoRemediation: false,
                    escalationDelay: 15
                }
            },
            ...config
        };
        this.eventBus = eventBus;
        this.metrics = metrics;
        this.logger = logger;
        this.securityMonitor = securityMonitor;
        this.initializeAutomation();
    }
    initializeAutomation() {
        // Start health checks
        this.startHealthChecks();
        // Start automation monitoring
        this.startAutomationMonitoring();
        // Listen for events
        this.setupEventListeners();
        // Start periodic checks
        setInterval(() => {
            this.performPeriodicChecks();
        }, 60000); // Every minute
        console.log('Automation and self-healing initialized');
    }
    setupEventListeners() {
        // Listen for security events
        this.eventBus.on('security:event', (event) => {
            this.handleSecurityEvent(event);
        });
        // Listen for metric alerts
        this.eventBus.on('metric:alert', (alert) => {
            this.handleMetricAlert(alert);
        });
        // Listen for service failures
        this.eventBus.on('service:failure', (failure) => {
            this.handleServiceFailure(failure);
        });
        // Listen for system events
        this.eventBus.on('system:event', (event) => {
            this.handleSystemEvent(event);
        });
    }
    startHealthChecks() {
        for (const healthCheck of this.config.healthChecks) {
            setInterval(() => {
                this.performHealthCheck(healthCheck);
            }, healthCheck.interval * 1000);
        }
    }
    async performHealthCheck(healthCheck) {
        const startTime = Date.now();
        try {
            const response = await fetch(healthCheck.endpoint, {
                method: healthCheck.method,
                headers: {
                    'User-Agent': 'Agentic-Flow-Health-Check/1.0'
                }
            });
            const duration = Date.now() - startTime;
            const isHealthy = response.status === healthCheck.expectedStatus;
            // Store result
            this.healthCheckResults.set(healthCheck.id, {
                status: isHealthy ? 'healthy' : 'unhealthy',
                statusCode: response.status,
                duration,
                timestamp: new Date().toISOString(),
                error: isHealthy ? null : `Expected ${healthCheck.expectedStatus}, got ${response.status}`
            });
            // Record metrics
            this.metrics.gauge('health_check_status', isHealthy ? 1 : 0, {
                check_name: healthCheck.name,
                endpoint: healthCheck.endpoint
            });
            this.metrics.observe('health_check_duration_ms', duration, {
                check_name: healthCheck.name
            });
            // Log health check
            this.logger.logHealthCheck(healthCheck.name, isHealthy ? 'pass' : 'fail', duration, isHealthy ? null : `Status code: ${response.status}`);
            // Trigger automation if unhealthy
            if (!isHealthy) {
                this.triggerHealthCheckAutomation(healthCheck);
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.healthCheckResults.set(healthCheck.id, {
                status: 'error',
                duration,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            this.metrics.gauge('health_check_status', 0, {
                check_name: healthCheck.name,
                endpoint: healthCheck.endpoint
            });
            this.logger.logHealthCheck(healthCheck.name, 'fail', duration, error instanceof Error ? error.message : 'Unknown error');
            this.triggerHealthCheckAutomation(healthCheck);
        }
    }
    triggerHealthCheckAutomation(healthCheck) {
        if (!this.config.enableSelfHealing) {
            return;
        }
        // Check if already healing
        if (this.activeHealing.has(healthCheck.id)) {
            return;
        }
        // Find automation rules for this health check
        const relevantRules = this.config.automationRules.filter(rule => rule.enabled && rule.trigger.metricName === 'health_check_status');
        for (const rule of relevantRules) {
            this.executeAutomationRule(rule, {
                healthCheck,
                status: 'unhealthy'
            });
        }
    }
    startAutomationMonitoring() {
        setInterval(() => {
            this.evaluateAutomationRules();
        }, 30000); // Every 30 seconds
    }
    evaluateAutomationRules() {
        if (!this.config.enableAutomation) {
            return;
        }
        const now = Date.now();
        for (const rule of this.config.automationRules) {
            if (!rule.enabled) {
                continue;
            }
            // Check cooldown
            if (rule.lastExecuted && (now - rule.lastExecuted) < (rule.cooldownPeriod * 1000)) {
                continue;
            }
            // Check execution limit
            const hourAgo = now - (60 * 60 * 1000);
            const recentExecutions = rule.executionCount || 0;
            if (recentExecutions >= rule.maxExecutionsPerHour) {
                continue;
            }
            // Evaluate trigger condition
            if (this.evaluateTriggerCondition(rule.trigger)) {
                this.executeAutomationRule(rule, {});
            }
        }
    }
    evaluateTriggerCondition(condition) {
        try {
            // This would query metrics from Prometheus or other source
            // For now, we'll use a simplified approach
            const currentValue = this.getMetricValue(condition.metricName, condition.labels);
            switch (condition.operator) {
                case 'gt':
                    return currentValue > condition.threshold;
                case 'lt':
                    return currentValue < condition.threshold;
                case 'eq':
                    return currentValue === condition.threshold;
                case 'gte':
                    return currentValue >= condition.threshold;
                case 'lte':
                    return currentValue <= condition.threshold;
                default:
                    return false;
            }
        }
        catch (error) {
            this.logger.error('Failed to evaluate trigger condition', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }
    getMetricValue(metricName, labels) {
        // This would integrate with Prometheus or metrics system
        // For now, return mock values based on metric name
        switch (metricName) {
            case 'health_check_status':
                return this.getHealthCheckMetric(labels);
            case 'cpu_usage_percent':
                return Math.random() * 100; // Mock
            case 'memory_usage_percent':
                return Math.random() * 100; // Mock
            case 'error_rate':
                return Math.random() * 0.1; // Mock
            default:
                return 0;
        }
    }
    getHealthCheckMetric(labels) {
        if (!labels || !labels.check_name) {
            return 1; // Assume healthy
        }
        const result = this.healthCheckResults.get(labels.check_name);
        return result && result.status === 'healthy' ? 1 : 0;
    }
    async executeAutomationRule(rule, context) {
        const now = Date.now();
        // Update execution tracking
        rule.lastExecuted = now;
        rule.executionCount = (rule.executionCount || 0) + 1;
        this.logger.info(`Executing automation rule: ${rule.name}`, {
            automationRuleId: rule.id,
            context
        });
        // Record metrics
        this.metrics.inc('automation_executions_total', 1, {
            rule_name: rule.name,
            rule_id: rule.id
        });
        try {
            // Execute actions
            for (const action of rule.actions) {
                await this.executeAutomationAction(action, rule, context);
            }
            this.logger.info(`Automation rule executed successfully: ${rule.name}`, {
                automationRuleId: rule.id
            });
        }
        catch (error) {
            this.logger.error(`Failed to execute automation rule: ${rule.name}`, error instanceof Error ? error : new Error(String(error)));
            this.metrics.inc('automation_failures_total', 1, {
                rule_name: rule.name,
                rule_id: rule.id
            });
        }
    }
    async executeAutomationAction(action, rule, context) {
        switch (action.type) {
            case 'restart_service':
                await this.restartService(action.parameters.serviceName);
                break;
            case 'scale_up':
                await this.scaleService(action.parameters.serviceName, 'up', action.parameters.instances);
                break;
            case 'scale_down':
                await this.scaleService(action.parameters.serviceName, 'down', action.parameters.instances);
                break;
            case 'clear_cache':
                await this.clearCache(action.parameters.cacheType);
                break;
            case 'block_ip':
                await this.blockIPAddress(action.parameters.ipAddress, action.parameters.reason);
                break;
            case 'send_alert':
                await this.sendAlert(action.parameters.message, action.parameters.severity, action.parameters.channels);
                break;
            case 'run_script':
                await this.runScript(action.parameters.scriptPath, action.parameters.arguments);
                break;
            case 'enable_maintenance_mode':
                await this.enableMaintenanceMode(action.parameters.duration);
                break;
            default:
                this.logger.warn(`Unknown automation action type: ${action.type}`);
        }
    }
    async restartService(serviceName) {
        this.logger.info(`Restarting service: ${serviceName}`, {
            component: 'automation',
            action: 'restart_service',
            serviceName
        });
        // This would integrate with container orchestration (Docker, Kubernetes)
        // For now, just log the action
        this.metrics.inc('service_restarts_total', 1, {
            service_name: serviceName,
            trigger: 'automation'
        });
        // Mark as active healing
        this.activeHealing.set(`restart_${serviceName}`, {
            startTime: Date.now(),
            action: 'restart'
        });
        // Clear after timeout
        setTimeout(() => {
            this.activeHealing.delete(`restart_${serviceName}`);
        }, 60000); // 1 minute
    }
    async scaleService(serviceName, direction, instances) {
        this.logger.info(`Scaling service ${serviceName} ${direction} by ${instances} instances`, {
            component: 'automation',
            action: 'scale_service',
            serviceName,
            direction,
            instances
        });
        this.metrics.inc('service_scalings_total', 1, {
            service_name: serviceName,
            direction,
            instances,
            trigger: 'automation'
        });
        // This would integrate with container orchestration
        this.activeHealing.set(`scale_${serviceName}`, {
            startTime: Date.now(),
            action: 'scale'
        });
        setTimeout(() => {
            this.activeHealing.delete(`scale_${serviceName}`);
        }, 120000); // 2 minutes
    }
    async clearCache(cacheType) {
        this.logger.info(`Clearing cache: ${cacheType}`, {
            component: 'automation',
            action: 'clear_cache',
            cacheType
        });
        this.metrics.inc('cache_clears_total', 1, {
            cache_type: cacheType,
            trigger: 'automation'
        });
        // This would integrate with cache system
        this.activeHealing.set(`cache_${cacheType}`, {
            startTime: Date.now(),
            action: 'clear_cache'
        });
        setTimeout(() => {
            this.activeHealing.delete(`cache_${cacheType}`);
        }, 30000); // 30 seconds
    }
    async blockIPAddress(ipAddress, reason) {
        this.logger.info(`Blocking IP address: ${ipAddress} - ${reason}`, {
            component: 'automation',
            action: 'block_ip',
            ipAddress,
            reason
        });
        // Use security monitoring to block IP
        this.securityMonitor.recordSecurityEvent('suspicious_activity', 'medium', 'automation', {
            blockedIP: ipAddress,
            reason,
            automated: true
        });
        this.metrics.inc('ip_blocks_total', 1, {
            trigger: 'automation'
        });
    }
    async sendAlert(message, severity, channels) {
        this.logger.info(`Sending alert: ${message}`, {
            component: 'automation',
            action: 'send_alert',
            severity,
            channels
        });
        // Emit alert event
        this.eventBus.emit('alert:send', {
            message,
            severity,
            channels,
            source: 'automation'
        });
        this.metrics.inc('alerts_sent_total', 1, {
            severity,
            trigger: 'automation'
        });
    }
    async runScript(scriptPath, args) {
        this.logger.info(`Running script: ${scriptPath}`, {
            component: 'automation',
            action: 'run_script',
            scriptPath,
            arguments
        });
        // This would execute the script
        this.metrics.inc('script_executions_total', 1, {
            trigger: 'automation'
        });
    }
    async enableMaintenanceMode(duration) {
        this.logger.info(`Enabling maintenance mode for ${duration} seconds`, {
            component: 'automation',
            action: 'enable_maintenance_mode',
            duration
        });
        // Emit maintenance mode event
        this.eventBus.emit('maintenance:enable', {
            duration,
            reason: 'automation'
        });
        this.metrics.gauge('maintenance_mode', 1);
        // Auto-disable after duration
        setTimeout(() => {
            this.disableMaintenanceMode();
        }, duration * 1000);
    }
    disableMaintenanceMode() {
        this.logger.info('Disabling maintenance mode', {
            component: 'automation',
            action: 'disable_maintenance_mode'
        });
        this.eventBus.emit('maintenance:disable', {
            reason: 'automation'
        });
        this.metrics.gauge('maintenance_mode', 0);
    }
    handleSecurityEvent(event) {
        if (!this.config.enableSelfHealing) {
            return;
        }
        // Check for automated responses to security events
        if (event.severity === 'critical') {
            // Find relevant automation rules
            const securityRules = this.config.automationRules.filter(rule => rule.enabled && rule.trigger.metricName === 'security_events_total');
            for (const rule of securityRules) {
                this.executeAutomationRule(rule, { securityEvent: event });
            }
        }
    }
    handleMetricAlert(alert) {
        if (!this.config.enableSelfHealing) {
            return;
        }
        // Find relevant automation rules
        const metricRules = this.config.automationRules.filter(rule => rule.enabled && rule.trigger.metricName === alert.metricName);
        for (const rule of metricRules) {
            this.executeAutomationRule(rule, { metricAlert: alert });
        }
    }
    async handleServiceFailure(failure) {
        if (!this.config.enableSelfHealing) {
            return;
        }
        this.logger.info(`Handling service failure: ${failure.serviceName}`, {
            component: 'automation',
            action: 'handle_service_failure',
            serviceName: failure.serviceName,
            error: failure.error
        });
        // Try to restart the service
        await this.restartService(failure.serviceName);
    }
    async handleSystemEvent(event) {
        if (!this.config.enableSelfHealing) {
            return;
        }
        this.logger.info(`Handling system event: ${event.type}`, {
            component: 'automation',
            action: 'handle_system_event',
            eventType: event.type,
            eventData: event.data
        });
        // Handle specific system events
        switch (event.type) {
            case 'high_memory':
                await this.clearCache('memory');
                break;
            case 'high_cpu':
                await this.scaleService('agentic-flow-app', 'up', 1);
                break;
            case 'disk_space_low':
                await this.runScript('/scripts/cleanup.sh', []);
                break;
        }
    }
    performPeriodicChecks() {
        // Check for stuck healing operations
        const now = Date.now();
        for (const [key, healing] of this.activeHealing) {
            if (now - healing.startTime > 300000) { // 5 minutes
                this.logger.warn(`Healing operation stuck: ${key}`, {
                    component: 'automation',
                    action: 'stuck_healing',
                    healingKey: key,
                    duration: now - healing.startTime
                });
                this.activeHealing.delete(key);
            }
        }
        // Check maintenance windows
        if (this.isInMaintenanceWindow()) {
            this.logger.info('System is in maintenance window', {
                component: 'automation',
                action: 'maintenance_window_check'
            });
        }
        // Cleanup old automation data
        this.cleanupAutomationData();
    }
    isInMaintenanceWindow() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        const { startHour, endHour, daysOfWeek } = this.config.maintenanceWindows;
        // Check if current day is in maintenance days
        if (!daysOfWeek.includes(currentDay)) {
            return false;
        }
        // Check if current time is within maintenance window
        if (startHour <= endHour) {
            return currentHour >= startHour && currentHour <= endHour;
        }
        else {
            return currentHour >= startHour || currentHour <= endHour;
        }
    }
    cleanupAutomationData() {
        // Reset execution counts every hour
        for (const rule of this.config.automationRules) {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (rule.lastExecuted && rule.lastExecuted < oneHourAgo) {
                rule.executionCount = 0;
            }
        }
    }
    // Public API methods
    getActiveHealing() {
        const healing = [];
        for (const [key, value] of this.activeHealing) {
            healing.push({ id: key, ...value });
        }
        return healing;
    }
    getHealthCheckResults() {
        return new Map(this.healthCheckResults);
    }
    getAutomationRules() {
        return [...this.config.automationRules];
    }
    updateAutomationRule(ruleId, updates) {
        const rule = this.config.automationRules.find(r => r.id === ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.logger.info(`Updated automation rule: ${ruleId}`, {
                component: 'automation',
                action: 'update_rule',
                ruleId,
                updates
            });
        }
    }
    addAutomationRule(rule) {
        this.config.automationRules.push(rule);
        this.logger.info(`Added automation rule: ${rule.id}`, {
            component: 'automation',
            action: 'add_rule',
            rule
        });
    }
    removeAutomationRule(ruleId) {
        const index = this.config.automationRules.findIndex(r => r.id === ruleId);
        if (index !== -1) {
            this.config.automationRules.splice(index, 1);
            this.logger.info(`Removed automation rule: ${ruleId}`, {
                component: 'automation',
                action: 'remove_rule',
                ruleId
            });
        }
    }
    destroy() {
        // Clear all timers
        for (const timer of this.automationTimers.values()) {
            clearTimeout(timer);
        }
        this.automationTimers.clear();
        // Clear active healing
        this.activeHealing.clear();
        console.log('Automation and self-healing system destroyed');
    }
}
export default AutomationSelfHealing;
//# sourceMappingURL=automation-self-healing.js.map
/**
 * Daily Send Automation - MAA Workflow
 *
 * Capabilities:
 * - Morning Accountability Automation (MAA)
 * - Template synchronization with git
 * - MCP (Model Context Protocol) integration
 * - MPP (Multi-Provider Pipeline) support
 * - Cron-based scheduling
 * - Context preservation across sends
 * - Metrics tracking and streaks
 */
interface DailySendConfig {
    workDir: string;
    templateDir: string;
    enableMCP?: boolean;
    enableMPP?: boolean;
}
interface Template {
    name: string;
    content: string;
    path: string;
}
interface MCPConnection {
    connected: boolean;
    capabilities?: string[];
    attempts?: number;
}
interface ContextStore {
    success: boolean;
    key?: string;
}
interface ContextRetrieve {
    found: boolean;
    value?: string;
}
interface ProviderRouting {
    provider: string;
    model: string;
    reasoning: string;
}
interface SendResult {
    success: boolean;
    providerUsed?: string;
    messageSent?: boolean;
    dryRun?: boolean;
    preview?: string;
}
interface Schedule {
    id: string;
    template: string;
    cron: string;
    timezone?: string;
    enabled: boolean;
    nextRun: Date;
    variables?: Record<string, string>;
}
interface ScheduleStatus {
    id: string;
    enabled: boolean;
}
interface DailyContext {
    yesterday?: {
        goals: string[];
        blockers: string[];
        completed: string[];
    };
    metrics?: Record<string, unknown>;
}
interface SendHistory {
    sends: Array<{
        template: string;
        timestamp: Date;
        success?: boolean;
    }>;
}
interface StreakMetrics {
    currentStreak: number;
    longestStreak: number;
    totalSends: number;
}
interface Metrics {
    successRate: number;
    totalSends: number;
    [key: string]: unknown;
}
interface TemplateMetrics {
    [templateName: string]: {
        count: number;
    };
}
interface ProviderMetrics {
    totalRequests: number;
    byProvider: Record<string, number>;
}
export declare class DailySendAutomation {
    private workDir;
    private templateDir;
    private enableMCP;
    private enableMPP;
    private mcpConnected;
    private contextStore;
    private schedules;
    private sendHistory;
    private templateUsage;
    private providerUsage;
    constructor(config: DailySendConfig);
    loadTemplates(): Promise<Template[]>;
    renderTemplate(templateName: string, variables: Record<string, string>): Promise<string | null>;
    syncTemplates(options: {
        source: 'git' | 'local';
        repository?: string;
        branch?: string;
        path?: string;
    }): Promise<{
        success: boolean;
        templatesUpdated: number;
    }>;
    connectMCP(options: {
        server: string;
        transport?: string;
        retries?: number;
        retryDelay?: number;
    }): Promise<MCPConnection>;
    storeContext(options: {
        namespace: string;
        key: string;
        value: string;
        ttl?: number;
    }): Promise<ContextStore>;
    retrieveContext(options: {
        namespace: string;
        key: string;
    }): Promise<ContextRetrieve>;
    routeProvider(options: {
        task: string;
        complexity?: string;
        budget?: string;
    }): Promise<ProviderRouting>;
    sendWithFallback(options: {
        message: string;
        primaryProvider: string;
        fallbackProviders?: string[];
    }): Promise<SendResult>;
    getProviderMetrics(): Promise<ProviderMetrics>;
    schedule(options: {
        template: string;
        cron: string;
        timezone?: string;
        enabled?: boolean;
        variables?: Record<string, string>;
    }): Promise<Schedule>;
    executeSchedule(scheduleId: string): Promise<SendResult>;
    disableSchedule(scheduleId: string): Promise<{
        success: boolean;
    }>;
    getScheduleStatus(scheduleId: string): Promise<ScheduleStatus>;
    buildDailyContext(options: {
        includeYesterday?: boolean;
        includeMetrics?: boolean;
    }): Promise<DailyContext>;
    getSendHistory(options: {
        limit: number;
    }): Promise<SendHistory>;
    getStreakMetrics(): Promise<StreakMetrics>;
    recordSend(options: {
        template?: string;
        timestamp?: Date;
        success?: boolean;
    }): Promise<void>;
    getMetrics(): Promise<Metrics>;
    getTemplateMetrics(): Promise<TemplateMetrics>;
    exportMetrics(outputPath: string): Promise<void>;
    sendDaily(options: {
        template: string;
        variables?: Record<string, string>;
        dryRun?: boolean;
    }): Promise<SendResult>;
}
export {};
//# sourceMappingURL=daily-send.d.ts.map
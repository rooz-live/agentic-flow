/**
 * Financial Modeling Prep Stable API Client
 * Migration from Legacy V3 to Stable Endpoints
 *
 * Legacy V3 API is discontinued as of 2024
 * New stable endpoints: https://financialmodelingprep.com/stable/*
 *
 * Key Changes:
 * - /v3/income-statement → /stable/income-statement-growth
 * - /v3/balance-sheet-statement → /stable/balance-sheet-statement-growth
 * - /v3/cash-flow-statement → /stable/cash-flow-statement-growth
 * - /v3/financial-growth → /stable/financial-growth
 */
import * as fs from 'fs';
import * as path from 'path';
export class FMPStableClient {
    apiKey;
    baseUrl;
    timeout;
    goalieDir;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://financialmodelingprep.com/stable';
        this.timeout = config.timeout || 30000;
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    /**
     * Emit pattern metric for API calls
     */
    async emitMetric(endpoint, symbol, success, responseTime) {
        try {
            const metricEntry = {
                ts: new Date().toISOString(),
                run: 'fmp-api-client',
                run_id: `fmp-${Date.now()}`,
                iteration: 0,
                circle: 'analyst',
                depth: 1,
                pattern: 'market_data_fetch',
                'pattern:kebab-name': 'market-data-fetch',
                mode: 'advisory',
                mutation: false,
                gate: 'validation',
                framework: 'fmp-stable',
                scheduler: '',
                tags: ['Financial', 'MarketData', 'Stats'],
                economic: {
                    cod: 1.0,
                    wsjf_score: 5.0,
                },
                reason: `fmp-${endpoint}`,
                metrics: {
                    endpoint,
                    symbol,
                    success,
                    response_time_ms: responseTime,
                },
            };
            const metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
            fs.appendFileSync(metricsFile, JSON.stringify(metricEntry) + '\n');
        }
        catch (err) {
            console.error('[FMPStableClient] Failed to emit metric:', err);
        }
    }
    /**
     * Make API request to FMP Stable endpoints
     */
    async request(endpoint, params = {}) {
        const startTime = Date.now();
        const url = new URL(`${this.baseUrl}/${endpoint}`);
        // Add API key and params
        url.searchParams.append('apikey', this.apiKey);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(url.toString(), {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const responseTime = Date.now() - startTime;
                await this.emitMetric(endpoint, params.symbol || '', false, responseTime);
                throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const responseTime = Date.now() - startTime;
            await this.emitMetric(endpoint, params.symbol || '', true, responseTime);
            return data;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            await this.emitMetric(endpoint, params.symbol || '', false, responseTime);
            throw error;
        }
    }
    /**
     * Get Financial Growth (replaces legacy /v3/financial-growth)
     * Stable endpoint: /stable/financial-growth
     */
    async getFinancialGrowth(symbol, period = 'annual') {
        return this.request('financial-growth', { symbol, period });
    }
    /**
     * Get Income Statement Growth (replaces legacy /v3/income-statement-growth)
     * Stable endpoint: /stable/income-statement-growth
     */
    async getIncomeStatementGrowth(symbol, period = 'annual') {
        return this.request('income-statement-growth', { symbol, period });
    }
    /**
     * Get Balance Sheet Statement Growth (replaces legacy /v3/balance-sheet-statement-growth)
     * Stable endpoint: /stable/balance-sheet-statement-growth
     */
    async getBalanceSheetGrowth(symbol, period = 'annual') {
        return this.request('balance-sheet-statement-growth', { symbol, period });
    }
    /**
     * Get Cash Flow Statement Growth (replaces legacy /v3/cash-flow-statement-growth)
     * Stable endpoint: /stable/cash-flow-statement-growth
     */
    async getCashFlowGrowth(symbol, period = 'annual') {
        return this.request('cash-flow-statement-growth', { symbol, period });
    }
    /**
     * Get Real-time Stock Quote
     */
    async getQuote(symbol) {
        return this.request('quote', { symbol });
    }
    /**
     * Get Financial Reports Dates
     * Stable endpoint: /stable/financial-reports-dates
     */
    async getFinancialReportsDates(symbol) {
        return this.request('financial-reports-dates', { symbol });
    }
    /**
     * Batch fetch multiple symbols
     */
    async batchGetQuotes(symbols) {
        return this.request('quote', { symbol: symbols.join(',') });
    }
    /**
     * Get comprehensive financial data for a symbol
     */
    async getComprehensiveData(symbol) {
        const [quote, financialGrowth, incomeGrowth] = await Promise.all([
            this.getQuote(symbol),
            this.getFinancialGrowth(symbol),
            this.getIncomeStatementGrowth(symbol),
        ]);
        return {
            symbol,
            timestamp: new Date().toISOString(),
            quote: quote[0],
            financialGrowth: financialGrowth.slice(0, 5), // Last 5 periods
            incomeGrowth: incomeGrowth.slice(0, 5),
        };
    }
}
/**
 * Factory function to create FMP Stable Client
 */
export function createFMPStableClient(apiKey) {
    const key = apiKey || process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
    if (!key) {
        throw new Error('FMP API key not configured. Set FMP_API_KEY or FINANCIAL_MODELING_PREP_API_KEY');
    }
    return new FMPStableClient({ apiKey: key });
}
export default FMPStableClient;
//# sourceMappingURL=fmp_stable_client.js.map
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
export interface FMPConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}
export interface FinancialGrowth {
    symbol: string;
    date: string;
    period: string;
    revenueGrowth: number;
    grossProfitGrowth: number;
    ebitGrowth: number;
    operatingIncomeGrowth: number;
    netIncomeGrowth: number;
    epsgrowth: number;
    epsdilutedGrowth: number;
    weightedAverageSharesGrowth: number;
    weightedAverageSharesDilutedGrowth: number;
}
export interface IncomeStatementGrowth {
    symbol: string;
    date: string;
    period: string;
    revenue: number;
    costOfRevenue: number;
    grossProfit: number;
    grossProfitRatio: number;
    operatingExpenses: number;
    operatingIncome: number;
    operatingIncomeRatio: number;
    netIncome: number;
    netIncomeRatio: number;
    eps: number;
    epsdiluted: number;
}
export interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    change: number;
    dayLow: number;
    dayHigh: number;
    yearHigh: number;
    yearLow: number;
    marketCap: number;
    priceAvg50: number;
    priceAvg200: number;
    volume: number;
    avgVolume: number;
    timestamp: number;
}
export declare class FMPStableClient {
    private apiKey;
    private baseUrl;
    private timeout;
    private goalieDir;
    constructor(config: FMPConfig);
    /**
     * Emit pattern metric for API calls
     */
    private emitMetric;
    /**
     * Make API request to FMP Stable endpoints
     */
    private request;
    /**
     * Get Financial Growth (replaces legacy /v3/financial-growth)
     * Stable endpoint: /stable/financial-growth
     */
    getFinancialGrowth(symbol: string, period?: 'annual' | 'quarter'): Promise<FinancialGrowth[]>;
    /**
     * Get Income Statement Growth (replaces legacy /v3/income-statement-growth)
     * Stable endpoint: /stable/income-statement-growth
     */
    getIncomeStatementGrowth(symbol: string, period?: 'annual' | 'quarter'): Promise<IncomeStatementGrowth[]>;
    /**
     * Get Balance Sheet Statement Growth (replaces legacy /v3/balance-sheet-statement-growth)
     * Stable endpoint: /stable/balance-sheet-statement-growth
     */
    getBalanceSheetGrowth(symbol: string, period?: 'annual' | 'quarter'): Promise<any[]>;
    /**
     * Get Cash Flow Statement Growth (replaces legacy /v3/cash-flow-statement-growth)
     * Stable endpoint: /stable/cash-flow-statement-growth
     */
    getCashFlowGrowth(symbol: string, period?: 'annual' | 'quarter'): Promise<any[]>;
    /**
     * Get Real-time Stock Quote
     */
    getQuote(symbol: string): Promise<StockQuote[]>;
    /**
     * Get Financial Reports Dates
     * Stable endpoint: /stable/financial-reports-dates
     */
    getFinancialReportsDates(symbol: string): Promise<any[]>;
    /**
     * Batch fetch multiple symbols
     */
    batchGetQuotes(symbols: string[]): Promise<StockQuote[]>;
    /**
     * Get comprehensive financial data for a symbol
     */
    getComprehensiveData(symbol: string): Promise<{
        symbol: string;
        timestamp: string;
        quote: StockQuote;
        financialGrowth: FinancialGrowth[];
        incomeGrowth: IncomeStatementGrowth[];
    }>;
}
/**
 * Factory function to create FMP Stable Client
 */
export declare function createFMPStableClient(apiKey?: string): FMPStableClient;
export default FMPStableClient;
//# sourceMappingURL=fmp_stable_client.d.ts.map
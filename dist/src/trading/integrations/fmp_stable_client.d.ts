/**
 * Financial Modeling Prep (FMP) API Client Stub
 */
export interface FMPMarketData {
    symbol: string;
    price: number;
    volume: number;
    change: number;
    changePercent: number;
    timestamp: string;
}
export interface StockQuote extends FMPQuote {
}
export interface FMPQuote {
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
    exchange: string;
    open: number;
    previousClose: number;
    eps: number;
    pe: number;
    earningsAnnouncement: string;
    sharesOutstanding: number;
    timestamp: number;
}
export declare class FMPStableClient {
    private apiKey;
    private baseUrl;
    constructor(apiKey?: string);
    getQuote(symbol: string): Promise<FMPQuote | null>;
    getMarketData(symbol: string): Promise<FMPMarketData | null>;
    getBatchQuotes(symbols: string[]): Promise<FMPQuote[]>;
}
export default FMPStableClient;
//# sourceMappingURL=fmp_stable_client.d.ts.map
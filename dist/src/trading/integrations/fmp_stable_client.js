/**
 * Financial Modeling Prep (FMP) API Client Stub
 */
export class FMPStableClient {
    apiKey;
    baseUrl;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.FMP_API_KEY || '';
        this.baseUrl = 'https://financialmodelingprep.com/api/v3';
    }
    async getQuote(symbol) {
        // Stub implementation
        console.warn('FMPStableClient.getQuote is a stub implementation');
        return null;
    }
    async getMarketData(symbol) {
        // Stub implementation
        console.warn('FMPStableClient.getMarketData is a stub implementation');
        return null;
    }
    async getBatchQuotes(symbols) {
        // Stub implementation
        console.warn('FMPStableClient.getBatchQuotes is a stub implementation');
        return [];
    }
}
export default FMPStableClient;
//# sourceMappingURL=fmp_stable_client.js.map
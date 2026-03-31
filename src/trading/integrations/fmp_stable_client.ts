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

export interface StockQuote extends FMPQuote {}

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

export class FMPStableClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FMP_API_KEY || '';
    this.baseUrl = 'https://financialmodelingprep.com/api/v3';
  }

  async getQuote(symbol: string): Promise<FMPQuote | null> {
    // Stub implementation
    console.warn('FMPStableClient.getQuote is a stub implementation');
    return null;
  }

  async getMarketData(symbol: string): Promise<FMPMarketData | null> {
    // Stub implementation
    console.warn('FMPStableClient.getMarketData is a stub implementation');
    return null;
  }

  async getBatchQuotes(symbols: string[]): Promise<FMPQuote[]> {
    // Stub implementation
    console.warn('FMPStableClient.getBatchQuotes is a stub implementation');
    return [];
  }
}

export default FMPStableClient;

export class QuantEngine {
    calculateMeanReversionSignal(historicalPrices: number[], currentPrice: number): 'BUY' | 'SELL' | 'HOLD' {
        if (historicalPrices.length === 0) return 'HOLD';

        const mean = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
        
        const variance = historicalPrices.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / historicalPrices.length;
        const sd = Math.sqrt(variance) || 5; 

        const lowerBand = mean - (2 * sd);
        const upperBand = mean + (2 * sd);

        if (currentPrice < lowerBand) return 'BUY';
        if (currentPrice > upperBand) return 'SELL';
        return 'HOLD';
    }
}

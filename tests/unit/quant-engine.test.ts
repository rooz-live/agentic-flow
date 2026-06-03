import { QuantEngine } from '../../swarm-core-app/src/domains/quant/QuantEngine';

describe('QuantEngine DDD Model', () => {
    it('should generate BUY signal when price drops below lower bollinger band', () => {
        const prices = [100, 100, 100, 100, 100]; // Mean: 100, SD: 0 -> Fallback SD: 5
        const currentPrice = 80; // < 90
        const engine = new QuantEngine();
        const signal = engine.calculateMeanReversionSignal(prices, currentPrice);
        expect(signal).toBe('BUY');
    });

    it('should generate SELL signal when price goes above upper bollinger band', () => {
        const prices = [100, 100, 100, 100, 100]; 
        const currentPrice = 120; // > 110
        const engine = new QuantEngine();
        const signal = engine.calculateMeanReversionSignal(prices, currentPrice);
        expect(signal).toBe('SELL');
    });

    it('should generate HOLD signal when price is within bands', () => {
        const prices = [100, 100, 100, 100, 100]; 
        const currentPrice = 100;
        const engine = new QuantEngine();
        const signal = engine.calculateMeanReversionSignal(prices, currentPrice);
        expect(signal).toBe('HOLD');
    });
});

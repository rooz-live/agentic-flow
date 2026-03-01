#!/usr/bin/env node
// Neural Trader - Paper Trading Mode with Income Evidence Generation
// Generates realistic trading statements for income verification

const fs = require('fs');
const path = require('path');

class NeuralTrader {
  constructor(config = {}) {
    this.mode = config.mode || 'paper';
    this.logDir = config.logDir || './data/trading-logs';
    this.statementsDir = config.statementsDir || './data/statements';
    this.riskThreshold = config.riskThreshold || 0.15;
    this.maxPositionSize = config.maxPositionSize || 10000;
    this.startingBalance = config.startingBalance || 50000;
    this.balance = this.startingBalance;
    this.positions = [];
    this.trades = [];
    
    // Ensure directories exist
    [this.logDir, this.statementsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Generate realistic market data for paper trading
  generateMarketData() {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const basePrice = 150 + Math.random() * 200;
    const volatility = 0.02;
    
    return {
      symbol,
      price: basePrice * (1 + (Math.random() - 0.5) * volatility),
      timestamp: new Date().toISOString(),
      volume: Math.floor(Math.random() * 1000000),
      bid: basePrice * 0.999,
      ask: basePrice * 1.001
    };
  }

  // WSJF-based risk calculation
  calculateRisk(marketData) {
    const { price, volume } = marketData;
    const businessValue = volume / 1000000; // Liquidity score
    const timeCriticality = 0.7; // Market timing
    const riskReduction = 0.3; // Risk mitigation
    const effort = Math.abs((price - 200) / 200); // Price deviation
    
    const wsjf = (businessValue + timeCriticality + riskReduction) / Math.max(effort, 0.01);
    const riskScore = 1 / (1 + wsjf); // Lower WSJF = higher risk
    
    return {
      score: riskScore,
      wsjf,
      signal: riskScore < this.riskThreshold ? 'BUY' : 'HOLD'
    };
  }

  // Execute paper trade
  async executeTrade(signal, marketData) {
    if (signal !== 'BUY') return null;
    
    const positionSize = Math.min(this.maxPositionSize, this.balance * 0.1);
    const shares = Math.floor(positionSize / marketData.price);
    const cost = shares * marketData.price;
    
    if (cost > this.balance) return null;
    
    const trade = {
      id: `TR-${Date.now()}`,
      symbol: marketData.symbol,
      type: 'BUY',
      shares,
      price: marketData.price,
      cost,
      timestamp: new Date().toISOString(),
      status: 'EXECUTED'
    };
    
    this.balance -= cost;
    this.positions.push({
      symbol: marketData.symbol,
      shares,
      entryPrice: marketData.price,
      currentPrice: marketData.price,
      unrealizedPnL: 0
    });
    this.trades.push(trade);
    
    this.log(`TRADE EXECUTED: ${trade.type} ${trade.shares} ${trade.symbol} @ $${trade.price.toFixed(2)}`);
    return trade;
  }

  // Generate trading statement for income evidence
  generateStatement(period = '7days') {
    const now = new Date();
    const totalTrades = this.trades.length;
    const totalVolume = this.trades.reduce((sum, t) => sum + t.cost, 0);
    const unrealizedPnL = this.positions.reduce((sum, p) => {
      return sum + (p.shares * (p.currentPrice - p.entryPrice));
    }, 0);
    const accountValue = this.balance + this.positions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);
    const profitLoss = accountValue - this.startingBalance;
    const roi = (profitLoss / this.startingBalance) * 100;
    
    const statement = {
      account: {
        holder: 'Shahrooz Bhopti',
        number: `NT-${Math.floor(Math.random() * 1000000)}`,
        type: 'Paper Trading Account'
      },
      period: {
        start: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      },
      summary: {
        startingBalance: this.startingBalance,
        currentBalance: this.balance,
        accountValue: accountValue,
        unrealizedPnL: unrealizedPnL,
        realizedPnL: 0, // Paper trading
        totalPnL: profitLoss,
        roi: roi.toFixed(2) + '%',
        totalTrades: totalTrades,
        totalVolume: totalVolume
      },
      positions: this.positions,
      recentTrades: this.trades.slice(-10),
      generated: now.toISOString(),
      disclaimer: 'PAPER TRADING ACCOUNT - For demonstration and income verification purposes only. No real money involved.'
    };
    
    const filename = `trading-statement-${now.toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.statementsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(statement, null, 2));
    
    this.log(`STATEMENT GENERATED: ${filepath}`);
    console.log('\n=== TRADING STATEMENT SUMMARY ===');
    console.log(`Period: ${statement.period.start} to ${statement.period.end}`);
    console.log(`Account Value: $${accountValue.toFixed(2)}`);
    console.log(`Total P&L: $${profitLoss.toFixed(2)} (${roi.toFixed(2)}%)`);
    console.log(`Total Trades: ${totalTrades}`);
    console.log(`Statement saved: ${filepath}`);
    console.log('================================\n');
    
    return statement;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    const logFile = path.join(this.logDir, `trading-${new Date().toISOString().split('T')[0]}.log`);
    
    fs.appendFileSync(logFile, logMessage);
    console.log(logMessage.trim());
  }

  // Run trading session
  async run(config = {}) {
    const trader = new NeuralTrader(config);
    
    trader.log('=== NEURAL TRADER STARTED (PAPER MODE) ===');
    trader.log(`Mode: ${trader.mode}`);
    trader.log(`Starting Balance: $${trader.startingBalance}`);
    trader.log(`Risk Threshold: ${trader.riskThreshold}`);
    
    // Run trading loop for demonstration (simulate 24 hours of trading)
    const iterations = 20; // Reduced for quick demo
    
    for (let i = 0; i < iterations; i++) {
      const marketData = trader.generateMarketData();
      const risk = trader.calculateRisk(marketData);
      
      trader.log(`MARKET: ${marketData.symbol} @ $${marketData.price.toFixed(2)} | Risk: ${risk.score.toFixed(3)} | Signal: ${risk.signal}`);
      
      if (risk.signal === 'BUY') {
        await trader.executeTrade(risk.signal, marketData);
      }
      
      // Update position prices (simulate market movement)
      trader.positions.forEach(pos => {
        pos.currentPrice = pos.entryPrice * (1 + (Math.random() - 0.48) * 0.02); // Slight upward bias
      });
      
      // Small delay for realistic timing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate final statement
    trader.generateStatement();
    trader.log('=== NEURAL TRADER STOPPED ===');
    
    return trader;
  }

  // CLI status check
  static status() {
    return 'active';
  }
}

// CLI entry point
if (require.main === module) {
  const config = {
    mode: process.env.TRADING_MODE || 'paper',
    logDir: process.env.LOG_DIR || './data/trading-logs',
    statementsDir: process.env.STATEMENTS_DIR || './data/statements',
    startingBalance: 50000
  };
  
  NeuralTrader.prototype.run.call(null, config)
    .then(() => {
      console.log('\n✅ Trading session complete. Check ./data/statements/ for income evidence.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Trading session failed:', err);
      process.exit(1);
    });
}

module.exports = NeuralTrader;

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app: Express = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

async function initDB(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        symbol VARCHAR(10) NOT NULL,
        side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
        quantity DECIMAL(15,4) NOT NULL,
        price DECIMAL(10,2) NOT NULL
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/portfolio', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        symbol,
        SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) as net_quantity,
        AVG(price) as average_price,
        SUM(CASE WHEN side = 'buy' THEN quantity * price ELSE -quantity * price END) as total_invested
      FROM trades 
      GROUP BY symbol
      HAVING SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) != 0
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/trades', async (req: Request, res: Response) => {
  const { symbol, side, quantity, price } = req.body;
  if (!symbol || !side || quantity == null || price == null) {
    return res.status(400).json({ error: 'Missing required fields: symbol, side, quantity, price' });
  }
  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ error: 'Side must be buy or sell' });
  }
  if (quantity <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Quantity and price must be positive' });
  }
  try {
    await pool.query(
      'INSERT INTO trades (symbol, side, quantity, price) VALUES ($1, $2, $3, $4)',
      [symbol.toUpperCase(), side, parseFloat(quantity.toString()), parseFloat(price.toString())]
    );
    io.emit('trade', { symbol, side, quantity, price });
    res.json({ success: true, trade: { symbol, side, quantity, price } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fake market data SOXL/SOXS
const symbols: string[] = ['SOXL', 'SOXS'];
const prices: Record<string, number> = { SOXL: 40.0, SOXS: 20.0 };

setInterval(async () => {
  for (const sym of symbols) {
    prices[sym] += (Math.random() - 0.5) * 1.0;
    if (prices[sym] < 1) prices[sym] = 1;
    const currentPrice = parseFloat(prices[sym].toFixed(2));
    io.emit('marketUpdate', { symbol: sym, price: currentPrice });
    await redisClient.set(`price:${sym}`, currentPrice.toString());
  }
}, 2000);

(async () => {
  await redisClient.connect();
  await initDB();
  server.listen(PORT, () => {
    console.log(`Trading MVP paper bot running on http://localhost:${PORT}`);
  });
})();

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
export class JsonlEventSink {
    bus;
    opts;
    buffer = [];
    timer;
    stream;
    perMinute = new Map();
    constructor(bus, opts) {
        this.bus = bus;
        this.opts = {
            flushIntervalMs: 2000,
            batchSize: 50,
            maxPerMinute: 120,
            dropSummaryEvery: 60,
            subscribeTo: [],
            ...opts,
        };
    }
    start() {
        // Ensure directory exists
        const dir = dirname(this.opts.filePath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        this.stream = createWriteStream(this.opts.filePath, { flags: 'a' });
        const handler = (name) => (payload) => {
            if (this.opts.subscribeTo.length && !this.opts.subscribeTo.includes(name))
                return;
            if (this.rateLimited(name))
                return;
            const line = JSON.stringify({ ts: new Date().toISOString(), event: name, ...payload });
            this.buffer.push(line);
            if (this.buffer.length >= this.opts.batchSize)
                this.flush();
        };
        this.bus.on('notifier.init', handler('notifier.init'));
        this.bus.on('cleanup.started', handler('cleanup.started'));
        this.bus.on('cleanup.cycle.completed', handler('cleanup.cycle.completed'));
        this.bus.on('cleanup.error', handler('cleanup.error'));
        this.bus.on('notifier.destroyed', handler('notifier.destroyed'));
        this.timer = setInterval(() => this.flush(), this.opts.flushIntervalMs).unref();
    }
    stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.flush(true);
        this.stream?.end();
    }
    flush(force = false) {
        if (!this.stream || this.buffer.length === 0)
            return;
        const chunk = force ? this.buffer.splice(0) : this.buffer.splice(0, this.opts.batchSize);
        this.stream.write(chunk.join('\n') + '\n');
    }
    rateLimited(name) {
        const now = Date.now();
        const windowMs = 60_000;
        const entry = this.perMinute.get(name) || { count: 0, windowStart: now, dropped: 0 };
        if (now - entry.windowStart >= windowMs) {
            entry.count = 0;
            entry.windowStart = now;
            entry.dropped = 0;
        }
        entry.count++;
        let limited = false;
        if (entry.count > this.opts.maxPerMinute) {
            entry.dropped++;
            limited = true;
            // every dropSummaryEvery drops, write a compact summary line
            if (entry.dropped % this.opts.dropSummaryEvery === 0) {
                const line = JSON.stringify({ ts: new Date().toISOString(), event: 'rate.limit', target: name, dropped: entry.dropped });
                this.buffer.push(line);
            }
        }
        this.perMinute.set(name, entry);
        return limited;
    }
}
//# sourceMappingURL=telemetry_sinks.js.map
#!/usr/bin/env python3
"""
Optimized Pattern Metrics Logger with Performance Enhancements

This module provides high-performance logging for pattern metrics with:
- Async I/O operations for non-blocking writes
- Batch processing for improved throughput
- Compression for large payloads
- Connection pooling for database operations
- Memory-efficient streaming operations
"""

import asyncio
import gzip
import json
import logging
import os
import socket
import time
from collections import deque
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, AsyncGenerator
import aiofiles
import aioredis
from asyncpg import create_pool, Connection
import numpy as np

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
PATTERN_LOG = GOALIE_DIR / "pattern_metrics.jsonl"
COMPRESSION_THRESHOLD = 1024  # Compress payloads larger than 1KB
BATCH_SIZE = 100
FLUSH_INTERVAL = 5.0  # seconds
MAX_QUEUE_SIZE = 10000

@dataclass
class LogEvent:
    """High-performance log event data structure"""
    pattern: str
    circle: str
    depth: int
    mode: str
    timestamp: float = field(default_factory=time.time)
    run_id: Optional[str] = None
    iteration: Optional[int] = None
    gate: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    observability: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PerformanceMetrics:
    """Performance tracking metrics"""
    events_processed: int = 0
    events_per_second: float = 0.0
    avg_latency_ms: float = 0.0
    memory_usage_mb: float = 0.0
    disk_write_kb: float = 0.0
    compression_ratio: float = 0.0
    error_count: int = 0

class CompressedPayload:
    """Wrapper for compressed payloads"""
    def __init__(self, data: bytes, original_size: int):
        self.compressed_data = data
        self.original_size = original_size
        self.is_compressed = True

    def decompress(self) -> bytes:
        return gzip.decompress(self.compressed_data)

class AsyncPatternLogger:
    """High-performance async pattern metrics logger"""

    def __init__(
        self,
        batch_size: int = BATCH_SIZE,
        flush_interval: float = FLUSH_INTERVAL,
        enable_compression: bool = True,
        enable_redis_cache: bool = False,
        enable_postgres: bool = False
    ):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.enable_compression = enable_compression
        self.enable_redis_cache = enable_redis_cache
        self.enable_postgres = enable_postgres

        self.event_queue = asyncio.Queue(maxsize=MAX_QUEUE_SIZE)
        self.batch_buffer: List[LogEvent] = []
        self.flush_task: Optional[asyncio.Task] = None
        self.performance_metrics = PerformanceMetrics()

        # External connections
        self.redis_pool: Optional[aioredis.Redis] = None
        self.postgres_pool: Optional[asyncpg.Pool] = None

        # Performance tracking
        self.latency_samples = deque(maxlen=1000)
        self.start_time = time.time()

        self.logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        """Setup structured logger for performance monitoring"""
        logger = logging.getLogger("pattern_logger")
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    async def initialize(self) -> None:
        """Initialize external connections and background tasks"""
        try:
            if self.enable_redis_cache:
                self.redis_pool = aioredis.Redis.from_url(
                    "redis://localhost:6379",
                    max_connections=10,
                    retry_on_timeout=True
                )
                await self.redis_pool.ping()
                self.logger.info("Redis connection established")

            if self.enable_postgres:
                self.postgres_pool = await create_pool(
                    "postgresql://localhost/pattern_metrics",
                    min_size=2,
                    max_size=10,
                    command_timeout=60
                )
                self.logger.info("PostgreSQL connection pool established")

            # Start background flush task
            self.flush_task = asyncio.create_task(self._flush_loop())

            # Ensure directory exists
            GOALIE_DIR.mkdir(parents=True, exist_ok=True)

        except Exception as e:
            self.logger.error(f"Initialization failed: {e}")
            raise

    async def close(self) -> None:
        """Cleanup resources and close connections"""
        if self.flush_task:
            self.flush_task.cancel()
            try:
                await self.flush_task
            except asyncio.CancelledError:
                pass

        # Flush remaining events
        if self.batch_buffer:
            await self._flush_batch(self.batch_buffer)

        if self.redis_pool:
            await self.redis_pool.close()

        if self.postgres_pool:
            await self.postgres_pool.close()

    async def log_event(self, event: LogEvent) -> None:
        """Log a pattern event asynchronously"""
        start_time = time.time()

        try:
            # Add to queue (blocking if full)
            await self.event_queue.put(event)

            # Update performance metrics
            latency = (time.time() - start_time) * 1000
            self.latency_samples.append(latency)
            self.performance_metrics.events_processed += 1

            # Update events per second
            elapsed = time.time() - self.start_time
            self.performance_metrics.events_per_second = (
                self.performance_metrics.events_processed / elapsed
            )

        except asyncio.QueueFull:
            self.performance_metrics.error_count += 1
            self.logger.warning("Event queue full, dropping event")

    async def log_events_batch(self, events: List[LogEvent]) -> None:
        """Log multiple events in a batch"""
        for event in events:
            await self.log_event(event)

    async def _flush_loop(self) -> None:
        """Background task to periodically flush events"""
        while True:
            try:
                await asyncio.sleep(self.flush_interval)

                # Move events from queue to buffer
                while not self.event_queue.empty() and len(self.batch_buffer) < self.batch_size:
                    event = self.event_queue.get_nowait()
                    self.batch_buffer.append(event)

                # Flush if buffer is full
                if len(self.batch_buffer) >= self.batch_size:
                    await self._flush_batch(self.batch_buffer.copy())
                    self.batch_buffer.clear()

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Flush loop error: {e}")

    async def _flush_batch(self, events: List[LogEvent]) -> None:
        """Flush a batch of events to storage"""
        if not events:
            return

        start_time = time.time()
        batch_size = len(events)

        try:
            # Prepare batch data
            jsonl_data = self._prepare_jsonl_batch(events)

            # Write to file asynchronously
            await self._write_batch_async(jsonl_data)

            # Write to cache if enabled
            if self.enable_redis_cache:
                await self._cache_events_async(events)

            # Write to database if enabled
            if self.enable_postgres:
                await self._write_to_database_async(events)

            # Update performance metrics
            flush_time = (time.time() - start_time) * 1000
            self.performance_metrics.avg_latency_ms = np.mean(self.latency_samples)
            self.performance_metrics.memory_usage_mb = self._get_memory_usage()
            self.performance_metrics.disk_write_kb = len(jsonl_data) / 1024

            self.logger.debug(f"Flushed {batch_size} events in {flush_time:.2f}ms")

        except Exception as e:
            self.performance_metrics.error_count += 1
            self.logger.error(f"Batch flush failed: {e}")

    def _prepare_jsonl_batch(self, events: List[LogEvent]) -> bytes:
        """Prepare JSONL batch with optional compression"""
        json_lines = []

        for event in events:
            event_dict = {
                "ts": datetime.fromtimestamp(event.timestamp, tz=timezone.utc).isoformat(),
                "pattern": event.pattern,
                "circle": event.circle,
                "depth": event.depth,
                "mode": event.mode,
                "tags": sorted(set(event.tags)),
                "run_id": event.run_id,
                "iteration": event.iteration,
                "gate": event.gate,
                "metadata": event.metadata,
                "observability": event.observability or self._get_observability_context()
            }

            # Remove None values
            event_dict = {k: v for k, v in event_dict.items() if v is not None}

            json_line = json.dumps(event_dict, ensure_ascii=False, separators=(',', ':'))
            json_lines.append(json_line)

        data = '\n'.join(json_lines).encode('utf-8')

        # Compress if enabled and data is large enough
        if self.enable_compression and len(data) > COMPRESSION_THRESHOLD:
            compressed_data = gzip.compress(data, compresslevel=6)
            compression_ratio = len(compressed_data) / len(data)
            self.performance_metrics.compression_ratio = compression_ratio

            # Return compressed data with marker
            return b'COMPRESSED:' + compressed_data
        else:
            return data

    async def _write_batch_async(self, data: bytes) -> None:
        """Write batch data to file asynchronously"""
        if data.startswith(b'COMPRESSED:'):
            # Write compressed data with marker
            compressed_data = data[11:]  # Remove 'COMPRESSED:' prefix
            async with aiofiles.open(PATTERN_LOG, 'ab') as f:
                await f.write(b'COMPRESSED:' + compressed_data)
        else:
            async with aiofiles.open(PATTERN_LOG, 'ab') as f:
                await f.write(data + b'\n')

    async def _cache_events_async(self, events: List[LogEvent]) -> None:
        """Cache events in Redis for fast lookup"""
        if not self.redis_pool:
            return

        try:
            pipe = self.redis_pool.pipeline()

            for event in events:
                key = f"pattern:{event.pattern}:circle:{event.circle}:time:{int(event.timestamp)}"
                value = json.dumps({
                    "run_id": event.run_id,
                    "depth": event.depth,
                    "mode": event.mode,
                    "tags": event.tags
                })

                # Cache with 1-hour TTL
                pipe.setex(key, 3600, value)

            await pipe.execute()

        except Exception as e:
            self.logger.warning(f"Redis cache write failed: {e}")

    async def _write_to_database_async(self, events: List[LogEvent]) -> None:
        """Write events to PostgreSQL database"""
        if not self.postgres_pool:
            return

        try:
            async with self.postgres_pool.acquire() as conn:
                # Use COPY for bulk insert
                await conn.executemany(
                    """
                    INSERT INTO pattern_metrics (
                        timestamp, pattern, circle, depth, mode, run_id,
                        iteration, gate, tags, metadata, observability
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT DO NOTHING
                    """,
                    [
                        (
                            datetime.fromtimestamp(event.timestamp, tz=timezone.utc),
                            event.pattern,
                            event.circle,
                            event.depth,
                            event.mode,
                            event.run_id,
                            event.iteration,
                            event.gate,
                            event.tags,
                            json.dumps(event.metadata),
                            json.dumps(event.observability)
                        )
                        for event in events
                    ]
                )

        except Exception as e:
            self.logger.warning(f"Database write failed: {e}")

    def _get_observability_context(self) -> Dict[str, Any]:
        """Get observability context data"""
        return {
            "host": socket.gethostname(),
            "pid": os.getpid(),
            "user": os.environ.get("USER", "unknown"),
            "environment": os.environ.get("ENVIRONMENT", "development"),
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}"
        }

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        import psutil
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024

    async def get_performance_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics"""
        # Update rolling averages
        if self.latency_samples:
            self.performance_metrics.avg_latency_ms = np.mean(self.latency_samples)

        self.performance_metrics.memory_usage_mb = self._get_memory_usage()

        # Update events per second
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            self.performance_metrics.events_per_second = (
                self.performance_metrics.events_processed / elapsed
            )

        return self.performance_metrics

    async def query_events(
        self,
        pattern: Optional[str] = None,
        circle: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 1000
    ) -> AsyncGenerator[LogEvent, None]:
        """Query events with optional filtering"""

        # Try Redis cache first if enabled
        if self.enable_redis_cache and pattern and circle:
            async for event in self._query_from_cache(pattern, circle, start_time, end_time):
                yield event
                return

        # Fallback to file-based query
        async for event in self._query_from_file(pattern, circle, start_time, end_time, limit):
            yield event

    async def _query_from_cache(
        self,
        pattern: str,
        circle: str,
        start_time: Optional[float],
        end_time: Optional[float]
    ) -> AsyncGenerator[LogEvent, None]:
        """Query events from Redis cache"""
        if not self.redis_pool:
            return

        try:
            pattern_key = f"pattern:{pattern}:circle:{circle}:time:*"
            keys = await self.redis_pool.keys(pattern_key)

            for key in keys:
                data = await self.redis_pool.get(key)
                if data:
                    event_data = json.loads(data)
                    yield LogEvent(
                        pattern=pattern,
                        circle=circle,
                        depth=event_data["depth"],
                        mode=event_data["mode"],
                        tags=event_data["tags"],
                        run_id=event_data["run_id"]
                    )

        except Exception as e:
            self.logger.warning(f"Cache query failed: {e}")

    async def _query_from_file(
        self,
        pattern: Optional[str],
        circle: Optional[str],
        start_time: Optional[float],
        end_time: Optional[float],
        limit: int
    ) -> AsyncGenerator[LogEvent, None]:
        """Query events from JSONL file with streaming"""
        if not PATTERN_LOG.exists():
            return

        count = 0
        try:
            async with aiofiles.open(PATTERN_LOG, 'r') as f:
                buffer = ""

                async for chunk in f:
                    buffer += chunk
                    lines = buffer.split('\n')
                    buffer = lines.pop() or ""

                    for line in lines:
                        if not line.strip():
                            continue

                        try:
                            # Handle compressed data
                            if line.startswith('COMPRESSED:'):
                                continue  # Skip compressed markers

                            event_data = json.loads(line)

                            # Apply filters
                            if pattern and event_data.get("pattern") != pattern:
                                continue
                            if circle and event_data.get("circle") != circle:
                                continue

                            event_ts = datetime.fromisoformat(event_data["ts"].replace('Z', '+00:00')).timestamp()
                            if start_time and event_ts < start_time:
                                continue
                            if end_time and event_ts > end_time:
                                continue

                            yield LogEvent(
                                pattern=event_data["pattern"],
                                circle=event_data["circle"],
                                depth=event_data["depth"],
                                mode=event_data["mode"],
                                tags=event_data.get("tags", []),
                                run_id=event_data.get("run_id"),
                                iteration=event_data.get("iteration"),
                                gate=event_data.get("gate"),
                                metadata=event_data.get("metadata", {}),
                                observability=event_data.get("observability", {}),
                                timestamp=event_ts
                            )

                            count += 1
                            if count >= limit:
                                return

                        except (json.JSONDecodeError, KeyError):
                            continue

        except Exception as e:
            self.logger.error(f"File query failed: {e}")

# Context manager for easy usage
@asynccontextmanager
async def pattern_logger(**kwargs) -> AsyncGenerator[AsyncPatternLogger, None]:
    """Context manager for pattern logger lifecycle"""
    logger = AsyncPatternLogger(**kwargs)
    try:
        await logger.initialize()
        yield logger
    finally:
        await logger.close()

# Example usage and CLI interface
async def main():
    """CLI interface for testing the optimized logger"""
    import argparse

    parser = argparse.ArgumentParser(description="Optimized Pattern Logger")
    parser.add_argument("--test-load", action="store_true", help="Run performance test")
    parser.add_argument("--events", type=int, default=10000, help="Number of test events")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size")
    parser.add_argument("--enable-redis", action="store_true", help="Enable Redis caching")
    parser.add_argument("--enable-postgres", action="store_true", help="Enable PostgreSQL storage")

    args = parser.parse_args()

    if args.test_load:
        await run_performance_test(args)
    else:
        print("Use --test-load to run performance tests")

async def run_performance_test(args):
    """Run performance test with specified parameters"""
    print(f"Running performance test with {args.events} events...")

    async with pattern_logger(
        batch_size=args.batch_size,
        enable_redis_cache=args.enable_redis,
        enable_postgres=args.enable_postgres
    ) as logger:

        # Generate test events
        test_events = [
            LogEvent(
                pattern=f"pattern-{i % 10}",
                circle=f"circle-{i % 5}",
                depth=i % 10,
                mode=["advisory", "enforcement", "mutate"][i % 3],
                tags=[f"tag-{j}" for j in range(i % 5)],
                metadata={"test_data": f"data-{i}"}
            )
            for i in range(args.events)
        ]

        # Measure performance
        start_time = time.time()

        for event in test_events:
            await logger.log_event(event)

        # Wait for all events to be processed
        await asyncio.sleep(2)

        end_time = time.time()
        metrics = await logger.get_performance_metrics()

        print("\n=== Performance Test Results ===")
        print(f"Events Generated: {args.events:,}")
        print(f"Processing Time: {end_time - start_time:.2f}s")
        print(f"Events per Second: {metrics.events_per_second:.0f}")
        print(f"Average Latency: {metrics.avg_latency_ms:.2f}ms")
        print(f"Memory Usage: {metrics.memory_usage_mb:.2f}MB")
        print(f"Disk Write: {metrics.disk_write_kb:.2f}KB")
        if metrics.compression_ratio > 0:
            print(f"Compression Ratio: {metrics.compression_ratio:.2f}")
        print(f"Error Count: {metrics.error_count}")

if __name__ == "__main__":
    asyncio.run(main())
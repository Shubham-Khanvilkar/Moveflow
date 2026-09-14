# ADR 003: Use Redis for Caching and Session Management

## Status
Accepted

## Context
We need a high-performance in-memory store for:
- Session storage (JWT refresh tokens)
- Rate limiting counters
- API response caching
- Real-time pub/sub for WebSocket events
- Distributed locking

## Decision
We will use Redis 7+ for caching, sessions, and pub/sub.

## Consequences
**Positive:**
- Sub-millisecond latency
- Rich data structures (hashes, sets, sorted sets)
- Built-in TTL/expiration
- Pub/sub for real-time features
- Lua scripting for atomic operations
- Cluster mode for horizontal scaling

**Negative:**
- Data loss on restart (unless persisted)
- Memory-limited storage
- Requires careful memory management

## Alternatives Considered
- Memcached - Simpler but no persistence/pubsub
- In-memory caches - Not distributed
- Database caching - Higher latency
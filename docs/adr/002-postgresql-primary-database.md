# ADR 002: Use PostgreSQL as Primary Database

## Status
Accepted

## Context
We need a reliable, ACID-compliant database for the NAVIRA platform that supports:
- Complex relational data (bookings, trips, fleet, billing)
- Multi-tenant data isolation
- JSON/JSONB for flexible schemas
- Strong consistency for financial transactions
- Point-in-time recovery

## Decision
We will use PostgreSQL 15+ as the primary database.

## Consequences
**Positive:**
- Mature, battle-tested RDBMS
- Excellent JSON support for flexible data
- Row-level security for multi-tenancy
- Rich indexing (GIN, GiST, BRIN)
- Strong ecosystem and tooling
- Supports advisory locks for distributed coordination

**Negative:**
- Horizontal scaling requires read replicas or sharding
- Write throughput limited to primary node
- Requires careful connection pooling

## Alternatives Considered
- MySQL - Good but weaker JSON support
- MongoDB - No ACID for multi-document transactions
- CockroachDB - More complex, less mature ecosystem
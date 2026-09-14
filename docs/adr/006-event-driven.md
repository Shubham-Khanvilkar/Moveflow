# ADR 006: Event-Driven Architecture with Webhooks and Pub/Sub

## Status
Accepted

## Context
NAVIRA needs to support real-time notifications and integrations:
- External systems need to react to booking/trip events
- Real-time UI updates via WebSocket
- Audit logging for all state changes
- Decoupled service communication

## Decision
We will implement event-driven patterns using:
1. **Internal events**: Redis pub/sub for real-time WebSocket broadcasts
2. **External integrations**: Webhook dispatcher with retry/backoff
3. **Audit trail**: Database audit log table for all mutations
4. **Domain events**: Service-level events for cross-module communication

## Consequences
**Positive:**
- Loose coupling between modules
- Real-time updates without polling
- Extensible for new integrations
- Audit trail for compliance

**Negative:**
- Eventual consistency complexity
- Webhook delivery reliability requires retry logic
- Event schema evolution needs care
- Debugging distributed flows harder

## Implementation
- `WebhookDispatcherService` handles external webhooks with exponential backoff
- `EventsGateway` broadcasts real-time events via Socket.io
- `AuditService` logs all mutations with before/after values
- Domain events emitted via `EventEmitter2` within services

## Alternatives Considered
- Direct service calls - Tight coupling, cascading failures
- Message queue (RabbitMQ/Kafka) - Overkill for current scale
- Polling - High latency, resource waste
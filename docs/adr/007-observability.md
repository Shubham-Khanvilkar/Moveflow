# ADR 007: Observability Stack with Prometheus, Grafana, and OpenTelemetry

## Status
Accepted

## Context
We need comprehensive observability for the NAVIRA platform:
- Metrics for system health and business KPIs
- Distributed tracing for request flows
- Structured logging for debugging
- Alerting for production incidents

## Decision
We will use:
- **Metrics**: Prometheus with `/metrics` endpoint on all services
- **Tracing**: OpenTelemetry with Jaeger backend
- **Logging**: Structured JSON logs to stdout, collected by Fluent Bit
- **Visualization**: Grafana dashboards
- **Alerting**: Prometheus Alertmanager with PagerDuty/Slack

## Consequences
**Positive:**
- Industry-standard stack
- Vendor-neutral (CNCF projects)
- Rich ecosystem of exporters
- Unified dashboards for infra and app metrics

**Negative:**
- Operational overhead of running Prometheus/Grafana
- Trace sampling needed at scale
- Correlation IDs required across services
- Log volume management

## Implementation
- `MetricsService` exposes Prometheus-compatible `/metrics` endpoint
- HTTP interceptors record request latency, error rates
- OpenTelemetry SDK auto-instruments NestJS/Express
- Structured logging with correlation IDs
- Pre-built Grafana dashboards for NestJS, PostgreSQL, Redis

## Alternatives Considered
- Datadog/New Relic - Vendor lock-in, cost at scale
- CloudWatch - AWS-specific, limited tracing
- Custom solution - High maintenance
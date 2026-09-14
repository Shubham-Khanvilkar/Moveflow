# ADR 001: Use NestJS for API Gateway

## Status
Accepted

## Context
We need a robust, scalable framework for the NAVIRA API Gateway that supports:
- TypeScript-first development
- Dependency injection and modular architecture
- Built-in validation, guards, interceptors
- WebSocket support
- OpenAPI/Swagger generation
- Microservice-ready patterns

## Decision
We will use NestJS as the primary framework for the API Gateway.

## Consequences
**Positive:**
- Excellent TypeScript support with decorators
- Modular architecture matches our domain boundaries
- Built-in security features (guards, pipes, interceptors)
- Strong ecosystem and community
- Easy testing with built-in test utilities

**Negative:**
- Learning curve for developers new to NestJS
- Decorator-heavy syntax may be unfamiliar
- Opinionated structure may not fit all use cases

## Alternatives Considered
- Express.js with TypeScript - More flexible but less structure
- Fastify - Fast but less built-in features
- Custom framework - Too much maintenance burden
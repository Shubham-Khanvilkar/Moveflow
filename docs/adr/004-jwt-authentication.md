# ADR 004: JWT-Based Authentication with Refresh Tokens

## Status
Accepted

## Context
We need a stateless, scalable authentication mechanism for the NAVIRA platform that supports:
- Multi-tenant access control
- Role-based and scope-based authorization
- Short-lived access tokens with refresh capability
- Secure token invalidation on logout

## Decision
We will use JWT (JSON Web Tokens) with short-lived access tokens (15 min) and longer-lived refresh tokens (7 days) stored in Redis.

## Consequences
**Positive:**
- Stateless authentication (no server-side session storage for access tokens)
- Scalable across multiple API instances
- Refresh tokens enable secure rotation and revocation
- Payload can include tenant context, roles, scopes

**Negative:**
- Token size increases with claims
- Cannot easily revoke access tokens before expiry
- Requires secure secret management
- Clock skew can cause issues

## Implementation Details
- Access tokens: 15 minutes, RS256 signed
- Refresh tokens: 7 days, stored in Redis with user/device binding
- Token rotation on refresh
- Immediate revocation on logout/password change

## Alternatives Considered
- Session cookies - Not stateless, CSRF concerns
- Opaque tokens - Requires token introspection endpoint
- API keys - No built-in expiration, harder to rotate
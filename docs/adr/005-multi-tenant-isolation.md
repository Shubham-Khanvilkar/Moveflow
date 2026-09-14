# ADR 005: Row-Level Security for Multi-Tenant Data Isolation

## Status
Accepted

## Context
NAVIRA is a multi-tenant SaaS platform where each customer (company) must have complete data isolation from other customers. We need a strategy that:
- Prevents cross-tenant data access at the database level
- Works with existing ORM (Prisma)
- Supports row-level policies
- Has minimal performance overhead

## Decision
We will implement multi-tenant isolation using:
1. PostgreSQL Row-Level Security (RLS) policies on all tenant-scoped tables
2. `company_id` column on all tenant tables
3. Application-level AccessScopeGuard for additional validation
4. JWT claims include `companyId` for tenant context

## Consequences
**Positive:**
- Database-enforced isolation (defense in depth)
- Works even if application logic has bugs
- Minimal performance overhead with proper indexes
- Supports shared-schema multi-tenancy (cost-effective)

**Negative:**
- Requires RLS policy on every tenant table
- Migrations must include RLS setup
- Connection pooling must set tenant context
- Super admin access requires bypass mechanism (audited)

## Implementation
```sql
-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy for tenant isolation
CREATE POLICY tenant_isolation ON bookings
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

## Alternatives Considered
- Separate databases per tenant - Higher cost, complex migrations
- Separate schemas per tenant - Complex migrations, connection pooling issues
- Application-only filtering - Risk of bugs exposing data
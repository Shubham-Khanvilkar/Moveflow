# ADR 008: Data Privacy and GDPR Compliance

## Status
Accepted

## Context
NAVIRA processes personal data (employee info, GPS locations, trip history) and must comply with:
- GDPR (EU)
- India's DPDP Act
- Data retention requirements
- Data Subject Access Requests (DSAR)
- Right to erasure

## Decision
We will implement privacy by design with:
1. **Encryption at rest**: AES-256 for PII columns (email, phone, address)
2. **Field-level encryption**: Prisma middleware for transparent encryption
3. **Data retention policies**: Configurable per entity type with automated cleanup
4. **DSAR automation**: `DSARService` for access/deletion requests
5. **Audit logging**: Immutable audit trail with hash chaining
6. **Data minimization**: Only collect necessary fields

## Consequences
**Positive:**
- Regulatory compliance built-in
- Automated retention reduces risk
- DSAR handling without manual intervention
- Audit trail for compliance evidence

**Negative:**
- Encryption adds complexity to queries
- Key rotation requires re-encryption
- Retention policies need legal review
- DSAR automation must handle edge cases

## Implementation
- `DataRetentionService` runs daily cron to purge expired data
- `DSARService` handles access/deletion requests with approval workflow
- PII fields encrypted via Prisma middleware using AES-256-GCM
- Audit logs include SHA-256 hash chain for tamper detection
- Privacy impact assessment documented per feature

## Alternatives Considered
- Manual processes - Not scalable, error-prone
- Third-party privacy tools - Vendor dependency, cost
- Full database encryption - Doesn't help with DSAR/retention
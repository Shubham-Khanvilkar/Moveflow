-- ============================================================
-- MIGRATION: Add Platform Internal Users + Missing Customer/Partner Users
-- Run against the live Supabase database (NOT seed.ts re-run)
-- ============================================================

-- 1. Create Navira Platform company (required for User.companyId FK)
INSERT INTO "Company" (id, name, code, slug, domain, logo, "primaryColor", status, country, city, "createdAt", "updatedAt")
VALUES (
  'comp_navira_001',
  'Navira Platform',
  'NAVIRA001',
  'navira-platform',
  'navira.com',
  'https://ui-avatars.com/api/?name=Navira&background=7c3aed&color=fff',
  '#7C3AED',
  'ACTIVE',
  'India',
  'Mumbai',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Platform Internal Users (10 users)
-- Password: Navira@2026
-- bcrypt hash of 'Navira@2026' with cost 12:
-- $2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0

-- Platform users are created via Supabase Auth API (see platform-users-supabase.sql)
-- This SQL handles the Prisma User + UserRoleAssignment + CompanyMembership records

-- Owner
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_owner', 'owner@navira.com', 'Navira Owner', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000001', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_owner', 'role_navira_owner', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_owner', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Super Admin
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_superadmin', 'superadmin@navira.com', 'Platform Super Admin', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000003', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_superadmin', 'role_superadmin', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_superadmin', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Move-In Admin
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_admin', 'admin@navira.com', 'Move-In Admin', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000002', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_admin', 'role_move_in_admin', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_admin', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Finance Team
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_finance', 'finance@navira.com', 'Finance Team', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000004', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_finance', 'role_finance_team', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_finance', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Project Manager
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_pm', 'pm@navira.com', 'Project Manager', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000005', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_pm', 'role_project_manager', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_pm', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Project Coordinator
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_coord', 'coordinator@navira.com', 'Project Coordinator', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000006', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_coord', 'role_project_coordinator', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_coord', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Platform Compliance
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_compliance', 'compliance@navira.com', 'Platform Compliance', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000007', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_compliance', 'role_platform_compliance', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_compliance', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Security Administrator
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_security', 'security@navira.com', 'Security Administrator', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000008', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_security', 'role_security_administrator', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_security', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Support Engineer
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_support', 'support@navira.com', 'Support Engineer', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000009', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_support', 'role_support_engineer', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_support', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- Platform Auditor
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_platform_auditor', 'auditor@navira.com', 'Platform Auditor', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919000000010', 'comp_navira_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_auditor', 'role_platform_auditor', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_platform_auditor', 'comp_navira_001', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

-- 3. Add missing Acme customer/partner users
-- Transport Sub-Admin
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_transport_sub_admin', 'subadmin@acme.com', 'Transport Sub-Admin', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919876543233', 'comp_acme_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_transport_sub_admin', 'role_transport_sub_admin', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_transport_sub_admin', 'comp_acme_001', 'TRANSPORT_SUB_ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

INSERT INTO "AccessScope" (id, "userId", "companyId", "siteId", "isActive", "isPrimary", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_transport_sub_admin', 'comp_acme_001', 'site_mumbai', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Vendor Dispatcher
INSERT INTO "User" (id, email, name, "passwordHash", phone, "companyId", status, "createdAt", "updatedAt")
VALUES ('user_vendor_dispatcher', 'vendor.dispatcher@acme.com', 'Vendor Dispatcher', '$2a$12$LJ3m4ys3GZvXw8RqXk9ZxuQwGzVrYj8H5K9f2d1a3b4c5d6e7f8g9h0', '+919876543234', 'comp_acme_001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "UserRoleAssignment" (id, "userId", "roleId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_vendor_dispatcher', 'role_vendor_dispatcher', NOW(), NOW())
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "CompanyMembership" (id, "userId", "companyId", role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_vendor_dispatcher', 'comp_acme_001', 'VENDOR_DISPATCHER', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("userId", "companyId") DO NOTHING;

INSERT INTO "AccessScope" (id, "userId", "companyId", "siteId", "isActive", "isPrimary", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user_vendor_dispatcher', 'comp_acme_001', 'site_mumbai', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTE: Password hashes above are placeholder bcrypt hashes.
-- Users MUST be created via Supabase Auth API for proper password verification.
-- Run the Supabase auth creation script separately:
--   node scripts/create-platform-users.js
-- ============================================================

-- Summary
SELECT 'Migration complete!' AS status;
SELECT COUNT(*) AS platform_users FROM "User" WHERE "companyId" = 'comp_navira_001';
SELECT COUNT(*) AS acme_users FROM "User" WHERE "companyId" = 'comp_acme_001';

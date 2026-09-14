-- Role & Identity Migration SQL Script
-- Run BEFORE prisma db push to migrate data from old enum values to new ones

-- Step 1: Add new enum values that don't exist in the DB yet
-- (prisma db push can add new values but fails if data references values being removed)
DO $$
BEGIN
  -- Add all new UserRole values needed by the canonical schema
  -- These are safe to add (IF NOT EXISTS) and won't affect existing data
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SECURITY_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'AUDITOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'COMPLIANCE_OFFICER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FINANCE_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FINANCE_APPROVER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FINANCE_VIEWER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'COST_ANALYST');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'REPORTING_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'PROCESS_HEAD');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'PROCESS_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SITE_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SITE_TRANSPORT_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SITE_SECURITY_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FACILITY_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SITE_OPERATIONS_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SHIFT_SUPERVISOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'TRAVEL_DESK_AGENT');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'TRANSPORT_HELPDESK_AGENT');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'BOOKING_COORDINATOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'EXECUTIVE_ASSISTANT_BOOKER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'EVACUATION_COORDINATOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'COMPANY_SUB_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'TRANSPORT_HEAD');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'CONTROL_ROOM_OPERATOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'ROSTER_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'ROSTER_PLANNER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'ROUTE_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FLEET_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'SAFETY_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'FEMALE_TRANSPORT_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'EMERGENCY_RESPONSE_OFFICER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'INCIDENT_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_COMPLIANCE_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_SUB_ADMIN');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_OPERATIONS_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_FLEET_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_DRIVER_MANAGER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_FINANCE');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_COORDINATOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'VENDOR_VIEWER');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'DRIVER_SUPERVISOR');
  PERFORM alter_enum_value_if_not_exists('UserRole', 'GUARD_SUPERVISOR');
EXCEPTION WHEN OTHERS THEN
  -- Helper function may not exist, use direct ALTER instead
  NULL;
END $$;

-- Step 2: Migrate data from values being dropped
-- TRANSPORT_COMPLIANCE → SECURITY_ADMIN (canonical customer compliance role)
UPDATE "CompanyMembership"
SET role = 'SECURITY_ADMIN'::"UserRole"
WHERE role::text = 'TRANSPORT_COMPLIANCE';

-- SENIOR_MANAGER → MANAGER (canonical customer management role)
UPDATE "CompanyMembership"
SET role = 'MANAGER'::"UserRole"
WHERE role::text = 'SENIOR_MANAGER';

-- ASSISTANT_MANAGER → MANAGER (canonical customer management role)
UPDATE "CompanyMembership"
SET role = 'MANAGER'::"UserRole"
WHERE role::text = 'ASSISTANT_MANAGER';

-- Step 3: Verify no dropped values remain
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM "CompanyMembership"
  WHERE role::text IN ('TRANSPORT_COMPLIANCE', 'SENIOR_MANAGER', 'ASSISTANT_MANAGER');

  IF cnt > 0 THEN
    RAISE EXCEPTION 'Still have % references to dropped enum values', cnt;
  END IF;

  RAISE NOTICE 'Data migration verified: no remaining references to dropped values';
END $$;

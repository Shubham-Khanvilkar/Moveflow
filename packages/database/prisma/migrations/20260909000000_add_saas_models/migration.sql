-- Plan 7: Platform SaaS models
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "tier" TEXT NOT NULL DEFAULT 'STARTER',
  "monthlyPrice" DECIMAL(10,2) NOT NULL,
  "annualPrice" DECIMAL(10,2) NOT NULL,
  "maxEmployees" INTEGER NOT NULL DEFAULT 100,
  "maxVehicles" INTEGER NOT NULL DEFAULT 50,
  "maxDrivers" INTEGER NOT NULL DEFAULT 50,
  "maxSites" INTEGER NOT NULL DEFAULT 5,
  "features" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPlan_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "trialEndsAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SubscriptionUsage" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "metricCode" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionUsage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WebhookConfig" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT[] NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastTriggeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WebhookLog" (
  "id" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SSOConfiguration" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientSecret" TEXT NOT NULL,
  "issuerUrl" TEXT NOT NULL,
  "metadataUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "enforceSSO" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SSOConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SSOConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL DEFAULT 90,
  "autoDelete" BOOLEAN NOT NULL DEFAULT false,
  "lastCleanupAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DSARRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "responseUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DSARRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "SubscriptionUsage_subscriptionId_metricCode_idx" ON "SubscriptionUsage"("subscriptionId", "metricCode");
CREATE INDEX IF NOT EXISTS "WebhookConfig_companyId_status_idx" ON "WebhookConfig"("companyId", "status");
CREATE INDEX IF NOT EXISTS "WebhookLog_webhookId_deliveredAt_idx" ON "WebhookLog"("webhookId", "deliveredAt");
CREATE INDEX IF NOT EXISTS "SSOConfiguration_companyId_idx" ON "SSOConfiguration"("companyId");
CREATE INDEX IF NOT EXISTS "DataRetentionPolicy_companyId_entityType_idx" ON "DataRetentionPolicy"("companyId", "entityType");
CREATE INDEX IF NOT EXISTS "DSARRequest_companyId_userId_idx" ON "DSARRequest"("companyId", "userId");
CREATE INDEX IF NOT EXISTS "DSARRequest_status_idx" ON "DSARRequest"("status");

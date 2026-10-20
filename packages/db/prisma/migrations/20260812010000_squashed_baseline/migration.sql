-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SolutionCategory" AS ENUM ('SAAS_PLATFORM', 'LAUNCH_KIT', 'AI_AUTOMATION', 'PRODUCTIZED_SERVICE', 'MARKETPLACE_SOLUTION', 'MARKET_ENABLEMENT');

-- CreateEnum
CREATE TYPE "LicenseModel" AS ENUM ('SUBSCRIPTION', 'ONE_TIME', 'REVENUE_SHARE');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('GCC', 'EUROPE', 'GLOBAL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PARTNER', 'VENDOR', 'RESELLER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "DemoStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'BIZUM', 'COUPON');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('LICENSE', 'SUBSCRIPTION', 'SERVICE');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('SOLUTION', 'PARTNER', 'SERVICE');

-- CreateEnum
CREATE TYPE "GmRole" AS ENUM ('BOARD', 'CEO', 'COO', 'CFO', 'CTO', 'DOC_CONTROLLER', 'ENTITY_GM', 'FUNCTIONAL_DIRECTOR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'EXTERNAL', 'AI_OPS', 'INFRA_ADMIN');

-- CreateEnum
CREATE TYPE "ApprovalLevel" AS ENUM ('A0', 'A1', 'A2', 'A3', 'A4');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "Confidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'PRIVILEGED');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('NEW', 'TRIAGED', 'PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'APPROVED', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "DocState" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'EXECUTED', 'SUPERSEDED', 'ARCHIVED', 'DELETION_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "GateKind" AS ENUM ('AUTO', 'AUTO_WITH_AUDIT', 'HUMAN_APPROVAL', 'HUMAN_ONLY', 'DUAL_HUMAN_APPROVAL', 'RECORDS_OWNER_AND_LEGAL_APPROVAL', 'SECURITY_OWNER_APPROVAL');

-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('HUMAN', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OrgTier" AS ENUM ('BOARD', 'GROUP_CEO', 'EXCO', 'ENTITY_GM', 'FUNCTIONAL_DIRECTOR', 'DEPARTMENT_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'EXTERNAL', 'AI_AGENT', 'INFRA_ADMIN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'ADVISOR');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'ON_LEAVE', 'NOTICE', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'PARENTAL', 'COMPASSIONATE', 'PUBLIC_HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('DRAFT', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'TAKEN');

-- CreateEnum
CREATE TYPE "JmlKind" AS ENUM ('JOINER', 'MOVER', 'LEAVER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('ORGANIZATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE_CUSTOMER', 'INACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ON_HOLD', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('NEW_PROJECT', 'VARIATION', 'MAINTENANCE', 'SUBSCRIPTION', 'RENEWAL', 'CONSULTANCY', 'PRODUCT_SALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'TASK', 'DOCUMENT', 'PROPOSAL', 'STATUS_CHANGE', 'APPROVAL', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('UNKNOWN', 'LEGITIMATE_INTEREST', 'CONSENTED', 'OPTED_OUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "locale" TEXT,
    "emailVerified" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "planExpiresAt" TIMESTAMP(3),
    "onboarded" BOOLEAN NOT NULL DEFAULT true,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeConnectId" TEXT,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerPolicyAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "providerData" JSONB,
    "couponId" TEXT,
    "discountCents" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENT',
    "amount" INTEGER NOT NULL,
    "appliesToPlan" "Plan",
    "maxRedemptions" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "assignedToUserId" TEXT,
    "ownerId" TEXT,
    "isReferral" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT,
    "ownerId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSale" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "solutionId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "partnerShare" INTEGER NOT NULL,
    "platformShare" INTEGER NOT NULL,
    "customerRef" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-realtime',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "solutionId" TEXT,
    "userId" TEXT,
    "ownerId" TEXT,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSolution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "alerts" BOOLEAN NOT NULL DEFAULT false,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "preferredAt" TIMESTAMP(3),
    "note" TEXT,
    "status" "DemoStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" "SolutionCategory" NOT NULL,
    "licenseModel" "LicenseModel" NOT NULL DEFAULT 'SUBSCRIPTION',
    "region" "Region" NOT NULL DEFAULT 'GLOBAL',
    "vendorName" TEXT,
    "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "partnerSharePercent" INTEGER NOT NULL DEFAULT 50,
    "code" TEXT,
    "tags" TEXT[],
    "images" TEXT[],
    "demoMedia" TEXT[],
    "techStack" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "externalId" TEXT,
    "url" TEXT,
    "ownerId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featuredUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerId" TEXT,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDemo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoScene" (
    "id" TEXT NOT NULL,
    "demoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "hotspots" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "DemoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "region" "Region" NOT NULL DEFAULT 'GLOBAL',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMember" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartnerRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "partyOneId" TEXT NOT NULL,
    "partyTwoId" TEXT NOT NULL,
    "solutionId" TEXT,
    "partnerId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "value" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "signedByPartyOneAt" TIMESTAMP(3),
    "signedByPartyTwoAt" TIMESTAMP(3),
    "eSignatureRef" TEXT,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "solutionId" TEXT,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "attachments" TEXT[],
    "replyToId" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "targetType" "ReviewTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "moderated" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Translation" (
    "hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "syncUrl" TEXT,
    "syncSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProductKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerSale" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "couponId" TEXT,
    "source" TEXT NOT NULL,
    "productKeyId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "commission" INTEGER NOT NULL,
    "customerRef" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "solutionId" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforcePerson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "roleKey" TEXT,
    "roleCopy" JSONB,
    "email" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "linkedin" TEXT,
    "photo" TEXT,
    "phones" JSONB NOT NULL,
    "whatsappDisplay" TEXT,
    "whatsappHref" TEXT,
    "branchSlugs" JSONB,
    "qrPath" TEXT,
    "vcfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforcePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "stages" JSONB NOT NULL,
    "onApproved" TEXT NOT NULL,
    "onRejected" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "definitionCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "companyId" TEXT,
    "requestedById" TEXT NOT NULL,
    "subjectMemberId" TEXT,
    "currentStageKey" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RUNNING',
    "evidence" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDecision" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "deciderId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "onBehalfOf" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "entityType" TEXT NOT NULL,
    "entityRef" TEXT NOT NULL,
    "companyId" TEXT,
    "correlationId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "note" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "registrationLabel" TEXT,
    "registrationValue" TEXT,
    "taxId" TEXT,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL,
    "flag" TEXT,
    "legalName" TEXT NOT NULL,
    "legalForm" TEXT,
    "registrationLabel" TEXT,
    "registrationNo" TEXT,
    "taxLabel" TEXT,
    "taxNo" TEXT,
    "authority" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "countryName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCard" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "copy" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "photo" TEXT,
    "locale" TEXT,
    "role" "GmRole" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "entityId" TEXT,
    "departmentId" TEXT,
    "approvalLevel" "ApprovalLevel" NOT NULL DEFAULT 'A0',
    "clearance" "Confidentiality" NOT NULL DEFAULT 'INTERNAL',
    "managerId" TEXT,
    "personId" TEXT,
    "positionId" TEXT,
    "grantedCapabilities" JSONB,
    "portalPasswordHash" TEXT,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpConfirmedAt" TIMESTAMP(3),
    "recoveryCodes" JSONB,
    "invitedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSession" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamLoginToken" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" "TaskState" NOT NULL DEFAULT 'NEW',
    "priority" "TaskPriority" NOT NULL DEFAULT 'P2',
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "agentKey" TEXT,
    "approverId" TEXT,
    "entityId" TEXT,
    "departmentId" TEXT,
    "project" TEXT,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNAL',
    "inputs" JSONB,
    "expectedOutputs" JSONB,
    "acceptanceCriteria" TEXT,
    "destination" TEXT,
    "dependencies" JSONB,
    "evidence" JSONB,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "aiConfidence" DOUBLE PRECISION,
    "parentId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorKind" "ActorKind" NOT NULL,
    "actorRef" TEXT NOT NULL,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "fromState" "TaskState",
    "toState" "TaskState",
    "note" TEXT,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledDocument" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "shortTitle" TEXT NOT NULL,
    "ownerRole" TEXT NOT NULL,
    "versionMajor" INTEGER NOT NULL DEFAULT 0,
    "versionMinor" INTEGER NOT NULL DEFAULT 1,
    "state" "DocState" NOT NULL DEFAULT 'DRAFT',
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNAL',
    "ownerId" TEXT NOT NULL,
    "custodianId" TEXT,
    "retentionClass" TEXT NOT NULL,
    "retainUntil" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "storagePath" TEXT,
    "sha256" TEXT,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "aiConfidence" DOUBLE PRECISION,
    "relatedIds" JSONB,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlledDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorKind" "ActorKind" NOT NULL,
    "actorRef" TEXT NOT NULL,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "fromState" "DocState",
    "toState" "DocState",
    "note" TEXT,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "gate" "GateKind" NOT NULL,
    "taskId" TEXT,
    "documentId" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "minLevel" "ApprovalLevel" NOT NULL DEFAULT 'A2',
    "requestedByKind" "ActorKind" NOT NULL,
    "requestedByRef" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "deciderId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "level" "ApprovalLevel" NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRegistry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "maxGate" "GateKind" NOT NULL DEFAULT 'AUTO_WITH_AUDIT',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoFileConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.92,
    "humanReviewConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "taskId" TEXT,
    "documentId" TEXT,
    "outcome" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "gateReason" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "conditions" JSONB,
    "relatedIds" JSONB,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgPosition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" "OrgTier" NOT NULL,
    "role" "GmRole" NOT NULL,
    "title" TEXT NOT NULL,
    "entityId" TEXT,
    "departmentId" TEXT,
    "approvalLevel" "ApprovalLevel" NOT NULL DEFAULT 'A0',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "executiveOwner" TEXT NOT NULL,
    "purpose" TEXT,
    "headId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "employeeNo" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ONBOARDING',
    "contractEntityId" TEXT,
    "workLocation" TEXT,
    "startDate" TIMESTAMP(3),
    "probationEndsAt" TIMESTAMP(3),
    "noticeGivenAt" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "personalEmail" TEXT,
    "personalPhone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "dietaryNotes" TEXT,
    "accessibilityNotes" TEXT,
    "hrNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compensation" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'ANNUAL',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "LeaveType" NOT NULL,
    "entitledDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "takenDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JmlEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "JmlKind" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completedSteps" JSONB,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JmlEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardChangeRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT,
    "proposed" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "classification" "Confidentiality" NOT NULL DEFAULT 'RESTRICTED',
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "documentId" TEXT,
    "dueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "providedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "waivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryFolder" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderEvent" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "detail" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "customerType" "CustomerType" NOT NULL DEFAULT 'ORGANIZATION',
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "taxId" TEXT,
    "websiteDomain" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "country" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "classification" "Confidentiality" NOT NULL DEFAULT 'CONFIDENTIAL',
    "ownerId" TEXT NOT NULL,
    "entityScope" JSONB,
    "tags" JSONB,
    "mergedFrom" JSONB,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "emails" JSONB,
    "phones" JSONB,
    "preferredChannel" TEXT NOT NULL DEFAULT 'unknown',
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opportunityType" "OpportunityType" NOT NULL DEFAULT 'NEW_PROJECT',
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "ownerId" TEXT NOT NULL,
    "entityId" TEXT,
    "currency" TEXT,
    "estimatedValueMinor" INTEGER,
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "lostReasonDetail" TEXT,
    "holdReason" TEXT,
    "followUpDate" TIMESTAMP(3),
    "handoverOwnerId" TEXT,
    "closedAt" TIMESTAMP(3),
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3),
    "breachCount" INTEGER NOT NULL DEFAULT 0,
    "lastBreachAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityStageEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityStageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "actorId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "contactIds" JSONB,
    "sourceUri" TEXT,
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNAL',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "provenance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'COURSE',
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "serialNumber" TEXT,
    "entityId" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "valueMinor" INTEGER,
    "currency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedToId" TEXT,
    "condition" TEXT,
    "note" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectId_key" ON "User"("stripeConnectId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_assignedToUserId_idx" ON "Coupon"("assignedToUserId");

-- CreateIndex
CREATE INDEX "Coupon_ownerId_idx" ON "Coupon"("ownerId");

-- CreateIndex
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");

-- CreateIndex
CREATE INDEX "Payout_resellerId_idx" ON "Payout"("resellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerApiKey_keyHash_key" ON "PartnerApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "PartnerApiKey_ownerId_idx" ON "PartnerApiKey"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSale_externalId_key" ON "PartnerSale"("externalId");

-- CreateIndex
CREATE INDEX "PartnerSale_ownerId_idx" ON "PartnerSale"("ownerId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "AgentUsage_userId_idx" ON "AgentUsage"("userId");

-- CreateIndex
CREATE INDEX "AgentUsage_createdAt_idx" ON "AgentUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_token_key" ON "AuthToken"("token");

-- CreateIndex
CREATE INDEX "AuthToken_userId_idx" ON "AuthToken"("userId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_solutionId_idx" ON "Lead"("solutionId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "SavedSolution_userId_idx" ON "SavedSolution"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSolution_userId_solutionId_key" ON "SavedSolution"("userId", "solutionId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "DemoRequest_userId_idx" ON "DemoRequest"("userId");

-- CreateIndex
CREATE INDEX "DemoRequest_solutionId_idx" ON "DemoRequest"("solutionId");

-- CreateIndex
CREATE INDEX "DemoRequest_status_idx" ON "DemoRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_slug_key" ON "Solution"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_code_key" ON "Solution"("code");

-- CreateIndex
CREATE INDEX "Solution_category_idx" ON "Solution"("category");

-- CreateIndex
CREATE INDEX "Solution_licenseModel_idx" ON "Solution"("licenseModel");

-- CreateIndex
CREATE INDEX "Solution_featured_idx" ON "Solution"("featured");

-- CreateIndex
CREATE INDEX "Solution_region_idx" ON "Solution"("region");

-- CreateIndex
CREATE INDEX "Solution_ownerId_idx" ON "Solution"("ownerId");

-- CreateIndex
CREATE INDEX "Solution_published_idx" ON "Solution"("published");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_source_externalId_key" ON "Solution"("source", "externalId");

-- CreateIndex
CREATE INDEX "ProductDemo_userId_idx" ON "ProductDemo"("userId");

-- CreateIndex
CREATE INDEX "DemoScene_demoId_idx" ON "DemoScene"("demoId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE INDEX "Partner_ownerId_idx" ON "Partner"("ownerId");

-- CreateIndex
CREATE INDEX "PartnerMember_userId_idx" ON "PartnerMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_key" ON "PartnerMember"("partnerId", "userId");

-- CreateIndex
CREATE INDEX "Agreement_partyOneId_idx" ON "Agreement"("partyOneId");

-- CreateIndex
CREATE INDEX "Agreement_partyTwoId_idx" ON "Agreement"("partyTwoId");

-- CreateIndex
CREATE INDEX "Agreement_solutionId_idx" ON "Agreement"("solutionId");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Agreement_partnerId_idx" ON "Agreement"("partnerId");

-- CreateIndex
CREATE INDEX "AgreementDocument_agreementId_idx" ON "AgreementDocument"("agreementId");

-- CreateIndex
CREATE INDEX "Conversation_solutionId_idx" ON "Conversation"("solutionId");

-- CreateIndex
CREATE INDEX "Conversation_partnerId_idx" ON "Conversation"("partnerId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Review_targetType_targetId_idx" ON "Review"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

-- CreateIndex
CREATE INDEX "Review_approved_idx" ON "Review"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewerId_targetType_targetId_key" ON "Review"("reviewerId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductKey_keyHash_key" ON "ProductKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ResellerSale_externalId_key" ON "ResellerSale"("externalId");

-- CreateIndex
CREATE INDEX "ResellerSale_resellerId_idx" ON "ResellerSale"("resellerId");

-- CreateIndex
CREATE INDEX "ResellerSale_productKeyId_idx" ON "ResellerSale"("productKeyId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_published_publishedAt_idx" ON "Post"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "DomainEvent_type_createdAt_idx" ON "DomainEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "DomainEvent_createdAt_idx" ON "DomainEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkforcePerson_slug_key" ON "WorkforcePerson"("slug");

-- CreateIndex
CREATE INDEX "WorkforcePerson_position_idx" ON "WorkforcePerson"("position");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_code_active_idx" ON "WorkflowDefinition"("code", "active");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_trigger_idx" ON "WorkflowDefinition"("trigger");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_code_version_key" ON "WorkflowDefinition"("code", "version");

-- CreateIndex
CREATE INDEX "WorkflowInstance_state_currentStageKey_idx" ON "WorkflowInstance"("state", "currentStageKey");

-- CreateIndex
CREATE INDEX "WorkflowInstance_subjectType_subjectRef_idx" ON "WorkflowInstance"("subjectType", "subjectRef");

-- CreateIndex
CREATE INDEX "WorkflowInstance_companyId_state_idx" ON "WorkflowInstance"("companyId", "state");

-- CreateIndex
CREATE INDEX "WorkflowInstance_definitionCode_state_idx" ON "WorkflowInstance"("definitionCode", "state");

-- CreateIndex
CREATE INDEX "WorkflowDecision_instanceId_at_idx" ON "WorkflowDecision"("instanceId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDecision_instanceId_stageKey_deciderId_key" ON "WorkflowDecision"("instanceId", "stageKey", "deciderId");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- CreateIndex
CREATE INDEX "AuditEvent_companyId_at_idx" ON "AuditEvent"("companyId", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityRef_at_idx" ON "AuditEvent"("entityType", "entityRef", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_at_idx" ON "AuditEvent"("actorId", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_at_idx" ON "AuditEvent"("action", "at");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessGroup_name_key" ON "BusinessGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "Company_groupId_idx" ON "Company"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_slug_key" ON "Branch"("slug");

-- CreateIndex
CREATE INDEX "Branch_position_idx" ON "Branch"("position");

-- CreateIndex
CREATE INDEX "SiteCard_section_position_idx" ON "SiteCard"("section", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SiteCard_section_slug_key" ON "SiteCard"("section", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_personId_key" ON "TeamMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_positionId_key" ON "TeamMember"("positionId");

-- CreateIndex
CREATE INDEX "TeamMember_status_idx" ON "TeamMember"("status");

-- CreateIndex
CREATE INDEX "TeamMember_managerId_idx" ON "TeamMember"("managerId");

-- CreateIndex
CREATE INDEX "TeamMember_entityId_departmentId_idx" ON "TeamMember"("entityId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_tokenHash_key" ON "TeamSession"("tokenHash");

-- CreateIndex
CREATE INDEX "TeamSession_memberId_idx" ON "TeamSession"("memberId");

-- CreateIndex
CREATE INDEX "TeamSession_expiresAt_idx" ON "TeamSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamLoginToken_tokenHash_key" ON "TeamLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TeamLoginToken_memberId_idx" ON "TeamLoginToken"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_ref_key" ON "Task"("ref");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_state_dueAt_idx" ON "Task"("state", "dueAt");

-- CreateIndex
CREATE INDEX "Task_entityId_departmentId_idx" ON "Task"("entityId", "departmentId");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_at_idx" ON "TaskEvent"("taskId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledDocument_docId_key" ON "ControlledDocument"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledDocument_supersedesId_key" ON "ControlledDocument"("supersedesId");

-- CreateIndex
CREATE INDEX "ControlledDocument_state_idx" ON "ControlledDocument"("state");

-- CreateIndex
CREATE INDEX "ControlledDocument_confidentiality_idx" ON "ControlledDocument"("confidentiality");

-- CreateIndex
CREATE INDEX "ControlledDocument_retainUntil_idx" ON "ControlledDocument"("retainUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledDocument_entityId_departmentId_docType_year_seque_key" ON "ControlledDocument"("entityId", "departmentId", "docType", "year", "sequence");

-- CreateIndex
CREATE INDEX "DocumentEvent_documentId_at_idx" ON "DocumentEvent"("documentId", "at");

-- CreateIndex
CREATE INDEX "ApprovalRequest_outcome_createdAt_idx" ON "ApprovalRequest"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalDecision_requestId_idx" ON "ApprovalDecision"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalDecision_requestId_deciderId_key" ON "ApprovalDecision"("requestId", "deciderId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRegistry_key_key" ON "AgentRegistry"("key");

-- CreateIndex
CREATE INDEX "AgentRun_agentKey_startedAt_idx" ON "AgentRun"("agentKey", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_outcome_idx" ON "AgentRun"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_ref_key" ON "Decision"("ref");

-- CreateIndex
CREATE INDEX "Decision_decidedAt_idx" ON "Decision"("decidedAt");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgPosition_code_key" ON "OrgPosition"("code");

-- CreateIndex
CREATE INDEX "OrgPosition_entityId_tier_idx" ON "OrgPosition"("entityId", "tier");

-- CreateIndex
CREATE INDEX "OrgPosition_parentId_idx" ON "OrgPosition"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRecord_memberId_key" ON "EmployeeRecord"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRecord_employeeNo_key" ON "EmployeeRecord"("employeeNo");

-- CreateIndex
CREATE INDEX "EmployeeRecord_status_idx" ON "EmployeeRecord"("status");

-- CreateIndex
CREATE INDEX "Compensation_recordId_effectiveFrom_idx" ON "Compensation"("recordId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "LeaveRequest_memberId_status_idx" ON "LeaveRequest"("memberId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_idx" ON "LeaveRequest"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_memberId_year_type_key" ON "LeaveBalance"("memberId", "year", "type");

-- CreateIndex
CREATE INDEX "JmlEvent_memberId_status_idx" ON "JmlEvent"("memberId", "status");

-- CreateIndex
CREATE INDEX "CardChangeRequest_status_createdAt_idx" ON "CardChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeDocument_status_idx" ON "EmployeeDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_memberId_code_key" ON "EmployeeDocument"("memberId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryFolder_path_key" ON "RepositoryFolder"("path");

-- CreateIndex
CREATE INDEX "RepositoryFolder_zone_idx" ON "RepositoryFolder"("zone");

-- CreateIndex
CREATE INDEX "RepositoryFolder_depth_idx" ON "RepositoryFolder"("depth");

-- CreateIndex
CREATE INDEX "FolderEvent_path_at_idx" ON "FolderEvent"("path", "at");

-- CreateIndex
CREATE INDEX "FolderEvent_at_idx" ON "FolderEvent"("at");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_ref_key" ON "Customer"("ref");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_taxId_idx" ON "Customer"("taxId");

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ref_key" ON "Contact"("ref");

-- CreateIndex
CREATE INDEX "Contact_consentStatus_idx" ON "Contact"("consentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_customerId_contactId_key" ON "CustomerContact"("customerId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_ref_key" ON "Opportunity"("ref");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");

-- CreateIndex
CREATE INDEX "Opportunity_customerId_idx" ON "Opportunity"("customerId");

-- CreateIndex
CREATE INDEX "OpportunityStageEvent_opportunityId_at_idx" ON "OpportunityStageEvent"("opportunityId", "at");

-- CreateIndex
CREATE INDEX "CrmActivity_customerId_occurredAt_idx" ON "CrmActivity"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "CrmActivity_opportunityId_occurredAt_idx" ON "CrmActivity"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrainingRecord_memberId_status_idx" ON "TrainingRecord"("memberId", "status");

-- CreateIndex
CREATE INDEX "TrainingRecord_expiresAt_idx" ON "TrainingRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_ref_key" ON "Asset"("ref");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "AssetAssignment_memberId_returnedAt_idx" ON "AssetAssignment"("memberId", "returnedAt");

-- CreateIndex
CREATE INDEX "AssetAssignment_assetId_issuedAt_idx" ON "AssetAssignment"("assetId", "issuedAt");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerApiKey" ADD CONSTRAINT "PartnerApiKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSale" ADD CONSTRAINT "PartnerSale_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentUsage" ADD CONSTRAINT "AgentUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSolution" ADD CONSTRAINT "SavedSolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSolution" ADD CONSTRAINT "SavedSolution_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDemo" ADD CONSTRAINT "ProductDemo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoScene" ADD CONSTRAINT "DemoScene_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "ProductDemo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_partyOneId_fkey" FOREIGN KEY ("partyOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_partyTwoId_fkey" FOREIGN KEY ("partyTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementDocument" ADD CONSTRAINT "AgreementDocument_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerSale" ADD CONSTRAINT "ResellerSale_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerSale" ADD CONSTRAINT "ResellerSale_productKeyId_fkey" FOREIGN KEY ("productKeyId") REFERENCES "ProductKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDecision" ADD CONSTRAINT "WorkflowDecision_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BusinessGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "WorkforcePerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "OrgPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamLoginToken" ADD CONSTRAINT "TeamLoginToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEvent" ADD CONSTRAINT "DocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ControlledDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ControlledDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentKey_fkey" FOREIGN KEY ("agentKey") REFERENCES "AgentRegistry"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgPosition" ADD CONSTRAINT "OrgPosition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRecord" ADD CONSTRAINT "EmployeeRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensation" ADD CONSTRAINT "Compensation_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "EmployeeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JmlEvent" ADD CONSTRAINT "JmlEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardChangeRequest" ADD CONSTRAINT "CardChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageEvent" ADD CONSTRAINT "OpportunityStageEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;


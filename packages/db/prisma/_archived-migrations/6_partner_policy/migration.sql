-- Partner Policy compliance: 50/50 default split + record policy acceptance
ALTER TABLE "User" ADD COLUMN "partnerPolicyAcceptedAt" TIMESTAMP(3);

ALTER TABLE "Solution" ALTER COLUMN "partnerSharePercent" SET DEFAULT 50;

-- Align existing solutions still on the old 70% default to the policy's 50/50.
UPDATE "Solution" SET "partnerSharePercent" = 50 WHERE "partnerSharePercent" = 70;

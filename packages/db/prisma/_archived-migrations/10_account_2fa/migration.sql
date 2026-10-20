-- Account self-service (notification preference) + 2FA (TOTP). Additive & idempotent.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailAlerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

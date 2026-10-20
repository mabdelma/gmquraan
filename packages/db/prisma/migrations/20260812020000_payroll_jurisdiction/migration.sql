-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "jurisdiction" TEXT;

-- CreateTable
CREATE TABLE "PayrollJurisdiction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "policies" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollJurisdiction_code_key" ON "PayrollJurisdiction"("code");


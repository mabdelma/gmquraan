-- Partner integration API: keys + reported sales (50/50)
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
CREATE UNIQUE INDEX "PartnerApiKey_keyHash_key" ON "PartnerApiKey"("keyHash");
CREATE INDEX "PartnerApiKey_ownerId_idx" ON "PartnerApiKey"("ownerId");
ALTER TABLE "PartnerApiKey" ADD CONSTRAINT "PartnerApiKey_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
CREATE UNIQUE INDEX "PartnerSale_externalId_key" ON "PartnerSale"("externalId");
CREATE INDEX "PartnerSale_ownerId_idx" ON "PartnerSale"("ownerId");
ALTER TABLE "PartnerSale" ADD CONSTRAINT "PartnerSale_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

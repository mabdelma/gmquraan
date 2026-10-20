-- Cross-product reseller income sharing: product API keys + attributed sales.
CREATE TABLE IF NOT EXISTS "ProductKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ProductKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductKey_keyHash_key" ON "ProductKey"("keyHash");

CREATE TABLE IF NOT EXISTS "ResellerSale" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "ResellerSale_externalId_key" ON "ResellerSale"("externalId");
CREATE INDEX IF NOT EXISTS "ResellerSale_resellerId_idx" ON "ResellerSale"("resellerId");
CREATE INDEX IF NOT EXISTS "ResellerSale_productKeyId_idx" ON "ResellerSale"("productKeyId");
ALTER TABLE "ResellerSale" ADD CONSTRAINT "ResellerSale_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResellerSale" ADD CONSTRAINT "ResellerSale_productKeyId_fkey" FOREIGN KEY ("productKeyId") REFERENCES "ProductKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

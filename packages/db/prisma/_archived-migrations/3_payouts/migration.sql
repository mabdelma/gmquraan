-- Reseller revenue-share payouts
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

CREATE INDEX "Payout_resellerId_idx" ON "Payout"("resellerId");

ALTER TABLE "Payout" ADD CONSTRAINT "Payout_resellerId_fkey"
  FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

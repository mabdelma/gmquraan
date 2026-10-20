-- Reseller referral ownership on coupons
ALTER TABLE "Coupon" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "isReferral" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Coupon_ownerId_idx" ON "Coupon"("ownerId");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

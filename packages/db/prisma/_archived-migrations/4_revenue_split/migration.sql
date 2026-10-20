-- Per-solution revenue-share terms (% to the partner; remainder to Unskinned)
ALTER TABLE "Solution" ADD COLUMN "partnerSharePercent" INTEGER NOT NULL DEFAULT 70;

-- Human-friendly unique application ID per solution
ALTER TABLE "Solution" ADD COLUMN "code" TEXT;
UPDATE "Solution" SET "code" = 'APP-' || upper(substr(md5("id"), 1, 8)) WHERE "code" IS NULL;
CREATE UNIQUE INDEX "Solution_code_key" ON "Solution"("code");

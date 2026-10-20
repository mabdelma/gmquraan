-- Domain-event log (event bus foundation). Additive.
CREATE TABLE IF NOT EXISTS "DomainEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DomainEvent_type_createdAt_idx" ON "DomainEvent"("type","createdAt");
CREATE INDEX IF NOT EXISTS "DomainEvent_createdAt_idx" ON "DomainEvent"("createdAt");

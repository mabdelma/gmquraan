-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "postable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "currency" TEXT,
    "parentCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "memo" TEXT,
    "reversesEntryId" TEXT,
    "totalDebit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "projectId" TEXT,
    "costCentreId" TEXT,
    "departmentId" TEXT,

    CONSTRAINT "PostingLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerAccount_companyId_type_idx" ON "LedgerAccount"("companyId", "type");

-- CreateIndex
CREATE INDEX "LedgerAccount_companyId_active_idx" ON "LedgerAccount"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_companyId_code_key" ON "LedgerAccount"("companyId", "code");

-- CreateIndex
CREATE INDEX "AccountingPeriod_companyId_status_idx" ON "AccountingPeriod"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_companyId_period_key" ON "AccountingPeriod"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversesEntryId_key" ON "JournalEntry"("reversesEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_period_state_idx" ON "JournalEntry"("companyId", "period", "state");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_date_idx" ON "JournalEntry"("companyId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_state_idx" ON "JournalEntry"("state");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_companyId_reference_key" ON "JournalEntry"("companyId", "reference");

-- CreateIndex
CREATE INDEX "PostingLine_entryId_idx" ON "PostingLine"("entryId");

-- CreateIndex
CREATE INDEX "PostingLine_accountId_idx" ON "PostingLine"("accountId");

-- CreateIndex
CREATE INDEX "PostingLine_projectId_idx" ON "PostingLine"("projectId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingLine" ADD CONSTRAINT "PostingLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingLine" ADD CONSTRAINT "PostingLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


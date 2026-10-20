-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "partyRef" TEXT NOT NULL,
    "partyName" TEXT,
    "currency" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "dueOn" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "netTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grossTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "taxRatePercent" DECIMAL(9,4),
    "accountCode" TEXT NOT NULL,
    "projectId" TEXT,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "on" TIMESTAMP(3) NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_journalEntryId_key" ON "SalesInvoice"("journalEntryId");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_side_state_idx" ON "SalesInvoice"("companyId", "side", "state");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_dueOn_idx" ON "SalesInvoice"("companyId", "dueOn");

-- CreateIndex
CREATE INDEX "SalesInvoice_partyRef_idx" ON "SalesInvoice"("partyRef");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_side_number_key" ON "SalesInvoice"("companyId", "side", "number");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_projectId_idx" ON "InvoiceLine"("projectId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_idx" ON "PaymentAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_on_idx" ON "PaymentAllocation"("on");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_invoiceId_paymentRef_key" ON "PaymentAllocation"("invoiceId", "paymentRef");

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


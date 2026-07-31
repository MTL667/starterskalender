-- Pdf mail batch distributor (admin PDF mailer)
-- Safe to run on Postgres; matches prisma/schema.prisma models.

DO $$ BEGIN
  CREATE TYPE "PdfMailBatchStatus" AS ENUM ('DRAFT', 'SENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PdfMailItemStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PdfMailBatch" (
  "id" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "status" "PdfMailBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "leftoverPdfNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "leftoverEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfMailBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PdfMailBatchItem" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "sortIndex" INTEGER NOT NULL,
  "recipientEmail" TEXT,
  "recipientName" TEXT,
  "pdfFileName" TEXT,
  "pdfStoragePath" TEXT,
  "status" "PdfMailItemStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "sgMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfMailBatchItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PdfMailBatch_createdBy_createdAt_idx" ON "PdfMailBatch"("createdBy", "createdAt");
CREATE INDEX IF NOT EXISTS "PdfMailBatch_status_idx" ON "PdfMailBatch"("status");
CREATE INDEX IF NOT EXISTS "PdfMailBatchItem_batchId_sortIndex_idx" ON "PdfMailBatchItem"("batchId", "sortIndex");
CREATE INDEX IF NOT EXISTS "PdfMailBatchItem_sgMessageId_idx" ON "PdfMailBatchItem"("sgMessageId");
CREATE INDEX IF NOT EXISTS "PdfMailBatchItem_status_idx" ON "PdfMailBatchItem"("status");

DO $$ BEGIN
  ALTER TABLE "PdfMailBatchItem"
    ADD CONSTRAINT "PdfMailBatchItem_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "PdfMailBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

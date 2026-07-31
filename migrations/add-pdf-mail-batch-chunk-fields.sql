-- Chunked PDF mailer upload support
ALTER TABLE "PdfMailBatch" ADD COLUMN IF NOT EXISTS "recipientsJson" JSONB;
ALTER TABLE "PdfMailBatch" ADD COLUMN IF NOT EXISTS "uploadedPdfs" JSONB;

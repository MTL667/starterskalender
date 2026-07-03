-- Backfill: remap offboarding materials from RESERVED to COLLECTED
UPDATE "StarterMaterial"
SET status = 'COLLECTED'
WHERE status = 'RESERVED'
  AND "starterId" IN (
    SELECT id FROM "Starter" WHERE type = 'OFFBOARDING'
  );

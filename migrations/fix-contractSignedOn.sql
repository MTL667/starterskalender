-- Migration: Fix NULL contractSignedOn values
-- Set contractSignedOn to startDate for existing records where it's NULL
-- This is needed before making the field non-nullable

UPDATE "Starter" 
SET "contractSignedOn" = COALESCE("contractSignedOn", "startDate", NOW()) 
WHERE "contractSignedOn" IS NULL;


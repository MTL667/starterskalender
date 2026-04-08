-- Migration: Split Starter.name into firstName and lastName
-- firstName = everything before the first space
-- lastName = everything after the first space
-- Idempotent: skips if name column no longer exists

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Starter' AND column_name = 'name'
  ) THEN
    -- Add new columns (nullable first for population)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Starter' AND column_name = 'firstName'
    ) THEN
      ALTER TABLE "Starter" ADD COLUMN "firstName" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Starter' AND column_name = 'lastName'
    ) THEN
      ALTER TABLE "Starter" ADD COLUMN "lastName" TEXT;
    END IF;

    -- Populate from existing name
    UPDATE "Starter"
    SET "firstName" = CASE
          WHEN POSITION(' ' IN "name") > 0 THEN LEFT("name", POSITION(' ' IN "name") - 1)
          ELSE "name"
        END,
        "lastName" = CASE
          WHEN POSITION(' ' IN "name") > 0 THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
          ELSE ''
        END
    WHERE "firstName" IS NULL OR "lastName" IS NULL;

    -- Make NOT NULL
    ALTER TABLE "Starter" ALTER COLUMN "firstName" SET NOT NULL;
    ALTER TABLE "Starter" ALTER COLUMN "lastName" SET NOT NULL;

    -- Drop old column
    ALTER TABLE "Starter" DROP COLUMN "name";

    RAISE NOTICE 'Migration split-starter-name: completed successfully';
  ELSE
    RAISE NOTICE 'Migration split-starter-name: already applied (name column does not exist)';
  END IF;
END $$;

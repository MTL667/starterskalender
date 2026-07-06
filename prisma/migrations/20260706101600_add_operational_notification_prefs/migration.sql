-- AlterTable
ALTER TABLE "NotificationPreference"
  ADD COLUMN "taskEmails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "materialAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "starterCancellation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "entraAlerts" BOOLEAN NOT NULL DEFAULT true;

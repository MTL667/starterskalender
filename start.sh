#!/bin/sh

# Start script voor Next.js + Cron jobs

echo "🚀 Starting Airport..."

# Fix existing NULL contractSignedOn values before schema sync
echo "🔧 Migrating existing starters with NULL contractSignedOn..."
if [ -f /app/migrations/fix-contractSignedOn.sql ]; then
  su-exec nextjs:nodejs node node_modules/.bin/prisma db execute --file /app/migrations/fix-contractSignedOn.sql || echo "⚠️  Migration already applied or failed (continuing...)"
fi

# Split Starter.name into firstName + lastName (must run BEFORE db push)
echo "🔧 Splitting Starter name into firstName/lastName..."
if [ -f /app/migrations/split-starter-name.sql ]; then
  su-exec nextjs:nodejs node node_modules/.bin/prisma db execute --file /app/migrations/split-starter-name.sql || echo "⚠️  Migration already applied or failed (continuing...)"
fi

# Sync database schema (push schema changes without migrations)
echo "🗄️  Syncing database schema..."
su-exec nextjs:nodejs node node_modules/.bin/prisma db push --accept-data-loss

# RBAC v2 — seed permissions + system roles (altijd runnen, is idempotent en moet
# in sync blijven met lib/authz-registry.ts)
echo "🔐 Seeding RBAC v2 permissions and system roles..."
su-exec nextjs:nodejs node ./node_modules/tsx/dist/cli.mjs prisma/seed-rbac.ts || echo "⚠️  RBAC seed failed (continuing...)"

# RBAC v2 — backfill legacy roles naar UserRoleAssignment.
# Zet RUN_RBAC_V2_BACKFILL=true in de productie-env bij de eerste deploy van
# RBAC v2. Daarna kan je de env var weghalen of op false zetten; het script
# is idempotent maar het scheelt logvolume.
if [ "$RUN_RBAC_V2_BACKFILL" = "true" ]; then
  echo "🔄 Running RBAC v2 backfill (legacy roles → UserRoleAssignment)..."
  su-exec nextjs:nodejs node ./node_modules/tsx/dist/cli.mjs prisma/backfill-rbac.ts || echo "⚠️  RBAC backfill failed (continuing...)"
fi

# Generate crontab with actual environment variables
echo "📅 Generating crontab with runtime env vars..."
CRON_AUTH=""
if [ -n "$CRON_SECRET" ]; then
  CRON_AUTH="-H \"Authorization: Bearer $CRON_SECRET\""
  echo "  ✅ CRON_SECRET is set"
else
  echo "  ⚠️  CRON_SECRET is not set — cron endpoints are unprotected!"
fi

cat > /etc/crontabs/root << CRONTAB
# Airport - Automated Email Cron Jobs (generated at startup)
# Timezone: ${TZ:-UTC}

# Wekelijkse reminder - elke dag om 08:00
0 8 * * * curl -sf $CRON_AUTH http://localhost:3000/api/cron/send-weekly-reminders > /proc/1/fd/1 2>&1

# Maandoverzicht - 1e van elke maand om 09:00
0 9 1 * * curl -sf $CRON_AUTH http://localhost:3000/api/cron/send-monthly-summary > /proc/1/fd/1 2>&1

# Kwartaaloverzicht - 1e van kwartaal om 10:00 (jan/apr/jul/okt)
0 10 1 1,4,7,10 * curl -sf $CRON_AUTH http://localhost:3000/api/cron/send-quarterly-summary > /proc/1/fd/1 2>&1

# Jaaroverzicht - 1 januari om 11:00
0 11 1 1 * curl -sf $CRON_AUTH http://localhost:3000/api/cron/send-yearly-summary > /proc/1/fd/1 2>&1

# Materialen leverdatum check - elke werkdag om 08:30
30 8 * * 1-5 curl -sf $CRON_AUTH http://localhost:3000/api/cron/check-material-deliveries > /proc/1/fd/1 2>&1

CRONTAB
chmod 0644 /etc/crontabs/root

# Start crond in de achtergrond (als root)
echo "📅 Starting cron daemon..."
crond -b -l 2

# Wacht even voor crond is gestart
sleep 2

# Start Next.js server as nextjs user (foreground)
echo "🌐 Starting Next.js server as nextjs user..."
exec su-exec nextjs:nodejs node server.js


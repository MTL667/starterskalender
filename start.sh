#!/bin/sh

# Start script voor Next.js app

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
# Admin bootstrap — zet ADMIN_EMAIL in .env bij eerste installatie.
# Idempotent: als de user al bestaat wordt alleen de rol gecontroleerd.
if [ -n "$ADMIN_EMAIL" ]; then
  echo "👤 Bootstrapping admin user: $ADMIN_EMAIL"
  su-exec nextjs:nodejs sh -c "ADMIN_EMAIL='$ADMIN_EMAIL' node ./node_modules/tsx/dist/cli.mjs prisma/seed-admin.ts" || echo "⚠️  Admin seed failed (continuing...)"
fi

if [ "$RUN_RBAC_V2_BACKFILL" = "true" ]; then
  echo "🔄 Running RBAC v2 backfill (legacy roles → UserRoleAssignment)..."
  su-exec nextjs:nodejs node ./node_modules/tsx/dist/cli.mjs prisma/backfill-rbac.ts || echo "⚠️  RBAC backfill failed (continuing...)"
fi

# NOTE: Cron jobs zijn verplaatst naar Cronicle (externe scheduler container).
# Zie docs/cronicle-setup.md voor configuratie.

# Start Next.js server as nextjs user (foreground)
echo "🌐 Starting Next.js server as nextjs user..."
exec su-exec nextjs:nodejs node server.js


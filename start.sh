#!/bin/sh

# Start script voor Next.js + Cron jobs

echo "🚀 Starting Starterskalender..."

# Fix existing NULL contractSignedOn values before schema sync
echo "🔧 Migrating existing starters with NULL contractSignedOn..."
if [ -f /app/migrations/fix-contractSignedOn.sql ]; then
  su-exec nextjs:nodejs node node_modules/.bin/prisma db execute --file /app/migrations/fix-contractSignedOn.sql || echo "⚠️  Migration already applied or failed (continuing...)"
fi

# Sync database schema (push schema changes without migrations)
echo "🗄️  Syncing database schema..."
su-exec nextjs:nodejs node node_modules/.bin/prisma db push --accept-data-loss

# Start crond in de achtergrond (als root)
echo "📅 Starting cron daemon..."
crond -b -l 2

# Wacht even voor crond is gestart
sleep 2

# Start Next.js server as nextjs user (foreground)
echo "🌐 Starting Next.js server as nextjs user..."
exec su-exec nextjs:nodejs node server.js


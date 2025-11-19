#!/bin/sh

# Start script voor Next.js + Cron jobs

echo "🚀 Starting Starterskalender..."

# Sync database schema (push schema changes without migrations)
echo "🗄️  Syncing database schema..."
su-exec nextjs:nodejs npx prisma db push --accept-data-loss

# Start crond in de achtergrond (als root)
echo "📅 Starting cron daemon..."
crond -b -l 2

# Wacht even voor crond is gestart
sleep 2

# Start Next.js server as nextjs user (foreground)
echo "🌐 Starting Next.js server as nextjs user..."
exec su-exec nextjs:nodejs node server.js


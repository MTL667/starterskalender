#!/bin/sh
set -e

# Wait for DB if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy || true
fi

# Start Next.js standalone server
node server.js


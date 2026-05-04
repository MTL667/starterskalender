#!/bin/sh
# Wrapper for cron curl calls — avoids quoting issues in BusyBox crontab
# Usage: /app/cron-curl.sh <endpoint-path>
# Example: /app/cron-curl.sh /api/cron/send-weekly-reminders

ENDPOINT="$1"
URL="http://localhost:3000${ENDPOINT}"
LOGPREFIX="[cron $(date '+%Y-%m-%d %H:%M:%S')]"

if [ -z "$ENDPOINT" ]; then
  echo "${LOGPREFIX} ERROR: no endpoint provided" >&2
  exit 1
fi

AUTH_HEADER=""
if [ -n "$CRON_SECRET" ]; then
  AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"
fi

if [ -n "$AUTH_HEADER" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "$URL" 2>&1)
else
  RESPONSE=$(curl -s -w "\n%{http_code}" "$URL" 2>&1)
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$HTTP_CODE" -lt 300 ] 2>/dev/null; then
  echo "${LOGPREFIX} OK ${ENDPOINT} (${HTTP_CODE}): ${BODY}"
else
  echo "${LOGPREFIX} FAIL ${ENDPOINT} (${HTTP_CODE}): ${BODY}" >&2
fi

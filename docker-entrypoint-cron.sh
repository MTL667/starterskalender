#!/bin/sh

echo "Starting cron service for Starterskalender email reminders..."
echo "Cron will run daily at 08:00 Europe/Brussels time"

# Start cron in foreground
crond -f -l 2


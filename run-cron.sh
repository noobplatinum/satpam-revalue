#!/bin/sh
# Redirect output to a log file and to the container's stdout
echo "Cron job running at $(date)"
curl http://localhost:${PORT:-3000}
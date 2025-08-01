#!/bin/sh

# Start the cron daemon in the background
cron -f &

# Start the Node.js server in the foreground
exec node easypanel-server.js

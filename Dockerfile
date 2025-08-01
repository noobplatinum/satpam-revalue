
# Use the official Node.js 22 image
FROM node:22-slim

# Install cron and curl
RUN apt-get update && apt-get -y install cron curl

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy the cron and entrypoint scripts
COPY run-cron.sh entrypoint.sh /app/

# Make scripts executable
RUN chmod +x /app/run-cron.sh /app/entrypoint.sh

# Add cron job
RUN echo "*/15 * * * * /app/run-cron.sh >> /var/log/cron.log 2>&1" | crontab -

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

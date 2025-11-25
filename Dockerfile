# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application and migrations from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./

# Create data directory for SQLite database
# Note: Permissions will be handled by the mounted volume from Unraid
RUN mkdir -p /app/data

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Create a startup script that handles permissions dynamically
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Ensure data directory exists and is writable' >> /app/start.sh && \
    echo 'mkdir -p /app/data' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application' >> /app/start.sh && \
    echo 'exec node build' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start the application using the startup script
CMD ["/app/start.sh"]

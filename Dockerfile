# Multi-stage build for Node.js + Express app with sql.js
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

FROM node:22-alpine

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY src ./src
COPY index.html app.html ./
COPY .env.example .env.example

# Create data directory for SQLite
RUN mkdir -p /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/api/server.js"]

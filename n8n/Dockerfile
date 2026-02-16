# N8N Docker Image for Render
FROM n8nio/n8n:latest

# Set user to root temporarily for setup
USER root

# Create data directory
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

# Switch back to node user
USER node

# Expose port
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5678/healthz || exit 1

# Start N8N
CMD ["n8n", "start"]

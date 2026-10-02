FROM node:alpine

# Path to assets in container
WORKDIR /app
COPY . .

# Build honey
RUN npm install
RUN npm run build

# Run honey's server (static files, sign-in roles, Jarvis proxy)
CMD ["/app/entrypoint.sh"]

# Expose port
EXPOSE 4173

# Health check
HEALTHCHECK CMD wget -nv --spider --tries=1 http://127.0.0.1:4173/healthz

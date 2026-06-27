# --- Build Stage ---
FROM node:20 AS builder
WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ gcc libsqlite3-dev && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Set dummy environment variables to allow next build to succeed without crashing
ENV SESSION_SECRET=temporary_docker_build_secret_value_123456
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Runner Stage ---
FROM node:20-slim AS runner
WORKDIR /app

# Install runtime sqlite library just in case
RUN apt-get update && apt-get install -y libsqlite3-0 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create database volume directory
RUN mkdir -p /app/data

# Copy built application and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start"]

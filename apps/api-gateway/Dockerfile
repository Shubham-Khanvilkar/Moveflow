FROM node:18-alpine AS builder
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./

# Copy workspace package files
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build --workspace=@moveflow/api-gateway

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]

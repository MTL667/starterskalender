# Multi-stage build voor Next.js applicatie

# Stage 1: Dependencies
# Use Alpine 3.19 which has OpenSSL 1.1 support
FROM node:18-alpine3.19 AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Kopieer package files én prisma schema (nodig voor postinstall)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:18-alpine3.19 AS builder
WORKDIR /app

# Kopieer node_modules (inclusief gegenereerde Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variabelen voor build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (Prisma is al gegenereerd in deps stage)
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine3.19 AS runner
WORKDIR /app

# Installeer OpenSSL voor Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Kopieer public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Maak uploads folder aan met correcte permissions
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public/uploads && \
    chmod 755 /app/public/uploads

# Kopieer Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Kopieer Prisma schema en generated client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]


# ---- Base builder ----
FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# ---- Dependencies layer ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ---- Build layer ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client before build (needed by code references)
RUN npx prisma generate
RUN pnpm build

# ---- Production image ----
FROM node:20-alpine AS prod
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Copy Next standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Prisma schema & migrations for migrate deploy
COPY --from=build /app/prisma ./prisma

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://localhost:3000/api/health || exit 1

# Entrypoint script: run migrations then start
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]


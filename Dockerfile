# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; fi

# Copy source and build
COPY . .

# Build-time environment variables (passed via --build-arg)
ARG FS_APP_KEY
ARG FS_REDIRECT_URI
ARG FS_OAUTH_SCOPE
ARG FS_AUTH_BASE_URL
ARG FS_API_BASE_URL
ARG SESSION_SECRET
ARG NEXT_PUBLIC_APP_ORIGIN
ARG DATABASE_URL

# Make them available as ENV during build
ENV FS_APP_KEY=$FS_APP_KEY
ENV FS_REDIRECT_URI=$FS_REDIRECT_URI
ENV FS_OAUTH_SCOPE=$FS_OAUTH_SCOPE
ENV FS_AUTH_BASE_URL=$FS_AUTH_BASE_URL
ENV FS_API_BASE_URL=$FS_API_BASE_URL
ENV SESSION_SECRET=$SESSION_SECRET
ENV NEXT_PUBLIC_APP_ORIGIN=$NEXT_PUBLIC_APP_ORIGIN
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run widget:build && npm run prisma:generate && npm run build


FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Prisma runtime + schema (for migrate deploy if desired)
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/prisma ./prisma

# Create cache directory with correct permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]


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
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run widget:build && npm run prisma:generate && npm run build


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Prisma runtime + schema (for migrate deploy if desired)
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]


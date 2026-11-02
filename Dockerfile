FROM node:24.22.1-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# One-shot database migration runner. Built and published separately from the
# lean Next.js runtime image; production DB credentials are supplied at run time.
FROM deps AS migrate
COPY . .
ENV NODE_ENV=production
ENV PAYLOAD_SECRET=migration-only-placeholder-never-used-by-runtime
ENV SITE_URL=http://localhost:3000
CMD ["pnpm", "payload", "migrate"]

FROM base AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No Supabase credentials in CI image build. All database-dependent pages are dynamic.
ENV NODE_ENV=production
ENV PAYLOAD_SECRET=build-only-placeholder-do-not-use-in-production
ENV DATABASE_URL=postgresql://invalid:invalid@localhost:5432/placeholder
ENV SITE_URL=http://localhost:3000
RUN pnpm run generate:importmap && pnpm exec next build --experimental-build-mode compile

FROM node:24.22.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

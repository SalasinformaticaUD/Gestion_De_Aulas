FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG AULAS_API_URL=http://backend:3000
ARG MONITORES_API_URL=http://host.docker.internal:8000
ENV NEXT_PUBLIC_AULAS_API_URL=${AULAS_API_URL} \
    NEXT_PUBLIC_MONITORES_API_URL=${MONITORES_API_URL} \
    NEXT_DIST_DIR=.next-build \
    NEXT_TELEMETRY_DISABLED=1

RUN npx next build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next-build/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next-build/static ./.next-build/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

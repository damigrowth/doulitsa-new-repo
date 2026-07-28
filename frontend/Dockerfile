# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Next.js frontend (Doulitsa) — production image.
#
# Public site: https://doulitsa.ncmulti.com  (behind Dokploy/Traefik, TLS at proxy)
# Talks to the API at https://api-doulitsa.ncmulti.com
#
# IMPORTANT: every NEXT_PUBLIC_* value is inlined into the browser bundle at
# BUILD time. They MUST be passed as --build-arg (Dokploy: "Build-time
# Variables"); setting them only as runtime env vars would never reach the
# client code. Deploy the backend FIRST so its URL is live when this builds.
# ---------------------------------------------------------------------------

############################
# Stage 1 — base toolchain (yarn 4 via corepack)
############################
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

############################
# Stage 2 — install deps + build
############################
FROM base AS build

# node-gyp toolchain for native deps (bcrypt) + openssl for the Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first so this layer caches across source-only edits
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# App sources
COPY . .

# --- Build-time public config (baked into the client bundle) ---
ARG NEXT_PUBLIC_API_URL=https://api-doulitsa.ncmulti.com
ARG NEXT_PUBLIC_APP_URL=https://doulitsa.ncmulti.com
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ddejhvzbf
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME \
    NODE_ENV=production

# Runs build:taxonomies (tsx) -> prisma generate -> next build
RUN yarn build

############################
# Stage 3 — runtime
############################
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# libssl for the Prisma query engine at runtime; curl for the healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Bring over the fully built app: node_modules, .next, next.config.js and the
# generated taxonomy maps. Run as the unprivileged node user.
COPY --from=build --chown=node:node /app /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/ || exit 1

# Invoke the next binary directly so no yarn/corepack network fetch is needed at boot
CMD ["node_modules/.bin/next", "start", "-p", "3000"]

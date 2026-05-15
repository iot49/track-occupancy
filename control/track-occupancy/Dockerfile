# Build from the monorepo root so workspace packages are available
FROM node:22-slim AS base

# Install pnpm and camera tools
# Install pnpm and camera tools + docker cli for stats
RUN apt-get update && apt-get install -y \
    ffmpeg v4l-utils curl gnupg lsb-release procps \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /repo

# ---- Dependencies ----
FROM base AS deps
# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY lib/r49/package.json ./lib/r49/
COPY lib/classifier/package.json ./lib/classifier/
COPY lib/uid/package.json ./lib/uid/
COPY control/track-occupancy/package.json ./control/track-occupancy/

# Install dependencies for the detector workspace
# We use --no-frozen-lockfile to avoid issues with slight environment differences
RUN pnpm install --no-frozen-lockfile --filter @occupancy/detector...

# ---- Source ----
FROM deps AS app
COPY lib/r49/src ./lib/r49/src
COPY lib/classifier/src ./lib/classifier/src
COPY lib/uid/src ./lib/uid/src
COPY control/track-occupancy/src ./control/track-occupancy/src

WORKDIR /repo/control/track-occupancy

ENV NODE_ENV=production
CMD ["npx", "tsx", "src/main.ts"]

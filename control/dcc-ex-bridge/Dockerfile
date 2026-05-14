# Build from the monorepo root
FROM node:22-slim

# serialport needs python/make/g++ for native bindings
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /repo

# Copy manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY control/dcc-ex-bridge/package.json ./control/dcc-ex-bridge/
COPY control/dcc-ex-bridge/tsconfig.json ./control/dcc-ex-bridge/

# Install deps (no --filter: avoids "No projects matched" silent skip)
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY control/dcc-ex-bridge/src ./control/dcc-ex-bridge/src
WORKDIR /repo/control/dcc-ex-bridge
RUN pnpm run build

ENV NODE_ENV=production
# Run the compiled JS
CMD ["node", "dist/main.js"]

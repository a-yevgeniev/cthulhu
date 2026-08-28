# Build context is the repo root (npm workspaces need packages/engine and packages/protocol
# alongside packages/server) — see fly.toml at the repo root, which points here.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json

RUN npm ci

COPY packages/engine packages/engine
COPY packages/protocol packages/protocol
COPY packages/server packages/server

WORKDIR /app/packages/server
ENV NODE_ENV=production
EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]

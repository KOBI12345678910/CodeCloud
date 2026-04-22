FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
# Copy every workspace manifest before install so pnpm can resolve any
# transitive `workspace:*` reference between artifacts and lib packages.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/api-trpc/package.json artifacts/api-trpc/package.json
COPY artifacts/worker/package.json artifacts/worker/package.json
COPY artifacts/cloud-ide/package.json artifacts/cloud-ide/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib lib
RUN pnpm install --frozen-lockfile --filter "./artifacts/worker..."

FROM deps AS run
ENV NODE_ENV=production
COPY . .
WORKDIR /repo/artifacts/worker
CMD ["pnpm", "run", "start"]

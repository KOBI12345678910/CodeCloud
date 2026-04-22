FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
# Copy workspace manifests first so pnpm can resolve all workspace
# protocol dependencies. api-server depends on @workspace/api-zod, db,
# i18n, and integrations-anthropic-ai (each living under artifacts/),
# plus every @platform/* package under lib/. We copy all of them so
# `pnpm install --filter ./artifacts/api-server...` can build the
# transitive graph without missing manifests.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/api-trpc/package.json artifacts/api-trpc/package.json
COPY artifacts/worker/package.json artifacts/worker/package.json
COPY artifacts/cloud-ide/package.json artifacts/cloud-ide/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib lib
RUN pnpm install --frozen-lockfile --filter "./artifacts/api-server..."

FROM deps AS build
COPY . .
RUN pnpm --filter ./artifacts/api-server run build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/artifacts/api-server
EXPOSE 8080
CMD ["pnpm", "run", "start"]

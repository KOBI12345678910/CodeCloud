FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
# Copy every workspace manifest so pnpm can resolve workspace:* refs
# across artifacts and lib packages (cloud-ide depends on
# @workspace/api-client-react and @workspace/i18n which live under
# artifacts/).
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/api-trpc/package.json artifacts/api-trpc/package.json
COPY artifacts/worker/package.json artifacts/worker/package.json
COPY artifacts/cloud-ide/package.json artifacts/cloud-ide/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib lib
RUN pnpm install --frozen-lockfile --filter "./artifacts/cloud-ide..."

FROM deps AS build
COPY . .
RUN pnpm --filter ./artifacts/cloud-ide run build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/artifacts/cloud-ide
EXPOSE 5173
CMD ["pnpm", "run", "serve", "--port", "5173"]

# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
# Keep pnpm version in sync with "packageManager" in package.json. Activating it
# explicitly ensures every stage uses the same pnpm (corepack otherwise falls
# back to its bundled default in stages without a package.json, e.g. pnpm fetch).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=true
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM deps AS build
COPY . .
RUN HUSKY=0 pnpm install --offline --frozen-lockfile \
  && pnpm -r build

FROM build AS runtime
RUN mkdir -p /opt/examples /data/courses \
  && cp -R examples/. /opt/examples/ \
  && chown -R node:node /opt/examples /data/courses /app
USER node
WORKDIR /app

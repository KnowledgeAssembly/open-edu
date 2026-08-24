# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

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

# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
# Keep pnpm version in sync with "packageManager" in package.json. Activating it
# explicitly ensures every stage uses the same pnpm (corepack otherwise falls
# back to its bundled default in stages without a package.json, e.g. pnpm fetch).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN CI=true pnpm fetch

FROM deps AS build
COPY . .
RUN CI=true HUSKY=0 pnpm install --offline --frozen-lockfile \
  && pnpm -r build

FROM build AS runtime
# /app must be writable by the non-root user for vite's dep-optimizer cache;
# this copies the whole tree once more, accepted for a dev-runtime image.
RUN mkdir -p /opt/examples /data/courses \
  && cp -R examples/. /opt/examples/ \
  && chown -R node:node /opt/examples /data/courses /app
USER node
WORKDIR /app

# Run both the Course Creator Studio (dev-server, port 4000) and the learner
# app (port 4001) in the same container. The studio opens the hello-world
# package from /opt/examples by default (BROWSER=none disables vite's
# auto-open in the headless container).
CMD ["sh", "-c", "\
  BROWSER=none OPEN_EDU_PACKAGE_DIR=/opt/examples/hello-world \
    pnpm --filter @open-edu/dev-server exec vite --host 0.0.0.0 --port 4000 --strictPort & \
  pnpm --filter @open-edu/learner exec vite --host 0.0.0.0 --port 4001 --strictPort & \
  wait"]

# Docker Compose for Learner App & Course Creator Studio — Design

- **Date:** 2026-08-24
- **Status:** Approved (pending implementation plan)
- **Scope:** Containerisation of `apps/learner` and `apps/dev-server` (Studio) so that anyone with Docker and a repo checkout can run `docker compose up --build` and use both apps.

## Goals

1. One command brings up both apps: Learner at `http://localhost:4001`, Studio at `http://localhost:4000`.
2. Courses authored in the Studio appear in the Learner app and persist across restarts.
3. No application refactors — the existing full-stack Vite dev servers are the runtime.
4. Optional LLM/AI keys pass through from the host `.env`; everything works degraded without them.

## Non-goals

- Production static builds / extracted API servers (see Alternatives).
- Prebuilt registry images or CI image publishing.
- Reverse-proxy single-entrypoint topology.

## Context & constraints (from repo exploration)

| Fact                                                                                                                                     | Consequence                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Both apps are Vite dev servers with server-side middleware (Pipili chat, LLM proxy, OEP proxy, dictionary, Studio AI + library file ops) | Running Vite in containers preserves 100% behavior; no code extraction needed                   |
| Learner catalog dir is configurable via `EDU_CATALOG_DIR` (default `examples/`), port fixed at 4001 (`apps/learner/vite.config.ts`)      | Point it at a shared volume; compose command supplies `--host --port --strictPort` flags        |
| Studio workspace resolves via `OPEN_EDU_STUDIO_WORKSPACE`, port defaults to 4000 (`apps/dev-server/src/index.ts`)                        | Point it at the same shared volume                                                              |
| `startDevServer` binds localhost and calls browser-open                                                                                  | Needs one small container-friendly tweak (host option, suppress open)                           |
| Single pnpm workspace, one lockfile; packages resolve to built `dist/`; learner aliases some packages to source                          | Image must contain installed deps, built dist, and sources → one shared image for both services |
| Root `.env` is gitignored and auto-loaded by docker compose for variable substitution                                                    | Allowlist-substitution reuses existing convention; never bake secrets into the image            |

## Architecture

One image, two services, one shared named volume:

```
docker compose up --build
├─ learner  → Vite :4001   command: vite --host 0.0.0.0 --port 4001 --strictPort
└─ studio   → CLI  :4000   command: node packages/cli/dist/cli.js dev /data/courses/hello-world
        both mount ─► named volume "courses" at /data/courses
```

- **Learner:** env `EDU_CATALOG_DIR=/data/courses`.
- **Studio:** env `OPEN_EDU_STUDIO_WORKSPACE=/data/courses`.
- Volume seeded on first run from `/opt/examples` baked into the image (copy only if target empty — idempotent, marker-free). Authored courses persist across `compose down/up`; `down -v` resets to pristine examples.
- No source bind-mounts → no macOS/Windows filesystem penalty; only the fast named volume is mounted.

## Image design

Multi-stage `Dockerfile` at repo root, base `node:22-bookworm-slim`, corepack-enabled pnpm 9 (matches `packageManager` field):

1. **fetch** — copy `pnpm-lock.yaml` + every `package.json` → `pnpm fetch` (cacheable layer keyed on manifests+lockfile).
2. **build** — `pnpm install --offline --frozen-lockfile` → `pnpm -r build`.
3. **runtime** = build stage contents + non-root `node` user; `WORKDIR /app`; `/opt/examples` holds pristine example courses; `/data/courses` pre-created owned by `node` so the named volume inherits correct ownership on first mount.

`.dockerignore`: `node_modules/`, `dist/`, `.git/`, `test-results/`, `output/`, `.worktrees/`, `.superpowers/`, `scratch/`, `playwright-report/`, logs, `.env*`.

## Code changes (the only application change)

`apps/dev-server/src/index.ts` — extend `DevServerOptions` and `startDevServer`:

- New `host?: string` option → forwarded as `server.host` (default unchanged: Vite's localhost).
- Suppress browser-open when host is set or `OPEN_EDU_CONTAINER=1` (Vite's headless open attempt is harmless but noisy).
- Wire-through from CLI `dev` command (read `OPEN_EDU_STUDIO_HOST` env).

~10 lines + vitest tests asserting the options passed to `createServer`. No other source changes; learner host/port are CLI flags.

## Compose file

`docker-compose.yml` at repo root:

```yaml
services:
  learner:
    build: { context: ., dockerfile: Dockerfile }
    entrypoint: /app/docker/entrypoint.sh
    command: sh -c "pnpm --filter @open-edu/learner exec vite --host 0.0.0.0 --port 4001 --strictPort"
    ports: ['4001:4001']
    environment:
      EDU_CATALOG_DIR: /data/courses
      LLM_PROVIDER: ${LLM_PROVIDER:-}
      LLM_MODEL: ${LLM_MODEL:-}
      LLM_BASE_URL: ${LLM_BASE_URL:-}
      LLM_API_KEY: ${LLM_API_KEY:-}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:-}
    volumes: [courses:/data/courses]
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://127.0.0.1:4001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 30s
    restart: unless-stopped
  studio:
    build: { context: ., dockerfile: Dockerfile }
    entrypoint: /app/docker/entrypoint.sh
    command: node packages/cli/dist/cli.js dev /data/courses/hello-world
    ports: ['4000:4000']
    environment:
      OPEN_EDU_STUDIO_WORKSPACE: /data/courses
      OPEN_EDU_STUDIO_HOST: 0.0.0.0
      OPEN_EDU_CONTAINER: '1'
      # same LLM allowlist as learner (+ OPEN_EDU_STUDIO_LLM_*)
    volumes: [courses:/data/courses]
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://127.0.0.1:4000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 30s
    restart: unless-stopped
volumes:
  courses:
```

Both services share the entrypoint because seeding must happen before either app scans the volume; the seed step is guarded by an atomic lock (`mkdir /data/courses/.seed-lock`) so concurrent first-start cannot interleave partial copies — the loser of the race skips straight to checks + `exec`.

### Secrets

- Compose allowlist-substitution reads the root `.env` users already have. No new required config; ship `.env.example` documenting optional keys.
- Never `COPY .env` into any image layer; keys exist only as runtime env vars.
- Without keys, Pipili and Studio AI degrade gracefully (existing behavior); entrypoint prints a one-line notice.

### Entrypoint (`docker/entrypoint.sh`)

Runs as `node` user before `exec "$@"` (used by **both** services):

1. Ensure `/data/courses` exists and is writable (clear error otherwise).
2. If empty: acquire exclusive seed lock (`mkdir /data/courses/.seed-lock` — atomic; loser skips to step 4), copy `/opt/examples/*` into it, then guarantee ≥1 course directory exists (falls back to creating an empty `hello-world/` so the Studio's active-package arg always resolves). Remove the lock after seeding.
3. Notice if no LLM key detected.
4. `exec "$@"`.

## Data flow

```
Browser ──► localhost:4000 (Studio)                Browser ──► localhost:4001 (Learner)
             │ vite middleware: /api/studio/*                     │ vite middleware: /api/pipili/chat,
             │ reads/writes /data/courses/**                      │ /api/llm-proxy, /api/oep-proxy, dictionary
             ▼                                                    ▼
        courses volume ◄──────── shared ────────► EDU_CATALOG_DIR=/data/courses
```

- Teacher authors `my-course` in Studio → files land in `/data/courses/my-course` → learner's catalog scan picks it up on next page load.
- LLM calls go browser → same-origin Vite middleware → outbound to provider using env keys. No cross-service traffic; services don't address each other.

## Error handling

| Failure                           | Behavior                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Host port already in use          | `--strictPort` + fixed mapping → fast, clear failure instead of drifting ports |
| Port bound inside container       | Service fails healthcheck → visible in `docker compose ps`                     |
| Volume not writable               | Entrypoint writability check with actionable message before exec               |
| Seeding fails / volume empty      | Studio still boots (empty-directory mode supported by CLI)                     |
| Studio active-package dir missing | Entrypoint guarantees ≥1 course dir exists                                     |
| Missing LLM keys                  | Degraded mode (existing); one-line notice from entrypoint                      |

Non-root `node` user throughout; no secrets in image layers; `restart: unless-stopped` on both services.

## Testing

1. **Unit (vitest):** extend dev-server suite for `startDevServer` — assert `createServer` receives forwarded `host`, browser-open suppressed when container flag/host set. Existing suite stays green.
2. **Smoke script** (`docker/smoke-test.sh`, documented, not CI-wired): `compose up --build -d` → wait healthy → curl both ports → write a trivial course into the volume via `docker compose exec studio` → verify learner catalog lists it → `compose down`.
3. **Manual acceptance checklist** in README (author-in-studio → appears-in-learner flow).
4. Repo gates: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` remain green.

## Files delivered

| Path                                        | Purpose                             |
| ------------------------------------------- | ----------------------------------- |
| `Dockerfile`                                | Multi-stage build described above   |
| `.dockerignore`                             | Build-context hygiene               |
| `docker-compose.yml`                        | Two services + shared volume        |
| `docker/entrypoint.sh`                      | Seed-if-empty, checks, exec         |
| `docker/smoke-test.sh`                      | Post-up verification script         |
| `.env.example`                              | Optional AI key documentation       |
| `README.md`                                 | "Run with Docker" section           |
| `apps/dev-server/src/index.ts` (+ test)     | host/open container tweak           |
| `packages/cli/src/commands/dev.ts` (+ test) | `OPEN_EDU_STUDIO_HOST` wire-through |

## Success criteria

Fresh clone + Docker installed → `docker compose up --build` → Learner at `http://localhost:4001` serves playable example courses; Studio at `http://localhost:4000` can create/edit courses that appear in the Learner; state persists across restarts; all repo quality gates green.

## Alternatives considered

- **B — Production static builds + extracted API servers:** closest to real production, but requires extracting ~1k lines of working middleware out of two Vite configs. Rejected: high effort/risk, unnecessary for evaluator UX.
- **C — Two per-app images:** duplicated install layers and maintenance for one shared lockfile/workspace. Rejected.

# Release Process

This document describes the steps to publish a new version of the Open-Edu Framework.

## Prerequisites

- Node.js >= 18, pnpm >= 9
- Clean working tree (`git status` should show no uncommitted changes)
- All CI checks passing locally

## Step-by-step

### 1. Create a changeset

```bash
pnpm changeset
```

Follow the interactive prompt to select packages and bump versions (major, minor, patch). Write a summary that will appear in the changelog.

Changesets are stored as markdown files in `.changeset/`. Commit them:

```bash
git add .changeset/
git commit -m "chore: add changeset for <description>"
```

### 2. Version packages

```bash
pnpm changeset version
```

This consumes all pending changesets, updates `package.json` version fields, and generates/updates `CHANGELOG.md` files.

Review the version bumps and changelog entries before proceeding.

```bash
git add -A
git commit -m "chore: bump versions for release"
```

### 3. Build verification

```bash
pnpm clean
pnpm install
pnpm build
```

Ensure all packages build without errors.

### 4. Test verification

```bash
pnpm test
pnpm test:e2e          # requires pnpm build first
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:coverage     # verify coverage thresholds pass
```

### 5. Dry-run publish

```bash
pnpm publish -r --dry-run
```

Review the output to verify the correct packages, versions, and files will be published. No secrets or tokens are required for a dry run.

### 6. Publish

```bash
pnpm publish -r
```

This publishes all packages with pending versions to the npm registry. Each package is published independently; if one fails, the others may still succeed.

### 7. Tag and push

```bash
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin main --tags
```

### 8. Create a GitHub release

Use the tag to create a release on GitHub with the changelog summary.

## Rollback

If a release introduces issues:

1. **npm**: Deprecate the bad version with `npm deprecate @open-edu/<pkg>@<version> "reason"`.
2. **Git**: The previous tag still points to the last known-good commit.
3. **Fix**: Commit a fix, bump a patch version, and publish again.

## Versioning Strategy

- **Major**: Breaking changes to schemas, public APIs, or workflow definitions.
- **Minor**: New features, new widgets, new CLI commands.
- **Patch**: Bug fixes, documentation, internal refactoring with no API changes.

## Related Documents

- [AGENTS.md](../AGENTS.md) — Development rules and PR checklist
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Framework architecture overview
- [FRAMEWORK_SPEC.md](./FRAMEWORK_SPEC.md) — Detailed framework specification

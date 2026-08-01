---
sidebar_position: 21
---

# Course Registry (`@open-edu/registry`)

`@open-edu/registry` is the published Node tooling behind the OpenEdu course
registry. It provides the `open-edu-registry` CLI used by GitHub Actions to
validate course metadata, validate release assets, and regenerate `catalog.json`.

The [openedu-library](https://github.com/<owner>/openedu-library) repository is the
actual registry: `courses/*/metadata.json` files are authored by maintainers,
`.oep` packages live in GitHub Releases, and CI publishes the generated catalog
to GitHub Pages. The learner app consumes it via `VITE_CATALOG_URL`.

See the registry repo's docs (`docs/COURSE_REGISTRY.md`, `docs/PUBLISHING_GUIDE.md`)
for the authoring and publishing workflow. `@open-edu/registry` itself reuses
`OepReader`, `computeSha256`, and the `CatalogSchema` from `@open-edu/oep-distribution`.

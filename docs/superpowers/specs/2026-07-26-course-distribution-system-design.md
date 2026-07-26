# OpenEdu Course Distribution System Design

## Status

Approved architecture direction for design review. The MVP targets the browser/PWA learner app only.

## Goal

Provide a portable `.oep` distribution artifact that the OpenEdu learner app can install from a local file, URL, or static catalog; validate and checksum the artifact; use it offline; and update it without deleting learner data.

## Existing Constraints

OpenEdu already defines the canonical course source format as a directory containing `package.json`, optional `workflow.json`, `nodes/`, `assets/`, rewards, and cards. The CLI already validates, builds, packages, and verifies SHA-256 build manifests. The learner app persists installed courses and learner state through `@open-edu/storage`, which uses IndexedDB.

The distribution system must extend these contracts rather than create a second course authoring model. SQLite, filesystem installation, peer-to-peer networking, and a custom registry backend are outside the browser/PWA MVP.

## Design Principles

- Keep course source files human-editable and compatible with the existing loader.
- Make the `.oep` artifact self-contained and usable without network access after installation.
- Validate before activation and make replacement atomic from the learner’s perspective.
- Keep course content and learner-owned state in separate storage records.
- Treat the registry as metadata, not as a content database.
- Reserve stable interfaces for future signatures, alternate storage, and decentralized sources.
- Reject unsafe or malformed archives before extraction.

## System Architecture

```text
Local file / URL / static catalog
              │
              ▼
       Course source adapter
              │
              ▼
          OEP reader
   ZIP safety + manifest + hash
              │
              ▼
       Course validator
       existing core loader
              │
              ▼
       Install coordinator
          stage → activate
              │
              ▼
         IndexedDB storage
  installed content + package metadata
```

The distribution subsystem has four boundaries:

1. **OEP format boundary** — reads and writes the archive envelope.
2. **Validation boundary** — validates distribution metadata and the embedded OpenEdu course.
3. **Installation boundary** — coordinates source acquisition, verification, staging, activation, and updates.
4. **Storage boundary** — persists installed content and metadata without owning learner progress semantics.

## OEP Package Format

An `.oep` file is a ZIP archive with this layout:

```text
manifest.json
course/
  package.json
  workflow.json
  nodes/
  assets/
  rewards.json
  cards.json
signatures/
```

`workflow.json`, `rewards.json`, `cards.json`, and `signatures/` are optional when the source course does not use them. `manifest.json` is the distribution manifest and is distinct from the embedded course `package.json`.

The distribution manifest has this conceptual shape:

```json
{
  "format": "openedu-package",
  "formatVersion": 1,
  "id": "science-grade7",
  "version": "1.0.0",
  "title": "Science Grade 7",
  "contentRoot": "course/",
  "checksum": {
    "algorithm": "sha256",
    "value": "..."
  },
  "signature": {
    "status": "unsigned"
  }
}
```

The manifest must agree with the embedded course manifest for identity, version, and display title. The checksum covers a canonical package payload defined by the implementation; the implementation must document whether it covers the archive bytes or a deterministic content listing and must use the same rule for building and installing.

## Browser Installation Flow

The installer accepts a source abstraction rather than knowing whether the package came from a file picker, URL, or catalog entry:

```ts
interface CourseSource {
  kind: 'file' | 'url' | 'catalog';
  getBytes(signal?: AbortSignal): Promise<Uint8Array>;
}

interface CourseInstaller {
  inspect(source: CourseSource): Promise<PackageInspection>;
  install(source: CourseSource): Promise<InstallResult>;
  update(courseId: string, source: CourseSource): Promise<InstallResult>;
}
```

The install coordinator performs these steps in order:

1. Read bytes from the source and enforce the configured archive-size limit.
2. Parse the ZIP central directory without extracting files.
3. Reject absolute paths, `..` traversal, symlinks, unsupported entry types, malformed archives, and excessive decompressed size.
4. Parse and validate `manifest.json`.
5. Verify the declared SHA-256 checksum.
6. Extract supported entries into memory.
7. Validate the `course/` directory through the existing OpenEdu schemas and loader.
8. Confirm the outer manifest and embedded `package.json` agree.
9. Stage the full course record.
10. Activate the staged record only after all checks pass.

An installation failure must leave the previously active course unchanged. The installer should expose structured error codes for source, archive, manifest, checksum, validation, storage, and version failures.

## Updates and Learner Data

Course identity is keyed by `id`; package content is versioned separately. By default, an update is accepted only when the incoming version is greater than the installed version according to semantic version ordering. Downgrades require an explicit future option.

The update process downloads and validates the new artifact before replacing the active course record. Progress, notes, bookmarks, badges, cards, and other learner-owned records remain outside the package replacement transaction. If a later version changes node identifiers, progress migration is a separate future concern and is not inferred by the installer.

## Storage Model

The existing IndexedDB course store remains the primary MVP storage mechanism. The stored course record gains distribution metadata such as installation timestamp, source kind, locator, and verified checksum.

Content records and learner-state records must not be merged. The installer may replace a course content record, but it must not delete or reset progress, notes, bookmarks, badges, or cards as a side effect.

## Static Registry

The MVP registry is static JSON. It contains metadata and immutable version entries, not package contents:

```json
{
  "catalogVersion": 1,
  "packages": [
    {
      "id": "science-grade7",
      "title": "Science Grade 7",
      "latestVersion": "1.0.0",
      "versions": [
        {
          "version": "1.0.0",
          "downloadUrl": "https://example.org/science-grade7-1.0.0.oep",
          "checksum": "...",
          "sizeBytes": 123456,
          "languages": ["en"]
        }
      ]
    }
  ]
}
```

The learner app can load the catalog while online, display available courses and updates, and install selected versions. Once installed, the course remains usable offline even if the catalog is unavailable.

## Security and Trust

The MVP provides integrity verification, not authenticity. SHA-256 detects accidental corruption and tampering relative to a trusted registry or locally supplied checksum; unsigned packages must be clearly identified.

The format reserves `signatures/` and the runtime exposes a future verifier boundary such as:

```ts
interface SignatureVerifier {
  verify(manifest: DistributionManifest, packageBytes: Uint8Array): Promise<SignatureStatus>;
}
```

OpenPGP and Ed25519 implementations are deferred. Package content must not be treated as executable code by the installer; remote widgets and other executable integrations retain their existing trust model.

## MVP Scope

Included:

- Build an `.oep` ZIP artifact around an existing OpenEdu course.
- Install from a local file.
- Install from a URL.
- Install from a static catalog entry.
- Validate the outer manifest and embedded course.
- Verify SHA-256 checksums.
- Protect against ZIP traversal, malformed archives, and extraction bombs.
- Detect newer versions and replace packages safely.
- Preserve learner-owned state.
- Use installed packages offline.

Deferred:

- Cryptographic signing and signature enforcement.
- Peer-to-peer, torrent, IPFS, or blockchain distribution.
- Background downloads and delta updates.
- Filesystem or SQLite installation.
- Monetization, license enforcement, and access control.
- Automatic progress migration across changed node identifiers.

## Validation and Testing Strategy

Every new schema, archive utility, installer service, storage change, and learner-facing component receives Vitest coverage. Tests must include:

- valid and invalid distribution manifests;
- archive creation and round-trip reading;
- path traversal, absolute path, symlink, malformed ZIP, size-limit, and decompression-limit rejection;
- checksum success and mismatch;
- embedded course validation and outer/inner manifest mismatch;
- failed installs preserving the prior active course;
- update acceptance, same-version rejection, and downgrade rejection;
- progress and notes remaining intact across updates;
- file, URL, and catalog source adapters;
- catalog parsing and learner-facing install/update states;
- accessibility tests for new learner UI.

The implementation should run focused package tests first, followed by learner tests and the repository’s standard typecheck, lint, format, and test commands.

## Implementation Sequence

1. Add schemas and format-version contracts.
2. Add browser-safe ZIP reading/writing and security checks.
3. Add `.oep` build and validation support to the CLI/core packages.
4. Add IndexedDB metadata and install coordination.
5. Add file and URL installation to the learner app.
6. Add static catalog loading and catalog installation.
7. Add update detection and progress-preserving replacement.
8. Add end-to-end coverage and documentation for authors and distributors.

## Open Decisions for Implementation Planning

- Select the ZIP library already compatible with the browser build and confirm its decompression-limit behavior.
- Choose the canonical checksum scope and encode it in the manifest/schema documentation.
- Set the initial archive and decompressed-size limits as configuration constants.
- Decide whether the learner app stores parsed content only or also retains the original `.oep` bytes for re-export/debugging; the MVP should default to parsed content only unless offline revalidation requires the archive.

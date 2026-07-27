---
sidebar_position: 20
---

# Course Distribution (`@open-edu/oep-distribution`)

The course distribution package provides the portable `.oep` (Open-Edu Package) archive format, install coordinator, catalog loader, and security infrastructure for distributing and installing educational courses.

## Overview

`@open-edu/oep-distribution` enables course authors to build portable distribution artifacts (`.oep` files) and learners to install them from files, URLs, or remote catalogs. The package handles:

- Building `.oep` ZIP archives with SHA-256 content integrity
- Reading, validating, and extracting `.oep` packages
- Stage-then-activate install flow with version detection
- ZIP security (path traversal, decompression bomb protection)
- Static JSON catalog fetching and parsing
- SEMVER version comparison

## Architecture

```
┌──────────────────────────────────────┐
│         OepWriter                    │  Build .oep archives
│  SHA-256 integrity · manifest gen    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│         OepReader                    │  Read + validate + extract
│  ZIP security · checksum verify      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│      InstallCoordinator              │  Stage → validate → activate
│  Version detection · upgrade/downgrade│
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌────────────────┐  ┌────────────────┐
│ Source Adapters │  │ Catalog Loader │
│ file · URL ·    │  │ fetch · parse  │
│ catalog         │  │ find version   │
└────────────────┘  └────────────────┘
```

## Key Components

### OepWriter

Builds portable `.oep` ZIP archives from a course directory:

```typescript
import { OepWriter } from '@open-edu/oep-distribution';

const writer = new OepWriter();
const result = await writer.build('/path/to/course', {
  outputPath: './dist/course.oep',
});
// { path, checksum, size }
```

### OepReader

Reads, validates, and extracts `.oep` packages:

```typescript
import { OepReader } from '@open-edu/oep-distribution';

const reader = new OepReader();
const extraction = await reader.extract('./course.oep', {
  outputDir: './installed-courses',
});
// { manifest, extractedPath, checksum }
```

### InstallCoordinator

Orchestrates the stage-then-activate install flow:

```typescript
import { InstallCoordinator } from '@open-edu/oep-distribution';

const coordinator = new InstallCoordinator();
const result = await coordinator.install({
  source: fileSource('./my-course.oep'),
  currentVersion: '0.1.0', // optional — enables upgrade/downgrade detection
});
// { status: 'installed' | 'upgraded' | 'downgraded' | 'same-version', path }
```

### Source Adapters

Three built-in adapters for different source types:

```typescript
import { fileSource, urlSource, catalogSource } from '@open-edu/oep-distribution';

// Local file
const src = fileSource('./my-course.oep');

// Remote URL
const src = urlSource('https://example.com/courses/math-101.oep');

// Catalog entry
const src = catalogSource(catalogEntry, baseUrl);
```

### Catalog Loader

Fetch and parse static JSON catalogs:

```typescript
import {
  fetchCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
} from '@open-edu/oep-distribution';

const catalog = await fetchCatalog('https://example.com/catalog.json');
const pkg = findPackageInCatalog(catalog, 'math-101');
const version = findVersionInCatalog(catalog, 'math-101', '1.0.0');
```

### ZIP Security

Built-in protection against malicious archives:

```typescript
import { validateZipArchive, validateZipEntry } from '@open-edu/oep-distribution';

// Validate entire archive
await validateZipArchive('./course.oep', {
  maxArchiveBytes: 100 * 1024 * 1024, // 100MB limit
  maxDecompressedBytes: 500 * 1024 * 1024, // 500MB limit
});

// Validate individual entries
validateZipEntry(entry); // throws SecurityViolationError on path traversal, absolute paths, etc.
```

### Version Comparison

SEMVER comparison utilities:

```typescript
import { semverGreaterThan, semverEquals, parseSemver } from '@open-edu/oep-distribution';

semverGreaterThan('1.0.0', '0.9.0'); // true
semverEquals('1.0.0', '1.0.0'); // true
parseSemver('1.2.3'); // { major: 1, minor: 2, patch: 3 }
```

## CLI Integration

The `edu oep:build` command builds a `.oep` artifact from any course directory:

```bash
edu oep:build ./my-course -o ./dist
```

Outputs:

- `./dist/<id>-<version>.oep` — the distribution archive
- SHA-256 checksum
- File size

## Learner App Integration

The learner app provides three install surfaces:

- **InstallCourseDialog** — tabbed file/URL install with error handling
- **CatalogInstallView** — fetch remote catalog JSON and install courses
- **AvailableUpdatesList** — detect and apply catalog updates

## Schemas

The distribution system uses two schemas from `@open-edu/schemas`:

- **`DistributionManifestSchema`** — format version, identity, checksum, signature status
- **`CatalogSchema`** — static registry catalog with version entries

## Storage Integration

Installed courses are persisted through `@open-edu/storage`:

- `DistributionMeta` type added to `StoredCourse` for tracking install source and version
- `replaceCourse` function for transactional course updates

## Testing

The package includes 56 Vitest tests covering:

- OepWriter archive generation
- OepReader extraction and validation
- InstallCoordinator stage-then-activate flow
- ZIP security (path traversal, decompression bombs, size limits)
- Catalog loading and parsing
- Version comparison edge cases

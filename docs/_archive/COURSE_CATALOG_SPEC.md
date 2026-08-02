# OpenEdu MVP Course Registry & Distribution

## Implementation Prompt Specification

Version: 1.0

---

# Objective

Design and implement the **OpenEdu MVP Course Distribution System**.

The goal is to create a lightweight, GitHub-native package registry that requires **no backend infrastructure** while providing a clean upgrade path to a future dedicated registry service.

This system should power the OpenEdu desktop application, PWA, and future mobile apps.

---

# Design Principles

The implementation must prioritize:

- Offline-first
- Open source
- GitHub-native
- Static hosting
- Minimal infrastructure
- Simple publishing workflow
- Versioned packages
- Future extensibility
- Excellent developer experience

Avoid introducing unnecessary complexity.

---

# MVP Architecture

Use a **single GitHub repository** as the official package registry.

Repository name:

```text
openedu-library
```

This repository serves three purposes:

1. Course catalog
2. Course metadata
3. GitHub Releases containing packaged courses

No database.

No backend.

No server APIs.

---

# Repository Structure

Design the repository like this:

```text
openedu-library/

├── README.md
├── LICENSE

├── catalog.json

├── courses/
│
│   ├── tribal-art/
│   │   ├── metadata.json
│   │   ├── thumbnail.webp
│   │   ├── screenshots/
│   │   └── README.md
│   │
│   ├── science-grade7/
│   │   ├── metadata.json
│   │   ├── thumbnail.webp
│   │   └── README.md
│   │
│   └── ...

├── schemas/
│   ├── catalog.schema.json
│   └── metadata.schema.json

└── .github/
    └── workflows/
```

The repository itself MUST NOT store `.oep` package files.

Packages belong exclusively in GitHub Releases.

---

# GitHub Releases

Each published course version becomes a Release Asset.

Example:

Release:

```text
tribal-art-v0.4.0
```

Assets:

```text
tribal-art-0.4.0.oep
checksums.txt
```

Future:

```text
tribal-art-0.4.0.sig
```

The release URL becomes the download URL inside the catalog.

---

# Course Metadata

Every course has its own metadata file.

Example:

```text
courses/
    tribal-art/
        metadata.json
```

Example metadata:

```json
{
  "id": "tribal-art",
  "name": "Indian Tribal Art",

  "description": "...",

  "author": "...",

  "version": "0.4.0",

  "license": "CC-BY-SA-4.0",

  "languages": ["en"],

  "thumbnail": "thumbnail.webp",

  "tags": ["art", "india"]
}
```

Metadata should NOT contain the GitHub Release URL.

Those should be generated automatically.

---

# catalog.json

The root catalog is generated.

Developers should never edit it manually.

CI should generate it from:

- metadata.json
- Release information

Structure:

```json
{
  "version": 1,

  "generatedAt": "...",

  "courses": [
    {
      "id": "...",

      "name": "...",

      "version": "...",

      "downloadUrl": "...",

      "sha256": "...",

      "size": 12345678,

      "thumbnail": "...",

      "description": "...",

      "languages": ["en"]
    }
  ]
}
```

---

# Publishing Workflow

The intended maintainer workflow should be:

```text
Author

↓

openedu build

↓

course.oep

↓

Upload Release

↓

GitHub Action

↓

Generate catalog.json

↓

Commit updated catalog

↓

Deploy GitHub Pages
```

The workflow should require as little manual work as possible.

---

# GitHub Actions

Implement workflows that can:

## Validate metadata

Ensure:

- schema validity
- required fields
- unique IDs

---

## Validate Release Assets

Ensure:

- .oep exists
- checksum exists

---

## Generate catalog.json

Automatically generate the catalog from:

- metadata
- Releases

Never require manual editing.

---

## Deploy GitHub Pages

Publish:

```text
catalog.json
```

and static assets.

---

# Package Installation

The OpenEdu application should support three installation methods.

---

## Install From Catalog

Download:

```text
catalog.json
```

Display available courses.

Install selected package.

---

## Install From URL

User pastes:

```text
https://...
```

Download package.

Install.

---

## Import Package

User selects:

```text
course.oep
```

Install locally.

---

# Update Detection

App downloads:

```text
catalog.json
```

Compare:

Installed version

vs

Latest version

Prompt user to update.

---

# Security

Validate:

- SHA256 checksum
- metadata schema
- ZIP traversal protection
- package manifest
- duplicate IDs

Reject invalid packages.

---

# Package Builder Integration

Assume another package already generates:

```text
course.oep
```

This registry project must integrate with that output.

Do not implement package creation.

Only publishing and discovery.

---

# Extensibility

Architecture must support future additions without breaking the catalog format.

Future features include:

- Multiple registries
- Private registries
- Signed packages
- Dependencies
- Delta updates
- Mirrors
- Regional CDNs
- Peer-to-peer distribution
- Content-addressed packages

Do not implement them now.

Design extension points.

---

# Developer Experience

Publishing a new course should require no more than:

1. Add metadata
2. Upload GitHub Release
3. Merge Pull Request

Everything else should happen automatically.

---

# Documentation

Produce:

```
COURSE_REGISTRY.md

CATALOG_SPEC.md

METADATA_SPEC.md

PUBLISHING_GUIDE.md

RELEASE_PROCESS.md

ARCHITECTURE.md
```

Include diagrams explaining:

- repository structure
- publishing flow
- installation flow
- update flow
- future migration path

---

# Success Criteria

A maintainer should be able to:

- Build a course package
- Upload it as a GitHub Release
- Merge metadata changes
- Automatically regenerate the catalog
- Have the course immediately discoverable inside OpenEdu

A learner should be able to:

- Open OpenEdu
- Browse available courses
- Install with one click
- Receive update notifications
- Continue using the course completely offline

without any dedicated backend service.

---

# Future Migration

The architecture must allow replacing GitHub with a dedicated registry service later without requiring changes to the OpenEdu application.

The application should depend only on the **Catalog API contract**, not on GitHub-specific implementation details.

GitHub is considered the initial hosting implementation, not the permanent architecture.
